"""add_unique_index_for_active_refresh_jobs_per_account

Revision ID: be8f93e4cc80
Revises: 2e98587be3db
Create Date: 2026-02-24 11:50:12.112183

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be8f93e4cc80'
down_revision: Union[str, None] = '2e98587be3db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clean up duplicate active jobs - keep only the most recent one per account
    op.execute("""
        DELETE FROM mt5_refresh_jobs
        WHERE id NOT IN (
            SELECT DISTINCT ON (account_number) id
            FROM mt5_refresh_jobs
            WHERE status IN ('queued', 'processing')
            ORDER BY account_number, requested_at DESC
        )
        AND status IN ('queued', 'processing')
    """)

    # Create unique index to prevent multiple active refresh jobs per account
    op.create_index(
        'uq_refresh_job_active_per_account',
        'mt5_refresh_jobs',
        ['account_number'],
        unique=True,
        postgresql_where=sa.text("status IN ('queued', 'processing')")
    )


def downgrade() -> None:
    op.drop_index('uq_refresh_job_active_per_account', 'mt5_refresh_jobs')
