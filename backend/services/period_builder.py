from datetime import datetime, time as dt_time, timedelta
from zoneinfo import ZoneInfo

from backend.schemas.weather import PeriodWeather, PeriodsWeather
from backend.services.weather_codes import decode_weather_code


def _parse_iso_local(iso_str: str, tz: ZoneInfo) -> datetime:
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def _pick_nearest_hourly(
    hourly_times: list[str],
    hourly_data: dict[str, list],
    target: datetime,
    tz: ZoneInfo,
) -> dict:
    if not hourly_times:
        return {}

    best_idx = 0
    best_diff = float("inf")
    target_local = target.astimezone(tz)

    for idx, time_str in enumerate(hourly_times):
        hour_dt = _parse_iso_local(time_str, tz)
        diff = abs((hour_dt - target_local).total_seconds())
        if diff < best_diff:
            best_diff = diff
            best_idx = idx

    code = hourly_data.get("weather_code", [None])[best_idx]
    info = decode_weather_code(code)
    temp = _safe_index(hourly_data.get("temperature_2m"), best_idx)
    feels = _safe_index(hourly_data.get("apparent_temperature"), best_idx)
    precip = _safe_index(hourly_data.get("precipitation_probability"), best_idx)
    wind = _safe_index(hourly_data.get("wind_speed_10m"), best_idx)
    time_str = hourly_times[best_idx]

    return {
        "time": time_str,
        "temp": temp,
        "feels_like": feels if feels is not None else temp,
        "condition_label": info.label,
        "precip_prob": int(precip) if precip is not None else None,
        "wind_speed": wind,
        "icon": info.icon,
    }


def _safe_index(values: list | None, idx: int):
    if not values or idx >= len(values):
        return None
    val = values[idx]
    return None if val is None else val


def _midpoint(start: datetime, end: datetime) -> datetime:
    if end <= start:
        end = end + timedelta(days=1)
    return start + (end - start) / 2


def build_periods(
    hourly_times: list[str],
    hourly_data: dict[str, list],
    sunrise_iso: str | None,
    sunset_iso: str | None,
    timezone: str,
) -> PeriodsWeather:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    today = now.date()

    sunrise = _parse_iso_local(sunrise_iso, tz) if sunrise_iso else datetime.combine(today, dt_time(6, 0), tz)
    sunset = _parse_iso_local(sunset_iso, tz) if sunset_iso else datetime.combine(today, dt_time(18, 0), tz)

    noon = datetime.combine(today, dt_time(12, 0), tzinfo=tz)
    afternoon_start = datetime.combine(today, dt_time(17, 0), tzinfo=tz)

    morning_target = _midpoint(sunrise, noon)
    afternoon_target = _midpoint(noon, afternoon_start)
    evening_target = _midpoint(afternoon_start, sunset)
    night_target = _midpoint(sunset, sunrise + timedelta(days=1))

    windows = {
        "morning": morning_target,
        "afternoon": afternoon_target,
        "evening": evening_target,
        "night": night_target,
    }

    period_dict = {}
    for name, target in windows.items():
        data = _pick_nearest_hourly(hourly_times, hourly_data, target, tz)
        if not data:
            data = {
                "time": target.isoformat(),
                "temp": None,
                "feels_like": None,
                "condition_label": "Unknown",
                "precip_prob": None,
                "wind_speed": None,
                "icon": "cloudy",
            }
        period_dict[name] = PeriodWeather(**data)

    return PeriodsWeather(**period_dict)
