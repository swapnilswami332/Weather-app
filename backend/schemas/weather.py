from pydantic import BaseModel, Field


class LocationInfo(BaseModel):
    name: str
    country: str
    lat: float
    lon: float
    timezone: str


class MetaInfo(BaseModel):
    updated_at: str
    source: str = "Open-Meteo"
    model_note: str = "Model forecast (updates every 1-6 hours)"
    cache_hit: bool = False
    stale: bool = False


class ThemeInfo(BaseModel):
    condition: str
    time_of_day: str
    background_key: str


class CurrentWeather(BaseModel):
    temp: float | None = None
    feels_like: float | None = None
    humidity: int | None = None
    wind_speed: float | None = None
    wind_direction: int | None = None
    wind_gust: float | None = None
    precipitation: float | None = None
    uv_index: float | None = None
    pressure: float | None = None
    visibility: float | None = None
    condition_label: str = "Unknown"
    icon: str = "cloudy"


class PeriodWeather(BaseModel):
    time: str
    temp: float | None = None
    feels_like: float | None = None
    condition_label: str = "Unknown"
    precip_prob: int | None = None
    wind_speed: float | None = None
    icon: str = "cloudy"


class PeriodsWeather(BaseModel):
    morning: PeriodWeather
    afternoon: PeriodWeather
    evening: PeriodWeather
    night: PeriodWeather


class HourlyItem(BaseModel):
    time: str
    temp: float | None = None
    feels_like: float | None = None
    precip_prob: int | None = None
    condition_label: str = "Unknown"
    icon: str = "cloudy"
    wind_speed: float | None = None


class DailyItem(BaseModel):
    date: str
    temp_max: float | None = None
    temp_min: float | None = None
    precip_prob: int | None = None
    sunrise: str | None = None
    sunset: str | None = None
    condition_label: str = "Unknown"
    icon: str = "cloudy"


class SunInfo(BaseModel):
    sunrise: str | None = None
    sunset: str | None = None
    is_day: bool = True


class AirQualityInfo(BaseModel):
    aqi: int | None = None
    pm2_5: float | None = None
    pm10: float | None = None
    category: str = "Unknown"


class WeatherResponse(BaseModel):
    location: LocationInfo
    meta: MetaInfo
    theme: ThemeInfo
    current: CurrentWeather
    periods: PeriodsWeather
    hourly: list[HourlyItem] = Field(default_factory=list)
    daily: list[DailyItem] = Field(default_factory=list)
    sun: SunInfo
    air_quality: AirQualityInfo


class SearchResult(BaseModel):
    id: str
    name: str
    country: str
    lat: float
    lon: float
    timezone: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
