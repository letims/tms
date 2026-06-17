import asyncio
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from fleet_telemetry.models import MaintenanceRecord, Mission

pytestmark = pytest.mark.asyncio


def telemetry_payload(
    vehicle_id: str, status: str = "moving", speed_mps: float = 1.0
) -> dict:
    return {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": 1.0,
        "lon": 2.0,
        "battery_pct": 80.0,
        "speed_mps": speed_mps,
        "status": status,
        "error_codes": [],
        "zone_entered": None,
    }


async def test_concurrent_fault_signals_create_one_maintenance_record(client: AsyncClient):
    """5 concurrent fault events for the same vehicle must yield exactly 1
    maintenance record (idempotent fault transition)."""
    vehicle_id = "v-01"

    # Establish the vehicle in a normal state first.
    await client.post("/telemetry", json=telemetry_payload(vehicle_id, status="moving"))

    tasks = [
        client.post(
            "/telemetry",
            json=telemetry_payload(vehicle_id, status="fault", speed_mps=0.0),
        )
        for _ in range(5)
    ]
    responses = await asyncio.gather(*tasks)

    for response in responses:
        assert response.status_code == 200

    fleet_response = await client.get("/fleet/state")
    assert fleet_response.status_code == 200
    assert fleet_response.json()["counts"]["fault"] == 1

    async with client.session_local() as session:
        result = await session.execute(
            select(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle_id)
        )
        records = result.scalars().all()

    assert len(records) == 1


async def test_fault_cancels_active_mission(client: AsyncClient):
    vehicle_id = "v-02"

    await client.post("/telemetry", json=telemetry_payload(vehicle_id, status="moving"))

    async with client.session_local() as session:
        session.add(
            Mission(
                vehicle_id=vehicle_id,
                status="active",
                created_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()

    fault_response = await client.post(
        "/telemetry", json=telemetry_payload(vehicle_id, status="fault", speed_mps=0.0)
    )
    assert fault_response.status_code == 200

    fleet_response = await client.get("/fleet/state")
    assert fleet_response.json()["counts"]["fault"] == 1

    async with client.session_local() as session:
        result = await session.execute(
            select(Mission).where(Mission.vehicle_id == vehicle_id)
        )
        mission = result.scalar_one()
        record_result = await session.execute(
            select(MaintenanceRecord).where(MaintenanceRecord.vehicle_id == vehicle_id)
        )
        record = record_result.scalar_one()

    assert mission.status == "cancelled"
    assert mission.cancelled_at is not None
    assert record.mission_id == mission.id
