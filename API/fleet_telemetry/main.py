from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from fleet_telemetry.config import settings
from fleet_telemetry.constants import ZONES
from fleet_telemetry.database import AsyncSessionLocal, Base, engine
from fleet_telemetry.routers import anomalies, fleet, telemetry, vehicles, zones


async def seed_zones() -> None:
    async with AsyncSessionLocal() as session:
        for zone_id in ZONES:
            await session.execute(
                text(
                    "INSERT OR IGNORE INTO zones (zone_id, name, entry_count) "
                    "VALUES (:zone_id, :name, 0)"
                ),
                {"zone_id": zone_id, "name": zone_id.replace("_", " ").title()},
            )
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_zones()
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title="Fleet Telemetry Monitoring Service", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(telemetry.router)
    app.include_router(vehicles.router)
    app.include_router(zones.router)
    app.include_router(anomalies.router)
    app.include_router(fleet.router)

    return app


app = create_app()
