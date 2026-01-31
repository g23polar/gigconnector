"""Add spotify_connections table

Revision ID: 0010_spotify_connections
Revises: 0009_add_admin_role
Create Date: 2026-01-30
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_spotify_connections"
down_revision = "0009_add_admin_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spotify_connections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("artist_profile_id", sa.String(), nullable=False),
        sa.Column("spotify_user_id", sa.String(), nullable=False),
        sa.Column("spotify_artist_id", sa.String(), nullable=True),
        sa.Column("access_token", sa.String(), nullable=False),
        sa.Column("refresh_token", sa.String(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("spotify_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("data_fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["artist_profile_id"],
            ["artist_profiles.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("artist_profile_id", name="uq_spotify_artist_profile"),
    )
    op.create_index(
        "ix_spotify_connections_artist_profile_id",
        "spotify_connections",
        ["artist_profile_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_spotify_connections_artist_profile_id",
        table_name="spotify_connections",
    )
    op.drop_table("spotify_connections")
