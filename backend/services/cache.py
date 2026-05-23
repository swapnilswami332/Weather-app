import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CacheEntry:
    data: dict[str, Any]
    fetched_at: float


@dataclass
class WeatherCache:
    ttl_seconds: int
    _store: dict[str, CacheEntry] = field(default_factory=dict)

    @staticmethod
    def make_key(lat: float, lon: float) -> str:
        return f"{round(lat, 4)},{round(lon, 4)}"

    def get_valid(self, lat: float, lon: float) -> dict[str, Any] | None:
        key = self.make_key(lat, lon)
        entry = self._store.get(key)
        if not entry:
            return None
        if time.time() - entry.fetched_at > self.ttl_seconds:
            return None
        return entry.data

    def get_stale(self, lat: float, lon: float) -> dict[str, Any] | None:
        key = self.make_key(lat, lon)
        entry = self._store.get(key)
        return entry.data if entry else None

    def set(self, lat: float, lon: float, data: dict[str, Any]) -> None:
        key = self.make_key(lat, lon)
        self._store[key] = CacheEntry(data=data, fetched_at=time.time())
