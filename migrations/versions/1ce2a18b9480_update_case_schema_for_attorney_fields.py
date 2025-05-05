"""update case schema for attorney fields

Revision ID: 1ce2a18b9480
Revises: 74f2c5a75beb
Create Date: 2025-05-04 22:30:44.548533

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1ce2a18b9480'
down_revision = '74f2c5a75beb'
branch_labels = None
depends_on = None


def upgrade():
    # Remove old column
    op.drop_column('case', 'defendant_counsel_info')
    
    # Add new columns
    op.add_column('case', sa.Column('defendant_counsel_attorneys', sa.String(1000), nullable=True))
    op.add_column('case', sa.Column('defendant_counsel_firm', sa.String(1000), nullable=True))
    op.add_column('case', sa.Column('defendant_counsel_address', sa.String(1000), nullable=True))
    op.add_column('case', sa.Column('defendant_counsel_contact', sa.String(1000), nullable=True))
    op.add_column('case', sa.Column('acting_attorney', sa.String(200), nullable=True))
    op.add_column('case', sa.Column('acting_clerk', sa.String(200), nullable=True))


def downgrade():
    # Remove new columns
    op.drop_column('case', 'defendant_counsel_attorneys')
    op.drop_column('case', 'defendant_counsel_firm')
    op.drop_column('case', 'defendant_counsel_address')
    op.drop_column('case', 'defendant_counsel_contact')
    op.drop_column('case', 'acting_attorney')
    op.drop_column('case', 'acting_clerk')
    
    # Restore old column
    op.add_column('case', sa.Column('defendant_counsel_info', sa.String(1000), nullable=True))


    # ### end Alembic commands ###
