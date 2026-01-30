from typing import List, Optional

from pydantic import BaseModel


class VenueLeaderboardEntry(BaseModel):
    venue_profile_id: str
    venue_name: str
    city: str
    state: str
    total_gigs: int
    verified_gigs: int
    total_attendance: Optional[int] = None
    avg_attendance: Optional[float] = None
    total_tickets_sold: Optional[int] = None
    total_gross_revenue_cents: Optional[int] = None
    unique_artists: int


class ArtistLeaderboardEntry(BaseModel):
    artist_profile_id: str
    artist_name: str
    city: str
    state: str
    total_gigs: int
    verified_gigs: int
    total_attendance: Optional[int] = None
    avg_attendance: Optional[float] = None
    total_tickets_sold: Optional[int] = None
    unique_venues: int


class LeaderboardOut(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    venues: List[VenueLeaderboardEntry]
    artists: List[ArtistLeaderboardEntry]
