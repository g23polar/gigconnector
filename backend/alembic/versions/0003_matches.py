"""Add matches table

Revision ID: 0003_matches
Revises: 0002_zipcode
Create Date: 2026-01-20
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_matches"
down_revision = "0002_zipcode"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "matches",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("from_user_id", sa.String(), nullable=False),
        sa.Column("to_user_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("from_user_id", "to_user_id", name="uq_match"),
    )
    op.create_index("ix_matches_from_user_id", "matches", ["from_user_id"])
    op.create_index("ix_matches_to_user_id", "matches", ["to_user_id"])


def downgrade() -> None:
    op.drop_index("ix_matches_to_user_id", table_name="matches")
    op.drop_index("ix_matches_from_user_id", table_name="matches")
    op.drop_table("matches")
