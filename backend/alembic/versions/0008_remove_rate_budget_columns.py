"""Remove artist max_rate and venue min_budget

Revision ID: 0008_remove_rate_budget_columns
Revises: 0007_relationship_logs_details
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0008_remove_rate_budget_columns"
down_revision = "0007_relationship_logs_details"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    return (
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = :table_name
                  AND column_name = :column_name
                """
            ),
            {"table_name": table_name, "column_name": column_name},
        ).first()
        is not None
    )


def upgrade() -> None:
    if _column_exists("artist_profiles", "max_rate"):
        op.drop_column("artist_profiles", "max_rate")
    if _column_exists("venue_profiles", "min_budget"):
        op.drop_column("venue_profiles", "min_budget")


def downgrade() -> None:
    if not _column_exists("artist_profiles", "max_rate"):
        op.add_column(
            "artist_profiles",
            sa.Column("max_rate", sa.Integer(), nullable=False, server_default="0"),
        )
        op.execute("UPDATE artist_profiles SET max_rate = 0 WHERE max_rate IS NULL")
    if not _column_exists("venue_profiles", "min_budget"):
        op.add_column(
            "venue_profiles",
            sa.Column("min_budget", sa.Integer(), nullable=False, server_default="0"),
        )
        op.execute("UPDATE venue_profiles SET min_budget = 0 WHERE min_budget IS NULL")
