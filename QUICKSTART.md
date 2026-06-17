# Fleet Telemetry System — Quick Start

This guide covers running both the API and the Dashboard.

<img width="1785" height="954" alt="image" src="https://github.com/user-attachments/assets/e05fbf8b-e857-4172-9e53-85b1d202462f" />

<img width="1781" height="553" alt="image" src="https://github.com/user-attachments/assets/2d8f17ee-e707-421a-a459-9d05c394fbe0" />


## Architecture

```
┌─────────────────────────────────────────────┐
│ React Dashboard (port 3000)                 │
│ - Vehicle table (pagination, sort, filter)  │
│ - Zone entry counts (live, alphabetical)    │
│ - Anomaly feed (2 views, sort, tooltip)     │
│ - Configurable polling (2s / 3s / 5s)      │
│ - Dark mode · Offline overlay               │
└────────────────────┬────────────────────────┘
                     │ HTTP polling
                     ↓
┌─────────────────────────────────────────────┐
│ FastAPI Backend (port 8000)                 │
│ - POST /telemetry                           │
│ - GET  /vehicles                            │
│ - GET  /zones/counts                        │
│ - GET  /anomalies                           │
│ - GET  /fleet/state                         │
│ - GET  /health                              │
└────────────────────┬────────────────────────┘
                     │ SQLite + WAL
                     ↓
            ┌────────────────┐
            │ fleet_...db    │
            └────────────────┘
```

---

## Prerequisites

- Python 3.12+
- Node.js 18+

---

## Part 1 — API

All commands run from the **`API/`** directory.

### Install

```bash
cd API
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run

```bash
uvicorn fleet_telemetry.main:app --reload --port 8000
```

On first startup the database is created and the 20 warehouse zones are seeded automatically. Verify:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","db":"ok","timestamp":"..."}
```

### Test

```bash
source .venv/bin/activate
python3 -m pytest fleet_telemetry/tests/
# 88 passed
```

### Reset the database

The schema is created automatically on first startup — no manual migration step is needed. To wipe and start fresh:

```bash
rm -f fleet_telemetry.db fleet_telemetry.db-wal fleet_telemetry.db-shm
uvicorn fleet_telemetry.main:app --port 8000
# schema and zones are re-seeded on next startup
```

---

## Part 2 — Dashboard

All commands run from the **`Dashboard/`** directory.

### Install

```bash
cd Dashboard
npm install
```

### Configure

Check that `.env` exists:

```bash
cat .env
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

If missing:

```bash
cp .env.example .env
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

### Test

```bash
npm run test
# 23 passed
```

### Production build

```bash
npm run build
# output → dist/
```

Set `VITE_API_BASE_URL` to your production backend URL before building.

---

## Part 3 — Send telemetry (cURL)

```bash
curl -X POST http://127.0.0.1:8000/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "v-01",
    "timestamp": "2026-06-17T12:00:00Z",
    "lat": 40.7128,
    "lon": -74.0060,
    "battery_pct": 75,
    "speed_mps": 2.5,
    "status": "moving",
    "error_codes": [],
    "zone_entered": "pack_station"
  }'
```

```bash
# Query endpoints
curl http://127.0.0.1:8000/vehicles
curl http://127.0.0.1:8000/zones/counts
curl "http://127.0.0.1:8000/anomalies?limit=10"
curl http://127.0.0.1:8000/fleet/state
```

---

## Part 4 — Load testing

Start the API first, then:

```bash
cd API
source .venv/bin/activate

# Headless — 80 concurrent users, 60 s
locust -f locust/locustfile_telemetry.py \
  --host http://127.0.0.1:8000 \
  --headless -u 80 -r 20 --run-time 60s

# Interactive UI at http://localhost:8089
locust -f locust/locustfile_telemetry.py --host http://127.0.0.1:8000
```

The telemetry script seeds 51 realistic vehicles into the dashboard at the end of each run.

---

## Troubleshooting

**Dashboard shows "Backend Unreachable" overlay**
1. Confirm the API is running: `curl http://127.0.0.1:8000/health`
2. Check `.env` points to the correct URL
3. Check the browser console for CORS errors

**Port conflict**
```bash
# API on a different port
uvicorn fleet_telemetry.main:app --port 8001

# Update Dashboard .env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

**Tests fail after moving directories**
```bash
# Backend — always run from API/
cd API && source .venv/bin/activate && python3 -m pytest fleet_telemetry/tests/

# Dashboard — always run from Dashboard/
cd Dashboard && npm run test
```

---

## Project structure

```
tms/
├── API/
│   ├── fleet_telemetry/     # Python package
│   │   ├── routers/         # Endpoint handlers
│   │   ├── services/        # Anomaly detection, fault handler
│   │   ├── models.py        # SQLAlchemy ORM
│   │   ├── schemas.py       # Pydantic validators
│   │   └── tests/           # 88 async tests
│   ├── locust/              # Load test scripts
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── requirements.txt
│   └── README.md
└── Dashboard/
    ├── src/
    │   ├── components/      # VehicleGrid, AnomalyFeed, ZonePanel, …
    │   ├── hooks/           # Data-fetching hooks
    │   ├── store/           # Zustand UI state
    │   └── utils/           # Anomaly formatters
    ├── package.json
    └── README.md
```
