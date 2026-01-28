"""Add relationship logs

Revision ID: 0006_relationship_logs
Revises: 0005_gigs
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_relationship_logs"
down_revision = "0005_gigs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "relationship_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("actor_user_id", sa.String(), nullable=False),
        sa.Column("target_user_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["target_user_id"], ["users.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_relationship_logs_actor_user_id",
        "relationship_logs",
        ["actor_user_id"],
    )
    op.create_index(
        "ix_relationship_logs_target_user_id",
        "relationship_logs",
        ["target_user_id"],
    )
    op.create_index(
        "ix_relationship_logs_action",
        "relationship_logs",
        ["action"],
    )
    op.create_index(
        "ix_relationship_logs_entity_type",
        "relationship_logs",
        ["entity_type"],
    )
    op.create_index(
        "ix_relationship_logs_entity_id",
        "relationship_logs",
        ["entity_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_relationship_logs_entity_id", table_name="relationship_logs")
    op.drop_index("ix_relationship_logs_entity_type", table_name="relationship_logs")
    op.drop_index("ix_relationship_logs_action", table_name="relationship_logs")
    op.drop_index("ix_relationship_logs_target_user_id", table_name="relationship_logs")
    op.drop_index("ix_relationship_logs_actor_user_id", table_name="relationship_logs")
    op.drop_table("relationship_logs")
