from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from fleet_telemetry.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()
    # Defer to manual BEGIN below so we can issue BEGIN IMMEDIATE.
    dbapi_conn.isolation_level = None


@event.listens_for(engine.sync_engine, "begin")
def do_begin(conn):
    # BEGIN IMMEDIATE acquires the write lock at transaction start, which
    # (combined with busy_timeout) gives us SQLite-safe serializable writes
    # and is required for the atomic fault-transition transaction.
    conn.exec_driver_sql("BEGIN IMMEDIATE")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
