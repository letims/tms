# Fleet Telemetry Monitoring API

An async Python API that ingests real-time telemetry from warehouse vehicles, maintains live fleet state, detects anomalies, and handles fault transitions atomically.

## Overview

Vehicles send telemetry events over HTTP. Each event is validated, persisted, and then processed through an anomaly detection pipeline in a single database transaction. The API exposes endpoints for querying fleet state, listing vehicles, browsing anomalies, and inspecting zone activity.

The stack is:

- **FastAPI** — async ASGI framework, chosen over Django REST Framework because the service needs fine-grained control over transaction boundaries (fault transitions, zone counters) that a synchronous ORM cannot provide without a thread pool
- **SQLAlchemy 2 (async)** — ORM with `aiosqlite` for SQLite
- **Pydantic v2** — request validation and response serialisation
- **Alembic** — database migrations
- **Locust** — load and concurrency testing

## Design decisions

### SQLite with WAL and `BEGIN IMMEDIATE`

Every transaction starts with `BEGIN IMMEDIATE`, which acquires SQLite's write lock up front. This eliminates SQLITE_BUSY races under concurrent writes and prevents anomalous reads — the read you do inside a transaction reflects exactly the state at the moment the lock was acquired.

The trade-off is higher tail latency under heavy concurrency (up to ~4 s in load tests at 80 users). This was an explicit product decision: **read precision is more important than throughput** for fleet state, because a stale status count could result in incorrect dispatch decisions.

WAL mode (`PRAGMA journal_mode=WAL`) allows concurrent reads alongside an active writer, which partially offsets the serialisation cost on read-heavy workloads.

**Upgrading to Postgres:** set `FLEET_DATABASE_URL` to a `postgresql+asyncpg://...` connection string. Remove the `BEGIN IMMEDIATE` / `isolation_level` configuration in `database.py` and replace it with `with_for_update()` on the vehicle row in `fault_handler.py` — Postgres supports `SELECT ... FOR UPDATE` natively. The atomic zone counter update requires no changes.

### Atomic fault transition

When a vehicle reports `status = "fault"` for the first time, the handler cancels any active mission and creates a maintenance record in the same `BEGIN IMMEDIATE` transaction. Because the write lock is held from the start, concurrent fault signals for the same vehicle cannot interleave — only the first one creates the maintenance record; subsequent ones are no-ops (idempotent guard on `previous_status == "fault"`).

### Anomaly detection inside the ingest transaction

Anomalies are detected and persisted in the same transaction as the telemetry event itself. This means there is no window in which a telemetry event exists in the database without its associated anomalies.

### In-process fleet state cache

`GET /fleet/state` aggregates status counts across all vehicles. Under high read rates this would re-run the GROUP BY query on every request. A 2-second module-level cache avoids that while keeping data fresh enough for operational dashboards. The cache is bypassed entirely in tests via a `reset_fleet_cache()` call in the `autouse` fixture.

### Timestamp validation

Telemetry timestamps must not be in the future (with a 5-second grace window to tolerate minor clock skew between vehicle hardware and the server). Timestamps well in the past are accepted — vehicles can send delayed events from offline periods.

### Zone counters

Zone entry counts are incremented with a SQL `UPDATE zones SET entry_count = entry_count + 1` rather than a read-modify-write in Python. The database performs the arithmetic atomically within the transaction, preventing a lost-update race when multiple vehicles enter the same zone at the same time.

---

## Running the API

### Prerequisites

- Python 3.12+
- A virtual environment

### Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Start the server

```bash
uvicorn fleet_telemetry.main:app --reload
```

The server starts on `http://127.0.0.1:8000`. On first startup it creates the SQLite database (`fleet_telemetry.db`) and seeds the 20 warehouse zones.

### Configuration

All settings are read from environment variables prefixed with `FLEET_`:

| Variable | Default | Description |
|---|---|---|
| `FLEET_DATABASE_URL` | `sqlite+aiosqlite:///./fleet_telemetry.db` | SQLAlchemy async database URL |
| `FLEET_LOW_BATTERY_PCT` | `15.0` | Battery % below which a `low_battery` anomaly is raised |
| `FLEET_CRITICAL_BATTERY_PCT` | `5.0` | Battery % below which a `critical_battery` anomaly is raised |
| `FLEET_OVERSPEED_MPS` | `5.0` | Speed (m/s) above which an `overspeed` anomaly is raised |
| `FLEET_MOVING_WITH_FAULT_SPEED_MPS` | `0.1` | Speed threshold for a `moving_with_fault` anomaly |
| `FLEET_STALE_VEHICLE_SECONDS` | `30` | Gap between events (seconds) that triggers a `stale_vehicle` anomaly |
| `FLEET_CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |

### Interactive API docs

FastAPI's built-in docs are available at `http://127.0.0.1:8000/docs` (Swagger UI) and `http://127.0.0.1:8000/redoc`.

---

## Running the tests

```bash
source .venv/bin/activate
pytest fleet_telemetry/tests/
```

Each test runs against an in-memory SQLite database spun up in a lifespan fixture — no external services required. The full suite (88 tests) completes in roughly 15 seconds.

To run a specific test file:

```bash
pytest fleet_telemetry/tests/test_validation.py -v
```

### Test files

| File | Coverage |
|---|---|
| `test_telemetry.py` | Ingest endpoint, concurrent bursts, state consistency across waves |
| `test_validation.py` | Every input field — boundaries, nulls, invalid types, future timestamps |
| `test_anomalies.py` | Anomaly query filters (vehicle, time range, combined), limit, ordering |
| `test_zones.py` | Zone entry counting, concurrent convergence, cross-zone isolation |
| `test_fault.py` | Fault transition atomicity, mission cancellation, maintenance record creation |

---

## Load testing with Locust

Three Locust scripts are in the `locust/` directory. Start the API first, then run any script headlessly or open the web UI.

```bash
# Headless (60-second run, 80 concurrent users)
locust -f locust/locustfile_telemetry.py \
  --host http://127.0.0.1:8000 \
  --headless -u 80 -r 20 --run-time 60s

# Interactive web UI at http://localhost:8089
locust -f locust/locustfile_telemetry.py --host http://127.0.0.1:8000
```

| Script | What it validates |
|---|---|
| `locustfile_telemetry.py` | Concurrent POST bursts; structural correctness of fleet state, zones, and anomaly responses. Seeds the dashboard with 51 realistic vehicles after the run. |
| `locustfile_fleet.py` | 10:1 reader-to-writer ratio; fleet state structural validity under high read concurrency |
| `locustfile_fault.py` | Concurrent fault signals for the same vehicle; verifies exactly one maintenance record is created per vehicle |

---

## Endpoints

### `POST /telemetry`

Ingests a telemetry event from a vehicle. Creates or updates the vehicle record, increments the zone entry counter if a zone was entered, runs anomaly detection, and handles the fault transition if the status is `"fault"`. All writes are committed in a single `BEGIN IMMEDIATE` transaction.

**Request body**

| Field | Type | Constraints |
|---|---|---|
| `vehicle_id` | string | Required, non-empty |
| `timestamp` | datetime (ISO 8601) | Required, must not be more than 5 seconds in the future |
| `lat` | float | −90 to 90 inclusive |
| `lon` | float | −180 to 180 inclusive |
| `battery_pct` | float | 0 to 100 inclusive |
| `speed_mps` | float | ≥ 0 |
| `status` | string | One of `idle`, `moving`, `charging`, `fault` |
| `error_codes` | list of strings | Optional, defaults to `[]` |
| `zone_entered` | string or null | Optional; must be one of the 20 registered zone IDs if provided |

**Response `200`**

```json
{
  "status": "ok",
  "anomalies_detected": 1
}
```

**Anomaly types**

| Type | Trigger | Why |
|---|---|---|
| `zero_battery` | `battery_pct == 0.0` | Completely discharged or sensor failure — requires immediate attention regardless of cause |
| `critical_battery` | `battery_pct < 5.0` | Vehicle at imminent risk of stranding, potentially blocking a corridor or dock |
| `low_battery` | `battery_pct < 15.0` | May not have enough charge to complete its mission and reach a charging bay; early warning lets dispatch reroute proactively |
| `boundary_coordinates` | `lat == ±90` or `lon == ±180` | GPS sentinel value or calibration failure — not a real position |
| `overspeed` | `speed_mps > 5.0` | 5 m/s (18 km/h) is the industrial floor safety limit on a shared floor with personnel |
| `moving_with_fault` | `status == "fault"` and `speed_mps > 0.1` | A faulted vehicle should fail safe and stop; continued motion means the fault did not halt the vehicle as expected |
| `unexpected_error_codes` | `error_codes` non-empty but `status != "fault"` | Error codes outside of fault status indicate a firmware reporting bug or an escalating fault the vehicle hasn't surfaced yet |
| `stale_vehicle` | Gap from previous event exceeds 30 seconds | At 1 Hz nominal telemetry, 30+ missed cycles is a strong signal of a connectivity or onboard-system failure |

Thresholds are configurable via environment variables (see Configuration).

**Errors**

- `422 Unprocessable Entity` — validation failure; the response body lists each invalid field with a reason.

---

### `GET /vehicles`

Returns a paginated list of vehicles with their latest known state.

**Query parameters**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `limit` | int | 50 | 1–100 |
| `offset` | int | 0 | ≥ 0 |

**Response `200`**

```json
{
  "vehicles": [
    {
      "vehicle_id": "v-001",
      "status": "moving",
      "battery_pct": 72.5,
      "lat": 51.5074,
      "lon": -0.1278,
      "speed_mps": 3.2,
      "last_seen": "2024-01-15T09:23:41Z"
    }
  ],
  "total": 51,
  "limit": 50,
  "offset": 0
}
```

---

### `GET /zones/counts`

Returns entry counts for all 20 registered warehouse zones, ordered alphabetically by zone ID.

**Response `200`**

```json
{
  "zones": [
    { "zone_id": "aisle_a", "entry_count": 14 },
    { "zone_id": "aisle_b", "entry_count": 7 }
  ]
}
```

---

### `GET /anomalies`

Returns detected anomalies, newest first. Supports filtering by vehicle and time window.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `vehicle_id` | string | Filter to anomalies for a specific vehicle |
| `from_ts` | datetime | Return only anomalies detected at or after this time |
| `to_ts` | datetime | Return only anomalies detected at or before this time |
| `limit` | int | Maximum results to return (default 100, max 1000) |

**Response `200`**

```json
[
  {
    "id": 42,
    "vehicle_id": "v-001",
    "detected_at": "2024-01-15T09:23:41Z",
    "anomaly_type": "low_battery",
    "details": { "battery_pct": 12.3, "threshold": 15.0 },
    "telemetry_event_id": 198
  }
]
```

---

### `GET /fleet/state`

Returns current per-status vehicle counts across the entire fleet. Results are cached in process for 2 seconds to reduce database load under high read concurrency.

**Response `200`**

```json
{
  "counts": {
    "idle": 15,
    "moving": 22,
    "charging": 10,
    "fault": 4
  },
  "total": 51,
  "as_of": "2024-01-15T09:23:42Z"
}
```

---

### `GET /health`

Liveness and database connectivity check. Returns `200` if the application is running and can reach the database.

**Response `200`**

```json
{
  "status": "ok",
  "db": "ok",
  "timestamp": "2024-01-15T09:23:42Z"
}
```

---

## Project structure

```
tms/API/
├── fleet_telemetry/
│   ├── main.py              # App factory, lifespan (DB init + zone seed), CORS
│   ├── config.py            # Pydantic settings, env variable bindings
│   ├── constants.py         # ZONES list (source of truth for valid zone IDs)
│   ├── database.py          # Async engine, session factory, SQLite pragmas, BEGIN IMMEDIATE
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas, field validators
│   ├── routers/
│   │   ├── telemetry.py     # POST /telemetry
│   │   ├── vehicles.py      # GET /vehicles
│   │   ├── zones.py         # GET /zones/counts
│   │   ├── anomalies.py     # GET /anomalies
│   │   └── fleet.py         # GET /fleet/state, GET /health
│   └── services/
│       ├── anomaly.py       # Anomaly detection pipeline
│       └── fault_handler.py # Atomic mission cancellation + maintenance record
└── locust/
    ├── locustfile_telemetry.py  # Concurrent POST bursts + dashboard seed
    ├── locustfile_fleet.py      # High read-concurrency fleet state test
    └── locustfile_fault.py      # Fault transition atomicity test
```
