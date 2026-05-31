import { fetchWithTimeout } from './utils.js';

const FIRMS_CACHE_MS = 60 * 60 * 1000;
const KOGI_BBOX = process.env.FIRMS_KOGI_BBOX ?? "5.3,6.4,7.9,8.8";
const FIRMS_SOURCE = process.env.FIRMS_SOURCE ?? "VIIRS_SNPP_NRT";

let fireCache = null;

function serviceError(message, code, status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function confidenceScore(row) {
  const confidence = row.confidence;
  if (confidence === "h") return 90;
  if (confidence === "n") return 60;
  if (confidence === "l") return 30;
  return Number(confidence) || 0;
}

function normalizeHotspots(rows) {
  return rows
    .map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      brightness: Number(row.bright_ti4 ?? row.brightness ?? 0),
      frp: Number(row.frp ?? 0),
      confidence: row.confidence,
      confidence_score: confidenceScore(row),
      acquisition_date: row.acq_date,
      acquisition_time: row.acq_time,
      satellite: row.satellite,
      instrument: row.instrument
    }))
    .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
}

function toGeoJson(hotspots) {
  return {
    type: "FeatureCollection",
    features: hotspots.map((spot) => ({
      type: "Feature",
      properties: {
        brightness: spot.brightness,
        frp: spot.frp,
        confidence: spot.confidence,
        confidence_score: spot.confidence_score,
        acquisition_date: spot.acquisition_date,
        acquisition_time: spot.acquisition_time,
        satellite: spot.satellite,
        instrument: spot.instrument
      },
      geometry: {
        type: "Point",
        coordinates: [spot.longitude, spot.latitude]
      }
    }))
  };
}

export async function getFireHotspots(days = 5) {
  const dayRange = Math.max(1, Math.min(Number(days) || 5, 5));
  const cacheKey = `${dayRange}:${KOGI_BBOX}:${FIRMS_SOURCE}`;

  if (fireCache?.cacheKey === cacheKey && Date.now() - fireCache.cachedAt < FIRMS_CACHE_MS) {
    console.log("[fire] cache hit: NASA FIRMS hotspots");
    return fireCache.data;
  }

  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    throw serviceError("NASA_FIRMS_MAP_KEY is not configured on the backend.", "FIRMS_KEY_MISSING", 503);
  }

  console.log("[fire] cache miss: fetching NASA FIRMS hotspots");
  
  // Try the primary endpoint first
  const timeout = Number(process.env.FETCH_TIMEOUT_MS ?? 45000); // Longer timeout for CSV data
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${FIRMS_SOURCE}/${KOGI_BBOX}/${dayRange}`;
  
  try {
    const response = await fetchWithTimeout(url, { headers: { accept: "text/csv" } }, timeout, 2); // Added retry parameter
    if (!response.ok) {
      throw serviceError(`NASA FIRMS request failed with status ${response.status}.`, "FIRMS_REQUEST_FAILED");
    }

    const rows = parseCsv(await response.text());
    const hotspots = normalizeHotspots(rows);
    const data = {
      source: "NASA FIRMS",
      product: FIRMS_SOURCE,
      bbox: KOGI_BBOX,
      day_range: dayRange,
      count: hotspots.length,
      total_frp: Number(hotspots.reduce((sum, spot) => sum + (spot.frp || 0), 0).toFixed(2)),
      high_confidence_count: hotspots.filter((spot) => spot.confidence_score >= 80).length,
      hotspots,
      geojson: toGeoJson(hotspots),
      timestamp: new Date().toISOString()
    };

    fireCache = {
      cacheKey,
      cachedAt: Date.now(),
      data
    };

    return data;
  } catch (error) {
    console.error("[fire] Primary endpoint failed:", error.message);
    
    // Log specific error details for DNS resolution issues
    if (error.message.includes('ENOTFOUND')) {
      console.error(`[fire] DNS resolution failed for nrt4.modaps.eosdis.nasa.gov. This may be due to network issues or service unavailability.`);
    }
    
    // If we have cached data that's not too old, return it instead of failing completely
    if (fireCache?.cacheKey === cacheKey && Date.now() - fireCache.cachedAt < FIRMS_CACHE_MS * 2) {
      console.warn("[fire] Returning older cached data due to endpoint failure");
      return {
        ...fireCache.data,
        degraded: true,
        warning: "NASA FIRMS request failed; showing the most recent cached hotspot dataset.",
        failure_code: error.code ?? "FIRMS_REQUEST_FAILED",
        failure_message: error.message
      };
    }
    
    // Return an explicitly degraded empty dataset so users do not interpret it as confirmed zero hotspots.
    console.warn("[fire] Returning degraded empty dataset due to endpoint failure");
    return {
      source: "NASA FIRMS",
      product: FIRMS_SOURCE,
      bbox: KOGI_BBOX,
      day_range: dayRange,
      count: 0,
      total_frp: 0,
      high_confidence_count: 0,
      hotspots: [],
      geojson: toGeoJson([]),
      degraded: true,
      warning: "NASA FIRMS request failed; hotspot data is unavailable, not confirmed clear.",
      failure_code: error.code ?? "FIRMS_REQUEST_FAILED",
      failure_message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
