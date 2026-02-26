from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.db.deps import get_db
from app.models.admin_allowlist import AdminAllowlist
from app.models.email_log import EmailLog


router = APIRouter(prefix="/admin/emails", tags=["Admin Emails"])


@router.get("")
def list_email_logs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    _: AdminAllowlist = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    total = db.scalar(select(func.count(EmailLog.id))) or 0

    query = (
        select(EmailLog)
        .order_by(EmailLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    logs = db.scalars(query).all()

    items = [
        {
            "id": log.id,
            "to_email": log.to_email,
            "subject": log.subject,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

    return {
        "emails": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    }