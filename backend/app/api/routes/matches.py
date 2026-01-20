import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user, get_db
from app.models.artist import ArtistProfile
from app.models.match import Match
from app.models.user import UserRole
from app.models.venue import VenueProfile
from app.schemas.match import MatchCreateIn, MatchOut

router = APIRouter(prefix="/matches", tags=["matches"])


def has_reciprocal(db: Session, from_user_id: str, to_user_id: str) -> bool:
    reciprocal = (
        db.query(Match.id)
        .filter(Match.from_user_id == to_user_id, Match.to_user_id == from_user_id)
        .first()
    )
    return reciprocal is not None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_match(
    payload: MatchCreateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role == UserRole.artist and payload.target_type != "venue":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artists can only match with venues")
    if user.role == UserRole.venue and payload.target_type != "artist":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Venues can only match with artists")

    if payload.target_type == "artist":
        profile = db.get(ArtistProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artist not found")
        target_user_id = profile.user_id
    else:
        profile = db.get(VenueProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
        target_user_id = profile.user_id

    if target_user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot match with yourself")

    existing = (
        db.query(Match)
        .filter(Match.from_user_id == user.id, Match.to_user_id == target_user_id)
        .first()
    )
    if existing:
        return {"ok": True, "id": existing.id, "matched": has_reciprocal(db, user.id, target_user_id)}

    match = Match(
        id=str(uuid.uuid4()),
        from_user_id=user.id,
        to_user_id=target_user_id,
    )
    db.add(match)
    db.commit()
    return {"ok": True, "id": match.id, "matched": has_reciprocal(db, user.id, target_user_id)}


@router.post("/accept", status_code=status.HTTP_201_CREATED)
def accept_match(
    payload: MatchCreateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # This creates a reciprocal match if there's an incoming request.
    if user.role == UserRole.artist and payload.target_type != "venue":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artists can only match with venues")
    if user.role == UserRole.venue and payload.target_type != "artist":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Venues can only match with artists")

    if payload.target_type == "artist":
        profile = db.get(ArtistProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artist not found")
        target_user_id = profile.user_id
    else:
        profile = db.get(VenueProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
        target_user_id = profile.user_id

    incoming = (
        db.query(Match)
        .filter(Match.from_user_id == target_user_id, Match.to_user_id == user.id)
        .first()
    )
    if not incoming:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No incoming request to accept")

    existing = (
        db.query(Match)
        .filter(Match.from_user_id == user.id, Match.to_user_id == target_user_id)
        .first()
    )
    if existing:
        return {"ok": True, "id": existing.id, "matched": True}

    match = Match(
        id=str(uuid.uuid4()),
        from_user_id=user.id,
        to_user_id=target_user_id,
    )
    db.add(match)
    db.commit()
    return {"ok": True, "id": match.id, "matched": True}


@router.get("", response_model=list[MatchOut])
def list_matches(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items: list[MatchOut] = []
    reciprocal = aliased(Match)

    if user.role == UserRole.artist:
        rows = (
            db.query(Match, VenueProfile)
            .join(VenueProfile, VenueProfile.user_id == Match.to_user_id)
            .filter(Match.from_user_id == user.id)
            .filter(
                db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, venue in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="venue",
                    target_id=venue.id,
                    name=venue.venue_name,
                    city=venue.city,
                    state=venue.state,
                    created_at=match.created_at,
                )
            )
    else:
        rows = (
            db.query(Match, ArtistProfile)
            .join(ArtistProfile, ArtistProfile.user_id == Match.to_user_id)
            .filter(Match.from_user_id == user.id)
            .filter(
                db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, artist in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="artist",
                    target_id=artist.id,
                    name=artist.name,
                    city=artist.city,
                    state=artist.state,
                    created_at=match.created_at,
                )
            )
    return items


@router.delete("")
def delete_match(
    payload: MatchCreateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role == UserRole.artist and payload.target_type != "venue":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Artists can only unmatch with venues")
    if user.role == UserRole.venue and payload.target_type != "artist":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Venues can only unmatch with artists")

    if payload.target_type == "artist":
        profile = db.get(ArtistProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artist not found")
        target_user_id = profile.user_id
    else:
        profile = db.get(VenueProfile, payload.target_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found")
        target_user_id = profile.user_id

    db.query(Match).filter(
        Match.from_user_id == user.id, Match.to_user_id == target_user_id
    ).delete(synchronize_session=False)
    db.query(Match).filter(
        Match.from_user_id == target_user_id, Match.to_user_id == user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.get("/incoming", response_model=list[MatchOut])
def list_incoming(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items: list[MatchOut] = []
    reciprocal = aliased(Match)

    if user.role == UserRole.artist:
        rows = (
            db.query(Match, VenueProfile)
            .join(VenueProfile, VenueProfile.user_id == Match.from_user_id)
            .filter(Match.to_user_id == user.id)
            .filter(
                ~db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, venue in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="venue",
                    target_id=venue.id,
                    name=venue.venue_name,
                    city=venue.city,
                    state=venue.state,
                    created_at=match.created_at,
                )
            )
    else:
        rows = (
            db.query(Match, ArtistProfile)
            .join(ArtistProfile, ArtistProfile.user_id == Match.from_user_id)
            .filter(Match.to_user_id == user.id)
            .filter(
                ~db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, artist in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="artist",
                    target_id=artist.id,
                    name=artist.name,
                    city=artist.city,
                    state=artist.state,
                    created_at=match.created_at,
                )
            )
    return items


@router.get("/outgoing", response_model=list[MatchOut])
def list_outgoing(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items: list[MatchOut] = []
    reciprocal = aliased(Match)

    if user.role == UserRole.artist:
        rows = (
            db.query(Match, VenueProfile)
            .join(VenueProfile, VenueProfile.user_id == Match.to_user_id)
            .filter(Match.from_user_id == user.id)
            .filter(
                ~db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, venue in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="venue",
                    target_id=venue.id,
                    name=venue.venue_name,
                    city=venue.city,
                    state=venue.state,
                    created_at=match.created_at,
                )
            )
    else:
        rows = (
            db.query(Match, ArtistProfile)
            .join(ArtistProfile, ArtistProfile.user_id == Match.to_user_id)
            .filter(Match.from_user_id == user.id)
            .filter(
                ~db.query(reciprocal.id)
                .filter(
                    reciprocal.from_user_id == Match.to_user_id,
                    reciprocal.to_user_id == Match.from_user_id,
                )
                .exists()
            )
            .order_by(Match.created_at.desc())
            .all()
        )
        for match, artist in rows:
            items.append(
                MatchOut(
                    id=match.id,
                    target_type="artist",
                    target_id=artist.id,
                    name=artist.name,
                    city=artist.city,
                    state=artist.state,
                    created_at=match.created_at,
                )
            )
    return items
