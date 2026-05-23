import { fetchWeather, searchCities } from "./api.js";
import { createLiveTracker, coordsChanged } from "./geolocation.js";
import {
  addLocation,
  createLiveLocation,
  getActiveCity,
  getDefaultCity,
  getLiveTrackingEnabled,
  getLocations,
  getUnits,
  LIVE_LOCATION_ID,
  removeLocation,
  saveLocations,
  setLastCityId,
  setLiveTrackingEnabled,
  setUnits,
  updateLocationCoords,
  upsertLocation,
} from "./locations.js";
import { applyEffects, initEffects } from "./effects.js";
import { applyTheme, initBackground } from "./theme.js";
import { getUnitsLabel, toggleUnits } from "./units.js";
import {
  renderLocationTabs,
  renderSavedLocationsList,
  renderSearchResults,
  renderWeather,
  setLiveTrackingUI,
  showSkeletons,
  startFreshnessTicker,
} from "./ui.js";

const REFRESH_MS = 15 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 300;
const CLIENT_STALE_MS = 15 * 60 * 1000;

let units = getUnits();
let locations = getLocations();
let activeCity = getActiveCity();
let weatherByCity = {};
let lastFetchByCity = {};
let searchTimer = null;
let refreshTimer = null;
let searchMode = "search";

const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("search-input");
const searchDialogTitle = document.getElementById("search-dialog-title");
const searchHint = document.getElementById("search-hint");
const errorBanner = document.getElementById("error-banner");
const errorBannerText = document.getElementById("error-banner-text");
const offlineBanner = document.getElementById("offline-banner");
const geoBtn = document.getElementById("geo-btn");

const liveTracker = createLiveTracker({
  isEnabled: getLiveTrackingEnabled,
  setEnabled: (enabled) => {
    setLiveTrackingEnabled(enabled);
    setLiveTrackingUI(enabled);
  },
  onError: (message) => showError(message),
  onPosition: handleLivePosition,
});

initBackground();
initEffects();
updateUnitsButton();
setLiveTrackingUI(getLiveTrackingEnabled());
renderTabs();
bootstrap();

async function bootstrap() {
  if (!locations.length) {
    const def = getDefaultCity();
    locations = [def];
    saveLocations(locations);
    activeCity = def;
    setLastCityId(def.id);
  }

  if (getLiveTrackingEnabled()) {
    liveTracker.resumeIfEnabled();
    prefetchAllLocations();
  } else {
    await loadWeather(activeCity);
    prefetchAllLocations();
  }

  setupEvents();
  setupConnectivity();
  refreshTimer = setInterval(() => {
    if (activeCity.id === LIVE_LOCATION_ID && getLiveTrackingEnabled()) return;
    loadWeather(activeCity, { silent: true });
    prefetchAllLocations();
  }, REFRESH_MS);
}

async function prefetchAllLocations() {
  const jobs = locations.map((city) => {
    const lastFetch = lastFetchByCity[city.id];
    const cached = getCachedWeather(city.id);
    if (lastFetch && Date.now() - lastFetch < CLIENT_STALE_MS && cached) {
      return Promise.resolve();
    }
    return loadWeather(city, { silent: true });
  });
  await Promise.all(jobs);
  renderTabs();
}

function setupEvents() {
  document.getElementById("refresh-btn")?.addEventListener("click", () =>
    loadWeather(activeCity, { force: true })
  );
  document.getElementById("add-location-btn")?.addEventListener("click", () =>
    openSearch("add")
  );
  document.getElementById("search-btn")?.addEventListener("click", () =>
    openSearch("search")
  );
  document.getElementById("search-close")?.addEventListener("click", closeSearch);
  document.getElementById("search-live-btn")?.addEventListener("click", () => {
    closeSearch();
    enableLiveTracking();
  });
  geoBtn?.addEventListener("click", toggleLiveTracking);
  document.getElementById("units-toggle")?.addEventListener("click", onToggleUnits);
  document.getElementById("error-banner-dismiss")?.addEventListener("click", hideError);

  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      renderSearchResults([], () => {});
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const data = await searchCities(q);
        renderSearchResults(data.results || [], onSelectSearchResult);
      } catch (err) {
        showError(err.message);
      }
    }, SEARCH_DEBOUNCE_MS);
  });
}

function setupConnectivity() {
  const update = () => {
    offlineBanner.hidden = navigator.onLine;
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function openSearch(mode = "search") {
  searchMode = mode;
  if (searchDialogTitle) {
    searchDialogTitle.textContent = mode === "add" ? "Add location" : "Search city";
  }
  if (searchHint) {
    searchHint.textContent =
      mode === "add"
        ? "Pick a city to save it to your list (up to 8 locations)."
        : "Find a city to view or add to your list.";
  }
  renderSavedLocationsPanel();
  searchDialog?.showModal();
  searchInput?.focus();
  renderSearchResults([], () => {});
}

function renderSavedLocationsPanel() {
  renderSavedLocationsList(
    locations,
    activeCity.id,
    weatherByCity,
    units,
    (id) => {
      activeCity = locations.find((l) => l.id === id) || activeCity;
      setLastCityId(activeCity.id);
      closeSearch();
      renderTabs();
      loadWeather(activeCity);
    },
    (id) => {
      deleteLocation(id);
      renderSavedLocationsPanel();
    }
  );
}

function closeSearch() {
  searchDialog?.close();
  if (searchInput) searchInput.value = "";
}

function onSelectSearchResult(city) {
  const entry = {
    id: city.id || `${city.lat},${city.lon}`,
    name: city.name,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone || "auto",
  };

  if (getLiveTrackingEnabled()) {
    liveTracker.stop();
  }

  locations = upsertLocation(entry);
  activeCity = entry;
  setLastCityId(entry.id);
  renderTabs();
  closeSearch();
  loadWeather(activeCity, { force: true }).then(() => prefetchAllLocations());
}

function toggleLiveTracking() {
  if (liveTracker.toggle()) {
    hideError();
  }
}

function enableLiveTracking() {
  if (!liveTracker.start()) return;
  hideError();
}

function handleLivePosition({ lat, lon, shouldFetch, onFetched }) {
  let live = locations.find((l) => l.id === LIVE_LOCATION_ID);
  const moved = coordsChanged(live?.lat, live?.lon, lat, lon);

  if (!live) {
    live = createLiveLocation(lat, lon);
    locations = upsertLocation(live);
  } else if (moved) {
    locations = updateLocationCoords(LIVE_LOCATION_ID, lat, lon);
    live = locations.find((l) => l.id === LIVE_LOCATION_ID);
    delete weatherByCity[LIVE_LOCATION_ID];
    delete lastFetchByCity[LIVE_LOCATION_ID];
  } else {
    live = locations.find((l) => l.id === LIVE_LOCATION_ID) || live;
  }

  activeCity = live;
  setLastCityId(live.id);
  renderTabs();

  const hasCache = !!getCachedWeather(LIVE_LOCATION_ID);
  if (moved || !hasCache) {
    loadWeather(live, {
      force: moved || shouldFetch,
      silent: hasCache && !moved,
    }).then(onFetched);
  } else if (live.id === activeCity.id) {
    const cached = getCachedWeather(LIVE_LOCATION_ID);
    if (cached) {
      applyWeatherAtmosphere(cached);
      renderWeather(cached, units);
      startFreshnessTicker(cached.meta?.updated_at);
    }
  }
}

function applyWeatherAtmosphere(data) {
  if (!data) return;
  applyTheme(data.theme);
  applyEffects(data, units);
}

function getCachedWeather(cityId) {
  return weatherByCity[cityId] || null;
}

function onToggleUnits() {
  units = toggleUnits(units);
  setUnits(units);
  updateUnitsButton();
  const cached = getCachedWeather(activeCity.id);
  if (cached) {
    applyWeatherAtmosphere(cached);
    renderWeather(cached, units);
  }
  renderTabs();
  if (searchDialog?.open) renderSavedLocationsPanel();
}

function updateUnitsButton() {
  const btn = document.getElementById("units-toggle");
  if (btn) btn.textContent = getUnitsLabel(units);
}

function renderTabs() {
  renderLocationTabs(
    locations,
    activeCity.id,
    weatherByCity,
    units,
    (id) => {
      activeCity = locations.find((l) => l.id === id) || activeCity;
      setLastCityId(activeCity.id);
      renderTabs();

      const lastFetch = lastFetchByCity[activeCity.id];
      const cached = getCachedWeather(activeCity.id);
      if (lastFetch && Date.now() - lastFetch < CLIENT_STALE_MS && cached) {
        applyWeatherAtmosphere(cached);
        renderWeather(cached, units);
        startFreshnessTicker(cached.meta?.updated_at);
      }
      loadWeather(activeCity);
    },
    deleteLocation
  );
}

function deleteLocation(id) {
  if (locations.length <= 1) return;

  if (id === LIVE_LOCATION_ID) {
    liveTracker.stop();
  }

  const wasActive = activeCity.id === id;
  locations = removeLocation(id);
  delete weatherByCity[id];
  delete lastFetchByCity[id];

  if (wasActive) {
    activeCity = locations[0] || getDefaultCity();
    if (!locations.length) {
      activeCity = getDefaultCity();
      locations = [activeCity];
      saveLocations(locations);
    }
    setLastCityId(activeCity.id);
    renderTabs();
    loadWeather(activeCity, { force: true });
  } else {
    renderTabs();
  }

  if (searchDialog?.open) {
    renderSavedLocationsPanel();
  }
}

async function loadWeather(city, { force = false, silent = false } = {}) {
  if (!city) return;
  const lastFetch = lastFetchByCity[city.id];
  const cached = getCachedWeather(city.id);
  if (!force && lastFetch && Date.now() - lastFetch < CLIENT_STALE_MS && cached) {
    if (city.id === activeCity.id) {
      applyWeatherAtmosphere(cached);
      renderWeather(cached, units);
      startFreshnessTicker(cached.meta?.updated_at);
    }
    renderTabs();
    return;
  }

  if (!silent) showSkeletons();
  hideError();

  try {
    const data = await fetchWeather({
      lat: city.lat,
      lon: city.lon,
      timezone: city.timezone,
      name: city.name,
      country: city.country,
    });

    weatherByCity[city.id] = data;
    lastFetchByCity[city.id] = Date.now();

    if (data.location?.timezone && city.timezone === "auto") {
      city.timezone = data.location.timezone;
      if (city.id === LIVE_LOCATION_ID) {
        locations = updateLocationCoords(city.id, city.lat, city.lon);
        const stored = locations.find((l) => l.id === city.id);
        if (stored) stored.timezone = data.location.timezone;
      }
    }

    renderTabs();

    if (city.id === activeCity.id) {
      applyWeatherAtmosphere(data);
      renderWeather(data, units);
      startFreshnessTicker(data.meta?.updated_at);
    }

    if (data.meta?.stale) {
      showError("Showing cached weather — live data temporarily unavailable.", true);
    }
  } catch (err) {
    const fallback = getCachedWeather(city.id) || getCachedWeather(activeCity.id);
    if (fallback && city.id === activeCity.id) {
      applyWeatherAtmosphere(fallback);
      renderWeather(fallback, units);
      showError(`${err.message}. Showing last loaded data.`, true);
    } else if (city.id === activeCity.id) {
      showError(err.message);
    }
  }
}

function showError(message, isWarning = false) {
  if (!errorBanner || !errorBannerText) return;
  errorBannerText.textContent = message;
  errorBanner.hidden = false;
  errorBanner.style.background = isWarning
    ? "rgba(180, 120, 0, 0.92)"
    : "rgba(180, 40, 40, 0.92)";
  if (!isWarning) {
    clearTimeout(window._errorBannerTimer);
    window._errorBannerTimer = setTimeout(hideError, 6000);
  }
}

function hideError() {
  clearTimeout(window._errorBannerTimer);
  if (errorBanner) errorBanner.hidden = true;
}
