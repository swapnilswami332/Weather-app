from datetime import datetime
from datetime import timezone as dt_timezone

import httpx

from backend.config import settings
from backend.services.http_client import create_http_client
from backend.schemas.weather import (
    AirQualityInfo,
    CurrentWeather,
    DailyItem,
    HourlyItem,
    LocationInfo,
    MetaInfo,
    SunInfo,
    ThemeInfo,
    WeatherResponse,
)
from backend.services.period_builder import build_periods
from backend.services.weather_codes import build_theme, decode_weather_code


def _aqi_category(aqi: int | None) -> str:
    if aqi is None:
        return "Unknown"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for sensitive groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very unhealthy"
    return "Hazardous"


def _eu_aqi(pm2_5: float | None, pm10: float | None) -> int | None:
    if pm2_5 is None and pm10 is None:
        return None
    score = 0
    if pm2_5 is not None:
        if pm2_5 <= 10:
            score = max(score, int(pm2_5 * 5))
        elif pm2_5 <= 25:
            score = max(score, int(50 + (pm2_5 - 10) * 3.33))
        elif pm2_5 <= 50:
            score = max(score, int(100 + (pm2_5 - 25) * 2))
        else:
            score = max(score, min(500, int(150 + (pm2_5 - 50) * 3)))
    if pm10 is not None:
        if pm10 <= 20:
            score = max(score, int(pm10 * 2.5))
        elif pm10 <= 50:
            score = max(score, int(50 + (pm10 - 20) * 1.67))
        else:
            score = max(score, min(500, int(100 + (pm10 - 50) * 2)))
    return score


async def _fetch_forecast(client: httpx.AsyncClient, lat: float, lon: float, tz: str) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": tz,
        "forecast_days": 10,
        "current": ",".join(
            [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",
                "surface_pressure",
                "uv_index",
                "is_day",
            ]
        ),
        "hourly": ",".join(
            [
                "temperature_2m",
                "apparent_temperature",
                "relative_humidity_2m",
                "precipitation_probability",
                "weather_code",
                "wind_speed_10m",
            ]
        ),
        "daily": ",".join(
            [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
                "sunrise",
                "sunset",
                "uv_index_max",
            ]
        ),
    }
    response = await client.get(settings.open_meteo_forecast_url, params=params)
    response.raise_for_status()
    return response.json()


async def _fetch_air_quality(client: httpx.AsyncClient, lat: float, lon: float, tz: str) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": tz,
        "current": "pm10,pm2_5",
    }
    response = await client.get(settings.open_meteo_air_quality_url, params=params)
    response.raise_for_status()
    return response.json()


def _normalize_weather(
    forecast: dict,
    air_payload: dict | None,
    name: str,
    country: str,
    lat: float,
    lon: float,
    timezone: str,
    cache_hit: bool = False,
    stale: bool = False,
) -> WeatherResponse:
    current_raw = forecast.get("current") or {}
    hourly = forecast.get("hourly") or {}
    daily = forecast.get("daily") or {}

    resolved_tz = forecast.get("timezone") or timezone
    code = current_raw.get("weather_code")
    info = decode_weather_code(code)
    is_day = bool(current_raw.get("is_day", 1))
    theme_data = build_theme(info.condition, is_day)

    temp = current_raw.get("temperature_2m")
    feels = current_raw.get("apparent_temperature")

    current = CurrentWeather(
        temp=temp,
        feels_like=feels if feels is not None else temp,
        humidity=current_raw.get("relative_humidity_2m"),
        wind_speed=current_raw.get("wind_speed_10m"),
        wind_direction=current_raw.get("wind_direction_10m"),
        wind_gust=current_raw.get("wind_gusts_10m"),
        precipitation=current_raw.get("precipitation"),
        uv_index=current_raw.get("uv_index"),
        pressure=current_raw.get("surface_pressure"),
        visibility=None,
        condition_label=info.label,
        icon=info.icon,
    )

    hourly_times = hourly.get("time") or []
    hourly_items: list[HourlyItem] = []
    for idx, time_str in enumerate(hourly_times[:24]):
        h_code = (hourly.get("weather_code") or [None])[idx]
        h_info = decode_weather_code(h_code)
        h_temp = (hourly.get("temperature_2m") or [None])[idx]
        h_feels = (hourly.get("apparent_temperature") or [None])[idx]
        h_precip = (hourly.get("precipitation_probability") or [None])[idx]
        h_wind = (hourly.get("wind_speed_10m") or [None])[idx]
        hourly_items.append(
            HourlyItem(
                time=time_str,
                temp=h_temp,
                feels_like=h_feels if h_feels is not None else h_temp,
                precip_prob=int(h_precip) if h_precip is not None else None,
                condition_label=h_info.label,
                icon=h_info.icon,
                wind_speed=h_wind,
            )
        )

    daily_dates = daily.get("time") or []
    daily_items: list[DailyItem] = []
    for idx, date_str in enumerate(daily_dates[:10]):
        d_code = (daily.get("weather_code") or [None])[idx]
        d_info = decode_weather_code(d_code)
        daily_items.append(
            DailyItem(
                date=date_str,
                temp_max=(daily.get("temperature_2m_max") or [None])[idx],
                temp_min=(daily.get("temperature_2m_min") or [None])[idx],
                precip_prob=(daily.get("precipitation_probability_max") or [None])[idx],
                sunrise=(daily.get("sunrise") or [None])[idx],
                sunset=(daily.get("sunset") or [None])[idx],
                condition_label=d_info.label,
                icon=d_info.icon,
            )
        )

    sunrise = (daily.get("sunrise") or [None])[0] if daily_dates else None
    sunset = (daily.get("sunset") or [None])[0] if daily_dates else None

    periods = build_periods(
        hourly_times=hourly_times,
        hourly_data=hourly,
        sunrise_iso=sunrise,
        sunset_iso=sunset,
        timezone=resolved_tz,
    )

    pm2_5 = pm10 = None
    if air_payload:
        air_current = air_payload.get("current") or {}
        pm2_5 = air_current.get("pm2_5")
        pm10 = air_current.get("pm10")

    aqi = _eu_aqi(pm2_5, pm10)
    air_quality = AirQualityInfo(
        aqi=aqi,
        pm2_5=pm2_5,
        pm10=pm10,
        category=_aqi_category(aqi),
    )

    updated_at = datetime.now(dt_timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    return WeatherResponse(
        location=LocationInfo(
            name=name,
            country=country,
            lat=lat,
            lon=lon,
            timezone=resolved_tz,
        ),
        meta=MetaInfo(
            updated_at=updated_at,
            cache_hit=cache_hit,
            stale=stale,
        ),
        theme=ThemeInfo(**theme_data),
        current=current,
        periods=periods,
        hourly=hourly_items,
        daily=daily_items,
        sun=SunInfo(sunrise=sunrise, sunset=sunset, is_day=is_day),
        air_quality=air_quality,
    )


async def fetch_weather(
    lat: float,
    lon: float,
    timezone: str,
    name: str,
    country: str,
) -> WeatherResponse:
    async with create_http_client() as client:
        forecast = await _fetch_forecast(client, lat, lon, timezone)
        try:
            air_payload = await _fetch_air_quality(client, lat, lon, timezone)
        except Exception:
            air_payload = None

    return _normalize_weather(
        forecast=forecast,
        air_payload=air_payload,
        name=name,
        country=country,
        lat=lat,
        lon=lon,
        timezone=timezone,
    )
