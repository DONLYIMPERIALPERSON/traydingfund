import json
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin, get_current_user
from app.db.deps import get_db
from app.models.admin_allowlist import AdminAllowlist
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["Auth"])


def serialize_user(user: User, db: Session | None = None) -> dict[str, str | int | list[str] | None]:
    result = {
        "id": user.id,
        "descope_user_id": user.descope_user_id,
        "email": user.email,
        "full_name": user.full_name,
        "nick_name": user.nick_name,
        "role": user.role,
        "status": user.status,
        "kyc_status": user.kyc_status,
    }

    # For admin users, include allowed_pages from admin_allowlist
    if user.role in {"admin", "super_admin"} and db is not None:
        allowlist_entry = db.scalar(
            select(AdminAllowlist).where(
                (AdminAllowlist.email == user.email) |
                (AdminAllowlist.descope_user_id == user.descope_user_id)
            )
        )
        if allowlist_entry and allowlist_entry.allowed_pages:
            try:
                result["allowed_pages"] = json.loads(allowlist_entry.allowed_pages)
            except (json.JSONDecodeError, TypeError):
                result["allowed_pages"] = []
        if allowlist_entry:
            result["admin_allowlist_id"] = allowlist_entry.id
            result["can_assign_mt5"] = allowlist_entry.can_assign_mt5

    return result


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)) -> dict[str, str | int | None]:
    return serialize_user(current_user)


@router.post("/login")
def login(current_user: User = Depends(get_current_user)) -> dict[str, str | int | None]:
    """Validates current Descope JWT and returns the app user profile."""
    return serialize_user(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """Stateless logout acknowledgment. Token revocation is handled by Descope."""
    return {
        "message": f"User {current_user.email} logged out successfully",
        "status": "ok",
    }


@router.get("/admin/me")
def get_admin_me(current_admin: User = Depends(get_current_admin)) -> dict[str, str | int | None]:
    return serialize_user(current_admin)
