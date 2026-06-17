import { fetchWithTimeout } from "./utils.js";
import { logger } from "../logger.js";
const CLIMATE_TTL_MS = Number(process.env.CLIMATE_CACHE_DAYS ?? 30) * 24 * 60 * 60 * 1000;
const LOKOJA_LAT = Number(process.env.LOKOJA_LAT ?? 7.8);
const LOKOJA_LON = Number(process.env.LOKOJA_LON ?? 6.74);
const VALID_PARAMS = new Set(["T2M", "PRECTOTCORR", "WS10M", "ALLSKY_SFC_SW_DWN"]);

const climateCache = new Map();

const PARAM_MAP = {
  T2M: {
    openMeteo: "temperature_2m_mean",
    nasa: "T2M",
    aggregate: "mean"
  },
  PRECTOTCORR: {
    openMeteo: "precipitation_sum",
    nasa: "PRECTOTCORR",
    aggregate: "sum"
  },
  WS10M: {
    openMeteo: "wind_speed_10m_mean",
    nasa: "WS10M",
    aggregate: "mean"
  },
  ALLSKY_SFC_SW_DWN: {
    openMeteo: "shortwave_radiation_sum",
    nasa: "ALLSKY_SFC_SW_DWN",
    aggregate: "mean"
  }
};

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function validateParam(param) {
  const normalized = String(param ?? "T2M").toUpperCase();
  if (!VALID_PARAMS.has(normalized)) {
    throw serviceError("Unsupported climate parameter. Use T2M, PRECTOTCORR, WS10M, or ALLSKY_SFC_SW_DWN.", "CLIMATE_PARAM_INVALID", 400);
  }
  return normalized;
}

function isoDate(year, month = 1, day = 1) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function yyyymmdd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function annualAggregateFromDaily(param, dates, values) {
  const grouped = new Map();

  dates.forEach((date, index) => {
    const value = Number(values[index]);
    if (!Number.isFinite(value) || value <= -900) return;
    const year = Number(String(date).slice(0, 4));
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(value);
  });

  const years = [...grouped.keys()].sort((a, b) => a - b);
  const valuesByYear = years.map((year) => {
    const rows = grouped.get(year);
    const total = rows.reduce((sum, value) => sum + value, 0);
    if (PARAM_MAP[param].aggregate === "sum") return Number(total.toFixed(2));
    return Number((total / rows.length).toFixed(3));
  });

  return { years, values: valuesByYear };
}

function annualAggregateFromNasa(param, valuesByDate) {
  return annualAggregateFromDaily(param, Object.keys(valuesByDate ?? {}), Object.values(valuesByDate ?? {}));
}

function linearSlopePerDecade(years, values) {
  const n = years.length;
  if (n < 2) return 0;

  const meanX = years.reduce((sum, value) => sum + value, 0) / n;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i += 1) {
    numerator += (years[i] - meanX) * (values[i] - meanY);
    denominator += (years[i] - meanX) ** 2;
  }

  return denominator === 0 ? 0 : Number(((numerator / denominator) * 10).toFixed(4));
}

function baselineMean(years, values) {
  const rows = values.filter((_, index) => years[index] >= 1991 && years[index] <= 2020);
  if (rows.length === 0) return null;
  return Number((rows.reduce((sum, value) => sum + value, 0) / rows.length).toFixed(3));
}

function erf(x) {
  const sign = Math.sign(x);
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function mannKendall(values) {
  const rows = values.filter((value) => Number.isFinite(value));
  const n = rows.length;
  if (n < 3) {
    return { s: 0, z: 0, p_value: 1, trend: "insufficient data", significant: false };
  }

  let s = 0;
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      s += Math.sign(rows[j] - rows[i]);
    }
  }

  const variance = (n * (n - 1) * (2 * n + 5)) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(variance) : s < 0 ? (s + 1) / Math.sqrt(variance) : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  return {
    s,
    z: Number(z.toFixed(4)),
    p_value: Number(pValue.toFixed(4)),
    trend: z > 0 ? "increasing" : z < 0 ? "decreasing" : "no trend",
    significant: pValue < 0.05
  };
}

export function calculateAnnualSpi(years, values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length < 3) return [];
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const variance = valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (valid.length - 1);
  const std = Math.sqrt(variance);

  return years.map((year, index) => {
    const spi = std === 0 ? 0 : (values[index] - mean) / std;
    return {
      year,
      spi: Number(spi.toFixed(3)),
      category: spi <= -2 ? "extremely dry" : spi <= -1.5 ? "severely dry" : spi <= -1 ? "moderately dry" : spi >= 1 ? "wet" : "near normal"
    };
  });
}

function pearsonCorrelation(xValues, yValues) {
  const pairs = xValues
    .map((x, index) => [Number(x), Number(yValues[index])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (const [x, y] of pairs) {
    numerator += (x - meanX) * (y - meanY);
    denominatorX += (x - meanX) ** 2;
    denominatorY += (y - meanY) ** 2;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator === 0 ? null : Number((numerator / denominator).toFixed(4));
}

async function fetchOpenMeteoArchive(param, years) {
  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = Math.max(1984, endYear - years + 1);
  const variable = PARAM_MAP[param].openMeteo;
  const params = new URLSearchParams({
    latitude: String(LOKOJA_LAT),
    longitude: String(LOKOJA_LON),
    start_date: isoDate(startYear, 1, 1),
    end_date: isoDate(endYear, 12, 31),
    daily: variable,
    timezone: "Africa/Lagos"
  });
  
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 45000); // Longer timeout for archive data
  const response = await fetchWithTimeout(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`, {
    headers: { accept: "application/json" }
  }, timeout);

  if (!response.ok) {
    throw serviceError(`Open-Meteo Archive request failed with status ${response.status}.`, "OPEN_METEO_ARCHIVE_REQUEST_FAILED");
  }

  const payload = await response.json();
  const dates = payload.daily?.time;
  const values = payload.daily?.[variable];
  if (!dates?.length || !values?.length) {
    throw serviceError("Open-Meteo Archive response did not include the requested daily series.", "OPEN_METEO_ARCHIVE_BAD_RESPONSE");
  }

  return annualAggregateFromDaily(param, dates, values);
}

async function fetchNasaPower(param, years) {
  const now = new Date();
  const endYear = now.getUTCFullYear() - 1;
  const startYear = Math.max(1984, endYear - years + 1);
  const start = `${startYear}0101`;
  const end = yyyymmdd(new Date(Date.UTC(endYear, 11, 31)));

  const params = new URLSearchParams({
    parameters: PARAM_MAP[param].nasa,
    community: "AG",
    longitude: String(LOKOJA_LON),
    latitude: String(LOKOJA_LAT),
    start,
    end,
    format: "JSON"
  });

  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 45000); // Longer timeout for NASA data
  const response = await fetchWithTimeout(`https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`, {
    headers: { accept: "application/json" }
  }, timeout);

  if (!response.ok) {
    throw serviceError(`NASA POWER request failed with status ${response.status}.`, "NASA_POWER_REQUEST_FAILED");
  }

  const payload = await response.json();
  const valuesByDate = payload?.properties?.parameter?.[PARAM_MAP[param].nasa];
  if (!valuesByDate) {
    throw serviceError("NASA POWER response did not include the requested parameter.", "NASA_POWER_BAD_RESPONSE");
  }

  return annualAggregateFromNasa(param, valuesByDate);
}

async function fetchAnnualEnsoIndex(targetYears) {
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 30000); // Standard timeout for text data
  const response = await fetchWithTimeout("https://www.cpc.ncep.noaa.gov/data/indices/ersst5.nino.mth.91-20.ascii", {
    headers: { accept: "text/plain" }
  }, timeout);
  
  if (!response.ok) {
    throw serviceError(`NOAA ENSO request failed with status ${response.status}.`, "ENSO_REQUEST_FAILED");
  }

  const lines = (await response.text()).trim().split(/\r?\n/);
  const grouped = new Map();
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    const year = Number(parts[0]);
    const nino34 = Number(parts[9]);
    if (!targetYears.includes(year) || !Number.isFinite(nino34)) continue;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(nino34);
  }

  return targetYears.map((year) => {
    const rows = grouped.get(year) ?? [];
    return rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : null;
  });
}

async function buildEnsoCorrelation(param, years, values) {
  if (param !== "PRECTOTCORR") return null;

  try {
    const ensoValues = await fetchAnnualEnsoIndex(years);
    return {
      index: "NOAA CPC Nino 3.4 SST anomaly",
      method: "Pearson correlation against annual rainfall totals",
      r: pearsonCorrelation(ensoValues, values)
    };
  } catch (error) {
    logger.warn("ENSO correlation unavailable", { message: error.message, code: error.code });
    return {
      index: "NOAA CPC Nino 3.4 SST anomaly",
      method: "Pearson correlation against annual rainfall totals",
      r: null,
      error: error.code ?? "ENSO_UNAVAILABLE"
    };
  }
}

export async function getClimateTrend(param = "T2M", years = 30) {
  const normalizedParam = validateParam(param);
  const normalizedYears = Math.max(1, Math.min(Number(years) || 30, 41));
  const cacheKey = `${normalizedParam}:${normalizedYears}:openmeteo-archive-primary`;
  const cached = climateCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CLIMATE_TTL_MS) {
    logger.info("Climate cache hit", { cache_key: cacheKey });
    return cached.data;
  }

  logger.info("Climate cache miss", { cache_key: cacheKey });
  let annual;
  let source = "Open-Meteo Archive ERA5";

  try {
    annual = await fetchOpenMeteoArchive(normalizedParam, normalizedYears);
  } catch (error) {
    logger.warn("Open-Meteo Archive failed; falling back to NASA POWER", { message: error.message, code: error.code });
    annual = await fetchNasaPower(normalizedParam, normalizedYears);
    source = "NASA POWER fallback";
  }

  const mk = mannKendall(annual.values);
  const data = {
    param: normalizedParam,
    years: annual.years,
    values: annual.values,
    trend_slope_per_decade: linearSlopePerDecade(annual.years, annual.values),
    baseline_mean: baselineMean(annual.years, annual.values),
    baseline_period: "1991-2020",
    source,
    mann_kendall: mk,
    spi: normalizedParam === "PRECTOTCORR" ? calculateAnnualSpi(annual.years, annual.values) : null,
    enso_correlation: await buildEnsoCorrelation(normalizedParam, annual.years, annual.values)
  };

  climateCache.set(cacheKey, {
    cachedAt: Date.now(),
    data
  });

  return data;
}
