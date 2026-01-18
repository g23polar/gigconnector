from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

artist_genres = Table(
    "artist_genres",
    Base.metadata,
    Column("artist_id", String, ForeignKey("artist_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", String, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)

venue_genres = Table(
    "venue_genres",
    Base.metadata,
    Column("venue_id", String, ForeignKey("venue_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", String, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
