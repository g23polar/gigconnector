import uuid
from datetime import date as dt_date, datetime as dt_datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from icalendar import Calendar
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.event import Event
from app.models.user import UserRole
from app.models.venue import VenueProfile
from app.schemas.event import EventImportResult, EventIn, EventOut, EventPublicOut

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventPublicOut])
def list_events(
    include_past: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Event, VenueProfile).join(VenueProfile, VenueProfile.id == Event.venue_profile_id)
    if not include_past:
        q = q.filter(Event.date >= dt_date.today())
    q = q.order_by(Event.date.asc())

    rows = q.all()
    return [
        EventPublicOut(
            id=e.id,
            title=e.title,
            description=e.description,
            date=e.date,
            venue_id=v.id,
            venue_name=v.venue_name,
            city=v.city,
            state=v.state,
        )
        for e, v in rows
    ]


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in (UserRole.venue, UserRole.admin):
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


@router.post("/import", response_model=EventImportResult)
async def import_events(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in (UserRole.venue, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only venues can import events",
        )

    prof = db.query(VenueProfile).filter(VenueProfile.user_id == user.id).first()
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue profile not found",
        )

    # Validate content type
    if file.content_type and file.content_type not in (
        "text/calendar",
        "application/octet-stream",
        "text/plain",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an .ics (iCalendar) file",
        )

    # Read with size limit (2 MB)
    MAX_SIZE = 2 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 2 MB.",
        )
    if not contents.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    # Parse .ics
    try:
        cal = Calendar.from_ical(contents)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid .ics file. Could not parse calendar data.",
        )

    # Load existing events for duplicate detection
    existing = (
        db.query(Event.title, Event.date)
        .filter(Event.venue_profile_id == prof.id)
        .all()
    )
    existing_set = {(row.title, row.date) for row in existing}

    imported = 0
    skipped = 0
    errors: list[str] = []

    for i, component in enumerate(cal.walk()):
        if component.name != "VEVENT":
            continue

        # SUMMARY -> title
        raw_title = component.get("SUMMARY")
        if not raw_title:
            errors.append(f"Event #{i + 1}: missing title, skipped")
            skipped += 1
            continue
        title = str(raw_title).strip()
        if not title:
            errors.append(f"Event #{i + 1}: empty title, skipped")
            skipped += 1
            continue
        if len(title) > 200:
            title = title[:200]
            errors.append(f"Event '{title[:30]}...': title truncated to 200 characters")

        # DTSTART -> date
        dt_prop = component.get("DTSTART")
        if not dt_prop:
            errors.append(f"Event '{title[:50]}': missing date, skipped")
            skipped += 1
            continue
        dt_val = dt_prop.dt
        if isinstance(dt_val, dt_datetime):
            event_date = dt_val.date()
        elif isinstance(dt_val, dt_date):
            event_date = dt_val
        else:
            errors.append(f"Event '{title[:50]}': unrecognized date format, skipped")
            skipped += 1
            continue

        # DESCRIPTION -> description (optional)
        raw_desc = component.get("DESCRIPTION")
        description = str(raw_desc).strip() if raw_desc else ""

        # Duplicate check
        if (title, event_date) in existing_set:
            skipped += 1
            continue

        event = Event(
            id=str(uuid.uuid4()),
            venue_profile_id=prof.id,
            title=title,
            description=description,
            date=event_date,
        )
        db.add(event)
        existing_set.add((title, event_date))
        imported += 1

    db.commit()
    return EventImportResult(imported=imported, skipped=skipped, errors=errors)


@router.get("/mine", response_model=list[EventOut])
def list_my_events(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role not in (UserRole.venue, UserRole.admin):
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
    if user.role not in (UserRole.venue, UserRole.admin):
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
