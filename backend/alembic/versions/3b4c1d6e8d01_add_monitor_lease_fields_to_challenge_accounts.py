"""add monitor lease fields to challenge accounts

Revision ID: 3b4c1d6e8d01
Revises: be8f93e4cc80
Create Date: 2026-02-26 02:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b4c1d6e8d01'
down_revision: Union[str, None] = 'be8f93e4cc80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('challenge_accounts', sa.Column('monitor_lease_owner', sa.String(length=255), nullable=True))
    op.add_column('challenge_accounts', sa.Column('monitor_lease_until', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_challenge_accounts_monitor_lease_owner', 'challenge_accounts', ['monitor_lease_owner'])
    op.create_index('ix_challenge_accounts_monitor_lease_until', 'challenge_accounts', ['monitor_lease_until'])


def downgrade() -> None:
    op.drop_index('ix_challenge_accounts_monitor_lease_until', table_name='challenge_accounts')
    op.drop_index('ix_challenge_accounts_monitor_lease_owner', table_name='challenge_accounts')
    op.drop_column('challenge_accounts', 'monitor_lease_until')
    op.drop_column('challenge_accounts', 'monitor_lease_owner')