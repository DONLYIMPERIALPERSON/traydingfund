"""merge heads for mt5 assign flag

Revision ID: 7c8ffda688af
Revises: 04a8b8c3c2f0, b1f7a9c9d8a1
Create Date: 2026-03-04 14:26:37.185594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c8ffda688af'
down_revision: Union[str, None] = ('04a8b8c3c2f0', 'b1f7a9c9d8a1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
