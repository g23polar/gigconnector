from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class GigCreateIn(BaseModel):
    artist_profile_id: str
    venue_profile_id: str
    title: str = Field(..., min_length=1, max_length=200)
    date: date


class GigOut(BaseModel):
    id: str
    artist_profile_id: str
    venue_profile_id: str
    artist_name: str
    venue_name: str
    title: str
    date: date
    status: Literal["upcoming", "completed", "cancelled"]
    tickets_sold: Optional[int] = None
    attendance: Optional[int] = None
    ticket_price_cents: Optional[int] = None
    gross_revenue_cents: Optional[int] = None
    artist_confirmed: bool
    venue_confirmed: bool
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime


class GigMetricsIn(BaseModel):
    tickets_sold: Optional[int] = Field(None, ge=0)
    attendance: Optional[int] = Field(None, ge=0)
    ticket_price_cents: Optional[int] = Field(None, ge=0)
    gross_revenue_cents: Optional[int] = Field(None, ge=0)


class GigStatusIn(BaseModel):
    status: Literal["completed", "cancelled"]


class GigHistoryItem(BaseModel):
    gig_id: str
    venue_name: str
    date: date
    attendance: Optional[int] = None
    tickets_sold: Optional[int] = None
    verified: bool


class ArtistStatsOut(BaseModel):
    artist_profile_id: str
    artist_name: str
    total_gigs: int
    verified_gigs: int
    avg_attendance: Optional[float] = None
    avg_tickets_sold: Optional[float] = None
    total_tickets_sold: Optional[int] = None
    unique_venues_count: int
    gig_history: List[GigHistoryItem]
