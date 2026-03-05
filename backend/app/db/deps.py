from collections.abc import Generator

from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except OperationalError:
            # Ignore SSL-closed errors during session cleanup.
            pass
