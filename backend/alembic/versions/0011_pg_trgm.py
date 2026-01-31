"""Enable pg_trgm and add trigram indexes for search

Revision ID: 0011_pg_trgm
Revises: 0010_spotify_connections
Create Date: 2026-01-31
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "0011_pg_trgm"
down_revision = "0010_spotify_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_index(
        "ix_artist_profiles_name_trgm",
        "artist_profiles",
        ["name"],
        postgresql_using="gin",
        postgresql_ops={"name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_artist_profiles_city_trgm",
        "artist_profiles",
        ["city"],
        postgresql_using="gin",
        postgresql_ops={"city": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_artist_profiles_state_trgm",
        "artist_profiles",
        ["state"],
        postgresql_using="gin",
        postgresql_ops={"state": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_venue_profiles_name_trgm",
        "venue_profiles",
        ["venue_name"],
        postgresql_using="gin",
        postgresql_ops={"venue_name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_venue_profiles_city_trgm",
        "venue_profiles",
        ["city"],
        postgresql_using="gin",
        postgresql_ops={"city": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_venue_profiles_state_trgm",
        "venue_profiles",
        ["state"],
        postgresql_using="gin",
        postgresql_ops={"state": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_venue_profiles_state_trgm", table_name="venue_profiles")
    op.drop_index("ix_venue_profiles_city_trgm", table_name="venue_profiles")
    op.drop_index("ix_venue_profiles_name_trgm", table_name="venue_profiles")
    op.drop_index("ix_artist_profiles_state_trgm", table_name="artist_profiles")
    op.drop_index("ix_artist_profiles_city_trgm", table_name="artist_profiles")
    op.drop_index("ix_artist_profiles_name_trgm", table_name="artist_profiles")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
