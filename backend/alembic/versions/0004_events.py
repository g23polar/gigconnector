"""Add events table

Revision ID: 0004_events
Revises: 0003_matches
Create Date: 2026-01-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_events"
down_revision = "0003_matches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("venue_profile_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["venue_profile_id"],
            ["venue_profiles.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_events_venue_profile_id", "events", ["venue_profile_id"])
    op.create_index("ix_events_date", "events", ["date"])


def downgrade() -> None:
    op.drop_index("ix_events_date", table_name="events")
    op.drop_index("ix_events_venue_profile_id", table_name="events")
    op.drop_table("events")
