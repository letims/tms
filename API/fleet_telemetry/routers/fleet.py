import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from fleet_telemetry.database import get_db
from fleet_telemetry.models import Vehicle
from fleet_telemetry.schemas import FleetStateResponse, HealthResponse

router = APIRouter(tags=["fleet"])

ALL_STATUSES = ["idle", "moving", "charging", "fault"]

_FLEET_CACHE_TTL = 2.0  # seconds
_fleet_cache: FleetStateResponse | None = None
_fleet_cache_expires: float = 0.0


def reset_fleet_cache() -> None:
    """Invalidate the in-memory fleet state cache. Call between tests."""
    global _fleet_cache, _fleet_cache_expires
    _fleet_cache = None
    _fleet_cache_expires = 0.0


@router.get("/fleet/state", response_model=FleetStateResponse)
async def get_fleet_state(db: AsyncSession = Depends(get_db)) -> FleetStateResponse:
    global _fleet_cache, _fleet_cache_expires

    if _fleet_cache is not None and time.monotonic() < _fleet_cache_expires:
        return _fleet_cache

    result = await db.execute(
        select(Vehicle.status, func.count()).group_by(Vehicle.status)
    )
    rows = result.all()

    counts = {status: 0 for status in ALL_STATUSES}
    for status, count in rows:
        counts[status] = count

    response = FleetStateResponse(
        counts=counts,
        total=sum(counts.values()),
        as_of=datetime.now(timezone.utc),
    )
    _fleet_cache = response
    _fleet_cache_expires = time.monotonic() + _FLEET_CACHE_TTL
    return response


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    await db.execute(text("SELECT 1"))
    return HealthResponse(status="ok", db="ok", timestamp=datetime.now(timezone.utc))
