"""add approval fields to user model

Revision ID: 6e496b48293f
Revises: cb4c200f0989
Create Date: 2025-05-01 11:12:02.859854

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6e496b48293f'
down_revision = 'cb4c200f0989'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to the users table
    op.add_column('users', sa.Column('firm', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('pending_approval', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('approval_token', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')))
    op.add_column('users', sa.Column('approved_at', sa.DateTime(), nullable=True))
    
    # Create a unique index on the approval_token to ensure uniqueness
    op.create_index(op.f('ix_users_approval_token'), 'users', ['approval_token'], unique=True)
    
    # Update existing users to set pending_approval to False
    # so they are still able to login after the migration
    op.execute("UPDATE users SET pending_approval = false, firm = 'Legacy User'")
    
    # Now make the firm column non-nullable for future records
    op.alter_column('users', 'firm', nullable=False)


def downgrade():
    # Remove the columns if needed to roll back
    op.drop_index(op.f('ix_users_approval_token'), table_name='users')
    op.drop_column('users', 'approved_at')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'approval_token')
    op.drop_column('users', 'pending_approval')
    op.drop_column('users', 'firm')