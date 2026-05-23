from dataclasses import dataclass


@dataclass(frozen=True)
class WeatherCodeInfo:
    condition: str
    label: str
    icon: str


WMO_CODES: dict[int, WeatherCodeInfo] = {
    0: WeatherCodeInfo("clear", "Clear sky", "clear"),
    1: WeatherCodeInfo("partly_cloudy", "Mainly clear", "partly-cloudy"),
    2: WeatherCodeInfo("partly_cloudy", "Partly cloudy", "partly-cloudy"),
    3: WeatherCodeInfo("cloudy", "Overcast", "cloudy"),
    45: WeatherCodeInfo("fog", "Fog", "fog"),
    48: WeatherCodeInfo("fog", "Depositing rime fog", "fog"),
    51: WeatherCodeInfo("drizzle", "Light drizzle", "rain"),
    53: WeatherCodeInfo("drizzle", "Moderate drizzle", "rain"),
    55: WeatherCodeInfo("drizzle", "Dense drizzle", "rain"),
    56: WeatherCodeInfo("drizzle", "Freezing drizzle", "rain"),
    57: WeatherCodeInfo("drizzle", "Freezing drizzle", "rain"),
    61: WeatherCodeInfo("rain", "Slight rain", "rain"),
    63: WeatherCodeInfo("rain", "Moderate rain", "rain"),
    65: WeatherCodeInfo("rain", "Heavy rain", "rain"),
    66: WeatherCodeInfo("rain", "Freezing rain", "rain"),
    67: WeatherCodeInfo("rain", "Heavy freezing rain", "rain"),
    71: WeatherCodeInfo("snow", "Slight snow", "snow"),
    73: WeatherCodeInfo("snow", "Moderate snow", "snow"),
    75: WeatherCodeInfo("snow", "Heavy snow", "snow"),
    77: WeatherCodeInfo("snow", "Snow grains", "snow"),
    80: WeatherCodeInfo("rain", "Slight rain showers", "rain"),
    81: WeatherCodeInfo("rain", "Moderate rain showers", "rain"),
    82: WeatherCodeInfo("rain", "Violent rain showers", "rain"),
    85: WeatherCodeInfo("snow", "Slight snow showers", "snow"),
    86: WeatherCodeInfo("snow", "Heavy snow showers", "snow"),
    95: WeatherCodeInfo("thunderstorm", "Thunderstorm", "storm"),
    96: WeatherCodeInfo("thunderstorm", "Thunderstorm with hail", "storm"),
    99: WeatherCodeInfo("thunderstorm", "Thunderstorm with heavy hail", "storm"),
}

DEFAULT_CODE = WeatherCodeInfo("cloudy", "Cloudy", "cloudy")


def decode_weather_code(code: int | None) -> WeatherCodeInfo:
    if code is None:
        return DEFAULT_CODE
    return WMO_CODES.get(code, DEFAULT_CODE)


def build_background_key(condition: str, is_day: bool) -> str:
    time_suffix = "day" if is_day else "night"
    mapping = {
        "clear": "clear",
        "partly_cloudy": "partly-cloudy",
        "cloudy": "cloudy",
        "fog": "fog",
        "drizzle": "rain",
        "rain": "rain",
        "snow": "snow",
        "thunderstorm": "storm",
        "windy": "cloudy",
    }
    base = mapping.get(condition, "cloudy")
    return f"{base}-{time_suffix}"


def build_theme(condition: str, is_day: bool) -> dict[str, str]:
    return {
        "condition": condition,
        "time_of_day": "day" if is_day else "night",
        "background_key": build_background_key(condition, is_day),
    }
