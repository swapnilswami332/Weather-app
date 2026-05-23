const API_BASE = "";

export async function searchCities(query) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail?.error || "Search failed");
  }
  return res.json();
}

export async function fetchWeather({ lat, lon, timezone, name, country }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    timezone: timezone || "auto",
  });
  if (name) params.set("name", name);
  if (country) params.set("country", country);

  const res = await fetch(`${API_BASE}/api/weather?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail?.error || "Weather fetch failed");
  }
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.ok;
}
