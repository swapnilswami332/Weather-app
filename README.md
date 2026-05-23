# Atmos — Weather App

A production-quality, **Xiaomi-inspired** weather web app with a **Python FastAPI** backend and **vanilla HTML/CSS/JS** frontend. Weather data comes from [Open-Meteo](https://open-meteo.com/) — a free model-based forecast API that requires **no API key**.

---

## What this app is / is not

| | |
|---|---|
| **Is** | An immersive weather UI with multi-city support, morning/afternoon/evening/night breakdowns, dynamic themes, and honest freshness labeling |
| **Is not** | Live radar, minute-by-minute ground observations, or guaranteed sensor-level accuracy |

The UI always shows **`Updated X minutes ago · Model forecast`** so users understand they are viewing forecast model data, not live readings.

---

## Features

| Feature | Description |
|---------|-------------|
| **Current weather** | Temperature, feels like, wind, humidity, UV, pressure |
| **Day periods** | Morning, afternoon, evening, night cards |
| **Forecasts** | 24-hour hourly scroll + 10-day daily list |
| **Air quality** | AQI estimate, PM2.5, PM10, category |
| **Dynamic themes** | Background image + heavy gradient overlays follow condition and time of day |
| **Locations** | Search cities, save up to 8, geolocation, quick tab switching |
| **Units** | Toggle °C/°F and km/h ↔ mph |
| **Trust label** | `Updated X minutes ago · Model forecast` on every view |
| **Resilience** | Backend cache with stale fallback when Open-Meteo is unavailable |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, httpx, pydantic |
| Frontend | Vanilla JavaScript (ES modules), HTML5, CSS3 |
| Weather data | Open-Meteo Forecast, Geocoding, Air Quality APIs |
| Backgrounds | 14 local 2K WebP images (2560×1440) |
| Run mode | Single process — API + static frontend |

---

## Prerequisites

- **Python 3.11+** (Windows users: `tzdata` is included in requirements for timezone support)
- Windows, macOS, or Linux
- Internet connection (for Open-Meteo)

---

## Installation and run

```powershell
cd "c:\projects\Small projects\weather app"

# Create virtual environment
python -m venv backend\.venv

# Activate (Windows PowerShell)
.\backend\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000** in your browser.

### Regenerate background images (optional)

Atmospheric 2K WebP backgrounds can be regenerated with Pillow:

```powershell
pip install pillow
python scripts/generate_backgrounds.py
```

---

## Project structure

```
weather app/
├── backend/
│   ├── main.py              # FastAPI app, static file mount
│   ├── config.py            # Environment settings
│   ├── routers/weather.py   # /api/weather, /api/search, /api/health
│   ├── services/            # Open-Meteo client, cache, period builder
│   └── schemas/weather.py   # Normalized API response models
├── frontend/
│   ├── index.html           # App shell
│   ├── css/                 # Variables, themes, layout, components
│   ├── js/                  # API client, UI renderer, theme engine
│   └── assets/backgrounds/  # 2K WebP weather scenes
├── scripts/
│   └── generate_backgrounds.py
├── requirements.txt
└── README.md
```

---

## API reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness check |
| `GET /api/search?q=London` | City search (min 2 characters) |
| `GET /api/weather?lat=51.5&lon=-0.12&timezone=Europe/London&name=London&country=United%20Kingdom` | Full normalized weather payload |

### Example

```powershell
curl "http://127.0.0.1:8000/api/weather?lat=51.5074&lon=-0.1278&timezone=Europe/London&name=London"
```

Sample `meta` block in the response:

```json
{
  "meta": {
    "updated_at": "2026-05-21T14:30:00Z",
    "source": "Open-Meteo",
    "model_note": "Model forecast (updates every 1–6 hours)",
    "cache_hit": false,
    "stale": false
  }
}
```

The frontend consumes this normalized JSON only — it never parses raw Open-Meteo responses.

---

## Data freshness and accuracy

| Layer | Behavior |
|-------|----------|
| **Open-Meteo** | Global weather models update every ~1–6 hours |
| **Backend cache** | 10-minute TTL per location; stale cache served if upstream fails |
| **Frontend refresh** | Auto-refresh every 15 minutes; manual refresh button |
| **UI label** | `Updated X minutes ago · Model forecast` |

**Feels like** temperature is always shown alongside the main reading because it better reflects perceived conditions.

---

## Configuration

Optional environment variables (`.env` in project root):

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_SECONDS` | `600` | Backend in-memory cache TTL |
| `REQUEST_TIMEOUT_SEC` | `25` | Upstream HTTP timeout |
| `SSL_VERIFY` | `true` | Set to `false` only if your system has broken SSL certs (not recommended) |
| `DEFAULT_CITY_NAME` | `London` | Fallback city name |
| `DEFAULT_LAT` / `DEFAULT_LON` | `51.5074` / `-0.1278` | Fallback coordinates |
| `LOG_LEVEL` | `INFO` | Python logging level |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Ensure uvicorn is running and port 8000 is free |
| No weather data | Check internet connection; inspect terminal logs |
| Wrong city | Use search to pick a city, or clear browser localStorage |
| Geolocation denied | Search for a city manually — app falls back to last saved or London |
| Module not found | Run uvicorn from the project root: `uvicorn backend.main:app` |

---

## Attributions and license

- **Weather data:** [Open-Meteo](https://open-meteo.com/) — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Background images:** Generated atmospheric gradients (see `scripts/generate_backgrounds.py`)
- **App:** MIT License

---

## Roadmap (v2 — not in initial release)

- PWA / offline shell
- Precipitation charts
- Compare two cities
- Share weather snippet
- Wind compass widget

---

## UI guide

1. **Search** — tap the magnifier icon, type a city name, select a result.
2. **GPS** — tap the pin icon to use your current location.
3. **Saved cities** — tabs at the top; tap to switch (up to 8 saved).
4. **Units** — tap the °C/°F button in the header.
5. **Refresh** — tap the circular arrow to fetch latest data.

The background, overlay colors, and accent shift smoothly when weather conditions or time of day change.
