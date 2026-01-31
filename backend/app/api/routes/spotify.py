import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.artist import ArtistProfile
from app.models.spotify_connection import SpotifyConnection
from app.models.user import User, UserRole
from app.schemas.spotify import (
    SpotifyAuthURL,
    SpotifyConnectionOut,
    SpotifyPublicData,
    SpotifySetArtistId,
)
from app.services.spotify import (
    exchange_code_for_tokens,
    fetch_and_cache_spotify_data,
    get_authorize_url,
    get_spotify_data_if_fresh,
)

router = APIRouter(prefix="/spotify", tags=["spotify"])


def _get_artist_profile(db: Session, user: User) -> ArtistProfile:
    prof = (
        db.query(ArtistProfile)
        .filter(ArtistProfile.user_id == user.id)
        .first()
    )
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create an artist profile first",
        )
    return prof


@router.get("/authorize", response_model=SpotifyAuthURL)
def spotify_authorize(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.SPOTIFY_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Spotify integration not configured",
        )
    if user.role not in (UserRole.artist, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only artists can connect Spotify",
        )
    _get_artist_profile(db, user)

    state_payload = {
        "sub": user.id,
        "purpose": "spotify_oauth",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    state = jwt.encode(
        state_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALG
    )
    url = get_authorize_url(state)
    return SpotifyAuthURL(url=url)


@router.get("/callback")
def spotify_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    # Validate state JWT
    try:
        payload = jwt.decode(
            state, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALG]
        )
        user_id = payload.get("sub")
        purpose = payload.get("purpose")
        if not user_id or purpose != "spotify_oauth":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state parameter",
        )

    prof = (
        db.query(ArtistProfile)
        .filter(ArtistProfile.user_id == user_id)
        .first()
    )
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artist profile not found",
        )

    # Exchange code for tokens
    try:
        token_data = exchange_code_for_tokens(code)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange Spotify authorization code",
        )

    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in = token_data["expires_in"]
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Fetch Spotify user profile
    try:
        me_resp = httpx.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        me_resp.raise_for_status()
        me = me_resp.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch Spotify user profile",
        )

    spotify_user_id = me["id"]

    # Upsert SpotifyConnection
    conn = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.artist_profile_id == prof.id)
        .first()
    )
    if conn:
        conn.spotify_user_id = spotify_user_id
        conn.access_token = access_token
        conn.refresh_token = refresh_token
        conn.token_expires_at = token_expires_at
    else:
        conn = SpotifyConnection(
            id=str(uuid.uuid4()),
            artist_profile_id=prof.id,
            spotify_user_id=spotify_user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
        )
        db.add(conn)

    db.commit()

    # Redirect to frontend profile page
    origins = settings.CORS_ORIGINS.split(",")
    frontend_origin = origins[0].strip() if origins else "http://localhost:5173"
    return RedirectResponse(
        url=f"{frontend_origin}/profile/artist?spotify=connected",
        status_code=302,
    )


@router.get("/connection", response_model=SpotifyConnectionOut)
def get_my_spotify_connection(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prof = (
        db.query(ArtistProfile)
        .filter(ArtistProfile.user_id == user.id)
        .first()
    )
    if not prof:
        return SpotifyConnectionOut(connected=False)

    conn = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.artist_profile_id == prof.id)
        .first()
    )
    if not conn:
        return SpotifyConnectionOut(connected=False)

    data = get_spotify_data_if_fresh(db, conn)
    return SpotifyConnectionOut(
        connected=True,
        spotify_artist_id=conn.spotify_artist_id,
        spotify_data=data,
        data_fetched_at=conn.data_fetched_at,
    )


@router.post("/artist-id", response_model=SpotifyConnectionOut)
def set_spotify_artist_id(
    payload: SpotifySetArtistId,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prof = _get_artist_profile(db, user)
    conn = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.artist_profile_id == prof.id)
        .first()
    )
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spotify not connected",
        )

    conn.spotify_artist_id = payload.spotify_artist_id
    db.commit()

    data = fetch_and_cache_spotify_data(db, conn)
    return SpotifyConnectionOut(
        connected=True,
        spotify_artist_id=conn.spotify_artist_id,
        spotify_data=data,
        data_fetched_at=conn.data_fetched_at,
    )


@router.delete("/connection")
def disconnect_spotify(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prof = _get_artist_profile(db, user)
    conn = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.artist_profile_id == prof.id)
        .first()
    )
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Spotify connection",
        )

    db.delete(conn)
    db.commit()
    return {"ok": True}


@router.get("/public/{artist_profile_id}", response_model=SpotifyPublicData)
def get_artist_spotify_public(
    artist_profile_id: str,
    db: Session = Depends(get_db),
):
    conn = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.artist_profile_id == artist_profile_id)
        .first()
    )
    if not conn or not conn.spotify_data:
        return SpotifyPublicData(connected=False)

    data = conn.spotify_data
    top_tracks = [
        {
            "name": t.get("name", ""),
            "preview_url": t.get("preview_url"),
            "album_name": t.get("album_name"),
            "album_image": t.get("album_image"),
            "duration_ms": t.get("duration_ms"),
            "track_url": t.get("track_url"),
        }
        for t in data.get("top_tracks", [])
    ]

    return SpotifyPublicData(
        connected=True,
        spotify_artist_id=conn.spotify_artist_id,
        followers=data.get("followers"),
        popularity=data.get("popularity"),
        genres=data.get("genres", []),
        images=data.get("images", []),
        top_tracks=top_tracks,
        artist_url=data.get("artist_url"),
    )
