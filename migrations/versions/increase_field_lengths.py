"""Increase field lengths for longer text content

Revision ID: increase_field_lengths
Revises: 1ce2a18b9480
Create Date: 2025-05-12 14:52:30.404463

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'increase_field_lengths'
down_revision = '1ce2a18b9480'
branch_labels = None
depends_on = None

def upgrade():
    # Increase field lengths for fields that need more space
    with op.batch_alter_table('case', schema=None) as batch_op:
        batch_op.alter_column('plaintiff', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('defendant', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('incident_location', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('incident_description', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('case_type', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('vehicle_details', type_=sa.String(1000), existing_type=sa.String(200))
        batch_op.alter_column('acting_attorney', type_=sa.String(1000), existing_type=sa.String(200))

def downgrade():
    # Revert field lengths back to original values
    with op.batch_alter_table('case', schema=None) as batch_op:
        batch_op.alter_column('plaintiff', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('defendant', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('incident_location', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('incident_description', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('case_type', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('vehicle_details', type_=sa.String(200), existing_type=sa.String(1000))
        batch_op.alter_column('acting_attorney', type_=sa.String(200), existing_type=sa.String(1000)) 