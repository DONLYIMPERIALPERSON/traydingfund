"""create challenge config table

Revision ID: 0007_create_challenge_config
Revises: 0006_admin_allowlist_full_name
Create Date: 2026-02-19 11:40:00
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = "0007_create_challenge_config"
down_revision: Union[str, None] = "0006_admin_allowlist_full_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "challenge_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("config_key", sa.String(length=100), nullable=False),
        sa.Column("config_value", sa.JSON(), nullable=False),
    )
    op.create_index("ix_challenge_config_id", "challenge_config", ["id"], unique=False)
    op.create_index("ix_challenge_config_config_key", "challenge_config", ["config_key"], unique=True)

    default_plans = [
        {
            "id": "200k",
            "name": "₦200k Account",
            "price": "₦8,900",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "100%",
            "payout_frequency": "24hr",
            "status": "Available",
            "enabled": True,
        },
        {
            "id": "400k",
            "name": "₦400k Account",
            "price": "₦18,500",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "100%",
            "payout_frequency": "24hr",
            "status": "Available",
            "enabled": True,
        },
        {
            "id": "600k",
            "name": "₦600k Account",
            "price": "₦28,000",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "100%",
            "payout_frequency": "24hr",
            "status": "Available",
            "enabled": True,
        },
        {
            "id": "800k",
            "name": "₦800k Account",
            "price": "₦38,000",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "100%",
            "payout_frequency": "24hr",
            "status": "Available",
            "enabled": True,
        },
        {
            "id": "1.5m",
            "name": "₦1.5m Account",
            "price": "₦99,000",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "50%",
            "payout_frequency": "24hr",
            "status": "Available",
            "enabled": True,
        },
        {
            "id": "3m",
            "name": "₦3m Account",
            "price": "₦180,000",
            "max_drawdown": "20%",
            "profit_target": "10%",
            "phases": "2",
            "min_trading_days": "1",
            "profit_split": "70%",
            "profit_cap": "50%",
            "payout_frequency": "24hr",
            "status": "Paused",
            "enabled": False,
        },
    ]

    connection.execute(
        sa.text(
            """
            INSERT INTO challenge_config (config_key, config_value)
            VALUES (:config_key, CAST(:config_value AS JSONB))
            ON CONFLICT (config_key) DO NOTHING
            """
        ),
        {
            "config_key": "public_challenge_plans",
            "config_value": json.dumps(default_plans),
        },
    )

    connection.execute(
        sa.text(
            """
            INSERT INTO challenge_config (config_key, config_value)
            VALUES (:config_key, CAST(:config_value AS JSONB))
            ON CONFLICT (config_key) DO NOTHING
            """
        ),
        {
            "config_key": "payout_auto_approval_config",
            "config_value": json.dumps({"auto_approval_threshold_percent": 15}),
        },
    )


def downgrade() -> None:
    op.drop_index("ix_challenge_config_config_key", table_name="challenge_config")
    op.drop_index("ix_challenge_config_id", table_name="challenge_config")
    op.drop_table("challenge_config")
