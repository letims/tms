from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.database import get_db
from fleet_telemetry.models import Zone
from fleet_telemetry.schemas import ZoneCount, ZoneCountsResponse

router = APIRouter(tags=["zones"])


@router.get("/zones/counts", response_model=ZoneCountsResponse)
async def get_zone_counts(db: AsyncSession = Depends(get_db)) -> ZoneCountsResponse:
    result = await db.execute(select(Zone).order_by(Zone.zone_id))
    zones = result.scalars().all()
    return ZoneCountsResponse(
        zones=[ZoneCount(zone_id=z.zone_id, entry_count=z.entry_count) for z in zones]
    )
