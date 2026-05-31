import { fetchWithTimeout } from "./utils.js";
const AQI_CACHE_MS = Number(process.env.AQI_CACHE_HOURS ?? 24) * 60 * 60 * 1000;
const AQI_FRESH_MS = Number(process.env.WAQI_POLL_MINUTES ?? 60) * 60 * 1000;
const AQI_STALE_BADGE_MS = 2 * 60 * 60 * 1000;
const WAQI_DAILY_LIMIT = Number(process.env.WAQI_DAILY_LIMIT ?? 1000);

const LOCATIONS = {
  lokoja: {
    id: "lokoja",
    name: "Lokoja",
    latitude: 7.8,
    longitude: 6.74,
    waqiStation: "geo:7.80;6.74"
  },
  obajana: {
    id: "obajana",
    name: "Obajana",
    latitude: 7.5,
    longitude: 6.32,
    waqiStation: "geo:7.50;6.32"
  },
  okene: {
    id: "okene",
    name: "Okene",
    latitude: 7.55,
    longitude: 6.24,
    waqiStation: "geo:7.55;6.24"
  },
  anyigba: {
    id: "anyigba",
    name: "Anyigba",
    latitude: 7.48,
    longitude: 6.9,
    waqiStation: "geo:7.48;6.90"
  },
  nearest: {
    id: "nearest",
    name: "Nearest observed station",
    latitude: 7.8,
    longitude: 6.74,
    waqiStation: "geo:7.80;6.74"
  }
};

const cache = new Map();
const tokenBucket = {
  capacity: WAQI_DAILY_LIMIT,
  tokens: WAQI_DAILY_LIMIT,
  lastRefill: Date.now()
};

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeLocation(location = "lokoja") {
  const id = String(location).trim().toLowerCase();
  return LOCATIONS[id] ?? LOCATIONS.lokoja;
}

function refillTokens() {
  const now = Date.now();
  const elapsedDays = (now - tokenBucket.lastRefill) / (24 * 60 * 60 * 1000);
  if (elapsedDays <= 0) return;
  tokenBucket.tokens = Math.min(tokenBucket.capacity, tokenBucket.tokens + elapsedDays * tokenBucket.capacity);
  tokenBucket.lastRefill = now;
}

function consumeToken() {
  refillTokens();
  if (tokenBucket.tokens < 1) {
    throw serviceError("WAQI daily request limit reached by token bucket.", "WAQI_RATE_LIMITED", 429);
  }
  tokenBucket.tokens -= 1;
}

function pollutantValue(iaqi, key) {
  const value = iaqi?.[key]?.v;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function pushCache(locationId, reading) {
  const rows = cache.get(locationId) ?? [];
  const cutoff = Date.now() - AQI_CACHE_MS;
  const nextRows = [...rows, reading].filter((row) => new Date(row.timestamp).getTime() >= cutoff);
  cache.set(locationId, nextRows);
}

function latestCached(locationId) {
  const rows = cache.get(locationId) ?? [];
  return rows[rows.length - 1] ?? null;
}

function withFreshness(reading, forcedStale = false) {
  const age = Date.now() - new Date(reading.timestamp).getTime();
  return {
    ...reading,
    stale: forcedStale || age > AQI_STALE_BADGE_MS
  };
}

function dominantPollutantFromOpenMeteo(current) {
  const candidates = [
    ["pm25", current.us_aqi_pm2_5],
    ["pm10", current.us_aqi_pm10],
    ["no2", current.us_aqi_nitrogen_dioxide],
    ["o3", current.us_aqi_ozone],
    ["so2", current.us_aqi_sulphur_dioxide],
    ["co", current.us_aqi_carbon_monoxide]
  ].filter(([, value]) => Number.isFinite(Number(value)));

  candidates.sort((a, b) => Number(b[1]) - Number(a[1]));
  return candidates[0]?.[0] ?? "us_aqi";
}

function buildOpenMeteoAqUrl(location, mode = "current") {
  const variables = [
    "us_aqi",
    "us_aqi_pm2_5",
    "us_aqi_pm10",
    "us_aqi_nitrogen_dioxide",
    "us_aqi_ozone",
    "us_aqi_sulphur_dioxide",
    "us_aqi_carbon_monoxide",
    "pm2_5",
    "pm10",
    "carbon_monoxide",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "ozone"
  ].join(",");
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: variables,
    hourly: variables,
    past_hours: mode === "history" ? "24" : "3",
    forecast_hours: "24",
    timezone: "Africa/Lagos",
    domains: "cams_global"
  });

  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
}

async function fetchJson(url, code) {
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000); // Default 30 seconds
  const response = await fetchWithTimeout(url, { headers: { accept: "application/json" } }, timeout, 2); // Added retry parameter
  if (!response.ok) {
    throw serviceError(`${code} request failed with status ${response.status}.`, `${code}_REQUEST_FAILED`);
  }
  return response.json();
}

async function fetchOpenMeteoAq(location, mode = "current") {
  const payload = await fetchJson(buildOpenMeteoAqUrl(location, mode), "OPEN_METEO_AQ");
  const current = payload.current;
  if (!current) {
    throw serviceError("Open-Meteo Air Quality response did not include current conditions.", "OPEN_METEO_AQ_BAD_RESPONSE");
  }

  const timestamp = current.time ? new Date(current.time).toISOString() : new Date().toISOString();
  return {
    reading: {
      location: location.name,
      location_id: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      aqi: Number(current.us_aqi ?? 0),
      dominant_pollutant: dominantPollutantFromOpenMeteo(current),
      pm25: Number(current.pm2_5 ?? 0),
      pm10: Number(current.pm10 ?? 0),
      so2: Number(current.sulphur_dioxide ?? 0),
      no2: Number(current.nitrogen_dioxide ?? 0),
      co: Number(current.carbon_monoxide ?? 0),
      o3: Number(current.ozone ?? 0),
      timestamp,
      stale: false,
      primary_source: "Open-Meteo Air Quality",
      validation_sources: []
    },
    hourly: payload.hourly
  };
}

function normalizeWaqi(payload, location) {
  if (payload.status !== "ok" || !payload.data) {
    throw serviceError(payload.data || "WAQI returned a non-ok response.", "WAQI_BAD_RESPONSE");
  }

  const data = payload.data;
  return {
    source: "WAQI",
    location: data.city?.name ?? location.name,
    aqi: Number.isFinite(Number(data.aqi)) ? Number(data.aqi) : null,
    dominant_pollutant: data.dominentpol || data.dominant_pol || "unknown",
    pm25: pollutantValue(data.iaqi, "pm25"),
    pm10: pollutantValue(data.iaqi, "pm10"),
    so2: pollutantValue(data.iaqi, "so2"),
    no2: pollutantValue(data.iaqi, "no2"),
    co: pollutantValue(data.iaqi, "co"),
    o3: pollutantValue(data.iaqi, "o3"),
    timestamp: data.time?.iso ? new Date(data.time.iso).toISOString() : new Date().toISOString()
  };
}

async function fetchWaqiValidation(location) {
  const apiKey = process.env.WAQI_API_KEY;
  if (!apiKey) return null;

  try {
    consumeToken();
    const url = `https://api.waqi.info/feed/${location.waqiStation}/?token=${encodeURIComponent(apiKey)}`;
    const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000); // Default 30 seconds
    const response = await fetchWithTimeout(url, {
      headers: { accept: "application/json" }
    }, timeout, 2); // Added retry parameter
    if (!response.ok) {
      throw serviceError(`WAQI request failed with status ${response.status}.`, "WAQI_REQUEST_FAILED");
    }
    const payload = await response.json();
    return normalizeWaqi(payload, location);
  } catch (error) {
    console.error(`[aqi] WAQI validation failed for ${location.id}:`, error.message);
    return {
      source: "WAQI",
      error: true,
      message: error.message,
      code: error.code ?? "WAQI_VALIDATION_FAILED"
    };
  }
}

async function fetchOpenAqValidation(location) {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) return null;

  try {
    const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 45000); // Longer timeout for OpenAQ
    const params = new URLSearchParams({
      coordinates: `${location.latitude},${location.longitude}`,
      radius: "100000", // 100km radius
      limit: "20"
    });
    const response = await fetchWithTimeout(`https://api.openaq.org/v3/latest?${params.toString()}`, {
      headers: {
        accept: "application/json",
        "X-API-Key": apiKey
      }
    }, timeout, 2); // Added retry parameter
    
    // Handle 404 specifically - it means no data is available for this location
    if (response.status === 404) {
      console.log(`[aqi] OpenAQ no data available for location ${location.id}`);
      return {
        source: "OpenAQ",
        message: "No monitoring stations found in your area",
        measurements: []
      };
    }
    
    if (!response.ok) {
      throw serviceError(`OpenAQ request failed with status ${response.status}.`, "OPENAQ_REQUEST_FAILED");
    }
    const payload = await response.json();
    const results = payload.results ?? [];
    return {
      source: "OpenAQ",
      measurements: results.slice(0, 6).map((row) => ({
        parameter: row.parameter?.name ?? row.parameter,
        value: row.value,
        unit: row.unit,
        timestamp: row.datetime?.utc ?? row.datetime,
        coordinates: row.coordinates
      }))
    };
  } catch (error) {
    // Special handling for 404 errors
    if (error.message.includes('404')) {
      console.log(`[aqi] OpenAQ validation failed for ${location.id} (404): Location not found`);
      return {
        source: "OpenAQ",
        message: "No monitoring stations found in your area",
        measurements: []
      };
    }
    
    console.error(`[aqi] OpenAQ validation failed for ${location.id}:`, error.message);
    return {
      source: "OpenAQ",
      error: true,
      message: error.message,
      code: error.code ?? "OPENAQ_VALIDATION_FAILED"
    };
  }
}

function conservativeAqi(primaryReading, validations) {
  const observedAqiValues = validations
    .map((item) => Number(item?.aqi))
    .filter((value) => Number.isFinite(value));
  return Math.max(primaryReading.aqi ?? 0, ...observedAqiValues);
}

export async function getCurrentAqi(locationId = "lokoja", options = {}) {
  const location = normalizeLocation(locationId);
  const cached = latestCached(location.id);

  if (!options.forceRefresh && cached) {
    const cacheAge = Date.now() - new Date(cached.cached_at ?? cached.timestamp).getTime();
    if (cacheAge < AQI_FRESH_MS) {
      console.log(`[aqi] cache hit: ${location.id}`);
      return withFreshness(cached);
    }
  }

  console.log(`[aqi] Open-Meteo AQ primary fetch: ${location.id}`);
  try {
    const { reading } = await fetchOpenMeteoAq(location);
    const validationSources = (await Promise.all([
      fetchWaqiValidation(location),
      fetchOpenAqValidation(location)
    ])).filter(Boolean);

    const cachedReading = {
      ...reading,
      validation_sources: validationSources,
      advisory_aqi: conservativeAqi(reading, validationSources),
      cached_at: new Date().toISOString()
    };
    pushCache(location.id, cachedReading);
    return withFreshness(cachedReading);
  } catch (error) {
    console.error(`[aqi] Open-Meteo AQ primary fetch failed for ${location.id}:`, error.message);
    if (cached) {
      console.log(`[aqi] serving stale cached reading: ${location.id}`);
      return withFreshness(cached, true);
    }
    throw error;
  }
}

export async function getAqiHistory(locationId = "lokoja", hours = 24) {
  const location = normalizeLocation(locationId);
  const requestedHours = Math.max(1, Math.min(Number(hours) || 24, 24));

  try {
    const { hourly } = await fetchOpenMeteoAq(location, "history");
    const time = hourly?.time ?? [];
    const aqi = hourly?.us_aqi ?? [];
    const pm25 = hourly?.pm2_5 ?? [];
    const rows = time.slice(-requestedHours).map((timestamp, index, arr) => {
      const sourceIndex = time.length - arr.length + index;
      return {
        timestamp: new Date(timestamp).toISOString(),
        aqi: Number(aqi[sourceIndex] ?? 0),
        pm25: Number(pm25[sourceIndex] ?? 0)
      };
    });

    return {
      location: location.name,
      timeseries: rows,
      cached_at: new Date().toISOString(),
      primary_source: "Open-Meteo Air Quality"
    };
  } catch (error) {
    console.error(`[aqi] Open-Meteo AQ history failed for ${location.id}:`, error.message);
    const cutoff = Date.now() - requestedHours * 60 * 60 * 1000;
    const rows = (cache.get(location.id) ?? []).filter((row) => new Date(row.timestamp).getTime() >= cutoff);
    if (rows.length === 0) throw error;
    return {
      location: location.name,
      timeseries: rows.map((row) => ({
        timestamp: row.timestamp,
        aqi: row.aqi,
        pm25: row.pm25
      })),
      cached_at: rows[rows.length - 1]?.cached_at ?? new Date().toISOString(),
      primary_source: "cache",
      stale: true
    };
  }
}

export function startAqiPolling() {
  const pollMs = Number(process.env.WAQI_POLL_MINUTES ?? 60) * 60 * 1000;
  setInterval(async () => {
    for (const location of Object.values(LOCATIONS)) {
      try {
        await getCurrentAqi(location.id, { forceRefresh: true });
        console.log(`[aqi] scheduled Open-Meteo AQ refresh complete: ${location.id}`);
      } catch (error) {
        console.error(`[aqi] scheduled refresh failed for ${location.id}:`, error.message);
      }
    }
  }, pollMs).unref();
}

export function getAqiLocations() {
  return Object.values(LOCATIONS).map(({ id, name, latitude, longitude }) => ({ id, name, latitude, longitude }));
}

