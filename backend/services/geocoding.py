import httpx

from backend.config import settings
from backend.schemas.weather import SearchResult
from backend.services.http_client import create_http_client


async def search_cities(query: str, limit: int = 8) -> list[SearchResult]:
    if not query or len(query.strip()) < 2:
        return []

    params = {
        "name": query.strip(),
        "count": limit,
        "language": "en",
        "format": "json",
    }

    async with create_http_client() as client:
        response = await client.get(settings.open_meteo_geocoding_url, params=params)
        response.raise_for_status()
        payload = response.json()

    results: list[SearchResult] = []
    for item in payload.get("results") or []:
        lat = item.get("latitude")
        lon = item.get("longitude")
        name = item.get("name")
        if lat is None or lon is None or not name:
            continue
        country = item.get("country") or item.get("country_code") or ""
        timezone = item.get("timezone") or "UTC"
        result_id = f"{lat:.4f},{lon:.4f}"
        results.append(
            SearchResult(
                id=result_id,
                name=name,
                country=country,
                lat=float(lat),
                lon=float(lon),
                timezone=timezone,
            )
        )
    return results
