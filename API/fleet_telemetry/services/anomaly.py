from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.config import settings
from fleet_telemetry.models import Anomaly
from fleet_telemetry.schemas import TelemetryEvent


async def detect_and_record_anomalies(
    session: AsyncSession,
    event: TelemetryEvent,
    telemetry_event_id: int,
    previous_last_seen: datetime | None,
) -> int:
    """Run anomaly checks for a telemetry event and persist any matches.

    Must be called within the same transaction as the telemetry event insert
    so anomalies are immediately queryable after ingestion.
    """
    detected: list[tuple[str, dict]] = []

    if event.battery_pct == 0.0:
        detected.append((
            "zero_battery",
            {"battery_pct": 0.0, "note": "completely discharged or sensor failure"},
        ))
    elif event.battery_pct < settings.critical_battery_pct:
        detected.append((
            "critical_battery",
            {"battery_pct": event.battery_pct, "threshold": settings.critical_battery_pct},
        ))
    elif event.battery_pct < settings.low_battery_pct:
        detected.append((
            "low_battery",
            {"battery_pct": event.battery_pct, "threshold": settings.low_battery_pct},
        ))

    if abs(event.lat) == 90.0 or abs(event.lon) == 180.0:
        detected.append((
            "boundary_coordinates",
            {"lat": event.lat, "lon": event.lon, "note": "GPS sentinel value or calibration failure"},
        ))

    if event.speed_mps > settings.overspeed_mps:
        detected.append((
            "overspeed",
            {"speed_mps": event.speed_mps, "threshold": settings.overspeed_mps},
        ))

    if event.status == "fault" and event.speed_mps > settings.moving_with_fault_speed_mps:
        detected.append((
            "moving_with_fault",
            {"speed_mps": event.speed_mps, "threshold": settings.moving_with_fault_speed_mps},
        ))

    if event.error_codes and event.status != "fault":
        detected.append((
            "unexpected_error_codes",
            {"error_codes": event.error_codes, "status": event.status},
        ))

    if previous_last_seen is not None:
        event_timestamp = event.timestamp
        if previous_last_seen.tzinfo is None and event_timestamp.tzinfo is not None:
            event_timestamp = event_timestamp.replace(tzinfo=None)
        gap_seconds = (event_timestamp - previous_last_seen).total_seconds()
        if gap_seconds > settings.stale_vehicle_seconds:
            detected.append((
                "stale_vehicle",
                {
                    "previous_last_seen": previous_last_seen.isoformat(),
                    "gap_seconds": gap_seconds,
                    "threshold_seconds": settings.stale_vehicle_seconds,
                },
            ))

    for anomaly_type, details in detected:
        session.add(
            Anomaly(
                vehicle_id=event.vehicle_id,
                detected_at=event.timestamp,
                anomaly_type=anomaly_type,
                details=details,
                telemetry_event_id=telemetry_event_id,
            )
        )

    return len(detected)
