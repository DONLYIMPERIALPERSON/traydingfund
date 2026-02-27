"""create staff salaries table

Revision ID: 3d2e4f0a9d11
Revises: 8b2d1f2a9c1c
Create Date: 2026-02-27 21:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d2e4f0a9d11'
down_revision: Union[str, None] = '8b2d1f2a9c1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'staff_salaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('staff_name', sa.String(length=255), nullable=False),
        sa.Column('bank_code', sa.String(length=20), nullable=False),
        sa.Column('bank_name', sa.String(length=255), nullable=False),
        sa.Column('bank_account_number', sa.String(length=20), nullable=False),
        sa.Column('salary_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('updated_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_admin_id'], ['admin_allowlist.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by_admin_id'], ['admin_allowlist.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_salaries_bank_account_number'), 'staff_salaries', ['bank_account_number'], unique=False)
    op.create_index(op.f('ix_staff_salaries_bank_code'), 'staff_salaries', ['bank_code'], unique=False)
    op.create_index(op.f('ix_staff_salaries_created_at'), 'staff_salaries', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_staff_salaries_created_at'), table_name='staff_salaries')
    op.drop_index(op.f('ix_staff_salaries_bank_code'), table_name='staff_salaries')
    op.drop_index(op.f('ix_staff_salaries_bank_account_number'), table_name='staff_salaries')
    op.drop_table('staff_salaries')