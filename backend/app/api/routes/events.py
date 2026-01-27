import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.event import Event
from app.models.user import UserRole
from app.models.venue import VenueProfile
from app.schemas.event import EventIn, EventOut

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != UserRole.venue:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only venues can create events",
        )

    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue profile not found",
        )

    event = Event(
        id=str(uuid.uuid4()),
        venue_profile_id=prof.id,
        title=payload.title,
        description=payload.description,
        date=payload.date,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return EventOut(
        id=event.id,
        title=event.title,
        description=event.description,
        date=event.date,
    )


@router.get("/mine", response_model=list[EventOut])
def list_my_events(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != UserRole.venue:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only venues can view their events",
        )

    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        return []

    events = (
        db.query(Event)
        .filter(Event.venue_profile_id == prof.id)
        .order_by(Event.date.asc())
        .all()
    )
    return [
        EventOut(id=e.id, title=e.title, description=e.description, date=e.date)
        for e in events
    ]


@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != UserRole.venue:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only venues can delete events",
        )

    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue profile not found",
        )

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.venue_profile_id == prof.id)
        .first()
    )
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    db.delete(event)
    db.commit()
    return {"ok": True}
