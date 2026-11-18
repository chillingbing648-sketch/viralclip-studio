from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config import settings
from backend.database.models import Base

# Async engine for FastAPI route handlers
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Synchronous engine for background video tasks / workers
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.SYNC_DATABASE_URL else {}
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db():
    """Create database tables if they do not exist."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def init_db_sync():
    """Create database tables synchronously."""
    Base.metadata.create_all(bind=sync_engine)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI route handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db():
    """Context / function for synchronous background workers."""
    db = SyncSessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise
