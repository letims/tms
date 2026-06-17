import os
import tempfile
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fleet_telemetry.constants import ZONES
from fleet_telemetry.database import Base, get_db
from fleet_telemetry.main import app
from fleet_telemetry.routers.fleet import reset_fleet_cache


@pytest.fixture(autouse=True)
def clear_fleet_cache():
    """Reset the fleet state cache before each test so stale data from a
    previous test's DB never bleeds into the next test's assertions."""
    reset_fleet_cache()
    yield
    reset_fleet_cache()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
        dbapi_conn.isolation_level = None

    @event.listens_for(engine.sync_engine, "begin")
    def do_begin(conn):
        conn.exec_driver_sql("BEGIN IMMEDIATE")

    session_local = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_local() as session:
        for zone_id in ZONES:
            await session.execute(
                text(
                    "INSERT OR IGNORE INTO zones (zone_id, name, entry_count) "
                    "VALUES (:zone_id, :name, 0)"
                ),
                {"zone_id": zone_id, "name": zone_id.replace("_", " ").title()},
            )
        await session.commit()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_local() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        test_client.session_local = session_local
        yield test_client

    app.dependency_overrides.clear()
    await engine.dispose()
    os.remove(db_path)
    for ext in ("-wal", "-shm"):
        if os.path.exists(db_path + ext):
            os.remove(db_path + ext)
