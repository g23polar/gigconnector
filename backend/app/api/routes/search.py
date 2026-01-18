from fastapi import APIRouter, Depends, Query
from sqlalchemy import Float, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.artist import ArtistProfile
from app.models.genre import Genre
from app.models.venue import VenueProfile

router = APIRouter(prefix="/search", tags=["search"])

# Earth radius in miles
EARTH_RADIUS_MI = 3958.7613


def haversine_miles(lat1: float, lng1: float, lat2_col, lng2_col):
    """
    Returns a SQLAlchemy expression computing great-circle distance in miles.
    Uses the spherical law of cosines (sufficient for MVP).
    """
    return EARTH_RADIUS_MI * func.acos(
        func.least(
            1.0,
            func.greatest(
                -1.0,
                func.cos(func.radians(lat1))
                * func.cos(func.radians(lat2_col))
                * func.cos(func.radians(lng2_col) - func.radians(lng1))
                + func.sin(func.radians(lat1)) * func.sin(func.radians(lat2_col)),
            ),
        )
    )


@router.get("/artists")
def search_artists(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    genres: list[str] = Query(default=[]),
    min_draw: int | None = None,
    max_rate: int | None = None,
    distance_miles: int | None = None,
    lat: float | None = None,
    lng: float | None = None,
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

    distance_expr = None
    if distance_miles is not None and lat is not None and lng is not None:
        q = q.filter(ArtistProfile.lat.isnot(None), ArtistProfile.lng.isnot(None))
        distance_expr = haversine_miles(lat, lng, ArtistProfile.lat, ArtistProfile.lng).label("distance_miles")
        q = q.add_columns(distance_expr).filter(distance_expr <= float(distance_miles))

    if sort == "distance" and distance_expr is not None:
        q = q.order_by(distance_expr.asc())
    elif sort == "draw":
        q = q.order_by(ArtistProfile.max_draw.desc())
    elif sort == "rate":
        q = q.order_by(ArtistProfile.min_rate.asc())

    q = q.offset((page - 1) * page_size).limit(page_size)

    rows = q.all()
    items = []
    for row in rows:
        if distance_expr is None:
            a = row
            dist = None
        else:
            a, dist = row[0], float(row[1]) if row[1] is not None else None

        items.append(
            {
                "id": a.id,
                "name": a.name,
                "city": a.city,
                "state": a.state,
                "lat": a.lat,
                "lng": a.lng,
                "distance_miles": dist,
                "min_rate": a.min_rate,
                "max_rate": a.max_rate,
                "min_draw": a.min_draw,
                "max_draw": a.max_draw,
                "genres": [g.name for g in a.genres],
                "media_links": a.media_links,
            }
        )
    return items


@router.get("/venues")
def search_venues(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    genres: list[str] = Query(default=[]),
    min_capacity: int | None = None,
    budget_max: int | None = None,
    distance_miles: int | None = None,
    lat: float | None = None,
    lng: float | None = None,
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

    distance_expr = None
    if distance_miles is not None and lat is not None and lng is not None:
        q = q.filter(VenueProfile.lat.isnot(None), VenueProfile.lng.isnot(None))
        distance_expr = haversine_miles(lat, lng, VenueProfile.lat, VenueProfile.lng).label("distance_miles")
        q = q.add_columns(distance_expr).filter(distance_expr <= float(distance_miles))

    if sort == "distance" and distance_expr is not None:
        q = q.order_by(distance_expr.asc())
    elif sort == "capacity":
        q = q.order_by(VenueProfile.capacity.desc())
    elif sort == "budget":
        q = q.order_by(VenueProfile.max_budget.desc())

    q = q.offset((page - 1) * page_size).limit(page_size)

    rows = q.all()
    items = []
    for row in rows:
        if distance_expr is None:
            v = row
            dist = None
        else:
            v, dist = row[0], float(row[1]) if row[1] is not None else None

        items.append(
            {
                "id": v.id,
                "venue_name": v.venue_name,
                "city": v.city,
                "state": v.state,
                "lat": v.lat,
                "lng": v.lng,
                "distance_miles": dist,
                "capacity": v.capacity,
                "min_budget": v.min_budget,
                "max_budget": v.max_budget,
                "genres": [g.name for g in v.genres],
                "amenities": v.amenities,
            }
        )
    return items
