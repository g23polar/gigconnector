from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.genre import Genre, venue_genres


class VenueProfile(Base):
    __tablename__ = "venue_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID string
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    venue_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String, default="", nullable=False)

    address: Mapped[str] = mapped_column(String, default="", nullable=False)
    city: Mapped[str] = mapped_column(String, default="", nullable=False)
    state: Mapped[str] = mapped_column(String, default="", nullable=False)
    country: Mapped[str] = mapped_column(String, default="US", nullable=False)

    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_budget: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_budget: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    amenities: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="venue_profile")
    genres = relationship(Genre, secondary=venue_genres, lazy="joined")
