import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class EntityType(str, enum.Enum):
    artist = "artist"
    venue = "venue"


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (
        UniqueConstraint("from_user_id", "to_entity_type", "to_entity_id", name="uq_bookmark"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID string
    from_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    to_entity_type: Mapped[EntityType] = mapped_column(Enum(EntityType), nullable=False)
    to_entity_id: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
