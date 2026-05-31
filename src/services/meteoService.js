import { fetchWithTimeout } from './utils.js';

const LOKOJA = {
  latitude: Number(process.env.LOKOJA_LAT ?? 7.8),
  longitude: Number(process.env.LOKOJA_LON ?? 6.74)
};

const FORECAST_TTL_MS = Number(process.env.OPEN_METEO_REFRESH_HOURS ?? 3) * 60 * 60 * 1000;

let forecastCache = null;

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function getCloudCoverValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(0, Math.min(100, numeric));
}

export function determineStabilityClass(windSpeed, cloudCover, date = new Date()) {
  const u = Math.max(0, Number(windSpeed) || 0);
  const cloud = getCloudCoverValue(cloudCover);
  const hour = date.getUTCHours() + 1;
  const isDaytime = hour >= 7 && hour <= 18;

  if (!isDaytime) {
    if (cloud >= 70) return "D";
    if (u < 2) return "F";
    if (u < 3) return "E";
    if (u < 5) return "D";
    return "D";
  }

  if (cloud >= 85) return "D";

  const strongSun = cloud < 35;
  const moderateSun = cloud >= 35 && cloud < 70;

  if (u < 2) return strongSun ? "A" : moderateSun ? "B" : "D";
  if (u < 3) return strongSun ? "B" : moderateSun ? "C" : "D";
  if (u < 5) return strongSun ? "B" : moderateSun ? "C" : "D";
  if (u < 6) return strongSun ? "C" : moderateSun ? "D" : "D";
  return strongSun ? "C" : "D";
}

function buildOpenMeteoUrl(hours) {
  const params = new URLSearchParams({
    latitude: String(LOKOJA.latitude),
    longitude: String(LOKOJA.longitude),
    current: "temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover",
    hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover",
    forecast_days: "3",
    timezone: "Africa/Lagos"
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function normalizeCurrent(payload) {
  const current = payload.current;
  if (!current) {
    throw serviceError("Open-Meteo response did not include current meteorology.", "OPEN_METEO_BAD_RESPONSE");
  }

  const timestamp = current.time ? new Date(current.time).toISOString() : new Date().toISOString();
  const windSpeed = Number(current.wind_speed_10m ?? 0);
  const cloudCover = getCloudCoverValue(current.cloud_cover);
  const tempK = Number(current.temperature_2m) + 273.15;

  return {
    wind_speed: windSpeed,
    wind_dir: Number(current.wind_direction_10m ?? 0),
    temp_k: Number(tempK.toFixed(2)),
    cloud_cover: cloudCover,
    boundary_layer_height: null,
    stability_class: determineStabilityClass(windSpeed, cloudCover, new Date(timestamp)),
    timestamp
  };
}

function normalizeForecast(payload, hours) {
  const hourly = payload.hourly;
  if (!hourly?.time?.length) {
    throw serviceError("Open-Meteo response did not include hourly forecast data.", "OPEN_METEO_BAD_RESPONSE");
  }

  const rows = hourly.time.slice(0, hours).map((time, index) => {
    const windSpeed = Number(hourly.wind_speed_10m?.[index] ?? 0);
    const cloudCover = getCloudCoverValue(hourly.cloud_cover?.[index]);
    const tempK = Number(hourly.temperature_2m?.[index]) + 273.15;

    return {
      timestamp: new Date(time).toISOString(),
      wind_speed: windSpeed,
      wind_dir: Number(hourly.wind_direction_10m?.[index] ?? 0),
      temp_k: Number(tempK.toFixed(2)),
      cloud_cover: cloudCover,
      stability_class: determineStabilityClass(windSpeed, cloudCover, new Date(time))
    };
  });

  return {
    hourly: rows,
    boundary_layer_height: null
  };
}

async function fetchOpenMeteo(hours = 48) {
  const url = buildOpenMeteoUrl(hours);
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000); // Standard timeout
  const response = await fetchWithTimeout(url, {
    headers: { accept: "application/json" }
  }, timeout);

  if (!response.ok) {
    throw serviceError(`Open-Meteo request failed with status ${response.status}.`, "OPEN_METEO_REQUEST_FAILED");
  }

  return response.json();
}

export async function getCurrentMeteo() {
  const now = Date.now();
  if (forecastCache && now - forecastCache.cachedAt < FORECAST_TTL_MS) {
    console.log("[meteo] cache hit: current meteorology");
    return forecastCache.current;
  }

  console.log("[meteo] cache miss: fetching Open-Meteo current and forecast");
  const payload = await fetchOpenMeteo(48);
  const current = normalizeCurrent(payload);
  const forecast = normalizeForecast(payload, 48);

  forecastCache = {
    cachedAt: now,
    current,
    forecast
  };

  return current;
}

export async function getMeteoForecast(hours = 48) {
  const requestedHours = Math.max(1, Math.min(Number(hours) || 48, 48));
  const now = Date.now();

  if (forecastCache && now - forecastCache.cachedAt < FORECAST_TTL_MS) {
    console.log("[meteo] cache hit: forecast");
    return {
      hourly: forecastCache.forecast.hourly.slice(0, requestedHours),
      boundary_layer_height: forecastCache.forecast.boundary_layer_height
    };
  }

  console.log("[meteo] cache miss: fetching Open-Meteo forecast");
  const payload = await fetchOpenMeteo(requestedHours);
  const current = normalizeCurrent(payload);
  const forecast = normalizeForecast(payload, requestedHours);

  forecastCache = {
    cachedAt: now,
    current,
    forecast
  };

  return forecast;
}

export function startMeteoRefresh() {
  const refreshMs = FORECAST_TTL_MS;
  setInterval(async () => {
    try {
      await getMeteoForecast(48);
      console.log("[meteo] scheduled refresh complete");
    } catch (error) {
      console.error("[meteo] scheduled refresh failed:", error.message);
    }
  }, refreshMs).unref();
}
