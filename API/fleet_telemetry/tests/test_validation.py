"""
Thorough input validation tests for the /telemetry endpoint.

Covers every field: allowed boundaries, rejected out-of-range values,
null / missing values, type errors, and the custom zone_entered validator.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NOW = datetime.now(timezone.utc).isoformat()

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def valid_payload(**overrides) -> dict:
    base = {
        "vehicle_id": "v-01",
        "timestamp": NOW,
        "lat": 40.0,
        "lon": -74.0,
        "battery_pct": 80.0,
        "speed_mps": 1.0,
        "status": "moving",
        "error_codes": [],
        "zone_entered": None,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# vehicle_id
# ---------------------------------------------------------------------------

async def test_vehicle_id_empty_string_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(vehicle_id=""))
    assert r.status_code == 422


async def test_vehicle_id_null_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(vehicle_id=None))
    assert r.status_code == 422


async def test_vehicle_id_missing_rejected(client: AsyncClient):
    payload = valid_payload()
    del payload["vehicle_id"]
    r = await client.post("/telemetry", json=payload)
    assert r.status_code == 422


async def test_vehicle_id_numeric_string_accepted(client: AsyncClient):
    """Numeric string is still a valid non-empty string."""
    r = await client.post("/telemetry", json=valid_payload(vehicle_id="12345"))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# timestamp
# ---------------------------------------------------------------------------

async def test_timestamp_null_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(timestamp=None))
    assert r.status_code == 422


async def test_timestamp_missing_rejected(client: AsyncClient):
    payload = valid_payload()
    del payload["timestamp"]
    r = await client.post("/telemetry", json=payload)
    assert r.status_code == 422


async def test_timestamp_garbage_string_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(timestamp="not-a-date"))
    assert r.status_code == 422


async def test_timestamp_boolean_rejected(client: AsyncClient):
    """True/False are not valid timestamps (Pydantic accepts ints as unix epoch,
    but booleans cannot be meaningfully coerced to a datetime)."""
    r = await client.post("/telemetry", json=valid_payload(timestamp=True))
    assert r.status_code == 422


async def test_timestamp_far_future_rejected(client: AsyncClient):
    """Timestamps more than 5 seconds in the future must be rejected."""
    future = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    r = await client.post("/telemetry", json=valid_payload(timestamp=future))
    assert r.status_code == 422


async def test_timestamp_slightly_future_within_grace_accepted(client: AsyncClient):
    """Timestamps within the 5-second clock-skew grace window are accepted."""
    near_future = (datetime.now(timezone.utc) + timedelta(seconds=3)).isoformat()
    r = await client.post("/telemetry", json=valid_payload(timestamp=near_future))
    assert r.status_code == 200


async def test_timestamp_past_accepted(client: AsyncClient):
    """Timestamps well in the past are valid."""
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r = await client.post("/telemetry", json=valid_payload(timestamp=past))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# lat / lon
# ---------------------------------------------------------------------------

async def test_lat_above_90_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lat=90.001))
    assert r.status_code == 422


async def test_lat_below_minus_90_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lat=-90.001))
    assert r.status_code == 422


async def test_lat_at_plus_90_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lat=90.0))
    assert r.status_code == 200


async def test_lat_at_minus_90_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lat=-90.0))
    assert r.status_code == 200


async def test_lon_above_180_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lon=180.001))
    assert r.status_code == 422


async def test_lon_below_minus_180_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lon=-180.001))
    assert r.status_code == 422


async def test_lon_at_plus_180_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lon=180.0))
    assert r.status_code == 200


async def test_lon_at_minus_180_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lon=-180.0))
    assert r.status_code == 200


async def test_lat_null_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lat=None))
    assert r.status_code == 422


async def test_lon_null_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(lon=None))
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# battery_pct
# ---------------------------------------------------------------------------

async def test_battery_above_100_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(battery_pct=100.001))
    assert r.status_code == 422


async def test_battery_below_0_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(battery_pct=-0.001))
    assert r.status_code == 422


async def test_battery_at_100_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(battery_pct=100.0))
    assert r.status_code == 200


async def test_battery_at_0_accepted_and_creates_zero_battery_anomaly(client: AsyncClient):
    """battery_pct == 0 is structurally valid but triggers a zero_battery anomaly."""
    r = await client.post("/telemetry", json=valid_payload(battery_pct=0.0, vehicle_id="zero-bat"))
    assert r.status_code == 200
    assert r.json()["anomalies_detected"] >= 1

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "zero-bat"})).json()
    assert any(a["anomaly_type"] == "zero_battery" for a in anomalies)


async def test_battery_null_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(battery_pct=None))
    assert r.status_code == 422


async def test_battery_string_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(battery_pct="full"))
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("status", ["idle", "moving", "charging", "fault"])
async def test_valid_statuses_accepted(client: AsyncClient, status: str):
    r = await client.post("/telemetry", json=valid_payload(status=status))
    assert r.status_code == 200


@pytest.mark.parametrize("bad_status", ["stopped", "MOVING", "error", "unknown", "", "0", None])
async def test_invalid_status_rejected(client: AsyncClient, bad_status):
    r = await client.post("/telemetry", json=valid_payload(status=bad_status))
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# error_codes
# ---------------------------------------------------------------------------

async def test_error_codes_list_of_strings_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(error_codes=["E01", "E42"]))
    assert r.status_code == 200


async def test_error_codes_empty_list_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(error_codes=[]))
    assert r.status_code == 200


async def test_error_codes_not_a_list_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(error_codes="E01"))
    assert r.status_code == 422


async def test_error_codes_list_of_integers_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(error_codes=[1, 2, 3]))
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# zone_entered
# ---------------------------------------------------------------------------

async def test_zone_entered_valid_zone_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(zone_entered="charging_bay_1"))
    assert r.status_code == 200


async def test_zone_entered_null_accepted(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(zone_entered=None))
    assert r.status_code == 200


async def test_zone_entered_unknown_zone_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(zone_entered="cafeteria"))
    assert r.status_code == 422


async def test_zone_entered_empty_string_rejected(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(zone_entered=""))
    assert r.status_code == 422


async def test_zone_entered_all_valid_zones_accepted(client: AsyncClient):
    from fleet_telemetry.constants import ZONES

    for zone in ZONES:
        r = await client.post(
            "/telemetry",
            json=valid_payload(vehicle_id=f"probe-{zone}", zone_entered=zone),
        )
        assert r.status_code == 200, f"Expected 200 for zone '{zone}', got {r.status_code}"


# ---------------------------------------------------------------------------
# Boundary-value anomaly detection
# ---------------------------------------------------------------------------

async def test_lat_at_90_creates_boundary_coordinates_anomaly(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(vehicle_id="gps-v1", lat=90.0))
    assert r.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "gps-v1"})).json()
    assert any(a["anomaly_type"] == "boundary_coordinates" for a in anomalies)


async def test_lon_at_180_creates_boundary_coordinates_anomaly(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(vehicle_id="gps-v2", lon=180.0))
    assert r.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "gps-v2"})).json()
    assert any(a["anomaly_type"] == "boundary_coordinates" for a in anomalies)


async def test_lat_at_minus_90_creates_boundary_coordinates_anomaly(client: AsyncClient):
    r = await client.post("/telemetry", json=valid_payload(vehicle_id="gps-v3", lat=-90.0))
    assert r.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "gps-v3"})).json()
    assert any(a["anomaly_type"] == "boundary_coordinates" for a in anomalies)
