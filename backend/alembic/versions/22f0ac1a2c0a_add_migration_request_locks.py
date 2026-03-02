"""add_migration_request_locks

Revision ID: 22f0ac1a2c0a
Revises: a7cd6224972f
Create Date: 2026-03-02 08:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '22f0ac1a2c0a'
down_revision: Union[str, None] = 'a7cd6224972f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('migration_requests', sa.Column('locked_by_admin_id', sa.Integer(), nullable=True))
    op.add_column('migration_requests', sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('migration_requests', sa.Column('lock_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        'fk_migration_requests_locked_by_admin',
        'migration_requests',
        'admin_allowlist',
        ['locked_by_admin_id'],
        ['id'],
    )
    op.create_index(op.f('ix_migration_requests_locked_by_admin_id'), 'migration_requests', ['locked_by_admin_id'], unique=False)
    op.create_index(op.f('ix_migration_requests_lock_expires_at'), 'migration_requests', ['lock_expires_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_migration_requests_lock_expires_at'), table_name='migration_requests')
    op.drop_index(op.f('ix_migration_requests_locked_by_admin_id'), table_name='migration_requests')
    op.drop_constraint('fk_migration_requests_locked_by_admin', 'migration_requests', type_='foreignkey')
    op.drop_column('migration_requests', 'lock_expires_at')
    op.drop_column('migration_requests', 'locked_at')
    op.drop_column('migration_requests', 'locked_by_admin_id')