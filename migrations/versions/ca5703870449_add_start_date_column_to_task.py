"""Add completed_dates column to Task

Revision ID: ca5703870449
Revises: 62f47f6cc452
Create Date: 2025-06-28 15:21:53.759947
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ca5703870449'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('completed_dates', sa.PickleType(), nullable=True))

def downgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.drop_column('completed_dates')
