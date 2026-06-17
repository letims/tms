from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.models import MaintenanceRecord, Mission


async def handle_fault_transition(
    session: AsyncSession, vehicle_id: str, previous_status: str | None, now: datetime
) -> None:
    """Cancel the active mission and create a maintenance record on first fault.

    Must run within the request's single DB transaction (BEGIN IMMEDIATE is
    issued at transaction start, see database.py) so the read-then-write of
    mission cancellation and maintenance record creation cannot interleave
    with a concurrent fault signal for the same vehicle.

    Idempotent: if the vehicle was already in "fault" prior to this event,
    this is a no-op (no duplicate maintenance record is created).
    """
    if previous_status == "fault":
        return

    mission_result = await session.execute(
        select(Mission).where(Mission.vehicle_id == vehicle_id, Mission.status == "active")
    )
    active_mission = mission_result.scalar_one_or_none()

    mission_id = None
    if active_mission is not None:
        await session.execute(
            update(Mission)
            .where(Mission.id == active_mission.id)
            .values(status="cancelled", cancelled_at=now)
        )
        mission_id = active_mission.id

    session.add(
        MaintenanceRecord(
            vehicle_id=vehicle_id,
            created_at=now,
            reason="Vehicle reported fault status",
            mission_id=mission_id,
        )
    )
