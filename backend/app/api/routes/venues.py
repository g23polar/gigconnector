import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes._profile_utils import upsert_genres
from app.models.user import UserRole
from app.models.venue import VenueProfile
from app.schemas.event import EventOut
from app.schemas.venue import VenueProfileIn, VenueProfileOut

router = APIRouter(prefix="/venue-profile", tags=["venue-profile"])


@router.post("", response_model=VenueProfileOut)
def create_or_update_venue_profile(
    payload: VenueProfileIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != UserRole.venue:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only venues can edit venue profile")

    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        prof = VenueProfile(id=str(uuid.uuid4()), user_id=user.id, venue_name=payload.venue_name)
        db.add(prof)

    prof.venue_name = payload.venue_name
    prof.description = payload.description
    prof.address = payload.address
    prof.city = payload.city
    prof.state = payload.state
    prof.country = payload.country

    prof.capacity = payload.capacity
    prof.min_budget = payload.min_budget
    prof.max_budget = payload.max_budget
    prof.amenities = payload.amenities

    prof.zip_code = payload.zip_code

    prof.genres = upsert_genres(db, payload.genre_names)

    db.commit()
    db.refresh(prof)

    return VenueProfileOut(
        id=prof.id,
        venue_name=prof.venue_name,
        description=prof.description,
        address=prof.address,
        city=prof.city,
        state=prof.state,
        country=prof.country,
        zip_code=prof.zip_code,
        capacity=prof.capacity,
        min_budget=prof.min_budget,
        max_budget=prof.max_budget,
        amenities=prof.amenities,
        genres=[g.name for g in prof.genres],
        events=[EventOut(id=e.id, title=e.title, description=e.description, date=e.date) for e in prof.events],
    )


@router.get("/me", response_model=VenueProfileOut)
def get_my_venue_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue profile not found")

    return VenueProfileOut(
        id=prof.id,
        venue_name=prof.venue_name,
        description=prof.description,
        address=prof.address,
        city=prof.city,
        state=prof.state,
        country=prof.country,
        zip_code=prof.zip_code,
        capacity=prof.capacity,
        min_budget=prof.min_budget,
        max_budget=prof.max_budget,
        amenities=prof.amenities,
        genres=[g.name for g in prof.genres],
        events=[EventOut(id=e.id, title=e.title, description=e.description, date=e.date) for e in prof.events],
    )


@router.get("/{venue_id}", response_model=VenueProfileOut)
def get_venue_by_id(venue_id: str, db: Session = Depends(get_db)):
    prof = db.get(VenueProfile, venue_id)
    if not prof:
        raise HTTPException(status_code=404, detail="Venue profile not found")
    return VenueProfileOut(
        id=prof.id, venue_name=prof.venue_name, description=prof.description,
        address=prof.address, city=prof.city, state=prof.state, country=prof.country,
        zip_code=prof.zip_code,
        capacity=prof.capacity,
        min_budget=prof.min_budget, max_budget=prof.max_budget,
        amenities=prof.amenities,
        genres=[g.name for g in prof.genres],
        events=[EventOut(id=e.id, title=e.title, description=e.description, date=e.date) for e in prof.events],
    )
