import {
  formatDateShort,
  formatDay,
  formatFreshness,
  formatHour,
  formatPercent,
  formatPressure,
  formatTemp,
  formatTempPlain,
  formatWind,
} from "./units.js";
import { LIVE_LOCATION_ID } from "./locations.js";
import { tabStyleAttr, tabTextColor, weatherIcon } from "./theme.js";

const PERIOD_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

function dash(value, formatter) {
  if (value == null || Number.isNaN(value)) return "—";
  return formatter ? formatter(value) : String(value);
}

export function renderWeather(data, units) {
  if (!data) return;
  const tz = data.location?.timezone || "UTC";

  renderHero(data, units, tz);
  renderPeriods(data, units);
  renderHourly(data, units, tz);
  renderDaily(data, units, tz);
  renderDetails(data, units);
  renderAirQuality(data);
}

function renderHero(data, units, tz) {
  const loc = data.location || {};
  const cur = data.current || {};

  setText("location-name", loc.name || "—");
  setText("location-country", loc.country || "");
  setText("hero-temp", formatTemp(cur.temp, units));
  setText("hero-feels", `Feels like ${formatTempPlain(cur.feels_like ?? cur.temp, units)}`);

  const wind = formatWind(cur.wind_speed, units);
  const summary = [cur.condition_label, cur.wind_speed != null ? `Wind ${wind}` : null]
    .filter(Boolean)
    .join(" · ");
  setText("condition-summary", summary || "—");

  const freshnessEl = document.getElementById("freshness-label");
  if (freshnessEl) {
    freshnessEl.textContent = formatFreshness(data.meta?.updated_at);
    if (data.meta?.stale) {
      freshnessEl.textContent += " (cached)";
    }
  }

  document.getElementById("hero-temp")?.classList.remove("skeleton");
}

function renderPeriods(data, units) {
  const grid = document.getElementById("periods-grid");
  if (!grid) return;
  const periods = data.periods || {};
  grid.innerHTML = Object.entries(PERIOD_LABELS)
    .map(([key, label]) => {
      const p = periods[key] || {};
      return `
        <article class="period-card fade-update">
          <p class="period-label">${label}</p>
          <div class="period-icon">${weatherIcon(p.icon)}</div>
          <p class="period-temp">${formatTemp(p.temp, units)}</p>
          <p class="period-condition">${p.condition_label || "—"}</p>
        </article>`;
    })
    .join("");
}

function renderHourly(data, units, tz) {
  const container = document.getElementById("hourly-scroll");
  if (!container) return;
  const hourly = data.hourly || [];
  container.innerHTML = hourly
    .map(
      (h) => `
      <article class="hourly-item fade-update">
        <p class="hourly-time">${formatHour(h.time, tz)}</p>
        <div class="hourly-icon">${weatherIcon(h.icon)}</div>
        <p class="hourly-temp">${formatTemp(h.temp, units)}</p>
        <p class="hourly-precip">${h.precip_prob != null ? formatPercent(h.precip_prob) : ""}</p>
      </article>`
    )
    .join("");
}

function renderDaily(data, units, tz) {
  const list = document.getElementById("daily-list");
  if (!list) return;
  const daily = data.daily || [];
  list.innerHTML = daily
    .map(
      (d) => `
      <article class="daily-row fade-update">
        <span class="daily-date">${formatDay(d.date, tz)}</span>
        <span class="daily-condition">${weatherIcon(d.icon)} ${d.condition_label || "—"}</span>
        <span class="daily-temp-max">${formatTemp(d.temp_max, units)}</span>
        <span class="daily-temp-min">${formatTemp(d.temp_min, units)}</span>
      </article>`
    )
    .join("");
}

function renderDetails(data, units) {
  const grid = document.getElementById("details-grid");
  if (!grid) return;
  const cur = data.current || {};
  const sun = data.sun || {};

  const items = [
    { label: "Humidity", value: dash(cur.humidity, (v) => `${Math.round(v)}%`) },
    { label: "Wind", value: formatWind(cur.wind_speed, units) },
    { label: "UV Index", value: dash(cur.uv_index, (v) => Math.round(v * 10) / 10) },
    { label: "Pressure", value: formatPressure(cur.pressure, units) },
    {
      label: "Sunrise",
      value: sun.sunrise ? formatHour(sun.sunrise, data.location?.timezone) : "—",
    },
    {
      label: "Sunset",
      value: sun.sunset ? formatHour(sun.sunset, data.location?.timezone) : "—",
    },
  ];

  grid.innerHTML = items
    .map(
      (item) => `
      <article class="detail-card fade-update">
        <p class="detail-label">${item.label}</p>
        <p class="detail-value">${item.value}</p>
      </article>`
    )
    .join("");
}

function renderAirQuality(data) {
  const card = document.getElementById("aqi-card");
  if (!card) return;
  const aqi = data.air_quality || {};
  const score = aqi.aqi;
  const category = aqi.category || "Unknown";
  const pct = score != null ? Math.min(100, (score / 300) * 100) : 0;
  const cls =
    score == null ? "" : score <= 50 ? "aqi-good" : score <= 100 ? "aqi-moderate" : "aqi-unhealthy";

  card.innerHTML = `
    <div class="aqi-header fade-update">
      <p class="aqi-value ${cls}">${score != null ? score : "—"}</p>
      <span class="aqi-category">${category}</span>
    </div>
    <div class="aqi-bar"><div class="aqi-bar-fill" style="width:${pct}%"></div></div>
    <div class="aqi-details fade-update">
      <span>PM2.5: ${dash(aqi.pm2_5, (v) => Math.round(v))}</span>
      <span>PM10: ${dash(aqi.pm10, (v) => Math.round(v))}</span>
    </div>`;
}

export function renderLocationTabs(locations, activeId, weatherByCity, units, onSelect, onDelete) {
  const container = document.getElementById("location-tabs");
  if (!container) return;
  const canDelete = locations.length > 1;

  container.innerHTML = locations
    .map((loc) => {
      const isLive = loc.isLive || loc.id === LIVE_LOCATION_ID;
      const liveBadge = isLive ? '<span class="tab-live-dot" aria-hidden="true"></span>' : "";
      const safeName = escapeHtml(loc.name);
      const wx = weatherByCity?.[loc.id];
      const theme = wx?.theme;
      const condition = theme?.condition || "unknown";
      const timeOfDay = theme?.time_of_day || "day";
      const bgKey = theme?.background_key || "";
      const inlineStyle = theme ? tabStyleAttr(theme) : "";
      const textColor = theme ? tabTextColor(theme) : "";
      const iconKey = wx?.current?.icon || "cloudy";
      const icon = wx ? weatherIcon(iconKey) : "🌡️";
      const temp = wx?.current?.temp != null ? formatTemp(wx.current.temp, units) : "";
      const deleteBtn = `<button type="button" class="location-tab-delete" data-id="${escapeHtml(loc.id)}" aria-label="Remove ${safeName}" title="Remove ${safeName}"${canDelete ? "" : " disabled"}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>`;

      return `
        <div class="location-tab-wrap${loc.id === activeId ? " active" : ""}${theme ? " has-weather" : ""}" data-weather="${escapeHtml(condition)}" data-time="${escapeHtml(timeOfDay)}" data-background="${escapeHtml(bgKey)}"${inlineStyle ? ` style="${inlineStyle}"` : ""}>
          <button type="button" class="location-tab${loc.id === activeId ? " active" : ""}${isLive ? " location-tab--live" : ""}" data-id="${escapeHtml(loc.id)}"${textColor ? ` style="color:${textColor}"` : ""}>
            ${isLive ? liveBadge : ""}
            <span class="tab-weather-icon">${icon}</span>
            <span class="tab-label">
              <span class="tab-name">${safeName}</span>
              ${temp ? `<span class="tab-temp" style="color:${textColor || "inherit"}">${temp}</span>` : ""}
            </span>
          </button>
          ${deleteBtn}
        </div>`;
    })
    .join("");

  container.querySelectorAll(".location-tab").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.id));
  });

  if (onDelete) {
    container.querySelectorAll(".location-tab-delete:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(btn.dataset.id);
      });
    });
  }

  const activeEl = container.querySelector(".location-tab-wrap.active");
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }
}

export function renderSavedLocationsList(locations, activeId, weatherByCity, units, onSelect, onDelete) {
  const list = document.getElementById("saved-locations-list");
  const section = document.getElementById("saved-locations-section");
  if (!list || !section) return;

  if (!locations.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  const canDelete = locations.length > 1;

  list.innerHTML = locations
    .map((loc) => {
      const safeName = escapeHtml(loc.name);
      const safeCountry = escapeHtml(loc.country || "");
      const wx = weatherByCity?.[loc.id];
      const iconKey = wx?.current?.icon || "cloudy";
      const icon = wx ? weatherIcon(iconKey) : "";
      const temp = wx?.current?.temp != null ? formatTemp(wx.current.temp, units) : "";
      const theme = wx?.theme;
      const weatherAttr = theme
        ? ` data-weather="${escapeHtml(theme.condition)}" data-time="${escapeHtml(theme.time_of_day)}"`
        : "";
      return `
        <li class="saved-location-row${loc.id === activeId ? " active" : ""}"${weatherAttr}>
          <button type="button" class="saved-location-info" data-id="${escapeHtml(loc.id)}">
            <span class="saved-location-icon">${icon}</span>
            <span class="saved-location-text">
              <div class="saved-location-name">${safeName}${temp ? ` · ${temp}` : ""}</div>
              ${safeCountry ? `<div class="saved-location-country">${safeCountry}</div>` : ""}
            </span>
          </button>
          <button type="button" class="saved-location-remove" data-id="${escapeHtml(loc.id)}" aria-label="Remove ${safeName}" title="Remove" ${canDelete ? "" : "disabled"}>✕</button>
        </li>`;
    })
    .join("");

  list.querySelectorAll(".saved-location-info").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.id));
  });

  if (onDelete) {
    list.querySelectorAll(".saved-location-remove:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => onDelete(btn.dataset.id));
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export function setLiveTrackingUI(enabled) {
  const geoBtn = document.getElementById("geo-btn");
  const liveDot = document.getElementById("geo-live-dot");
  if (geoBtn) {
    geoBtn.classList.toggle("icon-btn--live", enabled);
    geoBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    geoBtn.title = enabled ? "Stop live location tracking" : "Track live location";
  }
  if (liveDot) liveDot.hidden = !enabled;
}

export function renderSearchResults(results, onSelect) {
  const list = document.getElementById("search-results");
  if (!list) return;
  if (!results.length) {
    list.innerHTML = `<li class="search-empty">No cities found</li>`;
    return;
  }
  list.innerHTML = results
    .map(
      (r) =>
        `<li><button type="button" class="search-result-item" data-id="${r.id}">
          <div class="search-result-name">${r.name}</div>
          <div class="search-result-country">${r.country}</div>
        </button></li>`
    )
    .join("");

  list.querySelectorAll(".search-result-item").forEach((btn, idx) => {
    btn.addEventListener("click", () => onSelect(results[idx]));
  });
}

export function showSkeletons() {
  document.getElementById("hero-temp")?.classList.add("skeleton");
  ["periods-grid", "hourly-scroll", "daily-list", "details-grid"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="skeleton-block"></div>`;
  });
}

export function startFreshnessTicker(updatedAt) {
  if (window._freshnessInterval) clearInterval(window._freshnessInterval);
  window._freshnessInterval = setInterval(() => {
    const el = document.getElementById("freshness-label");
    if (el && updatedAt) el.textContent = formatFreshness(updatedAt);
  }, 60000);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export { formatFreshness };
