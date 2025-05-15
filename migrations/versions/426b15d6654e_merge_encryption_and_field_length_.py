"""merge encryption and field length migrations

Revision ID: 426b15d6654e
Revises: 7b695304afbb, 8f7d6e5c4b3a
Create Date: 2025-05-15 11:52:48.476318

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '426b15d6654e'
down_revision = ('7b695304afbb', '8f7d6e5c4b3a')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
