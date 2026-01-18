import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes._profile_utils import upsert_genres
from app.models.artist import ArtistProfile
from app.models.user import UserRole
from app.schemas.artist import ArtistProfileIn, ArtistProfileOut

router = APIRouter(prefix="/artist-profile", tags=["artist-profile"])


@router.get("/{artist_id}", response_model=ArtistProfileOut)
def get_artist_by_id(artist_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    prof = db.get(ArtistProfile, artist_id)
    if not prof:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    return ArtistProfileOut(
        id=prof.id, name=prof.name, bio=prof.bio,
        city=prof.city, state=prof.state, country=prof.country,
        travel_radius_miles=prof.travel_radius_miles,
        min_rate=prof.min_rate, max_rate=prof.max_rate,
        min_draw=prof.min_draw, max_draw=prof.max_draw,
        media_links=prof.media_links,
        genres=[g.name for g in prof.genres],
    )


@router.post("", response_model=ArtistProfileOut)
def create_or_update_artist_profile(
    payload: ArtistProfileIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != UserRole.artist:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only artists can edit artist profile")

    prof = db.query(ArtistProfile).filter(ArtistProfile.user_id == user.id).first()
    if not prof:
        prof = ArtistProfile(id=str(uuid.uuid4()), user_id=user.id, name=payload.name)
        db.add(prof)

    prof.name = payload.name
    prof.bio = payload.bio
    prof.city = payload.city
    prof.state = payload.state
    prof.country = payload.country

    prof.travel_radius_miles = payload.travel_radius_miles
    prof.min_rate = payload.min_rate
    prof.max_rate = payload.max_rate
    prof.min_draw = payload.min_draw
    prof.max_draw = payload.max_draw
    prof.media_links = payload.media_links

    prof.lat = payload.lat
    prof.lng = payload.lng


    prof.genres = upsert_genres(db, payload.genre_names)

    db.commit()
    db.refresh(prof)

    return ArtistProfileOut(
        id=prof.id,
        name=prof.name,
        bio=prof.bio,
        city=prof.city,
        state=prof.state,
        country=prof.country,
        travel_radius_miles=prof.travel_radius_miles,
        min_rate=prof.min_rate,
        max_rate=prof.max_rate,
        min_draw=prof.min_draw,
        max_draw=prof.max_draw,
        media_links=prof.media_links,
        genres=[g.name for g in prof.genres],
    )


@router.get("/me", response_model=ArtistProfileOut)
def get_my_artist_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    prof = db.query(ArtistProfile).filter(ArtistProfile.user_id == user.id).first()
    if not prof:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artist profile not found")

    return ArtistProfileOut(
        id=prof.id,
        name=prof.name,
        bio=prof.bio,
        city=prof.city,
        state=prof.state,
        country=prof.country,
        travel_radius_miles=prof.travel_radius_miles,
        min_rate=prof.min_rate,
        max_rate=prof.max_rate,
        min_draw=prof.min_draw,
        max_draw=prof.max_draw,
        media_links=prof.media_links,
        genres=[g.name for g in prof.genres],
    )
