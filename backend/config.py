import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:8000,http://localhost:8000",
        ).split(",")
        if o.strip()
    ]
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "600"))
    request_timeout_sec: float = float(os.getenv("REQUEST_TIMEOUT_SEC", "25"))
    default_city_name: str = os.getenv("DEFAULT_CITY_NAME", "London")
    default_city_country: str = os.getenv("DEFAULT_CITY_COUNTRY", "United Kingdom")
    default_lat: float = float(os.getenv("DEFAULT_LAT", "51.5074"))
    default_lon: float = float(os.getenv("DEFAULT_LON", "-0.1278"))
    default_timezone: str = os.getenv("DEFAULT_TIMEZONE", "Europe/London")
    open_meteo_forecast_url: str = os.getenv(
        "OPEN_METEO_FORECAST_URL", "https://api.open-meteo.com/v1/forecast"
    ).rstrip("/")
    open_meteo_geocoding_url: str = os.getenv(
        "OPEN_METEO_GEOCODING_URL", "https://geocoding-api.open-meteo.com/v1/search"
    ).rstrip("/")
    open_meteo_air_quality_url: str = os.getenv(
        "OPEN_METEO_AIR_QUALITY_URL", "https://air-quality-api.open-meteo.com/v1/air-quality"
    ).rstrip("/")
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()
