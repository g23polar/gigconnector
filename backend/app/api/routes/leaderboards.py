from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.artist import ArtistProfile
from app.models.gig import Gig, GigStatus
from app.models.venue import VenueProfile
from app.schemas.leaderboard import (
    ArtistLeaderboardEntry,
    LeaderboardOut,
    VenueLeaderboardEntry,
)

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])


@router.get("", response_model=LeaderboardOut)
def get_leaderboard(
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Public leaderboard showing top venues and artists by gig count,
    attendance, and more. Optionally filter by city/state.
    """

    # ── Venue leaderboard ──
    verified_case = case(
        (
            (Gig.artist_confirmed == True) & (Gig.venue_confirmed == True),  # noqa: E712
            1,
        ),
        else_=0,
    )

    venue_q = (
        db.query(
            VenueProfile.id.label("venue_profile_id"),
            VenueProfile.venue_name,
            VenueProfile.city,
            VenueProfile.state,
            func.count(Gig.id).label("total_gigs"),
            func.sum(verified_case).label("verified_gigs"),
            func.sum(Gig.attendance).label("total_attendance"),
            func.avg(Gig.attendance).label("avg_attendance"),
            func.sum(Gig.tickets_sold).label("total_tickets_sold"),
            func.sum(Gig.gross_revenue_cents).label("total_gross_revenue_cents"),
            func.count(func.distinct(Gig.artist_profile_id)).label("unique_artists"),
        )
        .join(Gig, Gig.venue_profile_id == VenueProfile.id)
        .filter(Gig.status != GigStatus.cancelled)
    )

    if city:
        venue_q = venue_q.filter(func.lower(VenueProfile.city) == city.lower())
    if state:
        venue_q = venue_q.filter(func.lower(VenueProfile.state) == state.lower())

    venue_q = (
        venue_q.group_by(VenueProfile.id)
        .order_by(func.count(Gig.id).desc())
        .limit(limit)
    )

    venues = []
    for row in venue_q.all():
        venues.append(
            VenueLeaderboardEntry(
                venue_profile_id=row.venue_profile_id,
                venue_name=row.venue_name,
                city=row.city,
                state=row.state,
                total_gigs=row.total_gigs,
                verified_gigs=row.verified_gigs or 0,
                total_attendance=row.total_attendance,
                avg_attendance=round(row.avg_attendance, 1) if row.avg_attendance else None,
                total_tickets_sold=row.total_tickets_sold,
                total_gross_revenue_cents=row.total_gross_revenue_cents,
                unique_artists=row.unique_artists,
            )
        )

    # ── Artist leaderboard ──
    artist_q = (
        db.query(
            ArtistProfile.id.label("artist_profile_id"),
            ArtistProfile.name.label("artist_name"),
            ArtistProfile.city,
            ArtistProfile.state,
            func.count(Gig.id).label("total_gigs"),
            func.sum(verified_case).label("verified_gigs"),
            func.sum(Gig.attendance).label("total_attendance"),
            func.avg(Gig.attendance).label("avg_attendance"),
            func.sum(Gig.tickets_sold).label("total_tickets_sold"),
            func.count(func.distinct(Gig.venue_profile_id)).label("unique_venues"),
        )
        .join(Gig, Gig.artist_profile_id == ArtistProfile.id)
        .filter(Gig.status != GigStatus.cancelled)
    )

    if city:
        artist_q = artist_q.filter(func.lower(ArtistProfile.city) == city.lower())
    if state:
        artist_q = artist_q.filter(func.lower(ArtistProfile.state) == state.lower())

    artist_q = (
        artist_q.group_by(ArtistProfile.id)
        .order_by(func.count(Gig.id).desc())
        .limit(limit)
    )

    artists = []
    for row in artist_q.all():
        artists.append(
            ArtistLeaderboardEntry(
                artist_profile_id=row.artist_profile_id,
                artist_name=row.artist_name,
                city=row.city,
                state=row.state,
                total_gigs=row.total_gigs,
                verified_gigs=row.verified_gigs or 0,
                total_attendance=row.total_attendance,
                avg_attendance=round(row.avg_attendance, 1) if row.avg_attendance else None,
                total_tickets_sold=row.total_tickets_sold,
                unique_venues=row.unique_venues,
            )
        )

    return LeaderboardOut(
        city=city,
        state=state,
        venues=venues,
        artists=artists,
    )


@router.get("/cities", response_model=list[str])
def get_available_cities(db: Session = Depends(get_db)):
    """Return cities that have at least one non-cancelled gig."""
    rows = (
        db.query(VenueProfile.city)
        .join(Gig, Gig.venue_profile_id == VenueProfile.id)
        .filter(Gig.status != GigStatus.cancelled)
        .filter(VenueProfile.city != "")
        .group_by(VenueProfile.city)
        .order_by(func.count(Gig.id).desc())
        .all()
    )
    return [r[0] for r in rows]
