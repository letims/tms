"""
Locust load test – concurrent POST telemetry bursts.

Simulates many vehicles firing unique telemetry payloads simultaneously and
validates that data written to the server is consistent with what is read back
via the public read endpoints.

Run:
    locust -f locust/locustfile_telemetry.py --host http://127.0.0.1:8000

Then open http://localhost:8089 to use the real-time web UI.

For a headless CI run:
    locust -f locust/locustfile_telemetry.py \
           --host http://127.0.0.1:8000 \
           --headless -u 100 -r 20 --run-time 60s \
           --csv locust/results/telemetry
"""

import random
import threading
import uuid
from datetime import datetime, timedelta, timezone

import requests
from locust import HttpUser, between, events, task

# ── module-level counters shared across all users ────────────────────────────
_lock = threading.Lock()
_posted_vehicle_ids: set[str] = set()
_post_ok_count: int = 0
_post_fail_count: int = 0

ZONES = [
    "inbound_dock_a", "inbound_dock_b", "receiving_staging",
    "aisle_a", "aisle_b", "aisle_c",
    "high_bay_1", "high_bay_2", "bulk_storage",
    "pick_zone_1", "pick_zone_2", "pack_station", "sort_belt",
    "outbound_dock_a", "outbound_dock_b", "shipping_staging",
    "charging_bay_1", "charging_bay_2", "charging_bay_3", "maintenance_bay",
]
STATUSES = ["idle", "moving", "charging", "fault"]


def _make_payload(vehicle_id: str) -> dict:
    return {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": round(random.uniform(-89.0, 89.0), 6),
        "lon": round(random.uniform(-179.0, 179.0), 6),
        "battery_pct": round(random.uniform(20.0, 100.0), 2),
        "speed_mps": round(random.uniform(0.0, 4.9), 2),
        "status": random.choice(["idle", "moving", "charging"]),
        "error_codes": [],
        "zone_entered": random.choice(ZONES + [None, None, None]),  # 25 % zone entries
    }


class TelemetryVehicle(HttpUser):
    """Each Locust user simulates one vehicle sending telemetry at a fixed rate."""

    wait_time = between(0.5, 2.0)

    def on_start(self):
        # Each user gets a stable vehicle_id for its lifetime
        self.vehicle_id = f"locust-{uuid.uuid4().hex[:8]}"

    @task(10)
    def post_telemetry(self):
        global _post_ok_count, _post_fail_count

        payload = _make_payload(self.vehicle_id)
        with self.client.post(
            "/telemetry",
            json=payload,
            catch_response=True,
            name="/telemetry [POST]",
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                if body.get("status") != "ok":
                    resp.failure(f"Unexpected body: {body}")
                    with _lock:
                        _post_fail_count += 1
                else:
                    resp.success()
                    with _lock:
                        _posted_vehicle_ids.add(self.vehicle_id)
                        _post_ok_count += 1
            else:
                resp.failure(f"HTTP {resp.status_code}")
                with _lock:
                    _post_fail_count += 1

    @task(2)
    def validate_fleet_state(self):
        """Structural check: sum(counts) must equal total, all counts non-negative,
        and all four expected status keys must be present."""
        with self.client.get(
            "/fleet/state",
            catch_response=True,
            name="/fleet/state [validate]",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
                return
            body = resp.json()
            counts = body.get("counts", {})
            total = body.get("total", -1)

            if set(counts.keys()) != {"idle", "moving", "charging", "fault"}:
                resp.failure(f"Unexpected status keys: {set(counts.keys())}")
                return
            if any(v < 0 for v in counts.values()):
                resp.failure(f"Negative count detected: {counts}")
                return
            if sum(counts.values()) != total:
                resp.failure(
                    f"sum(counts)={sum(counts.values())} != total={total}: "
                    "aggregate inconsistency"
                )
                return
            resp.success()

    @task(1)
    def validate_zone_counts(self):
        """Zone counts endpoint must return all 20 zones with non-negative counts."""
        with self.client.get(
            "/zones/counts",
            catch_response=True,
            name="/zones/counts [validate]",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
                return
            zones = resp.json().get("zones", [])
            if len(zones) != 20:
                resp.failure(f"Expected 20 zones, got {len(zones)}")
                return
            if any(z["entry_count"] < 0 for z in zones):
                resp.failure("Negative entry_count detected – DB corruption")
                return
            resp.success()

    @task(1)
    def validate_anomalies_readable(self):
        """The anomalies endpoint must respond 200 and return a list."""
        with self.client.get(
            "/anomalies",
            params={"vehicle_id": self.vehicle_id, "limit": 10},
            catch_response=True,
            name="/anomalies [validate]",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
                return
            if not isinstance(resp.json(), list):
                resp.failure("Response is not a list")
                return
            resp.success()


# ── end-of-test summary printed to stdout ────────────────────────────────────

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    with _lock:
        ok = _post_ok_count
        fail = _post_fail_count
        unique_vehicles = len(_posted_vehicle_ids)

    print("\n" + "=" * 60)
    print("TELEMETRY BURST VALIDATION SUMMARY")
    print("=" * 60)
    print(f"  Successful POSTs : {ok}")
    print(f"  Failed POSTs     : {fail}")
    print(f"  Unique vehicles  : {unique_vehicles}")
    if ok + fail > 0:
        success_rate = ok / (ok + fail) * 100
        print(f"  Success rate     : {success_rate:.1f}%")
    print("=" * 60 + "\n")

    _seed_dashboard(environment)


def _seed_dashboard(environment):
    """
    POST realistic seed data so the dashboard shows a populated, meaningful view
    immediately after the Locust run completes.

    50 named vehicles covering all statuses, varied battery levels, zone entries,
    and anomaly-triggering events (low battery, fault, boundary GPS).
    """
    base_url = environment.host.rstrip("/")
    session = requests.Session()

    now = datetime.now(timezone.utc)

    # Distribute 50 vehicles: 15 moving, 15 idle, 12 charging, 8 fault
    vehicle_profiles = (
        [("moving", 65, 3.5, None)] * 5
        + [("moving", 45, 2.0, "aisle_a")] * 3
        + [("moving", 78, 4.1, "pick_zone_1")] * 3
        + [("moving", 30, 1.5, "aisle_b")] * 2
        + [("moving", 88, 3.8, "outbound_dock_a")] * 2
        + [("idle", 72, 0.0, "shipping_staging")] * 3
        + [("idle", 55, 0.0, None)] * 4
        + [("idle", 20, 0.0, "receiving_staging")] * 3  # low battery → anomaly
        + [("idle", 92, 0.0, "sort_belt")] * 3
        + [("idle", 8, 0.0, None)] * 2   # critical battery → anomaly
        + [("charging", 15, 0.0, "charging_bay_1")] * 4
        + [("charging", 40, 0.0, "charging_bay_2")] * 4
        + [("charging", 5, 0.0, "charging_bay_3")] * 4   # charging from low
        + [("fault", 35, 0.0, "maintenance_bay")] * 4
        + [("fault", 12, 0.0, None)] * 4   # fault + low battery
    )

    print("\n" + "=" * 60)
    print("SEEDING DASHBOARD DATA")
    print("=" * 60)

    ok = 0
    errors = 0
    for i, (status, battery, speed, zone) in enumerate(vehicle_profiles):
        vehicle_id = f"seed-v{i + 1:03d}"
        # Spread timestamps slightly so the feed shows a timeline
        ts = now - timedelta(seconds=i * 2)

        payload = {
            "vehicle_id": vehicle_id,
            "timestamp": ts.isoformat(),
            "lat": round(random.uniform(-89.0, 89.0), 5),
            "lon": round(random.uniform(-179.0, 179.0), 5),
            "battery_pct": float(battery),
            "speed_mps": float(speed),
            "status": status,
            "error_codes": ["E_FAULT_01"] if status == "fault" else [],
            "zone_entered": zone,
        }

        try:
            resp = session.post(f"{base_url}/telemetry", json=payload, timeout=10)
            if resp.status_code == 200:
                ok += 1
            else:
                errors += 1
                print(f"  [WARN] {vehicle_id}: HTTP {resp.status_code} – {resp.text[:80]}")
        except Exception as exc:
            errors += 1
            print(f"  [ERR]  {vehicle_id}: {exc}")

    # One vehicle at GPS boundary to trigger boundary_coordinates anomaly
    boundary_payload = {
        "vehicle_id": "seed-boundary",
        "timestamp": now.isoformat(),
        "lat": 90.0,
        "lon": 0.0,
        "battery_pct": 60.0,
        "speed_mps": 0.0,
        "status": "idle",
        "error_codes": [],
        "zone_entered": None,
    }
    try:
        resp = session.post(f"{base_url}/telemetry", json=boundary_payload, timeout=10)
        if resp.status_code == 200:
            ok += 1
        else:
            errors += 1
    except Exception:
        errors += 1

    print(f"  Seeded vehicles  : {ok} ok, {errors} errors")
    print("=" * 60 + "\n")
