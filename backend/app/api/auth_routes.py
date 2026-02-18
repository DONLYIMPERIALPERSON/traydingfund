from fastapi import APIRouter, Depends

from app.core.auth import get_current_admin, get_current_user
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["Auth"])


def serialize_user(user: User) -> dict[str, str | int | None]:
    return {
        "id": user.id,
        "descope_user_id": user.descope_user_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "status": user.status,
    }


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
