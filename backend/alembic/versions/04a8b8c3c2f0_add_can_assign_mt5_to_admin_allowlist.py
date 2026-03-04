"""add_can_assign_mt5_to_admin_allowlist

Revision ID: 04a8b8c3c2f0
Revises: e24abb6050e6
Create Date: 2026-03-04 13:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '04a8b8c3c2f0'
down_revision: Union[str, None] = 'e24abb6050e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'admin_allowlist',
        sa.Column('can_assign_mt5', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.alter_column('admin_allowlist', 'can_assign_mt5', server_default=None)


def downgrade() -> None:
    op.drop_column('admin_allowlist', 'can_assign_mt5')