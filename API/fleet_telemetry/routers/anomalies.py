from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.database import get_db
from fleet_telemetry.models import Anomaly
from fleet_telemetry.schemas import AnomalyResponse

router = APIRouter(tags=["anomalies"])


@router.get("/anomalies", response_model=list[AnomalyResponse])
async def get_anomalies(
    vehicle_id: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = Query(default=100, le=1000, gt=0),
    db: AsyncSession = Depends(get_db),
) -> list[AnomalyResponse]:
    stmt = select(Anomaly)

    if vehicle_id is not None:
        stmt = stmt.where(Anomaly.vehicle_id == vehicle_id)
    if from_ts is not None:
        stmt = stmt.where(Anomaly.detected_at >= from_ts)
    if to_ts is not None:
        stmt = stmt.where(Anomaly.detected_at <= to_ts)

    stmt = stmt.order_by(Anomaly.detected_at.desc()).limit(limit)

    result = await db.execute(stmt)
    return [AnomalyResponse.model_validate(a) for a in result.scalars().all()]
