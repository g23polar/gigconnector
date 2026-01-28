import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.artist import ArtistProfile
from app.models.gig import Gig, GigStatus
from app.models.match import Match
from app.models.user import User, UserRole
from app.models.venue import VenueProfile
from app.schemas.gig import (
    ArtistStatsOut,
    GigCreateIn,
    GigHistoryItem,
    GigMetricsIn,
    GigOut,
    GigStatusIn,
)

router = APIRouter(prefix="/gigs", tags=["gigs"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _gig_out(gig: Gig, artist_name: str, venue_name: str) -> GigOut:
    return GigOut(
        id=gig.id,
        artist_profile_id=gig.artist_profile_id,
        venue_profile_id=gig.venue_profile_id,
        artist_name=artist_name,
        venue_name=venue_name,
        title=gig.title,
        date=gig.date,
        status=gig.status.value,
        tickets_sold=gig.tickets_sold,
        attendance=gig.attendance,
        ticket_price_cents=gig.ticket_price_cents,
        gross_revenue_cents=gig.gross_revenue_cents,
        artist_confirmed=gig.artist_confirmed,
        venue_confirmed=gig.venue_confirmed,
        created_by_user_id=gig.created_by_user_id,
        created_at=gig.created_at,
        updated_at=gig.updated_at,
    )


def _get_user_profile_ids(db: Session, user: User) -> tuple:
    """Return (artist_profile_id | None, venue_profile_id | None)."""
    if user.role == UserRole.artist:
        row = (
            db.query(ArtistProfile.id)
            .filter(ArtistProfile.user_id == user.id)
            .first()
        )
        return (row[0] if row else None, None)
    else:
        row = (
            db.query(VenueProfile.id)
            .filter(VenueProfile.user_id == user.id)
            .first()
        )
        return (None, row[0] if row else None)


def _has_mutual_match(db: Session, user_id_a: str, user_id_b: str) -> bool:
    fwd = (
        db.query(Match.id)
        .filter(Match.from_user_id == user_id_a, Match.to_user_id == user_id_b)
        .first()
    )
    rev = (
        db.query(Match.id)
        .filter(Match.from_user_id == user_id_b, Match.to_user_id == user_id_a)
        .first()
    )
    return fwd is not None and rev is not None


def _load_gig_row(db: Session, gig_id: str):
    """Load gig with joined artist/venue names. Returns (Gig, artist_name, venue_name) or None."""
    return (
        db.query(Gig, ArtistProfile.name, VenueProfile.venue_name)
        .join(ArtistProfile, ArtistProfile.id == Gig.artist_profile_id)
        .join(VenueProfile, VenueProfile.id == Gig.venue_profile_id)
        .filter(Gig.id == gig_id)
        .first()
    )


def _assert_participant(db: Session, gig: Gig, user: User):
    """Raise 403 if user is not the artist or venue for this gig."""
    artist_prof = db.get(ArtistProfile, gig.artist_profile_id)
    venue_prof = db.get(VenueProfile, gig.venue_profile_id)
    if user.id != artist_prof.user_id and user.id != venue_prof.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this gig",
        )
    return artist_prof, venue_prof


# ---------------------------------------------------------------------------
# 1) POST /gigs  –  Create a gig
# ---------------------------------------------------------------------------


@router.post("", response_model=GigOut, status_code=status.HTTP_201_CREATED)
def create_gig(
    payload: GigCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    artist_prof = db.get(ArtistProfile, payload.artist_profile_id)
    if not artist_prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Artist profile not found"
        )

    venue_prof = db.get(VenueProfile, payload.venue_profile_id)
    if not venue_prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Venue profile not found"
        )

    # User must be either the artist or the venue
    if user.id != artist_prof.user_id and user.id != venue_prof.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this gig",
        )

    # Require mutual match
    if not _has_mutual_match(db, artist_prof.user_id, venue_prof.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mutual match is required before creating a gig",
        )

    # Prevent duplicate
    existing = (
        db.query(Gig)
        .filter(
            Gig.artist_profile_id == payload.artist_profile_id,
            Gig.venue_profile_id == payload.venue_profile_id,
            Gig.date == payload.date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A gig already exists for this artist, venue, and date",
        )

    gig = Gig(
        id=str(uuid.uuid4()),
        artist_profile_id=payload.artist_profile_id,
        venue_profile_id=payload.venue_profile_id,
        title=payload.title,
        date=payload.date,
        status=GigStatus.upcoming,
        created_by_user_id=user.id,
    )
    db.add(gig)
    db.commit()
    db.refresh(gig)

    return _gig_out(gig, artist_prof.name, venue_prof.venue_name)


# ---------------------------------------------------------------------------
# 2) GET /gigs  –  List user's gigs
# ---------------------------------------------------------------------------


@router.get("", response_model=list[GigOut])
def list_gigs(
    status_filter: GigStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    artist_id, venue_id = _get_user_profile_ids(db, user)

    q = (
        db.query(Gig, ArtistProfile.name, VenueProfile.venue_name)
        .join(ArtistProfile, ArtistProfile.id == Gig.artist_profile_id)
        .join(VenueProfile, VenueProfile.id == Gig.venue_profile_id)
    )

    if artist_id:
        q = q.filter(Gig.artist_profile_id == artist_id)
    elif venue_id:
        q = q.filter(Gig.venue_profile_id == venue_id)
    else:
        return []

    if status_filter:
        q = q.filter(Gig.status == status_filter)

    rows = q.order_by(Gig.date.desc()).all()
    return [_gig_out(g, aname, vname) for g, aname, vname in rows]


# ---------------------------------------------------------------------------
# 3) GET /gigs/stats/{artist_profile_id}  –  Public aggregated stats
#    MUST be defined before /{gig_id} to avoid path conflict
# ---------------------------------------------------------------------------


@router.get("/stats/{artist_profile_id}", response_model=ArtistStatsOut)
def get_artist_stats(
    artist_profile_id: str,
    db: Session = Depends(get_db),
):
    artist_prof = db.get(ArtistProfile, artist_profile_id)
    if not artist_prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Artist profile not found"
        )

    # SQL-level aggregation for completed gigs
    stats = (
        db.query(
            sa_func.count(Gig.id).label("total_gigs"),
            sa_func.count(
                case(
                    (
                        and_(
                            Gig.artist_confirmed == True,  # noqa: E712
                            Gig.venue_confirmed == True,  # noqa: E712
                        ),
                        Gig.id,
                    ),
                )
            ).label("verified_gigs"),
            sa_func.avg(Gig.attendance).label("avg_attendance"),
            sa_func.avg(Gig.tickets_sold).label("avg_tickets_sold"),
            sa_func.coalesce(sa_func.sum(Gig.tickets_sold), 0).label(
                "total_tickets_sold"
            ),
            sa_func.count(sa_func.distinct(Gig.venue_profile_id)).label(
                "unique_venues_count"
            ),
        )
        .filter(
            Gig.artist_profile_id == artist_profile_id,
            Gig.status == GigStatus.completed,
        )
        .first()
    )

    # Gig history
    history_rows = (
        db.query(Gig, VenueProfile.venue_name)
        .join(VenueProfile, VenueProfile.id == Gig.venue_profile_id)
        .filter(
            Gig.artist_profile_id == artist_profile_id,
            Gig.status == GigStatus.completed,
        )
        .order_by(Gig.date.desc())
        .all()
    )

    gig_history = [
        GigHistoryItem(
            gig_id=gig.id,
            venue_name=vname,
            date=gig.date,
            attendance=gig.attendance,
            tickets_sold=gig.tickets_sold,
            verified=gig.artist_confirmed and gig.venue_confirmed,
        )
        for gig, vname in history_rows
    ]

    return ArtistStatsOut(
        artist_profile_id=artist_profile_id,
        artist_name=artist_prof.name,
        total_gigs=stats.total_gigs or 0,
        verified_gigs=stats.verified_gigs or 0,
        avg_attendance=(
            round(float(stats.avg_attendance), 1)
            if stats.avg_attendance is not None
            else None
        ),
        avg_tickets_sold=(
            round(float(stats.avg_tickets_sold), 1)
            if stats.avg_tickets_sold is not None
            else None
        ),
        total_tickets_sold=stats.total_tickets_sold or 0,
        unique_venues_count=stats.unique_venues_count or 0,
        gig_history=gig_history,
    )


# ---------------------------------------------------------------------------
# 4) GET /gigs/{gig_id}  –  Gig detail
# ---------------------------------------------------------------------------


@router.get("/{gig_id}", response_model=GigOut)
def get_gig(
    gig_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _load_gig_row(db, gig_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gig not found"
        )

    gig, aname, vname = row
    _assert_participant(db, gig, user)
    return _gig_out(gig, aname, vname)


# ---------------------------------------------------------------------------
# 5) PATCH /gigs/{gig_id}/metrics  –  Submit / update metrics
# ---------------------------------------------------------------------------


@router.patch("/{gig_id}/metrics", response_model=GigOut)
def update_metrics(
    gig_id: str,
    payload: GigMetricsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _load_gig_row(db, gig_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gig not found"
        )

    gig, aname, vname = row
    artist_prof, venue_prof = _assert_participant(db, gig, user)

    if gig.status == GigStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update metrics for a cancelled gig",
        )

    # Update only provided fields
    if payload.tickets_sold is not None:
        gig.tickets_sold = payload.tickets_sold
    if payload.attendance is not None:
        gig.attendance = payload.attendance
    if payload.ticket_price_cents is not None:
        gig.ticket_price_cents = payload.ticket_price_cents
    if payload.gross_revenue_cents is not None:
        gig.gross_revenue_cents = payload.gross_revenue_cents

    # Reset OTHER party's confirmation when metrics change
    if user.id == artist_prof.user_id:
        gig.venue_confirmed = False
    else:
        gig.artist_confirmed = False

    db.commit()
    db.refresh(gig)
    return _gig_out(gig, aname, vname)


# ---------------------------------------------------------------------------
# 6) POST /gigs/{gig_id}/confirm  –  Confirm metrics
# ---------------------------------------------------------------------------


@router.post("/{gig_id}/confirm", response_model=GigOut)
def confirm_gig(
    gig_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _load_gig_row(db, gig_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gig not found"
        )

    gig, aname, vname = row
    artist_prof, venue_prof = _assert_participant(db, gig, user)

    if gig.status == GigStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm a cancelled gig",
        )

    if gig.tickets_sold is None and gig.attendance is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No metrics to confirm. Submit metrics first.",
        )

    if user.id == artist_prof.user_id:
        gig.artist_confirmed = True
    else:
        gig.venue_confirmed = True

    db.commit()
    db.refresh(gig)
    return _gig_out(gig, aname, vname)


# ---------------------------------------------------------------------------
# 7) PATCH /gigs/{gig_id}/status  –  Update status
# ---------------------------------------------------------------------------


@router.patch("/{gig_id}/status", response_model=GigOut)
def update_gig_status(
    gig_id: str,
    payload: GigStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _load_gig_row(db, gig_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gig not found"
        )

    gig, aname, vname = row
    _assert_participant(db, gig, user)

    if gig.status == GigStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancelled gigs cannot be updated",
        )

    if gig.status == GigStatus.completed and payload.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gig is already completed",
        )

    gig.status = GigStatus(payload.status)
    db.commit()
    db.refresh(gig)
    return _gig_out(gig, aname, vname)
