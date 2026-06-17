from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.database import get_db
from fleet_telemetry.models import Vehicle
from fleet_telemetry.schemas import VehicleListResponse, VehicleResponse

router = APIRouter(tags=["vehicles"])


@router.get("/vehicles", response_model=VehicleListResponse)
async def list_vehicles(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> VehicleListResponse:
    total = await db.scalar(select(func.count()).select_from(Vehicle))
    result = await db.execute(select(Vehicle).limit(limit).offset(offset))
    return VehicleListResponse(
        vehicles=[VehicleResponse.model_validate(v) for v in result.scalars().all()],
        total=total or 0,
        limit=limit,
        offset=offset,
    )
