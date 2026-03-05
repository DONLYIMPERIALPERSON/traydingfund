from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(
    settings.database_url,
    # NOTE:
    # Use a larger pool and pre-ping to avoid pool exhaustion and stale
    # connections during bursts.
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    pool_size=10,
    max_overflow=20,
    pool_use_lifo=True,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
