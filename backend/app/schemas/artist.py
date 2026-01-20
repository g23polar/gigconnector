from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ArtistProfileIn(BaseModel):
    name: str
    bio: str = ""

    city: str = ""
    state: str = ""
    country: str = "US"

    zip_code: Optional[str] = None

    travel_radius_miles: int = 25

    min_rate: int = 0
    max_rate: int = 0

    min_draw: int = 0
    max_draw: int = 0

    media_links: Dict = Field(default_factory=dict)
    genre_names: List[str] = Field(default_factory=list)


class ArtistProfileOut(BaseModel):
    id: str
    name: str
    bio: str

    city: str
    state: str
    country: str
    zip_code: Optional[str] = None

    travel_radius_miles: int

    min_rate: int
    max_rate: int

    min_draw: int
    max_draw: int

    media_links: Dict
    genres: List[str]
