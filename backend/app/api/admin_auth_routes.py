import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth_routes import serialize_user
from app.core.config import settings
from app.core.auth import get_current_admin_allowlisted, get_current_super_admin
from app.db.deps import get_db
from app.models.admin_allowlist import AdminAllowlist
from app.models.user import User
from app.schemas.admin import AdminAllowlistCreateRequest, AdminAllowlistUpdateRequest


router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])
bootstrap_key_header = APIKeyHeader(name="X-Admin-Bootstrap-Secret", auto_error=False)


def _serialize_allowlist(entry: AdminAllowlist) -> dict[str, str | int | bool | list[str] | None]:
    allowed_pages = None
    if entry.allowed_pages:
        try:
            allowed_pages = json.loads(entry.allowed_pages)
        except (json.JSONDecodeError, TypeError):
            allowed_pages = []

    return {
        "id": entry.id,
        "email": entry.email,
        "full_name": entry.full_name,
        "descope_user_id": entry.descope_user_id,
        "role": entry.role,
        "status": entry.status,
        "require_mfa": entry.require_mfa,
        "mfa_enrolled": entry.mfa_enrolled,
        "allowed_pages": allowed_pages,
        "created_by_user_id": entry.created_by_user_id,
    }


@router.get("/precheck")
def precheck_admin_email(email: str, db: Session = Depends(get_db)) -> dict[str, str | bool | None]:
    normalized = email.strip().lower()
    entry = db.scalar(select(AdminAllowlist).where(AdminAllowlist.email == normalized))

    if entry is None:
        return {
            "allowlisted": False,
            "status": None,
            "role": None,
            "require_mfa": False,
            "mfa_enrolled": False,
        }

    return {
        "allowlisted": entry.status == "active" and entry.role in {"admin", "super_admin"},
        "status": entry.status,
        "role": entry.role,
        "require_mfa": entry.require_mfa,
        "mfa_enrolled": entry.mfa_enrolled,
    }


def _assert_bootstrap_secret(secret: str | None) -> None:
    if not settings.admin_bootstrap_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_BOOTSTRAP_SECRET is not configured",
        )
    if secret != settings.admin_bootstrap_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap secret")


@router.post("/login")
def admin_login(
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str | int | list[str] | None]:
    return serialize_user(current_admin, db)


@router.post("/logout")
def admin_logout(current_admin: User = Depends(get_current_admin_allowlisted)) -> dict[str, str]:
    """Stateless admin logout acknowledgment. Descope handles token invalidation client-side."""
    return {
        "message": f"Admin {current_admin.email} logged out successfully",
        "status": "ok",
    }


@router.get("/me")
def admin_me(
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str | int | list[str] | None]:
    return serialize_user(current_admin, db)


@router.get("/allowlist")
def list_allowlist(
    _: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> list[dict[str, str | int | bool | list[str] | None]]:
    rows = db.scalars(select(AdminAllowlist).order_by(AdminAllowlist.id.asc())).all()
    return [_serialize_allowlist(row) for row in rows]


@router.post("/allowlist", status_code=status.HTTP_201_CREATED)
def add_allowlist_entry(
    payload: AdminAllowlistCreateRequest,
    current_super_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, str | int | bool | list[str] | None]:
    email = payload.email.strip().lower()

    existing = db.scalar(select(AdminAllowlist).where(AdminAllowlist.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Admin email already allowlisted")

    allowed_pages_json = None
    if payload.allowed_pages:
        allowed_pages_json = json.dumps(payload.allowed_pages)

    row = AdminAllowlist(
        email=email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        role=payload.role,
        status="active",
        require_mfa=payload.require_mfa,
        allowed_pages=allowed_pages_json,
        created_by_user_id=current_super_admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_allowlist(row)


@router.post("/allowlist/bootstrap", status_code=status.HTTP_201_CREATED)
def bootstrap_allowlist_entry(
    payload: AdminAllowlistCreateRequest,
    db: Session = Depends(get_db),
    bootstrap_secret: str | None = Depends(bootstrap_key_header),
) -> dict[str, str | int | bool | list[str] | None]:
    _assert_bootstrap_secret(bootstrap_secret)

    email = payload.email.strip().lower()
    existing = db.scalar(select(AdminAllowlist).where(AdminAllowlist.email == email))
    if existing:
        return _serialize_allowlist(existing)

    row = AdminAllowlist(
        email=email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        role=payload.role,
        status="active",
        require_mfa=payload.require_mfa,
        created_by_user_id=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_allowlist(row)


@router.patch("/allowlist/{entry_id}")
def update_allowlist_entry(
    entry_id: int,
    payload: AdminAllowlistUpdateRequest,
    _: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, str | int | bool | list[str] | None]:
    row = db.get(AdminAllowlist, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowlist entry not found")

    changed = False
    if payload.full_name is not None and payload.full_name != row.full_name:
        row.full_name = payload.full_name
        changed = True
    if payload.role is not None and payload.role != row.role:
        row.role = payload.role
        changed = True
    if payload.status is not None and payload.status != row.status:
        row.status = payload.status
        changed = True
    if payload.require_mfa is not None and payload.require_mfa != row.require_mfa:
        row.require_mfa = payload.require_mfa
        changed = True
    if payload.allowed_pages is not None:
        allowed_pages_json = json.dumps(payload.allowed_pages) if payload.allowed_pages else None
        if allowed_pages_json != row.allowed_pages:
            row.allowed_pages = allowed_pages_json
            changed = True

    if changed:
        db.add(row)
        db.commit()
        db.refresh(row)

    return _serialize_allowlist(row)


@router.delete("/allowlist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allowlist_entry(
    entry_id: int,
    _: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.get(AdminAllowlist, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowlist entry not found")

    db.delete(row)
    db.commit()
    return None
