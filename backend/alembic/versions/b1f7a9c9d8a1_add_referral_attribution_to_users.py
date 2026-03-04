"""add referral attribution to users

Revision ID: b1f7a9c9d8a1
Revises: ae8da4fccbfb
Create Date: 2026-03-04 00:40:00.000000
"""

from typing import Union, Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1f7a9c9d8a1"
down_revision: Union[str, None] = "ae8da4fccbfb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("referral_affiliate_id", sa.Integer(), sa.ForeignKey("affiliates.user_id"), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("referral_clicked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("referral_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_referral_affiliate_id", "users", ["referral_affiliate_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_referral_affiliate_id", table_name="users")
    op.drop_column("users", "referral_expires_at")
    op.drop_column("users", "referral_clicked_at")
    op.drop_column("users", "referral_affiliate_id")