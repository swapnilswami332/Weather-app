export function formatTemp(value, units = "metric") {
  if (value == null || Number.isNaN(value)) return "—";
  if (units === "imperial") {
    return `${Math.round(value * 9 / 5 + 32)}°`;
  }
  return `${Math.round(value)}°`;
}

export function formatTempPlain(value, units = "metric") {
  if (value == null || Number.isNaN(value)) return "—";
  if (units === "imperial") {
    return `${Math.round(value * 9 / 5 + 32)}°F`;
  }
  return `${Math.round(value)}°C`;
}

export function formatWind(speed, units = "metric") {
  if (speed == null || Number.isNaN(speed)) return "—";
  if (units === "imperial") {
    return `${Math.round(speed * 0.621371)} mph`;
  }
  return `${Math.round(speed)} km/h`;
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function formatPressure(value, units = "metric") {
  if (value == null || Number.isNaN(value)) return "—";
  if (units === "imperial") {
    return `${(value * 0.02953).toFixed(2)} inHg`;
  }
  return `${Math.round(value)} hPa`;
}

export function formatHour(isoString, timezone) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return "—";
  }
}

export function formatDay(isoString, timezone) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString.includes("T") ? isoString : `${isoString}T12:00:00`);
    const today = new Date();
    const isToday =
      date.toLocaleDateString("en-US", { timeZone: timezone }) ===
      today.toLocaleDateString("en-US", { timeZone: timezone });
    if (isToday) return "Today";
    return date.toLocaleDateString([], { weekday: "short", timeZone: timezone });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString, timezone) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString.includes("T") ? isoString : `${isoString}T12:00:00`);
    return date.toLocaleDateString([], { month: "short", day: "numeric", timeZone: timezone });
  } catch {
    return isoString;
  }
}

export function formatFreshness(updatedAt) {
  if (!updatedAt) return "Updated — · Model forecast";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
  const label = mins === 0 ? "Updated just now" : `Updated ${mins} minute${mins === 1 ? "" : "s"} ago`;
  return `${label} · Model forecast`;
}

export function getUnitsLabel(units) {
  return units === "imperial" ? "°F" : "°C";
}

export function toggleUnits(units) {
  return units === "metric" ? "imperial" : "metric";
}
