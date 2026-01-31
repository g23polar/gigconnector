from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class SpotifyConnection(Base):
    __tablename__ = "spotify_connections"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    artist_profile_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("artist_profiles.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    spotify_user_id: Mapped[str] = mapped_column(String, nullable=False)
    spotify_artist_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    access_token: Mapped[str] = mapped_column(String, nullable=False)
    refresh_token: Mapped[str] = mapped_column(String, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    spotify_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    data_fetched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    artist_profile = relationship("ArtistProfile", backref="spotify_connection")
