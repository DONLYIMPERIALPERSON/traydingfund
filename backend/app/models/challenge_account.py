from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChallengeAccount(Base):
    __tablename__ = "challenge_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    challenge_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    account_size: Mapped[str] = mapped_column(String(120), nullable=False)
    current_stage: Mapped[str] = mapped_column(String(20), nullable=False, default="Phase 1", index=True)

    phase1_mt5_account_id: Mapped[int | None] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=True)
    phase2_mt5_account_id: Mapped[int | None] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=True)
    funded_mt5_account_id: Mapped[int | None] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=True)
    active_mt5_account_id: Mapped[int | None] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=True)
    last_withdrawn_mt5_account_id: Mapped[int | None] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=True)

    objective_status: Mapped[str] = mapped_column(String(30), nullable=False, default="active", index=True)
    breached_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    passed_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)

    initial_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    dd_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    highest_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    breach_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    profit_target_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    latest_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_equity: Mapped[float | None] = mapped_column(Float, nullable=True)
    scalping_violations_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    funded_profit_raw: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    funded_profit_capped: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    funded_profit_cap_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    funded_user_payout_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    withdrawal_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    stage_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_trades_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    winning_trades_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lots_traded_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    today_closed_pnl: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    today_trades_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    today_lots_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    last_feed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_refresh_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    breached_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    passed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    last_feed_engine_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    monitor_lease_owner: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    monitor_lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
