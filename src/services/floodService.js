import { fetchWithTimeout } from './utils.js';
import { logger } from "../logger.js";

const FLOOD_LOCATIONS = {
  lokoja: {
    id: "lokoja",
    name: "Niger-Benue confluence, Lokoja",
    latitude: Number(process.env.LOKOJA_LAT ?? 7.8),
    longitude: Number(process.env.LOKOJA_LON ?? 6.74),
    riverineWeight: 1,
    seasonBoost: 15
  },
  idah: {
    id: "idah",
    name: "Idah riverine corridor",
    latitude: 7.11,
    longitude: 6.73,
    riverineWeight: 0.9,
    seasonBoost: 12
  },
  kabba: {
    id: "kabba",
    name: "Kabba upland drainage",
    latitude: 7.83,
    longitude: 6.07,
    riverineWeight: 0.48,
    seasonBoost: 6
  }
};

const FLOOD_CACHE_MS = 3 * 60 * 60 * 1000;
const floodCache = new Map();

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function categoryFromScore(score) {
  if (score >= 75) return { level: 3, category: "Severe", color_hex: "#FF0000" };
  if (score >= 55) return { level: 2, category: "High", color_hex: "#FF7E00" };
  if (score >= 35) return { level: 1, category: "Moderate", color_hex: "#FFFF00" };
  return { level: 0, category: "Low", color_hex: "#00E400" };
}

function normalizeLocation(location = "lokoja") {
  const id = String(location).trim().toLowerCase().replace(/\s+/g, "-");
  return FLOOD_LOCATIONS[id] ?? FLOOD_LOCATIONS.lokoja;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

async function fetchFloodWeather(location) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    daily: "precipitation_sum,precipitation_probability_max",
    past_days: "30",
    forecast_days: "7",
    timezone: "Africa/Lagos"
  });
  
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000); // Standard timeout
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetchWithTimeout(url, { headers: { accept: "application/json" } }, timeout);
  if (!response.ok) {
    throw serviceError(`Open-Meteo flood request failed with status ${response.status}.`, "FLOOD_METEO_REQUEST_FAILED");
  }
  return response.json();
}

function max(values) {
  return Math.max(0, ...values.map((value) => Number(value) || 0));
}

export function resolveTodayIndex(dates) {
  const today = new Date().toISOString().slice(0, 10);
  const exactIndex = dates.findIndex((date) => date === today);
  if (exactIndex >= 0) return exactIndex;

  const firstFutureIndex = dates.findIndex((date) => String(date) > today);
  if (firstFutureIndex >= 0) return firstFutureIndex;

  return Math.max(0, dates.length - 7);
}

function buildDrivers({
  recent7,
  recent14,
  recent30,
  forecast3,
  forecast7,
  peakProbability,
  peakDailyForecast,
  riverineWeight,
  confluenceSeasonBoost
}) {
  return [
    {
      key: "antecedent_7day",
      label: "7-day antecedent rain",
      value: Number(recent7.toFixed(1)),
      unit: "mm",
      contribution: Math.min(20, (recent7 / 90) * 20)
    },
    {
      key: "antecedent_14day",
      label: "14-day saturation rain",
      value: Number(recent14.toFixed(1)),
      unit: "mm",
      contribution: Math.min(20, (recent14 / 160) * 20)
    },
    {
      key: "antecedent_30day",
      label: "30-day catchment wetness",
      value: Number(recent30.toFixed(1)),
      unit: "mm",
      contribution: Math.min(18, (recent30 / 260) * 18)
    },
    {
      key: "forecast_3day",
      label: "3-day forecast rain",
      value: Number(forecast3.toFixed(1)),
      unit: "mm",
      contribution: Math.min(25, (forecast3 / 90) * 25)
    },
    {
      key: "forecast_7day",
      label: "7-day forecast rain",
      value: Number(forecast7.toFixed(1)),
      unit: "mm",
      contribution: Math.min(12, (forecast7 / 160) * 12)
    },
    {
      key: "peak_probability",
      label: "Peak precipitation probability",
      value: Number(peakProbability.toFixed(0)),
      unit: "%",
      contribution: Math.min(12, (peakProbability / 100) * 12)
    },
    {
      key: "extreme_daily_forecast",
      label: "Peak daily forecast",
      value: Number(peakDailyForecast.toFixed(1)),
      unit: "mm",
      contribution: Math.min(18, (peakDailyForecast / 70) * 18)
    },
    {
      key: "riverine_exposure",
      label: "Riverine exposure weighting",
      value: Number(riverineWeight.toFixed(2)),
      unit: "factor",
      contribution: 12 * riverineWeight
    },
    {
      key: "seasonal_exposure",
      label: "Rainy-season exposure",
      value: confluenceSeasonBoost,
      unit: "points",
      contribution: confluenceSeasonBoost
    }
  ].map((driver) => ({
    ...driver,
    contribution: Number(driver.contribution.toFixed(2))
  }));
}

export async function getFloodRisk(locationId = "lokoja") {
  const location = normalizeLocation(locationId);
  const cached = floodCache.get(location.id);
  if (cached && Date.now() - cached.cachedAt < FLOOD_CACHE_MS) {
    logger.info("Flood cache hit", { location_id: location.id });
    return cached.data;
  }

  logger.info("Flood cache miss; fetching Open-Meteo inputs", {
    location_id: location.id,
    latitude: location.latitude,
    longitude: location.longitude
  });
  const payload = await fetchFloodWeather(location);
  const daily = payload.daily;
  if (!daily?.time?.length) {
    throw serviceError("Open-Meteo flood response did not include daily precipitation.", "FLOOD_BAD_RESPONSE");
  }

  const todayIndex = resolveTodayIndex(daily.time);
  const precip = daily.precipitation_sum ?? [];
  const probability = daily.precipitation_probability_max ?? [];
  const past30 = precip.slice(Math.max(0, todayIndex - 30), todayIndex);
  const past14 = precip.slice(Math.max(0, todayIndex - 14), todayIndex);
  const past7 = precip.slice(Math.max(0, todayIndex - 7), todayIndex);
  const forecast3 = precip.slice(todayIndex, todayIndex + 3);
  const forecast7 = precip.slice(todayIndex, todayIndex + 7);
  const prob3 = probability.slice(todayIndex, todayIndex + 3);
  const prob7 = probability.slice(todayIndex, todayIndex + 7);

  const recent7 = sum(past7);
  const recent14 = sum(past14);
  const recentRain = sum(past30);
  const forecastRain = sum(forecast3);
  const forecastWeekRain = sum(forecast7);
  const peakProbability = max(prob7.length ? prob7 : prob3);
  const peakDailyForecast = max(forecast7);
  const month = new Date().getMonth() + 1;
  const confluenceSeasonBoost = month >= 7 && month <= 10 ? location.seasonBoost : month >= 5 && month <= 11 ? location.seasonBoost * 0.6 : 0;
  const drivers = buildDrivers({
    recent7,
    recent14,
    recent30: recentRain,
    forecast3: forecastRain,
    forecast7: forecastWeekRain,
    peakProbability,
    peakDailyForecast,
    riverineWeight: location.riverineWeight,
    confluenceSeasonBoost
  });
  const rawScore = drivers.reduce((total, driver) => total + driver.contribution, 0);
  const score = Math.round(Math.min(100, rawScore));
  const category = categoryFromScore(score);
  const confidence = Math.round(Math.min(95, 55 + Math.min(20, probability.filter((value) => Number.isFinite(Number(value))).length * 1.6) + Math.min(20, forecast7.length * 2)));

  const data = {
    source: "Open-Meteo forecast",
    location: location.name,
    location_id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    flood_index: score,
    ...category,
    confidence_percent: confidence,
    recent_7day_rain_mm: Number(recent7.toFixed(1)),
    recent_14day_rain_mm: Number(recent14.toFixed(1)),
    recent_30day_rain_mm: Number(recentRain.toFixed(1)),
    forecast_3day_rain_mm: Number(forecastRain.toFixed(1)),
    forecast_7day_rain_mm: Number(forecastWeekRain.toFixed(1)),
    peak_daily_forecast_mm: Number(peakDailyForecast.toFixed(1)),
    peak_probability_percent: Number(peakProbability.toFixed(0)),
    drivers,
    forecast_7day: daily.time.slice(todayIndex, todayIndex + 7).map((date, index) => ({
      date,
      precipitation_mm: Number((forecast7[index] ?? 0).toFixed(1)),
      probability_percent: Number(probability[todayIndex + index] ?? 0)
    })),
    advisory_text:
      score >= 75
        ? "Severe flood conditions are possible around low-lying Niger-Benue confluence areas. Prepare emergency response checks."
        : score >= 55
          ? "Flood risk is high. Monitor riverine communities and avoid unnecessary movement near flood-prone roads."
          : score >= 35
            ? "Flood risk is moderate. Watch rainfall updates and prepare drainage checks."
            : "Flood risk is low. Continue routine monitoring.",
    timestamp: new Date().toISOString()
  };

  floodCache.set(location.id, {
    cachedAt: Date.now(),
    data
  });

  return data;
}

export function getFloodLocations() {
  return Object.values(FLOOD_LOCATIONS).map(({ id, name, latitude, longitude }) => ({ id, name, latitude, longitude }));
}
