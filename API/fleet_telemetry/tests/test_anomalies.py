"""
Tests for the GET /anomalies endpoint: all filter combinations, edge cases,
ordering, and limit behaviour.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

NOW = datetime.now(timezone.utc)


def telemetry_payload(vehicle_id: str, **overrides) -> dict:
    base = {
        "vehicle_id": vehicle_id,
        "timestamp": NOW.isoformat(),
        "lat": 1.0,
        "lon": 2.0,
        "battery_pct": 10.0,   # low battery → produces an anomaly
        "speed_mps": 1.0,
        "status": "moving",
        "error_codes": [],
        "zone_entered": None,
    }
    base.update(overrides)
    return base


async def _seed_anomalies(client: AsyncClient):
    """Post three vehicles each producing one low-battery anomaly at distinct times."""
    for i, vid in enumerate(["a-01", "a-02", "a-03"]):
        # Use past timestamps (offset backwards) so future-timestamp validation passes.
        ts = NOW - timedelta(seconds=(2 - i) * 10)
        await client.post("/telemetry", json=telemetry_payload(vid, timestamp=ts.isoformat()))


# ---------------------------------------------------------------------------
# filter: vehicle_id
# ---------------------------------------------------------------------------

async def test_filter_by_vehicle_id_returns_only_that_vehicle(client: AsyncClient):
    await _seed_anomalies(client)

    r = await client.get("/anomalies", params={"vehicle_id": "a-01"})
    assert r.status_code == 200
    results = r.json()
    assert len(results) >= 1
    assert all(a["vehicle_id"] == "a-01" for a in results)


async def test_filter_by_vehicle_id_unknown_vehicle_returns_empty(client: AsyncClient):
    await _seed_anomalies(client)

    r = await client.get("/anomalies", params={"vehicle_id": "nonexistent-99"})
    assert r.status_code == 200
    assert r.json() == []


async def test_no_filter_returns_all_vehicles_anomalies(client: AsyncClient):
    await _seed_anomalies(client)

    r = await client.get("/anomalies")
    assert r.status_code == 200
    vehicle_ids = {a["vehicle_id"] for a in r.json()}
    assert {"a-01", "a-02", "a-03"}.issubset(vehicle_ids)


# ---------------------------------------------------------------------------
# filter: from_ts
# ---------------------------------------------------------------------------

async def test_filter_from_ts_excludes_earlier_anomalies(client: AsyncClient):
    await _seed_anomalies(client)

    # a-01 at NOW-20s, a-02 at NOW-10s, a-03 at NOW.
    # cutoff at NOW-15s: a-01 excluded, a-02 and a-03 included.
    cutoff = (NOW - timedelta(seconds=15)).isoformat()
    r = await client.get("/anomalies", params={"from_ts": cutoff})
    assert r.status_code == 200

    returned_ids = {a["vehicle_id"] for a in r.json()}
    assert "a-01" not in returned_ids
    assert "a-02" in returned_ids or "a-03" in returned_ids


async def test_filter_from_ts_future_returns_empty(client: AsyncClient):
    await _seed_anomalies(client)

    future = (NOW + timedelta(hours=1)).isoformat()
    r = await client.get("/anomalies", params={"from_ts": future})
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# filter: to_ts
# ---------------------------------------------------------------------------

async def test_filter_to_ts_excludes_later_anomalies(client: AsyncClient):
    await _seed_anomalies(client)

    # cutoff at NOW-15s: a-01 (NOW-20s) included, a-02 and a-03 excluded.
    cutoff = (NOW - timedelta(seconds=15)).isoformat()
    r = await client.get("/anomalies", params={"to_ts": cutoff})
    assert r.status_code == 200

    returned_ids = {a["vehicle_id"] for a in r.json()}
    assert "a-01" in returned_ids
    assert "a-03" not in returned_ids


async def test_filter_to_ts_past_returns_empty(client: AsyncClient):
    await _seed_anomalies(client)

    past = (NOW - timedelta(hours=1)).isoformat()
    r = await client.get("/anomalies", params={"to_ts": past})
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# filter: from_ts + to_ts combined
# ---------------------------------------------------------------------------

async def test_filter_time_range_returns_only_anomalies_in_window(client: AsyncClient):
    await _seed_anomalies(client)

    # Window: NOW-15s to NOW-5s — only a-02 (NOW-10s) falls inside.
    from_ts = (NOW - timedelta(seconds=15)).isoformat()
    to_ts = (NOW - timedelta(seconds=5)).isoformat()
    r = await client.get("/anomalies", params={"from_ts": from_ts, "to_ts": to_ts})
    assert r.status_code == 200

    returned_ids = {a["vehicle_id"] for a in r.json()}
    assert "a-02" in returned_ids
    assert "a-01" not in returned_ids
    assert "a-03" not in returned_ids


async def test_filter_inverted_range_returns_empty(client: AsyncClient):
    """from_ts > to_ts → no rows can satisfy the condition."""
    await _seed_anomalies(client)

    r = await client.get(
        "/anomalies",
        params={
            "from_ts": (NOW + timedelta(hours=1)).isoformat(),
            "to_ts": (NOW - timedelta(hours=1)).isoformat(),
        },
    )
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# filter: vehicle_id + time range
# ---------------------------------------------------------------------------

async def test_combined_vehicle_and_time_filter(client: AsyncClient):
    await _seed_anomalies(client)

    # a-01 is at NOW-20s; window covers it
    r = await client.get(
        "/anomalies",
        params={
            "vehicle_id": "a-01",
            "from_ts": (NOW - timedelta(seconds=25)).isoformat(),
            "to_ts": (NOW - timedelta(seconds=15)).isoformat(),
        },
    )
    assert r.status_code == 200
    results = r.json()
    assert len(results) >= 1
    assert all(a["vehicle_id"] == "a-01" for a in results)


async def test_combined_filter_miss_returns_empty(client: AsyncClient):
    """vehicle_id matches, but time window is outside anomaly window."""
    await _seed_anomalies(client)

    r = await client.get(
        "/anomalies",
        params={
            "vehicle_id": "a-01",
            "from_ts": (NOW + timedelta(hours=1)).isoformat(),
        },
    )
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# limit parameter
# ---------------------------------------------------------------------------

async def test_limit_caps_returned_results(client: AsyncClient):
    # Create 10 anomalies for a single vehicle
    for _ in range(10):
        await client.post("/telemetry", json=telemetry_payload("limit-v"))

    r = await client.get("/anomalies", params={"vehicle_id": "limit-v", "limit": 3})
    assert r.status_code == 200
    assert len(r.json()) <= 3


async def test_limit_zero_rejected(client: AsyncClient):
    r = await client.get("/anomalies", params={"limit": 0})
    assert r.status_code == 422


async def test_limit_above_max_rejected(client: AsyncClient):
    r = await client.get("/anomalies", params={"limit": 1001})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# ordering
# ---------------------------------------------------------------------------

async def test_results_ordered_newest_first(client: AsyncClient):
    await _seed_anomalies(client)

    r = await client.get("/anomalies")
    assert r.status_code == 200
    results = r.json()
    if len(results) >= 2:
        timestamps = [a["detected_at"] for a in results]
        assert timestamps == sorted(timestamps, reverse=True)


# ---------------------------------------------------------------------------
# anomaly types: verify all 7 types are produced
# ---------------------------------------------------------------------------

async def test_low_battery_anomaly_type(client: AsyncClient):
    await client.post("/telemetry", json=telemetry_payload("type-v", battery_pct=10.0))
    r = await client.get("/anomalies", params={"vehicle_id": "type-v"})
    assert any(a["anomaly_type"] == "low_battery" for a in r.json())


async def test_critical_battery_anomaly_type(client: AsyncClient):
    await client.post("/telemetry", json=telemetry_payload("type-v2", battery_pct=3.0))
    r = await client.get("/anomalies", params={"vehicle_id": "type-v2"})
    assert any(a["anomaly_type"] == "critical_battery" for a in r.json())


async def test_zero_battery_anomaly_type(client: AsyncClient):
    await client.post("/telemetry", json=telemetry_payload("type-v3", battery_pct=0.0))
    r = await client.get("/anomalies", params={"vehicle_id": "type-v3"})
    assert any(a["anomaly_type"] == "zero_battery" for a in r.json())


async def test_overspeed_anomaly_type(client: AsyncClient):
    await client.post("/telemetry", json=telemetry_payload("type-v4", speed_mps=6.0, battery_pct=80.0))
    r = await client.get("/anomalies", params={"vehicle_id": "type-v4"})
    assert any(a["anomaly_type"] == "overspeed" for a in r.json())


async def test_unexpected_error_codes_anomaly_type(client: AsyncClient):
    await client.post(
        "/telemetry",
        json=telemetry_payload("type-v5", error_codes=["ERR_SENSOR"], battery_pct=80.0),
    )
    r = await client.get("/anomalies", params={"vehicle_id": "type-v5"})
    assert any(a["anomaly_type"] == "unexpected_error_codes" for a in r.json())


async def test_boundary_coordinates_anomaly_type(client: AsyncClient):
    await client.post(
        "/telemetry",
        json=telemetry_payload("type-v6", lat=90.0, battery_pct=80.0),
    )
    r = await client.get("/anomalies", params={"vehicle_id": "type-v6"})
    assert any(a["anomaly_type"] == "boundary_coordinates" for a in r.json())


async def test_anomaly_details_structure(client: AsyncClient):
    """Each anomaly must carry a non-empty details dict."""
    await _seed_anomalies(client)
    r = await client.get("/anomalies")
    assert r.status_code == 200
    for anomaly in r.json():
        assert isinstance(anomaly["details"], dict)
        assert len(anomaly["details"]) > 0
