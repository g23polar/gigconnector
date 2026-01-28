"""Add gigs table

Revision ID: 0005_gigs
Revises: 0004_events
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_gigs"
down_revision = "0004_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gigs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("artist_profile_id", sa.String(), nullable=False),
        sa.Column("venue_profile_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("upcoming", "completed", "cancelled", name="gigstatus"),
            nullable=False,
            server_default="upcoming",
        ),
        sa.Column("tickets_sold", sa.Integer(), nullable=True),
        sa.Column("attendance", sa.Integer(), nullable=True),
        sa.Column("ticket_price_cents", sa.Integer(), nullable=True),
        sa.Column("gross_revenue_cents", sa.Integer(), nullable=True),
        sa.Column(
            "artist_confirmed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "venue_confirmed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("created_by_user_id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["artist_profile_id"], ["artist_profiles.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["venue_profile_id"], ["venue_profiles.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "artist_profile_id",
            "venue_profile_id",
            "date",
            name="uq_gig_artist_venue_date",
        ),
    )
    op.create_index("ix_gigs_artist_profile_id", "gigs", ["artist_profile_id"])
    op.create_index("ix_gigs_venue_profile_id", "gigs", ["venue_profile_id"])
    op.create_index("ix_gigs_date", "gigs", ["date"])


def downgrade() -> None:
    op.drop_index("ix_gigs_date", table_name="gigs")
    op.drop_index("ix_gigs_venue_profile_id", table_name="gigs")
    op.drop_index("ix_gigs_artist_profile_id", table_name="gigs")
    op.drop_table("gigs")
    op.execute("DROP TYPE IF EXISTS gigstatus")
