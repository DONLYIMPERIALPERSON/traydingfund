from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StaffSalary(Base):
    __tablename__ = "staff_salaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    staff_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_code: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_account_number: Mapped[str] = mapped_column(String(20), nullable=False)
    salary_amount: Mapped[float] = mapped_column(nullable=False, default=0)

    created_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_allowlist.id"), nullable=True)
    updated_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_allowlist.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    created_by_admin: Mapped["AdminAllowlist"] = relationship("AdminAllowlist", foreign_keys=[created_by_admin_id])
    updated_by_admin: Mapped["AdminAllowlist"] = relationship("AdminAllowlist", foreign_keys=[updated_by_admin_id])