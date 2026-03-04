from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AdminAllowlist(Base):
    __tablename__ = "admin_allowlist"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    descope_user_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="admin")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    require_mfa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    mfa_enrolled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    allowed_pages: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of allowed page IDs
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    can_assign_mt5: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
