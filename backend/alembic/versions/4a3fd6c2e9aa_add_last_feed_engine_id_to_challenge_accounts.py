"""add last feed engine id to challenge accounts

Revision ID: 4a3fd6c2e9aa
Revises: 3b4c1d6e8d01
Create Date: 2026-02-26 04:29:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a3fd6c2e9aa'
down_revision: Union[str, None] = '3b4c1d6e8d01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('challenge_accounts', sa.Column('last_feed_engine_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('challenge_accounts', 'last_feed_engine_id')