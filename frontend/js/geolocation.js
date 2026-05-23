const MOVE_THRESHOLD = 0.012;
const LIVE_FETCH_MIN_MS = 2 * 60 * 1000;

let watchId = null;
let lastLiveFetchAt = 0;

export function coordsChanged(prevLat, prevLon, lat, lon) {
  if (prevLat == null || prevLon == null) return true;
  return Math.abs(prevLat - lat) + Math.abs(prevLon - lon) >= MOVE_THRESHOLD;
}

export function createLiveTracker({
  onPosition,
  onError,
  isEnabled,
  setEnabled,
}) {
  function clearWatch() {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function stop() {
    clearWatch();
    setEnabled(false);
  }

  function start() {
    if (!navigator.geolocation) {
      onError("Geolocation is not supported in this browser.");
      return false;
    }

    clearWatch();
    setEnabled(true);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const now = Date.now();
        const shouldFetch =
          now - lastLiveFetchAt >= LIVE_FETCH_MIN_MS ||
          !lastLiveFetchAt;

        onPosition({
          lat: latitude,
          lon: longitude,
          shouldFetch,
          onFetched: () => {
            lastLiveFetchAt = Date.now();
          },
        });
      },
      (err) => {
        const message =
          err.code === 1
            ? "Location access denied. Enable location in browser settings."
            : err.code === 2
              ? "Location unavailable. Try again outdoors or near a window."
              : "Could not get your location. Try again.";
        onError(message);
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );

    return true;
  }

  function toggle() {
    if (isEnabled()) {
      stop();
      return false;
    }
    start();
    return true;
  }

  function resumeIfEnabled() {
    if (isEnabled()) start();
  }

  return { start, stop, toggle, resumeIfEnabled };
}
