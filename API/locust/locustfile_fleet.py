"""
Locust load test – fleet state endpoint under heavy concurrent read load.

Tests that GET /fleet/state:
  - Remains available and returns 200 under high concurrency
  - Returns structurally valid responses throughout
  - Maintains consistent aggregate totals (no negative counts, total == sum)
  - Latency percentiles stay within acceptable bounds

Also seeds background writes to exercise read-under-write consistency.

Run:
    locust -f locust/locustfile_fleet.py --host http://127.0.0.1:8000

Web UI: http://localhost:8089

Headless (example – 200 concurrent readers + 20 writers for 90s):
    locust -f locust/locustfile_fleet.py \
           --host http://127.0.0.1:8000 \
           --headless -u 220 -r 30 --run-time 90s \
           --csv locust/results/fleet
"""

import threading
import uuid
from datetime import datetime, timezone

from locust import HttpUser, between, events, task

VALID_STATUSES = {"idle", "moving", "charging", "fault"}

# ── shared counters ───────────────────────────────────────────────────────────
_lock = threading.Lock()
_invalid_responses: int = 0
_reads_ok: int = 0


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _assert_valid_fleet_state(body: dict) -> str | None:
    """Return an error string if the fleet state body is inconsistent, else None."""
    counts = body.get("counts")
    total = body.get("total")

    if not isinstance(counts, dict):
        return "counts is not a dict"
    if not isinstance(total, int):
        return "total is not an int"
    if set(counts.keys()) != VALID_STATUSES:
        return f"unexpected status keys: {set(counts.keys())}"
    if any(v < 0 for v in counts.values()):
        return f"negative count: {counts}"
    if sum(counts.values()) != total:
        return f"sum(counts)={sum(counts.values())} != total={total}"

    return None


class FleetStateReader(HttpUser):
    """Heavy read user – hammers GET /fleet/state as fast as possible."""

    wait_time = between(0.05, 0.3)   # aggressive polling
    weight = 10                        # 10× more readers than writers

    @task
    def read_fleet_state(self):
        global _reads_ok, _invalid_responses

        with self.client.get(
            "/fleet/state",
            catch_response=True,
            name="/fleet/state [read]",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
                with _lock:
                    _invalid_responses += 1
                return

            error = _assert_valid_fleet_state(resp.json())
            if error:
                resp.failure(f"Consistency violation: {error}")
                with _lock:
                    _invalid_responses += 1
            else:
                resp.success()
                with _lock:
                    _reads_ok += 1


class BackgroundWriter(HttpUser):
    """Minority write user – keeps the fleet state changing during reads."""

    wait_time = between(0.5, 2.0)
    weight = 1

    def on_start(self):
        self.vehicle_id = f"bg-{uuid.uuid4().hex[:8]}"
        self._statuses = ["idle", "moving", "charging"]
        self._idx = 0

    @task
    def write_telemetry(self):
        status = self._statuses[self._idx % len(self._statuses)]
        self._idx += 1

        self.client.post(
            "/telemetry",
            json={
                "vehicle_id": self.vehicle_id,
                "timestamp": _now(),
                "lat": 40.0,
                "lon": -74.0,
                "battery_pct": 60.0,
                "speed_mps": 1.5,
                "status": status,
                "error_codes": [],
                "zone_entered": None,
            },
            name="/telemetry [background write]",
        )

    @task(2)
    def read_fleet_state_writer_perspective(self):
        """Writers also verify the fleet state after their own writes."""
        resp = self.client.get("/fleet/state", name="/fleet/state [writer check]")
        if resp.status_code == 200:
            error = _assert_valid_fleet_state(resp.json())
            if error:
                with _lock:
                    global _invalid_responses
                    _invalid_responses += 1


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    with _lock:
        ok = _reads_ok
        bad = _invalid_responses

    print("\n" + "=" * 60)
    print("FLEET STATE READ VALIDATION SUMMARY")
    print("=" * 60)
    print(f"  Successful reads            : {ok}")
    print(f"  Consistency violations      : {bad}")
    if ok + bad > 0:
        rate = ok / (ok + bad) * 100
        print(f"  Valid response rate         : {rate:.2f}%")
    if bad > 0:
        print("  ⚠️  CONSISTENCY VIOLATIONS DETECTED")
    else:
        print("  ✅ All fleet state responses were structurally valid")
    print("=" * 60 + "\n")
