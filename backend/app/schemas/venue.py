from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class VenueProfileIn(BaseModel):
    venue_name: str
    description: str = ""

    address: str = ""
    city: str = ""
    state: str = ""
    country: str = "US"

    lat: Optional[float] = None
    lng: Optional[float] = None

    capacity: int = 0
    min_budget: int = 0
    max_budget: int = 0

    amenities: Dict = Field(default_factory=dict)
    genre_names: List[str] = Field(default_factory=list)


class VenueProfileOut(BaseModel):
    id: str
    venue_name: str
    description: str

    city: str
    state: str
    country: str

    capacity: int
    min_budget: int
    max_budget: int

    amenities: Dict
    genres: List[str]
