"""Add zip_code, remove lat/lng

Revision ID: 0002_zipcode
Revises: 0001_init
Create Date: 2026-01-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_zipcode"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add zip_code columns
    op.add_column("artist_profiles", sa.Column("zip_code", sa.String(10), nullable=True))
    op.add_column("venue_profiles", sa.Column("zip_code", sa.String(10), nullable=True))

    # Create indexes for zip_code
    op.create_index("ix_artist_profiles_zip_code", "artist_profiles", ["zip_code"])
    op.create_index("ix_venue_profiles_zip_code", "venue_profiles", ["zip_code"])

    # Drop lat/lng columns
    op.drop_column("artist_profiles", "lat")
    op.drop_column("artist_profiles", "lng")
    op.drop_column("venue_profiles", "lat")
    op.drop_column("venue_profiles", "lng")


def downgrade() -> None:
    # Re-add lat/lng columns
    op.add_column("artist_profiles", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("artist_profiles", sa.Column("lng", sa.Float(), nullable=True))
    op.add_column("venue_profiles", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("venue_profiles", sa.Column("lng", sa.Float(), nullable=True))

    # Drop zip_code indexes and columns
    op.drop_index("ix_venue_profiles_zip_code", table_name="venue_profiles")
    op.drop_index("ix_artist_profiles_zip_code", table_name="artist_profiles")
    op.drop_column("venue_profiles", "zip_code")
    op.drop_column("artist_profiles", "zip_code")
