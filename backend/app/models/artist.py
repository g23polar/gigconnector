from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.genre import Genre, artist_genres


class ArtistProfile(Base):
    __tablename__ = "artist_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID string
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    bio: Mapped[str] = mapped_column(String, default="", nullable=False)

    city: Mapped[str] = mapped_column(String, default="", nullable=False)
    state: Mapped[str] = mapped_column(String, default="", nullable=False)
    country: Mapped[str] = mapped_column(String, default="US", nullable=False)

    zip_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)

    travel_radius_miles: Mapped[int] = mapped_column(Integer, default=25, nullable=False)

    min_rate: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_rate: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    min_draw: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_draw: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    media_links: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="artist_profile")
    genres = relationship(Genre, secondary=artist_genres, lazy="joined")
