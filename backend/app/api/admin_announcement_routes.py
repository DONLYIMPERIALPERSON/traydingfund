from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin_allowlisted
from app.db.deps import get_db
from app.models.user import User
from app.tasks import send_announcement_email

router = APIRouter(prefix="/admin/announcements", tags=["Admin Announcements"])


@router.post("/send")
def send_announcement(
    payload: dict[str, str],
    current_admin: User = Depends(get_current_admin_allowlisted),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Send announcement email to all users."""
    subject = payload.get("subject", "").strip()
    message = payload.get("message", "").strip()

    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject is required")

    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

    # Get all user emails
    users = db.scalars(select(User.email).where(User.status == "active")).all()
    user_emails = [email for email in users if email]

    if not user_emails:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active users found")

    try:
        # Send announcement to all users
        send_announcement_email.delay(
            to_emails=user_emails,
            subject=subject,
            message=message,
        )

        return {
            "message": f"Announcement sent successfully to {len(user_emails)} users",
            "recipient_count": len(user_emails),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send announcement: {str(e)}",
        ) from e


@router.post("/send-test")
def send_test_announcement(
    payload: dict[str, str],
    current_admin: User = Depends(get_current_admin_allowlisted),
) -> dict[str, str]:
    """Send test announcement email to the admin's email."""
    subject = payload.get("subject", "").strip()
    message = payload.get("message", "").strip()

    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject is required")

    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

    try:
        # Send test announcement to admin's email
        send_announcement_email.delay(
            to_emails=[current_admin.email],
            subject=f"[TEST] {subject}",
            message=message,
        )

        return {
            "message": f"Test announcement sent successfully to {current_admin.email}",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test announcement: {str(e)}",
        ) from e