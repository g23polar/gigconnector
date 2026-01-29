"""Add admin role to userrole enum

Revision ID: 0009_add_admin_role
Revises: 0008_remove_rate_budget_columns
Create Date: 2026-01-28
"""

from alembic import op

revision = "0009_add_admin_role"
down_revision = "0008_remove_rate_budget_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")


def downgrade() -> None:
    # Downgrade is a no-op because PostgreSQL does not support removing enum values easily.
    pass
