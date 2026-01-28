"""Rename relationship_logs metadata -> details

Revision ID: 0007_relationship_logs_details
Revises: 0006_relationship_logs
Create Date: 2026-01-28
"""

from alembic import op
from sqlalchemy import text

revision = "0007_relationship_logs_details"
down_revision = "0006_relationship_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'relationship_logs'
              AND column_name = 'metadata'
            """
        )
    ).first()
    if exists:
        op.alter_column("relationship_logs", "metadata", new_column_name="details")


def downgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'relationship_logs'
              AND column_name = 'details'
            """
        )
    ).first()
    if exists:
        op.alter_column("relationship_logs", "details", new_column_name="metadata")
