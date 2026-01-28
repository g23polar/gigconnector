import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class GigStatus(str, enum.Enum):
    upcoming = "upcoming"
    completed = "completed"
    cancelled = "cancelled"


class Gig(Base):
    __tablename__ = "gigs"
    __table_args__ = (
        UniqueConstraint(
            "artist_profile_id",
            "venue_profile_id",
            "date",
            name="uq_gig_artist_venue_date",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    artist_profile_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("artist_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    venue_profile_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("venue_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[GigStatus] = mapped_column(
        Enum(GigStatus), nullable=False, default=GigStatus.upcoming
    )

    # Metrics (nullable until submitted)
    tickets_sold: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    attendance: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ticket_price_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gross_revenue_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Dual verification
    artist_confirmed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    venue_confirmed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    created_by_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    artist_profile = relationship("ArtistProfile")
    venue_profile = relationship("VenueProfile")
    created_by = relationship("User")
