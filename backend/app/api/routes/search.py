import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.zipcode import lookup_zipcode
from app.models.artist import ArtistProfile
from app.models.genre import Genre
from app.models.venue import VenueProfile

router = APIRouter(prefix="/search", tags=["search"])

# Earth radius in miles
EARTH_RADIUS_MI = 3958.7613


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute great-circle distance in miles using haversine formula."""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_MI * c


@router.get("/artists")
async def search_artists(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
    genres: list[str] = Query(default=[]),
    min_draw: int | None = None,
    max_rate: int | None = None,
    distance_miles: int | None = None,
    zip_code: str | None = None,
    sort: str = "distance",  # distance|draw|rate
    page: int = 1,
    page_size: int = 20,
):
    q = db.query(ArtistProfile)

    if genres:
        q = q.join(ArtistProfile.genres).filter(Genre.name.in_([g.strip().lower() for g in genres]))

    if min_draw is not None:
        q = q.filter(ArtistProfile.max_draw >= min_draw)

    if max_rate is not None:
        q = q.filter(or_(ArtistProfile.min_rate == 0, ArtistProfile.min_rate <= max_rate))

    # Lookup searcher's coordinates from zip code
    search_coords = None
    if distance_miles is not None and zip_code:
        search_coords = await lookup_zipcode(zip_code)
        if search_coords:
            # Only include artists with zip codes when filtering by distance
            q = q.filter(ArtistProfile.zip_code.isnot(None))

    # For distance filtering, we need to fetch candidates and filter in Python
    # since artist coordinates come from their zip_code lookup
    if sort == "draw":
        q = q.order_by(ArtistProfile.max_draw.desc())
    elif sort == "rate":
        q = q.order_by(ArtistProfile.min_rate.asc())

    # Fetch more than needed to allow for distance filtering
    fetch_limit = page_size * 5 if search_coords else page_size
    offset = (page - 1) * page_size if not search_coords else 0
    candidates = q.offset(offset).limit(fetch_limit).all()

    items = []
    for a in candidates:
        dist = None

        # Calculate distance if we have search coordinates
        if search_coords and a.zip_code:
            artist_coords = await lookup_zipcode(a.zip_code)
            if artist_coords:
                dist = haversine_miles(
                    search_coords.lat, search_coords.lng,
                    artist_coords.lat, artist_coords.lng
                )
                # Filter by distance
                if distance_miles is not None and dist > distance_miles:
                    continue

        items.append({
            "id": a.id,
            "name": a.name,
            "city": a.city,
            "state": a.state,
            "zip_code": a.zip_code,
            "distance_miles": round(dist, 1) if dist is not None else None,
            "min_rate": a.min_rate,
            "max_rate": a.max_rate,
            "min_draw": a.min_draw,
            "max_draw": a.max_draw,
            "genres": [g.name for g in a.genres],
            "media_links": a.media_links,
        })

    # Sort by distance if requested
    if sort == "distance" and search_coords:
        items.sort(key=lambda x: x["distance_miles"] if x["distance_miles"] is not None else float("inf"))

    # Paginate after distance filtering
    if search_coords:
        start = (page - 1) * page_size
        items = items[start : start + page_size]

    return items


@router.get("/venues")
async def search_venues(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
    genres: list[str] = Query(default=[]),
    min_capacity: int | None = None,
    budget_max: int | None = None,
    distance_miles: int | None = None,
    zip_code: str | None = None,
    sort: str = "distance",  # distance|capacity|budget
    page: int = 1,
    page_size: int = 20,
):
    q = db.query(VenueProfile)

    if genres:
        q = q.join(VenueProfile.genres).filter(Genre.name.in_([g.strip().lower() for g in genres]))

    if min_capacity is not None:
        q = q.filter(VenueProfile.capacity >= min_capacity)

    if budget_max is not None:
        q = q.filter(or_(VenueProfile.min_budget == 0, VenueProfile.min_budget <= budget_max))

    # Lookup searcher's coordinates from zip code
    search_coords = None
    if distance_miles is not None and zip_code:
        search_coords = await lookup_zipcode(zip_code)
        if search_coords:
            q = q.filter(VenueProfile.zip_code.isnot(None))

    if sort == "capacity":
        q = q.order_by(VenueProfile.capacity.desc())
    elif sort == "budget":
        q = q.order_by(VenueProfile.max_budget.desc())

    fetch_limit = page_size * 5 if search_coords else page_size
    offset = (page - 1) * page_size if not search_coords else 0
    candidates = q.offset(offset).limit(fetch_limit).all()

    items = []
    for v in candidates:
        dist = None

        if search_coords and v.zip_code:
            venue_coords = await lookup_zipcode(v.zip_code)
            if venue_coords:
                dist = haversine_miles(
                    search_coords.lat, search_coords.lng,
                    venue_coords.lat, venue_coords.lng
                )
                if distance_miles is not None and dist > distance_miles:
                    continue

        items.append({
            "id": v.id,
            "venue_name": v.venue_name,
            "city": v.city,
            "state": v.state,
            "zip_code": v.zip_code,
            "distance_miles": round(dist, 1) if dist is not None else None,
            "capacity": v.capacity,
            "min_budget": v.min_budget,
            "max_budget": v.max_budget,
            "genres": [g.name for g in v.genres],
            "amenities": v.amenities,
        })

    if sort == "distance" and search_coords:
        items.sort(key=lambda x: x["distance_miles"] if x["distance_miles"] is not None else float("inf"))

    if search_coords:
        start = (page - 1) * page_size
        items = items[start : start + page_size]

    return items
