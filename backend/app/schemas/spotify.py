from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class SpotifyAuthURL(BaseModel):
    url: str


class SpotifyConnectionOut(BaseModel):
    connected: bool
    spotify_artist_id: Optional[str] = None
    spotify_data: dict[str, Any] = {}
    data_fetched_at: Optional[datetime] = None


class SpotifyTopTrack(BaseModel):
    name: str
    preview_url: Optional[str] = None
    album_name: Optional[str] = None
    album_image: Optional[str] = None
    duration_ms: Optional[int] = None
    track_url: Optional[str] = None


class SpotifyRelease(BaseModel):
    name: str
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    album_type: Optional[str] = None
    image: Optional[str] = None
    url: Optional[str] = None


class SpotifyPublicData(BaseModel):
    connected: bool = False
    spotify_artist_id: Optional[str] = None
    monthly_listeners: Optional[int] = None
    followers: Optional[int] = None
    popularity: Optional[int] = None
    genres: list[str] = []
    images: list[dict[str, Any]] = []
    top_tracks: list[SpotifyTopTrack] = []
    recent_releases: list[SpotifyRelease] = []
    artist_url: Optional[str] = None


class SpotifySetArtistId(BaseModel):
    spotify_artist_id: str
