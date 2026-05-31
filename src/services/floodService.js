import { fetchWithTimeout } from './utils.js';

const LOKOJA = {
  latitude: Number(process.env.LOKOJA_LAT ?? 7.8),
  longitude: Number(process.env.LOKOJA_LON ?? 6.74)
};

const FLOOD_CACHE_MS = 3 * 60 * 60 * 1000;
let floodCache = null;

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

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

async function fetchFloodWeather() {
  const params = new URLSearchParams({
    latitude: String(LOKOJA.latitude),
    longitude: String(LOKOJA.longitude),
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

export async function getFloodRisk() {
  if (floodCache && Date.now() - floodCache.cachedAt < FLOOD_CACHE_MS) {
    console.log("[flood] cache hit: Niger-Benue flood risk");
    return floodCache.data;
  }

  console.log("[flood] cache miss: fetching Open-Meteo flood inputs");
  const payload = await fetchFloodWeather();
  const daily = payload.daily;
  if (!daily?.time?.length) {
    throw serviceError("Open-Meteo flood response did not include daily precipitation.", "FLOOD_BAD_RESPONSE");
  }

  const todayIndex = Math.max(0, daily.time.findIndex((date) => date === new Date().toISOString().slice(0, 10)));
  const precip = daily.precipitation_sum ?? [];
  const probability = daily.precipitation_probability_max ?? [];
  const past30 = precip.slice(Math.max(0, todayIndex - 30), todayIndex);
  const forecast3 = precip.slice(todayIndex, todayIndex + 3);
  const forecast7 = precip.slice(todayIndex, todayIndex + 7);
  const prob3 = probability.slice(todayIndex, todayIndex + 3);

  const recentRain = sum(past30);
  const forecastRain = sum(forecast3);
  const peakProbability = Math.max(0, ...prob3.map((value) => Number(value) || 0));
  const month = new Date().getMonth() + 1;
  const confluenceSeasonBoost = month >= 7 && month <= 10 ? 15 : month >= 5 && month <= 11 ? 8 : 0;

  const recentComponent = Math.min(35, (recentRain / 250) * 35);
  const forecastComponent = Math.min(45, (forecastRain / 80) * 45);
  const probabilityComponent = Math.min(20, (peakProbability / 100) * 20);
  const score = Math.round(Math.min(100, recentComponent + forecastComponent + probabilityComponent + confluenceSeasonBoost));
  const category = categoryFromScore(score);

  const data = {
    source: "Open-Meteo forecast",
    location: "Niger-Benue confluence, Lokoja",
    latitude: LOKOJA.latitude,
    longitude: LOKOJA.longitude,
    flood_index: score,
    ...category,
    recent_30day_rain_mm: Number(recentRain.toFixed(1)),
    forecast_3day_rain_mm: Number(forecastRain.toFixed(1)),
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

  floodCache = {
    cachedAt: Date.now(),
    data
  };

  return data;
}

