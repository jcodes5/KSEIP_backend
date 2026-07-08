import { getKogiLga, getKogiLgas } from "../data/kogiLgas.js";
import { logger } from "../logger.js";
import { fetchWithTimeout } from "./utils.js";
import { buildWeatherIntelligence, weatherCodeToCondition } from "./weatherRiskEngine.js";

const CURRENT_TTL_MS = Number(process.env.WEATHER_CURRENT_CACHE_MINUTES ?? 15) * 60 * 1000;
const FORECAST_TTL_MS = Number(process.env.WEATHER_FORECAST_CACHE_HOURS ?? 6) * 60 * 60 * 1000;
const MAX_DAYS = 7;
const KOGI_COVERAGE_RADIUS_KM = Number(process.env.WEATHER_KOGI_COVERAGE_RADIUS_KM ?? 80);

const currentCache = new Map();
const forecastCache = new Map();
const coordinateCurrentCache = new Map();
const reverseGeocodeCache = new Map();

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function round(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function numberAt(values, index, fallback = 0) {
  const numeric = Number(values?.[index]);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildOpenMeteoUrl(lga, days = MAX_DAYS) {
  const params = new URLSearchParams({
    latitude: String(lga.latitude),
    longitude: String(lga.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "visibility",
      "uv_index"
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "visibility",
      "uv_index"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
      "uv_index_max"
    ].join(","),
    forecast_days: String(Math.max(1, Math.min(Number(days) || MAX_DAYS, MAX_DAYS))),
    timezone: "Africa/Lagos",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm"
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

async function fetchOpenMeteo(lga, days = MAX_DAYS) {
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000);
  const response = await fetchWithTimeout(buildOpenMeteoUrl(lga, days), {
    headers: { accept: "application/json" }
  }, timeout);

  if (!response.ok) {
    throw serviceError(`Open-Meteo weather request failed with status ${response.status}.`, "WEATHER_OPEN_METEO_REQUEST_FAILED");
  }

  return response.json();
}

async function fetchReverseGeocode(latitude, longitude) {
  const cacheKey = buildCoordinateCacheKey(latitude, longitude);
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
    return cached.data;
  }

  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000);
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "12");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          accept: "application/json",
          "user-agent": "KSEIP/1.0 (weather location lookup)"
        }
      },
      timeout
    );

    if (!response.ok) {
      throw serviceError(`Reverse geocoding failed with status ${response.status}.`, "WEATHER_REVERSE_GEOCODE_FAILED");
    }

    const payload = await response.json();
    const address = payload?.address ?? {};
    const locationName = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? address.state_district ?? address.state ?? payload?.name ?? payload?.display_name ?? "Detected location";

    const result = {
      name: locationName,
      displayName: payload?.display_name ?? locationName,
      state: address.state ?? null,
      county: address.county ?? null,
      district: address.state_district ?? null,
      locality: address.city ?? address.town ?? address.village ?? address.municipality ?? null,
      raw: payload
    };

    reverseGeocodeCache.set(cacheKey, { cachedAt: Date.now(), data: result });
    return result;
  } catch (error) {
    logger.warn("Reverse geocoding failed", { latitude, longitude, message: error.message, code: error.code });
    return null;
  }
}

function average(values) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return null;
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, 1);
}

function toFiniteNumber(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw serviceError(`${fieldName} must be a valid number.`, "WEATHER_INVALID_COORDINATES", 400);
  }
  return numeric;
}

function haversineKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);

  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function buildCoordinateCacheKey(latitude, longitude) {
  return `${Number(latitude).toFixed(4)}:${Number(longitude).toFixed(4)}`;
}

function findNearestKogiLga(latitude, longitude) {
  const lgas = getKogiLgas();
  let nearest = null;

  for (const lga of lgas) {
    const distanceKm = haversineKm(latitude, longitude, lga.latitude, lga.longitude);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { ...lga, distanceKm };
    }
  }

  if (!nearest) {
    throw serviceError("Kogi LGA lookup failed.", "WEATHER_LOCATION_LOOKUP_FAILED", 503);
  }

  return nearest;
}

function normalizeCoordinateWeather(payload, coordinateLocation, nearestLga, stale = false, cachedAt = null, fromCache = false) {
  const current = normalizeCurrent(payload, coordinateLocation, stale, cachedAt, fromCache);
  const distanceKm = round(nearestLga.distanceKm, 1);

  return {
    ...current,
    location: coordinateLocation.name,
    detected_location: coordinateLocation.name,
    detected_location_source: coordinateLocation.source ?? "coordinates",
    nearest_lga: nearestLga.name,
    nearest_lga_id: nearestLga.id,
    nearest_lga_distance_km: distanceKm,
    detected_lga_id: nearestLga.id,
    detected_distance_km: distanceKm,
    outside_kogi_coverage: nearestLga.distanceKm > KOGI_COVERAGE_RADIUS_KM,
    query_coordinates: {
      latitude: coordinateLocation.latitude,
      longitude: coordinateLocation.longitude,
      accuracy_m: coordinateLocation.accuracy_m ?? null
    }
  };
}

function normalizeCurrent(payload, lga, stale = false, cachedAt = null, fromCache = false) {
  const current = payload.current;
  if (!current) {
    throw serviceError("Open-Meteo response did not include current weather.", "WEATHER_BAD_RESPONSE");
  }

  const weatherCode = Number(current.weather_code ?? 0);
  const rainProbability = Number(current.precipitation_probability ?? payload.hourly?.precipitation_probability?.[0] ?? 0);
  const rainVolume = Number(current.precipitation ?? current.rain ?? 0);
  const timestamp = current.time ? new Date(current.time).toISOString() : new Date().toISOString();
  const cacheTimestamp = cachedAt ? new Date(cachedAt).toISOString() : new Date().toISOString();

  return {
    source: "Open-Meteo forecast",
    location: lga.name,
    lga_id: lga.id,
    latitude: lga.latitude,
    longitude: lga.longitude,
    temperature: round(current.temperature_2m),
    feelsLike: round(current.apparent_temperature),
    humidity: round(current.relative_humidity_2m, 0),
    rainProbability: round(rainProbability, 0),
    rainVolume: round(rainVolume),
    windSpeed: round(current.wind_speed_10m),
    windDirection: round(current.wind_direction_10m, 0),
    windGusts: round(current.wind_gusts_10m),
    visibility: round(current.visibility, 0),
    cloudCover: round(current.cloud_cover, 0),
    uvIndex: round(current.uv_index),
    weatherCode,
    weatherCondition: weatherCodeToCondition(weatherCode),
    timestamp,
    cached: fromCache,
    stale,
    cached_at: cacheTimestamp
  };
}

function normalizeHourly(payload, hours = 48) {
  const hourly = payload.hourly;
  if (!hourly?.time?.length) {
    throw serviceError("Open-Meteo response did not include hourly weather.", "WEATHER_BAD_RESPONSE");
  }

  return hourly.time.slice(0, Math.max(1, Math.min(Number(hours) || 48, hourly.time.length))).map((time, index) => {
    const weatherCode = Number(hourly.weather_code?.[index] ?? 0);
    return {
      timestamp: new Date(time).toISOString(),
      temperature: round(hourly.temperature_2m?.[index]),
      feelsLike: round(hourly.apparent_temperature?.[index]),
      humidity: round(hourly.relative_humidity_2m?.[index], 0),
      rainProbability: round(hourly.precipitation_probability?.[index], 0),
      rainVolume: round(hourly.precipitation?.[index] ?? hourly.rain?.[index] ?? 0),
      windSpeed: round(hourly.wind_speed_10m?.[index]),
      windDirection: round(hourly.wind_direction_10m?.[index], 0),
      windGusts: round(hourly.wind_gusts_10m?.[index]),
      visibility: round(hourly.visibility?.[index], 0),
      cloudCover: round(hourly.cloud_cover?.[index], 0),
      uvIndex: round(hourly.uv_index?.[index]),
      weatherCode,
      weatherCondition: weatherCodeToCondition(weatherCode)
    };
  });
}

function normalizeDaily(payload, days = MAX_DAYS) {
  const daily = payload.daily;
  if (!daily?.time?.length) {
    throw serviceError("Open-Meteo response did not include daily weather.", "WEATHER_BAD_RESPONSE");
  }

  const hourly = payload.hourly ?? {};

  return daily.time.slice(0, Math.max(1, Math.min(Number(days) || MAX_DAYS, daily.time.length))).map((date, index) => {
    const weatherCode = Number(daily.weather_code?.[index] ?? 0);
    const matchingHourIndexes = (hourly.time ?? [])
      .map((time, hourIndex) => (String(time).startsWith(date) ? hourIndex : null))
      .filter((hourIndex) => hourIndex !== null);
    const humidityValues = matchingHourIndexes.map((hourIndex) => numberAt(hourly.relative_humidity_2m, hourIndex, NaN));

    return {
      date,
      temperatureMax: round(daily.temperature_2m_max?.[index]),
      temperatureMin: round(daily.temperature_2m_min?.[index]),
      feelsLikeMax: round(daily.apparent_temperature_max?.[index]),
      feelsLikeMin: round(daily.apparent_temperature_min?.[index]),
      humidityMean: average(humidityValues),
      rainProbability: round(daily.precipitation_probability_max?.[index], 0),
      rainVolume: round(daily.precipitation_sum?.[index] ?? daily.rain_sum?.[index] ?? 0),
      windSpeed: round(daily.wind_speed_10m_max?.[index]),
      windGusts: round(daily.wind_gusts_10m_max?.[index]),
      windDirection: round(daily.wind_direction_10m_dominant?.[index], 0),
      uvIndex: round(daily.uv_index_max?.[index]),
      weatherCode,
      weatherCondition: weatherCodeToCondition(weatherCode)
    };
  });
}

function buildForecast(payload, lga, days = MAX_DAYS, stale = false, cachedAt = null, fromCache = false) {
  const dailyForecast = normalizeDaily(payload, days);
  const hourlyForecast = normalizeHourly(payload, Math.min(24 * days, 168));
  const current = normalizeCurrent(payload, lga, stale, cachedAt, fromCache);

  return {
    source: "Open-Meteo forecast",
    location: lga.name,
    lga_id: lga.id,
    latitude: lga.latitude,
    longitude: lga.longitude,
    current,
    hourlyForecast,
    dailyForecast,
    cached: fromCache,
    stale,
    cached_at: cachedAt ? new Date(cachedAt).toISOString() : new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
}

function cachePayload(lga, payload) {
  const cachedAt = Date.now();
  const current = normalizeCurrent(payload, lga, false, cachedAt, false);
  const forecast = buildForecast(payload, lga, MAX_DAYS, false, cachedAt, false);

  currentCache.set(lga.id, { cachedAt, payload, data: current });
  forecastCache.set(lga.id, { cachedAt, payload, data: forecast });

  return { current, forecast, cachedAt };
}

function staleCurrent(lga) {
  const cached = currentCache.get(lga.id) ?? forecastCache.get(lga.id);
  if (!cached) return null;
  return normalizeCurrent(cached.payload, lga, true, cached.cachedAt, true);
}

function staleForecast(lga, days = MAX_DAYS) {
  const cached = forecastCache.get(lga.id) ?? currentCache.get(lga.id);
  if (!cached) return null;
  return buildForecast(cached.payload, lga, days, true, cached.cachedAt, true);
}

function staleCoordinateCurrent(cacheKey, coordinateLocation, nearestLga) {
  const cached = coordinateCurrentCache.get(cacheKey);
  if (!cached) return null;
  return normalizeCoordinateWeather(cached.payload, coordinateLocation, nearestLga, true, cached.cachedAt, true);
}

export function getWeatherLgas() {
  return getKogiLgas();
}

export async function getCurrentWeather(lgaId = "lokoja", options = {}) {
  const lga = getKogiLga(lgaId);
  const cached = currentCache.get(lga.id);

  if (!options.forceRefresh && cached && Date.now() - cached.cachedAt < CURRENT_TTL_MS) {
    logger.info("Weather current cache hit", { lga_id: lga.id });
    return { ...cached.data, cached: true, stale: false, cached_at: new Date(cached.cachedAt).toISOString() };
  }

  try {
    logger.info("Weather current cache miss; fetching Open-Meteo", { lga_id: lga.id, latitude: lga.latitude, longitude: lga.longitude });
    const payload = await fetchOpenMeteo(lga, MAX_DAYS);
    return cachePayload(lga, payload).current;
  } catch (error) {
    logger.warn("Weather current fetch failed", { lga_id: lga.id, message: error.message, code: error.code });
    const stale = staleCurrent(lga);
    if (stale) return { ...stale, warning: "Weather source failed; showing the most recent cached current conditions." };
    throw error;
  }
}

export async function getCurrentWeatherByCoordinates(latitude, longitude, options = {}) {
  const normalizedLatitude = toFiniteNumber(latitude, "latitude");
  const normalizedLongitude = toFiniteNumber(longitude, "longitude");
  const normalizedAccuracy = options.accuracy == null ? null : toFiniteNumber(options.accuracy, "accuracy");
  const nearestLga = findNearestKogiLga(normalizedLatitude, normalizedLongitude);
  const cacheKey = buildCoordinateCacheKey(normalizedLatitude, normalizedLongitude);
  const cached = coordinateCurrentCache.get(cacheKey);
  const reverseGeocode = await fetchReverseGeocode(normalizedLatitude, normalizedLongitude);
  const resolvedLocationName = reverseGeocode?.name ?? "Browser coordinates";
  const resolvedLocationSource = reverseGeocode ? "reverse-geocode" : "browser-geolocation";

  if (!options.forceRefresh && cached && Date.now() - cached.cachedAt < CURRENT_TTL_MS) {
    logger.info("Weather coordinate cache hit", {
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      lga_id: nearestLga.id
    });
    return {
      ...normalizeCoordinateWeather(cached.payload, {
        id: cacheKey,
        name: resolvedLocationName,
        source: resolvedLocationSource,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        accuracy_m: normalizedAccuracy
      }, nearestLga, false, cached.cachedAt, true),
      detected_location_display_name: reverseGeocode?.displayName ?? resolvedLocationName,
      cached: true,
      stale: false,
      cached_at: new Date(cached.cachedAt).toISOString()
    };
  }

  const coordinateLocation = {
    id: cacheKey,
    name: resolvedLocationName,
    source: resolvedLocationSource,
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
    accuracy_m: normalizedAccuracy
  };

  try {
    logger.info("Weather coordinate cache miss; fetching Open-Meteo", {
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      nearest_lga_id: nearestLga.id
    });
    const payload = await fetchOpenMeteo(coordinateLocation, MAX_DAYS);
    const cachedAt = Date.now();
    const current = normalizeCoordinateWeather(payload, coordinateLocation, nearestLga, false, cachedAt, false);
    coordinateCurrentCache.set(cacheKey, { cachedAt, payload, data: current });

    return {
      ...current,
      detected_location_display_name: reverseGeocode?.displayName ?? resolvedLocationName,
      cached: false,
      stale: false,
      cached_at: new Date(cachedAt).toISOString()
    };
  } catch (error) {
    logger.warn("Weather coordinate fetch failed", {
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      nearest_lga_id: nearestLga.id,
      message: error.message,
      code: error.code
    });
    const stale = staleCoordinateCurrent(cacheKey, coordinateLocation, nearestLga);
    if (stale) {
      return {
        ...stale,
        detected_location_display_name: reverseGeocode?.displayName ?? resolvedLocationName,
        warning: "Weather source failed; showing the most recent cached current conditions."
      };
    }
    throw error;
  }
}

export async function getWeatherForecast(lgaId = "lokoja", days = MAX_DAYS, options = {}) {
  const lga = getKogiLga(lgaId);
  const requestedDays = Math.max(1, Math.min(Number(days) || MAX_DAYS, MAX_DAYS));
  const cached = forecastCache.get(lga.id);

  if (!options.forceRefresh && cached && Date.now() - cached.cachedAt < FORECAST_TTL_MS) {
    logger.info("Weather forecast cache hit", { lga_id: lga.id, days: requestedDays });
    return buildForecast(cached.payload, lga, requestedDays, false, cached.cachedAt, true);
  }

  try {
    logger.info("Weather forecast cache miss; fetching Open-Meteo", { lga_id: lga.id, latitude: lga.latitude, longitude: lga.longitude });
    const payload = await fetchOpenMeteo(lga, requestedDays);
    cachePayload(lga, payload);
    return buildForecast(payload, lga, requestedDays, false, Date.now(), false);
  } catch (error) {
    logger.warn("Weather forecast fetch failed", { lga_id: lga.id, message: error.message, code: error.code });
    const stale = staleForecast(lga, requestedDays);
    if (stale) return { ...stale, warning: "Weather source failed; showing the most recent cached forecast." };
    throw error;
  }
}

export async function getWeatherIntelligence(lgaId = "lokoja", options = {}) {
  const lga = getKogiLga(lgaId);
  const forecast = await getWeatherForecast(lga.id, MAX_DAYS, options);
  const intelligence = buildWeatherIntelligence({
    lga,
    current: forecast.current,
    dailyForecast: forecast.dailyForecast
  });

  return {
    source: forecast.source,
    location: lga.name,
    lga_id: lga.id,
    latitude: lga.latitude,
    longitude: lga.longitude,
    current: forecast.current,
    hourlyForecast: forecast.hourlyForecast.slice(0, 48).map((hour) => ({
      ...hour,
      riskLevel: buildWeatherIntelligence({ lga, current: hour, dailyForecast: forecast.dailyForecast }).riskLevel
    })),
    dailyForecast: forecast.dailyForecast,
    intelligence,
    cached: forecast.cached,
    stale: forecast.stale,
    cached_at: forecast.cached_at,
    timestamp: new Date().toISOString(),
    warning: forecast.warning
  };
}

export async function getWeatherMap(options = {}) {
  const lgas = getKogiLgas();
  const results = await Promise.allSettled(lgas.map((lga) => getWeatherIntelligence(lga.id, options)));
  return {
    source: "Open-Meteo forecast",
    timestamp: new Date().toISOString(),
    locations: results.map((result, index) => {
      const lga = lgas[index];
      if (result.status === "fulfilled") {
        const data = result.value;
        return {
          id: lga.id,
          name: lga.name,
          latitude: lga.latitude,
          longitude: lga.longitude,
          weatherScore: data.intelligence.overallWeatherScore,
          riskLevel: data.intelligence.riskLevel,
          topRiskDriver: data.intelligence.topRiskDriver,
          weatherCondition: data.current.weatherCondition,
          recommendationText: data.intelligence.recommendationText,
          stale: data.stale,
          cached_at: data.cached_at
        };
      }

      return {
        id: lga.id,
        name: lga.name,
        latitude: lga.latitude,
        longitude: lga.longitude,
        error: true,
        message: result.reason?.message ?? "Weather data unavailable.",
        code: result.reason?.code ?? "WEATHER_MAP_LOCATION_FAILED"
      };
    })
  };
}

export const weatherServiceTestUtils = {
  buildOpenMeteoUrl,
  normalizeCurrent,
  normalizeHourly,
  normalizeDaily,
  normalizeCoordinateWeather,
  cachePayload,
  buildCoordinateCacheKey,
  findNearestKogiLga,
  haversineKm
};
