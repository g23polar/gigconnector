"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-01-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.Enum("artist", "venue", name="userrole"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "genres",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )
    op.create_index("ix_genres_name", "genres", ["name"], unique=True)

    op.create_table(
        "artist_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("bio", sa.String(), nullable=False, server_default=""),
        sa.Column("city", sa.String(), nullable=False, server_default=""),
        sa.Column("state", sa.String(), nullable=False, server_default=""),
        sa.Column("country", sa.String(), nullable=False, server_default="US"),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("travel_radius_miles", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("min_rate", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_rate", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_draw", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_draw", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("media_links", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("user_id", name="uq_artist_profiles_user_id"),
    )
    op.create_index("ix_artist_profiles_user_id", "artist_profiles", ["user_id"], unique=True)
    op.create_index("ix_artist_profiles_name", "artist_profiles", ["name"])

    op.create_table(
        "venue_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("venue_name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("address", sa.String(), nullable=False, server_default=""),
        sa.Column("city", sa.String(), nullable=False, server_default=""),
        sa.Column("state", sa.String(), nullable=False, server_default=""),
        sa.Column("country", sa.String(), nullable=False, server_default="US"),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_budget", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_budget", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amenities", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("user_id", name="uq_venue_profiles_user_id"),
    )
    op.create_index("ix_venue_profiles_user_id", "venue_profiles", ["user_id"], unique=True)
    op.create_index("ix_venue_profiles_venue_name", "venue_profiles", ["venue_name"])

    op.create_table(
        "artist_genres",
        sa.Column("artist_id", sa.String(), sa.ForeignKey("artist_profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.String(), sa.ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "venue_genres",
        sa.Column("venue_id", sa.String(), sa.ForeignKey("venue_profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.String(), sa.ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "bookmarks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("from_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_entity_type", sa.Enum("artist", "venue", name="entitytype"), nullable=False),
        sa.Column("to_entity_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("from_user_id", "to_entity_type", "to_entity_id", name="uq_bookmark"),
    )
    op.create_index("ix_bookmarks_from_user_id", "bookmarks", ["from_user_id"])


def downgrade() -> None:
    op.drop_index("ix_bookmarks_from_user_id", table_name="bookmarks")
    op.drop_table("bookmarks")
    op.drop_table("venue_genres")
    op.drop_table("artist_genres")

    op.drop_index("ix_venue_profiles_venue_name", table_name="venue_profiles")
    op.drop_index("ix_venue_profiles_user_id", table_name="venue_profiles")
    op.drop_table("venue_profiles")

    op.drop_index("ix_artist_profiles_name", table_name="artist_profiles")
    op.drop_index("ix_artist_profiles_user_id", table_name="artist_profiles")
    op.drop_table("artist_profiles")

    op.drop_index("ix_genres_name", table_name="genres")
    op.drop_table("genres")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS entitytype;")
    op.execute("DROP TYPE IF EXISTS userrole;")
