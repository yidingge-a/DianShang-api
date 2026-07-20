"""Initial schema — mirrors SQLAlchemy models."""

from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 使用 env.py target_metadata.create_all 的等价表结构；生产推荐 alembic revision --autogenerate
    bind = op.get_bind()
    from app.database import Base
    from app.models import forbidden_word, monitor, product, task, user  # noqa: F401

    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    from app.database import Base
    from app.models import forbidden_word, monitor, product, task, user  # noqa: F401

    Base.metadata.drop_all(bind=bind)
