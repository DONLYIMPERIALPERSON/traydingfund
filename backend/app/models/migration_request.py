from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MigrationRequest(Base):
    __tablename__ = "migration_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    request_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "phase2" or "funded"
    account_size: Mapped[str] = mapped_column(String(120), nullable=False)
    mt5_server: Mapped[str] = mapped_column(String(255), nullable=False)
    mt5_account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    mt5_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # For funded requests
    bank_account_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, approved, declined
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_allowlist.id"), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    locked_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_allowlist.id"), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lock_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # For approved funded requests
    withdrawal_amount: Mapped[float | None] = mapped_column(nullable=True)
    transfer_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="migration_requests")
    processed_by_admin: Mapped["AdminAllowlist"] = relationship(
        "AdminAllowlist",
        foreign_keys=[processed_by_admin_id],
    )
    locked_by_admin: Mapped["AdminAllowlist"] = relationship(
        "AdminAllowlist",
        foreign_keys=[locked_by_admin_id],
    )