from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    descope_user_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nick_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    use_nickname_for_certificates: Mapped[bool] = mapped_column(default=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    kyc_status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_started")
    referral_affiliate_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("affiliates.user_id"),
        nullable=True,
        index=True,
    )
    referral_clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    referral_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="user")
    support_chats: Mapped[list["SupportChat"]] = relationship("SupportChat", back_populates="user")
    migration_requests: Mapped[list["MigrationRequest"]] = relationship("MigrationRequest", back_populates="user")
