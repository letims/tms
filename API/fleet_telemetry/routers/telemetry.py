from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.database import get_db
from fleet_telemetry.models import TelemetryEvent as TelemetryEventModel
from fleet_telemetry.models import Vehicle, Zone
from fleet_telemetry.schemas import TelemetryEvent, TelemetryResponse
from fleet_telemetry.services.anomaly import detect_and_record_anomalies
from fleet_telemetry.services.fault_handler import handle_fault_transition

router = APIRouter(tags=["telemetry"])


@router.post("/telemetry", response_model=TelemetryResponse)
async def ingest_telemetry(
    event: TelemetryEvent, db: AsyncSession = Depends(get_db)
) -> TelemetryResponse:
    telemetry_row = TelemetryEventModel(
        vehicle_id=event.vehicle_id,
        timestamp=event.timestamp,
        lat=event.lat,
        lon=event.lon,
        battery_pct=event.battery_pct,
        speed_mps=event.speed_mps,
        status=event.status,
        error_codes=event.error_codes,
        zone_entered=event.zone_entered,
    )
    db.add(telemetry_row)
    await db.flush()

    existing_vehicle = await db.scalar(
        select(Vehicle).where(Vehicle.vehicle_id == event.vehicle_id)
    )
    previous_status = existing_vehicle.status if existing_vehicle is not None else None
    previous_last_seen = existing_vehicle.last_seen if existing_vehicle is not None else None

    anomalies_detected = await detect_and_record_anomalies(
        db, event, telemetry_row.id, previous_last_seen
    )

    if existing_vehicle is not None:
        existing_vehicle.status = event.status
        existing_vehicle.lat = event.lat
        existing_vehicle.lon = event.lon
        existing_vehicle.battery_pct = event.battery_pct
        existing_vehicle.speed_mps = event.speed_mps
        existing_vehicle.last_seen = event.timestamp
    else:
        db.add(
            Vehicle(
                vehicle_id=event.vehicle_id,
                status=event.status,
                lat=event.lat,
                lon=event.lon,
                battery_pct=event.battery_pct,
                speed_mps=event.speed_mps,
                last_seen=event.timestamp,
            )
        )

    if event.zone_entered is not None:
        await db.execute(
            update(Zone)
            .where(Zone.zone_id == event.zone_entered)
            .values(entry_count=Zone.entry_count + 1)
        )

    if event.status == "fault":
        await handle_fault_transition(db, event.vehicle_id, previous_status, event.timestamp)

    await db.commit()

    return TelemetryResponse(status="ok", anomalies_detected=anomalies_detected)
