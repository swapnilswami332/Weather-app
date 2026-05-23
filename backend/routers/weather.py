import logging

from fastapi import APIRouter, HTTPException, Query

from backend.config import settings
from backend.schemas.response import error_response
from backend.schemas.weather import SearchResponse, WeatherResponse
from backend.services.cache import WeatherCache
from backend.services.geocoding import search_cities
from backend.services.open_meteo import fetch_weather

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["weather"])
weather_cache = WeatherCache(ttl_seconds=settings.cache_ttl_seconds)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "atmos-weather"}


@router.get("/search", response_model=SearchResponse)
async def search(q: str = Query(..., min_length=2, max_length=80)):
    try:
        results = await search_cities(q)
        return SearchResponse(results=results)
    except Exception as exc:
        logger.exception("Search failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=error_response("City search is temporarily unavailable", "UPSTREAM_ERROR"),
        ) from exc


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    timezone: str = Query(default="auto"),
    name: str | None = Query(default=None),
    country: str | None = Query(default=None),
):
    display_name = name or settings.default_city_name
    display_country = country or settings.default_city_country
    tz = timezone if timezone else "auto"

    cached = weather_cache.get_valid(lat, lon)
    if cached:
        cached["meta"]["cache_hit"] = True
        cached["meta"]["stale"] = False
        if name:
            cached["location"]["name"] = display_name
        if country:
            cached["location"]["country"] = display_country
        return WeatherResponse(**cached)

    try:
        weather = await fetch_weather(
            lat=lat,
            lon=lon,
            timezone=tz,
            name=display_name,
            country=display_country,
        )
        payload = weather.model_dump()
        weather_cache.set(lat, lon, payload)
        return weather
    except Exception as exc:
        logger.exception("Weather fetch failed: %s", exc)
        stale = weather_cache.get_stale(lat, lon)
        if stale:
            stale_copy = dict(stale)
            stale_copy["meta"] = dict(stale_copy.get("meta", {}))
            stale_copy["meta"]["stale"] = True
            stale_copy["meta"]["cache_hit"] = True
            if name:
                stale_copy["location"] = dict(stale_copy.get("location", {}))
                stale_copy["location"]["name"] = display_name
            if country:
                stale_copy["location"] = dict(stale_copy.get("location", {}))
                stale_copy["location"]["country"] = display_country
            return WeatherResponse(**stale_copy)

        raise HTTPException(
            status_code=502,
            detail=error_response("Weather data is temporarily unavailable", "UPSTREAM_ERROR"),
        ) from exc
