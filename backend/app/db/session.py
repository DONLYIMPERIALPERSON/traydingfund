from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(
    settings.database_url,
    # NOTE:
    # Disable pooling to avoid stale SSL connections and pool exhaustion
    # causing 504 timeouts. Each request gets a fresh DB connection.
    poolclass=NullPool,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        # Enforce timeouts at the DB connection level to prevent
        # long-lived idle transactions from exhausting the pool.
        "options": "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=10000",
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
