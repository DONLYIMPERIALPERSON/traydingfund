"""add_refresh_fields_and_mt5_refresh_jobs_table

Revision ID: 2e98587be3db
Revises: a7cd6224972f
Create Date: 2026-02-24 10:33:11.318906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e98587be3db'
down_revision: Union[str, None] = 'a7cd6224972f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add last_refresh_requested_at to challenge_accounts
    op.add_column("challenge_accounts", sa.Column("last_refresh_requested_at", sa.DateTime(timezone=True), nullable=True))

    # Create mt5_refresh_jobs table
    op.create_table(
        "mt5_refresh_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("account_number", sa.String(length=120), nullable=False, index=True),
        sa.Column("reason", sa.Enum("user_refresh", "withdrawal_verify", "admin_verify", name="refresh_reason"), nullable=False),
        sa.Column("status", sa.Enum("queued", "processing", "done", "failed", name="refresh_status"), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("engine_id", sa.String(length=255), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    # Drop mt5_refresh_jobs table
    op.drop_table("mt5_refresh_jobs")

    # Drop last_refresh_requested_at from challenge_accounts
    op.drop_column("challenge_accounts", "last_refresh_requested_at")
