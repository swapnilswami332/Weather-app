const ICONS = {
  clear: "☀️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
  fog: "🌫️",
};

/** Bold, distinct tab colors per weather scene — each city tab uses its own. */
const TAB_COLORS = {
  "clear-day": {
    bg: "linear-gradient(135deg, #f59e0b 0%, #f97316 45%, #2563eb 100%)",
    border: "#fbbf24",
    text: "#ffffff",
  },
  "clear-night": {
    bg: "linear-gradient(135deg, #312e81 0%, #1e3a8a 55%, #0f172a 100%)",
    border: "#818cf8",
    text: "#e0e7ff",
  },
  "partly-cloudy-day": {
    bg: "linear-gradient(135deg, #38bdf8 0%, #64748b 60%, #334155 100%)",
    border: "#7dd3fc",
    text: "#ffffff",
  },
  "partly-cloudy-night": {
    bg: "linear-gradient(135deg, #475569 0%, #334155 50%, #0f172a 100%)",
    border: "#94a3b8",
    text: "#e2e8f0",
  },
  "cloudy-day": {
    bg: "linear-gradient(135deg, #94a3b8 0%, #64748b 55%, #475569 100%)",
    border: "#cbd5e1",
    text: "#ffffff",
  },
  "cloudy-night": {
    bg: "linear-gradient(135deg, #64748b 0%, #334155 50%, #0f172a 100%)",
    border: "#64748b",
    text: "#e2e8f0",
  },
  "rain-day": {
    bg: "linear-gradient(135deg, #64748b 0%, #1e40af 50%, #1e3a5f 100%)",
    border: "#38bdf8",
    text: "#e0f2fe",
  },
  "rain-night": {
    bg: "linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #0c1222 100%)",
    border: "#0ea5e9",
    text: "#bae6fd",
  },
  "storm-day": {
    bg: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 50%, #1e1b4b 100%)",
    border: "#c4b5fd",
    text: "#ede9fe",
  },
  "storm-night": {
    bg: "linear-gradient(135deg, #4c1d95 0%, #312e81 45%, #020617 100%)",
    border: "#a78bfa",
    text: "#ddd6fe",
  },
  "snow-day": {
    bg: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #64748b 100%)",
    border: "#e2e8f0",
    text: "#0f172a",
  },
  "snow-night": {
    bg: "linear-gradient(135deg, #cbd5e1 0%, #64748b 50%, #1e293b 100%)",
    border: "#94a3b8",
    text: "#f1f5f9",
  },
  "fog-day": {
    bg: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 55%, #6b7280 100%)",
    border: "#d1d5db",
    text: "#1f2937",
  },
  "fog-night": {
    bg: "linear-gradient(135deg, #6b7280 0%, #374151 50%, #111827 100%)",
    border: "#9ca3af",
    text: "#f3f4f6",
  },
};

export function weatherIcon(iconKey) {
  return ICONS[iconKey] || "☁️";
}

export function getTabStyle(theme) {
  if (!theme) return null;
  const key = theme.background_key || buildBackgroundKey(theme.condition, theme.time_of_day);
  return TAB_COLORS[key] || TAB_COLORS["cloudy-day"];
}

function buildBackgroundKey(condition, timeOfDay) {
  const time = timeOfDay === "night" ? "night" : "day";
  const map = {
    clear: "clear",
    partly_cloudy: "partly-cloudy",
    cloudy: "cloudy",
    fog: "fog",
    drizzle: "rain",
    rain: "rain",
    snow: "snow",
    thunderstorm: "storm",
    windy: "cloudy",
  };
  return `${map[condition] || "cloudy"}-${time}`;
}

export function tabStyleAttr(theme) {
  const colors = getTabStyle(theme);
  if (!colors) return "";
  return `background:${colors.bg};border-color:${colors.border};color:${colors.text};`;
}

export function tabTextColor(theme) {
  return getTabStyle(theme)?.text || "#ffffff";
}

let activeLayer = "a";
let currentKey = "";

export function applyTheme(theme) {
  if (!theme) return;
  const html = document.documentElement;
  html.dataset.weather = theme.condition || "cloudy";
  html.dataset.time = theme.time_of_day || "day";
  html.dataset.background = theme.background_key || "cloudy-day";
  applyBackground(theme.background_key || "cloudy-day");
}

function applyBackground(key) {
  if (key === currentKey) return;
  const layerA = document.querySelector(".bg-layer-a");
  const layerB = document.querySelector(".bg-layer-b");
  if (!layerA || !layerB) return;

  const url = `url("/assets/backgrounds/${key}.webp")`;
  const gradient = getGradientFallback(key);

  if (activeLayer === "a") {
    layerB.style.backgroundImage = `${url}, ${gradient}`;
    layerB.style.opacity = "1";
    layerA.style.opacity = "0";
    activeLayer = "b";
  } else {
    layerA.style.backgroundImage = `${url}, ${gradient}`;
    layerA.style.opacity = "1";
    layerB.style.opacity = "0";
    activeLayer = "a";
  }
  currentKey = key;
}

function getGradientFallback(key) {
  const gradients = {
    "clear-day": "linear-gradient(160deg, #fbbf24 0%, #3b82f6 45%, #1e1b4b 100%)",
    "clear-night": "linear-gradient(160deg, #1e3a8a 0%, #0f172a 60%, #020617 100%)",
    "partly-cloudy-day": "linear-gradient(160deg, #93c5fd 0%, #64748b 50%, #1e293b 100%)",
    "partly-cloudy-night": "linear-gradient(160deg, #334155 0%, #0f172a 100%)",
    "cloudy-day": "linear-gradient(160deg, #94a3b8 0%, #475569 100%)",
    "cloudy-night": "linear-gradient(160deg, #475569 0%, #0f172a 100%)",
    "rain-day": "linear-gradient(160deg, #64748b 0%, #1e3a5f 100%)",
    "rain-night": "linear-gradient(160deg, #1e3a5f 0%, #0c1222 100%)",
    "storm-day": "linear-gradient(160deg, #4c1d95 0%, #1e1b4b 100%)",
    "storm-night": "linear-gradient(160deg, #312e81 0%, #020617 100%)",
    "snow-day": "linear-gradient(160deg, #e2e8f0 0%, #64748b 100%)",
    "snow-night": "linear-gradient(160deg, #cbd5e1 0%, #1e293b 100%)",
    "fog-day": "linear-gradient(160deg, #d1d5db 0%, #6b7280 100%)",
    "fog-night": "linear-gradient(160deg, #6b7280 0%, #111827 100%)",
  };
  return gradients[key] || gradients["cloudy-day"];
}

export function initBackground() {
  const layerA = document.querySelector(".bg-layer-a");
  if (layerA) {
    const key = document.documentElement.dataset.background || "clear-day";
    layerA.style.backgroundImage = `url("/assets/backgrounds/${key}.webp"), ${getGradientFallback(key)}`;
    currentKey = key;
  }
}
