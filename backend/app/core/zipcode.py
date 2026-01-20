"""Zip code lookup utility using Zippopotam.us API."""

import time
from dataclasses import dataclass

import httpx


@dataclass
class ZipCodeResult:
    """Result from zip code lookup."""

    lat: float
    lng: float
    city: str
    state: str


# In-memory cache: zip_code -> (result, timestamp)
_cache: dict[str, tuple[ZipCodeResult | None, float]] = {}
CACHE_TTL_SECONDS = 86400  # 24 hours


async def lookup_zipcode(zip_code: str) -> ZipCodeResult | None:
    """
    Lookup coordinates and location info for a US zip code.

    Uses Zippopotam.us API with in-memory caching.
    Returns None if zip code is invalid or API fails.
    """
    if not zip_code:
        return None

    # Normalize zip code (take first 5 digits)
    zip_code = zip_code.strip()[:5]
    if not zip_code.isdigit() or len(zip_code) != 5:
        return None

    # Check cache
    now = time.time()
    if zip_code in _cache:
        result, cached_at = _cache[zip_code]
        if now - cached_at < CACHE_TTL_SECONDS:
            return result

    # Fetch from API
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://api.zippopotam.us/us/{zip_code}")
            if resp.status_code != 200:
                _cache[zip_code] = (None, now)
                return None

            data = resp.json()
            places = data.get("places", [])
            if not places:
                _cache[zip_code] = (None, now)
                return None

            place = places[0]
            result = ZipCodeResult(
                lat=float(place["latitude"]),
                lng=float(place["longitude"]),
                city=place["place name"],
                state=place["state abbreviation"],
            )
            _cache[zip_code] = (result, now)
            return result

    except Exception:
        # On any error, cache as None to avoid repeated failures
        _cache[zip_code] = (None, now)
        return None
