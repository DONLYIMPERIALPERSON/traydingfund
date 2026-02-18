"""Import ORM models here so Alembic can discover metadata."""

from app.models.user import User

__all__ = ["User"]
