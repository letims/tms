import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


def telemetry_payload(vehicle_id: str, **overrides) -> dict:
    payload = {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": 1.0,
        "lon": 2.0,
        "battery_pct": 80.0,
        "speed_mps": 1.0,
        "status": "moving",
        "error_codes": [],
        "zone_entered": None,
    }
    payload.update(overrides)
    return payload


async def test_burst_ingestion_all_50_vehicles_concurrent(client: AsyncClient):
    tasks = [
        client.post("/telemetry", json=telemetry_payload(vehicle_id=f"v-{i:02d}"))
        for i in range(50)
    ]
    responses = await asyncio.gather(*tasks)

    for response in responses:
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    state_response = await client.get("/fleet/state")
    assert state_response.status_code == 200
    assert state_response.json()["total"] == 50
    assert state_response.json()["counts"]["moving"] == 50


async def test_aggressive_burst_200_vehicles_all_persisted(client: AsyncClient):
    """200 unique vehicles fire concurrently.  Every write must land and the
    aggregate count must exactly match the number of requests sent."""
    n = 200
    tasks = [
        client.post("/telemetry", json=telemetry_payload(vehicle_id=f"burst-{i:03d}"))
        for i in range(n)
    ]
    responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses), (
        f"{sum(r.status_code != 200 for r in responses)} requests failed"
    )

    state_response = await client.get("/fleet/state")
    assert state_response.status_code == 200
    assert state_response.json()["total"] == n

    # Verify via /vehicles (paginated, max 100 per page) that every unique vehicle_id is stored
    stored_ids: set[str] = set()
    for offset in range(0, n, 100):
        page = await client.get("/vehicles", params={"limit": 100, "offset": offset})
        assert page.status_code == 200
        body = page.json()
        assert body["total"] == n, f"Expected total={n}, got {body['total']}"
        stored_ids.update(v["vehicle_id"] for v in body["vehicles"])
    expected_ids = {f"burst-{i:03d}" for i in range(n)}
    assert expected_ids == stored_ids, (
        f"Missing: {expected_ids - stored_ids}\nExtra: {stored_ids - expected_ids}"
    )


async def test_repeated_waves_same_vehicles_state_consistent(client: AsyncClient):
    """Send 3 successive waves of 50 vehicles each with alternating statuses.
    After the last wave the fleet state must reflect only the final status."""
    vehicles = [f"wave-{i:02d}" for i in range(50)]

    for status in ("moving", "idle", "charging"):
        tasks = [
            client.post("/telemetry", json=telemetry_payload(vehicle_id=v, status=status))
            for v in vehicles
        ]
        await asyncio.gather(*tasks)

    state = (await client.get("/fleet/state")).json()
    # All 50 vehicles last sent "charging"
    assert state["counts"]["charging"] == 50
    assert state["counts"]["moving"] == 0
    assert state["counts"]["idle"] == 0
    assert state["total"] == 50


async def test_telemetry_rejects_malformed_payload(client: AsyncClient):
    response = await client.post(
        "/telemetry",
        json={
            "vehicle_id": "v-01",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "lat": 1.0,
            "lon": 2.0,
            "battery_pct": 150.0,  # invalid: > 100
            "speed_mps": 1.0,
            "status": "moving",
        },
    )
    assert response.status_code == 422


async def test_low_battery_anomaly_detected(client: AsyncClient):
    response = await client.post(
        "/telemetry", json=telemetry_payload("v-01", battery_pct=10.0)
    )
    assert response.status_code == 200
    assert response.json()["anomalies_detected"] == 1

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "v-01"})).json()
    assert len(anomalies) == 1
    assert anomalies[0]["anomaly_type"] == "low_battery"


async def test_critical_battery_anomaly_detected(client: AsyncClient):
    response = await client.post(
        "/telemetry", json=telemetry_payload("v-01", battery_pct=3.0)
    )
    assert response.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "v-01"})).json()
    assert any(a["anomaly_type"] == "critical_battery" for a in anomalies)


async def test_overspeed_anomaly_detected(client: AsyncClient):
    response = await client.post(
        "/telemetry", json=telemetry_payload("v-01", speed_mps=6.0)
    )
    assert response.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "v-01"})).json()
    assert any(a["anomaly_type"] == "overspeed" for a in anomalies)


async def test_unexpected_error_codes_anomaly_detected(client: AsyncClient):
    response = await client.post(
        "/telemetry",
        json=telemetry_payload("v-01", status="moving", error_codes=["E42"]),
    )
    assert response.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "v-01"})).json()
    assert any(a["anomaly_type"] == "unexpected_error_codes" for a in anomalies)


async def test_stale_vehicle_anomaly_detected(client: AsyncClient):
    now = datetime.now(timezone.utc)

    # First event 45 seconds in the past; second event at now.
    # The 45s gap exceeds the stale_vehicle threshold and triggers the anomaly.
    first = await client.post(
        "/telemetry",
        json=telemetry_payload("v-01", **{"timestamp": (now - timedelta(seconds=45)).isoformat()}),
    )
    assert first.status_code == 200

    second = await client.post(
        "/telemetry",
        json=telemetry_payload("v-01", **{"timestamp": now.isoformat()}),
    )
    assert second.status_code == 200

    anomalies = (await client.get("/anomalies", params={"vehicle_id": "v-01"})).json()
    assert any(a["anomaly_type"] == "stale_vehicle" for a in anomalies)


async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
