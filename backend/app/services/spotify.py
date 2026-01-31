from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.models.spotify_connection import SpotifyConnection
from app.core.config import settings

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SCOPES = "user-read-private user-top-read"
DATA_TTL_HOURS = 24


def get_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
        "show_dialog": "true",
    }
    return f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    resp = httpx.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            "client_id": settings.SPOTIFY_CLIENT_ID,
            "client_secret": settings.SPOTIFY_CLIENT_SECRET,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    resp = httpx.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.SPOTIFY_CLIENT_ID,
            "client_secret": settings.SPOTIFY_CLIENT_SECRET,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def _ensure_valid_token(db: Session, conn: SpotifyConnection) -> str:
    now = datetime.now(timezone.utc)
    if conn.token_expires_at > now + timedelta(minutes=1):
        return conn.access_token

    token_data = refresh_access_token(conn.refresh_token)
    conn.access_token = token_data["access_token"]
    conn.token_expires_at = now + timedelta(seconds=token_data["expires_in"])
    if "refresh_token" in token_data:
        conn.refresh_token = token_data["refresh_token"]
    db.commit()
    return conn.access_token


def _spotify_get(access_token: str, path: str) -> dict:
    resp = httpx.get(
        f"{SPOTIFY_API_BASE}{path}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_and_cache_spotify_data(db: Session, conn: SpotifyConnection) -> dict:
    access_token = _ensure_valid_token(db, conn)

    data: dict[str, Any] = {}

    me = _spotify_get(access_token, "/me")
    data["display_name"] = me.get("display_name")
    data["spotify_url"] = me.get("external_urls", {}).get("spotify")
    if conn.spotify_data and "monthly_listeners" in conn.spotify_data:
        data["monthly_listeners"] = conn.spotify_data.get("monthly_listeners")

    if conn.spotify_artist_id:
        artist = _spotify_get(access_token, f"/artists/{conn.spotify_artist_id}")
        data["followers"] = artist.get("followers", {}).get("total")
        data["genres"] = artist.get("genres", [])
        data["popularity"] = artist.get("popularity")
        data["images"] = artist.get("images", [])
        data["artist_name"] = artist.get("name")
        data["artist_url"] = artist.get("external_urls", {}).get("spotify")

        top_tracks_resp = _spotify_get(
            access_token,
            f"/artists/{conn.spotify_artist_id}/top-tracks?market=US",
        )
        tracks = []
        for t in top_tracks_resp.get("tracks", [])[:10]:
            tracks.append(
                {
                    "name": t.get("name"),
                    "preview_url": t.get("preview_url"),
                    "album_name": t.get("album", {}).get("name"),
                    "album_image": (
                        t.get("album", {}).get("images", [{}])[0].get("url")
                        if t.get("album", {}).get("images")
                        else None
                    ),
                    "duration_ms": t.get("duration_ms"),
                    "track_url": t.get("external_urls", {}).get("spotify"),
                }
            )
        data["top_tracks"] = tracks

        albums_resp = _spotify_get(
            access_token,
            f"/artists/{conn.spotify_artist_id}/albums?include_groups=album,single&market=US&limit=10",
        )
        seen_albums: set[str] = set()
        releases = []
        for album in albums_resp.get("items", []):
            album_id = album.get("id")
            if not album_id or album_id in seen_albums:
                continue
            seen_albums.add(album_id)
            releases.append(
                {
                    "name": album.get("name"),
                    "release_date": album.get("release_date"),
                    "release_date_precision": album.get("release_date_precision"),
                    "album_type": album.get("album_type"),
                    "image": (
                        album.get("images", [{}])[0].get("url")
                        if album.get("images")
                        else None
                    ),
                    "url": album.get("external_urls", {}).get("spotify"),
                }
            )
        data["recent_releases"] = releases[:8]
    else:
        data["monthly_listeners"] = data.get("monthly_listeners")
        data["followers"] = None
        data["top_tracks"] = []
        data["recent_releases"] = []

    conn.spotify_data = data
    conn.data_fetched_at = datetime.now(timezone.utc)
    db.commit()
    return data


def get_spotify_data_if_fresh(db: Session, conn: SpotifyConnection) -> dict:
    now = datetime.now(timezone.utc)
    if (
        conn.data_fetched_at
        and conn.spotify_data
        and (now - conn.data_fetched_at).total_seconds() < DATA_TTL_HOURS * 3600
    ):
        return conn.spotify_data
    return fetch_and_cache_spotify_data(db, conn)
