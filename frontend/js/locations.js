const STORAGE_KEY = "weather_locations";
const LAST_CITY_KEY = "weather_last_city";
const UNITS_KEY = "weather_units";
const LIVE_TRACKING_KEY = "weather_live_tracking";
const MAX_LOCATIONS = 8;

export const LIVE_LOCATION_ID = "__live__";

const DEFAULT_CITY = {
  id: "51.5074,-0.1278",
  name: "London",
  country: "United Kingdom",
  lat: 51.5074,
  lon: -0.1278,
  timezone: "Europe/London",
};

export function getUnits() {
  return localStorage.getItem(UNITS_KEY) || "metric";
}

export function setUnits(units) {
  localStorage.setItem(UNITS_KEY, units);
}

export function getLiveTrackingEnabled() {
  return localStorage.getItem(LIVE_TRACKING_KEY) === "true";
}

export function setLiveTrackingEnabled(enabled) {
  localStorage.setItem(LIVE_TRACKING_KEY, enabled ? "true" : "false");
}

export function getLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocations(locations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations.slice(0, MAX_LOCATIONS)));
}

export function getLastCityId() {
  return localStorage.getItem(LAST_CITY_KEY);
}

export function setLastCityId(id) {
  localStorage.setItem(LAST_CITY_KEY, id);
}

export function createLiveLocation(lat, lon) {
  return {
    id: LIVE_LOCATION_ID,
    name: "Live Location",
    country: "Tracking",
    lat,
    lon,
    timezone: "auto",
    isLive: true,
  };
}

export function upsertLocation(city) {
  const locations = getLocations().filter((l) => l.id !== city.id);
  const next = [city, ...locations].slice(0, MAX_LOCATIONS);
  saveLocations(next);
  return next;
}

export function addLocation(city) {
  const locations = getLocations();
  const exists = locations.find((l) => l.id === city.id);
  if (exists) {
    return upsertLocation(exists);
  }
  const next = [city, ...locations].slice(0, MAX_LOCATIONS);
  saveLocations(next);
  return next;
}

export function removeLocation(id) {
  const locations = getLocations().filter((l) => l.id !== id);
  saveLocations(locations);
  return locations;
}

export function updateLocationCoords(id, lat, lon) {
  const locations = getLocations();
  const idx = locations.findIndex((l) => l.id === id);
  if (idx === -1) return locations;
  locations[idx] = { ...locations[idx], lat, lon };
  saveLocations(locations);
  return [...locations];
}

export function getActiveCity() {
  const locations = getLocations();
  const lastId = getLastCityId();
  if (lastId) {
    const found = locations.find((l) => l.id === lastId);
    if (found) return found;
  }
  if (locations.length) return locations[0];
  return DEFAULT_CITY;
}

export function getDefaultCity() {
  return DEFAULT_CITY;
}

export { DEFAULT_CITY, MAX_LOCATIONS };
