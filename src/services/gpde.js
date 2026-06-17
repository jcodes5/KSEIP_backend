import { determineStabilityClass } from "./meteoService.js";
import { logger } from "../logger.js";

const G = 9.81;
const DEG_PER_M_LAT = 1 / 111_320;
const THRESHOLDS = [15, 25, 35, 65];
const VALID_STABILITY = new Set(["A", "B", "C", "D", "E", "F"]);

const OBAJANA_DEFAULTS = {
  stack_height: 80,
  exit_velocity: 15,
  stack_diameter: 4,
  stack_temp_k: 423,
  source_lat: Number(process.env.OBAJANA_LAT ?? 7.5),
  source_lon: Number(process.env.OBAJANA_LON ?? 6.32)
};

const SIGMA_Y_COEFFICIENTS = {
  A: [0.22, 0.5],
  B: [0.16, 0.5],
  C: [0.11, 0.5],
  D: [0.08, 0.5],
  E: [0.06, 0.5],
  F: [0.04, 0.5]
};

const SIGMA_Z_COEFFICIENTS = {
  A: [0.20, 0.0],
  B: [0.12, 0.0],
  C: [0.08, 0.0002],
  D: [0.06, 0.0015],
  E: [0.03, 0.0003],
  F: [0.016, 0.0003]
};

function modelError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function numeric(value, fallback = undefined) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

function getEffectiveHeight(x, input) {
  if (input.effective_height_override !== undefined) {
    return input.effective_height_override;
  }
  return input.stack_height + plumeRise(x, input);
}

function attenuationTerm(x, input) {
  const travelTime = x / Math.max(input.wind_speed, 0.1);
  const chemicalDecay = input.loss_rate_override !== undefined ? Math.exp(-input.loss_rate_override * travelTime) : 1;

  if (input.deposition_velocity === undefined || input.deposition_velocity <= 0) {
    return chemicalDecay;
  }

  const mixingHeight = Math.max(1, estimateMixingHeight(input));
  const depositionLoss = Math.exp(-(input.deposition_velocity * travelTime) / mixingHeight);
  return chemicalDecay * depositionLoss;
}

function assertRange(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw modelError(`${name} must be between ${min} and ${max}.`, "GPDE_INPUT_INVALID");
  }
}

export function validatePlumeInput(body = {}) {
  const input = {
    stack_height: numeric(body.stack_height, OBAJANA_DEFAULTS.stack_height),
    emission_rate: numeric(body.emission_rate),
    exit_velocity: numeric(body.exit_velocity, OBAJANA_DEFAULTS.exit_velocity),
    stack_diameter: numeric(body.stack_diameter, OBAJANA_DEFAULTS.stack_diameter),
    stack_temp_k: numeric(body.stack_temp_k, OBAJANA_DEFAULTS.stack_temp_k),
    ambient_temp_k: numeric(body.ambient_temp_k ?? body.temp_k, 300),
    wind_speed: numeric(body.wind_speed),
    wind_dir: numeric(body.wind_dir, 45),
    cloud_cover: numeric(body.cloud_cover, 60),
    stability_class: String(body.stability_class ?? "auto").trim().toUpperCase(),
    terrain: String(body.terrain ?? "flat").trim().toLowerCase(),
    source_lat: numeric(body.source_lat, OBAJANA_DEFAULTS.source_lat),
    source_lon: numeric(body.source_lon, OBAJANA_DEFAULTS.source_lon),
    deposition_velocity: numeric(body.deposition_velocity, undefined),
    mixing_height_override: numeric(body.mixing_height_override, undefined),
    loss_rate_override: numeric(body.loss_rate_override, undefined),
    effective_height_override: numeric(body.effective_height_override, undefined)
  };

  assertRange(input.stack_height, "stack_height", 1, 500);
  assertRange(input.emission_rate, "emission_rate", 0.0001, 100_000);
  assertRange(input.exit_velocity, "exit_velocity", 0.1, 100);
  assertRange(input.stack_diameter, "stack_diameter", 0.1, 30);
  assertRange(input.stack_temp_k, "stack_temp_k", 250, 1_000);
  assertRange(input.ambient_temp_k, "ambient_temp_k", 250, 330);
  assertRange(input.wind_speed, "wind_speed", 0.1, 50);
  assertRange(input.wind_dir, "wind_dir", 0, 360);
  assertRange(input.cloud_cover, "cloud_cover", 0, 100);
  assertRange(input.source_lat, "source_lat", -90, 90);
  assertRange(input.source_lon, "source_lon", -180, 180);
  if (input.deposition_velocity !== undefined) {
    assertRange(input.deposition_velocity, "deposition_velocity", 0, 0.1);
  }
  if (input.mixing_height_override !== undefined) {
    assertRange(input.mixing_height_override, "mixing_height_override", 50, 5_000);
  }
  if (input.loss_rate_override !== undefined) {
    assertRange(input.loss_rate_override, "loss_rate_override", 0, 10);
  }
  if (input.effective_height_override !== undefined) {
    assertRange(input.effective_height_override, "effective_height_override", 1, 1_000);
  }

  if (input.terrain !== "flat") {
    throw modelError("terrain must be 'flat' for KSEIP v1.0.", "GPDE_TERRAIN_UNSUPPORTED");
  }

  if (input.stability_class === "AUTO") {
    input.stability_class = determineStabilityClass(input.wind_speed, input.cloud_cover);
  }

  if (!VALID_STABILITY.has(input.stability_class)) {
    throw modelError("stability_class must be A, B, C, D, E, F, or auto.", "GPDE_STABILITY_INVALID");
  }

  return input;
}

export function sigmaY(x, stabilityClass) {
  const [a, b] = SIGMA_Y_COEFFICIENTS[stabilityClass];
  return Math.max(0.1, a * Math.pow(x, b));
}

export function sigmaZ(x, stabilityClass) {
  const [a, c] = SIGMA_Z_COEFFICIENTS[stabilityClass];
  return Math.max(0.1, (a * x) / Math.sqrt(1 + c * x));
}

export function buoyancyFlux(exitVelocity, stackDiameter, stackTempK, ambientTempK) {
  const radius = stackDiameter / 2;
  const deltaT = Math.max(0, stackTempK - ambientTempK);
  return G * exitVelocity * radius ** 2 * (deltaT / stackTempK);
}

export function plumeRise(x, input) {
  const fb = buoyancyFlux(input.exit_velocity, input.stack_diameter, input.stack_temp_k, input.ambient_temp_k);
  if (fb <= 0) return 0;
  return (1.6 * Math.cbrt(fb) * Math.pow(x, 2 / 3)) / Math.max(input.wind_speed, 0.1);
}

export function gaussianConcentration({ x, y, z = 0, input }) {
  if (x < 100 || x > 10_000) return 0;

  const sy = sigmaY(x, input.stability_class);
  const sz = sigmaZ(x, input.stability_class);
  const effectiveHeight = getEffectiveHeight(x, input);
  const crosswindTerm = Math.exp(-(y ** 2) / (2 * sy ** 2));
  const reflectionTerm =
    Math.exp(-((z - effectiveHeight) ** 2) / (2 * sz ** 2)) +
    Math.exp(-((z + effectiveHeight) ** 2) / (2 * sz ** 2));
  const gramsPerCubicMeter =
    (input.emission_rate / (2 * Math.PI * sy * sz * input.wind_speed)) *
    crosswindTerm *
    reflectionTerm *
    attenuationTerm(x, input);

  return gramsPerCubicMeter * 1_000_000;
}

export function groundLevelCenterline(x, input) {
  if (x < 100 || x > 10_000) return 0;

  const sy = sigmaY(x, input.stability_class);
  const sz = sigmaZ(x, input.stability_class);
  const effectiveHeight = getEffectiveHeight(x, input);
  const gramsPerCubicMeter =
    (input.emission_rate / (Math.PI * sy * sz * input.wind_speed)) *
    Math.exp(-0.5 * (effectiveHeight / sz) ** 2) *
    attenuationTerm(x, input);

  return gramsPerCubicMeter * 1_000_000;
}

function rotatePoint(x, y, windDirDegrees) {
  const theta = (windDirDegrees * Math.PI) / 180;
  const east = x * Math.sin(theta) + y * Math.cos(theta);
  const north = x * Math.cos(theta) - y * Math.sin(theta);
  return { east, north };
}

function meterOffsetToLonLat(sourceLon, sourceLat, east, north) {
  const lat = sourceLat + north * DEG_PER_M_LAT;
  const lon = sourceLon + east * (1 / (111_320 * Math.cos((sourceLat * Math.PI) / 180)));
  return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
}

function modelPointToLonLat(input, x, y) {
  const { east, north } = rotatePoint(x, y, input.wind_dir);
  return meterOffsetToLonLat(input.source_lon, input.source_lat, east, north);
}

function computeGrid(input) {
  const fullGrid = [];
  const downsampled = [];
  let cmax = 0;
  let xmax = 0;
  let totalConcentration = 0;
  let positiveConcentration = 0;
  let positiveCells = 0;
  let minPositiveConcentration = Number.POSITIVE_INFINITY;
  const step = 50;
  const halfWidth = 1_000;

  for (let x = 0; x <= 2_000; x += step) {
    for (let y = -halfWidth; y <= halfWidth; y += step) {
      const concentration = x < 100 ? 0 : gaussianConcentration({ x, y, input });
      const row = {
        x,
        y,
        concentration: Number(concentration.toFixed(4))
      };
      fullGrid.push(row);
      totalConcentration += concentration;

      if (concentration > 0) {
        positiveConcentration += concentration;
        positiveCells += 1;
        minPositiveConcentration = Math.min(minPositiveConcentration, concentration);
      }

      if (x % 100 === 0 && y % 100 === 0) {
        downsampled.push([x, y, Number(concentration.toFixed(2))]);
      }

      if (concentration > cmax) {
        cmax = concentration;
        xmax = x;
      }
    }
  }

  return {
    fullGrid,
    grid_json: {
      resolution_m: 100,
      units: "ug/m3",
      columns: ["x_m", "y_m", "concentration_ug_m3"],
      points: downsampled
    },
    cmax: Number(cmax.toFixed(4)),
    xmax,
    stats: {
      avg_concentration_ug_m3: Number((totalConcentration / fullGrid.length).toFixed(4)),
      avg_positive_concentration_ug_m3: Number((positiveCells ? positiveConcentration / positiveCells : 0).toFixed(4)),
      min_positive_concentration_ug_m3: Number((Number.isFinite(minPositiveConcentration) ? minPositiveConcentration : 0).toFixed(4)),
      positive_grid_cells: positiveCells,
      grid_cells: fullGrid.length
    }
  };
}

function exposureSummary(fullGrid) {
  let zone1 = 0;
  let zone2 = 0;
  let zone3 = 0;
  let zone4 = 0;

  for (const point of fullGrid) {
    if (point.concentration >= 65) zone4 += 1;
    else if (point.concentration >= 35) zone3 += 1;
    else if (point.concentration >= 25) zone2 += 1;
    else if (point.concentration >= 15) zone1 += 1;
  }

  const cellAreaKm2 = (50 * 50) / 1_000_000;
  const populationDensityScreening = 250;
  const convert = (cells) => ({
    grid_cells: cells,
    area_km2: Number((cells * cellAreaKm2).toFixed(3)),
    estimated_population: Math.round(cells * cellAreaKm2 * populationDensityScreening)
  });

  return {
    zone1: convert(zone1),
    zone2: convert(zone2),
    zone3: convert(zone3),
    zone4: convert(zone4)
  };
}

function estimateMixingHeight(input) {
  if (input.mixing_height_override !== undefined) {
    return Math.round(input.mixing_height_override);
  }
  const baseByStability = {
    A: 1_600,
    B: 1_250,
    C: 950,
    D: 700,
    E: 420,
    F: 280
  };
  const windAdjustment = Math.min(420, input.wind_speed * 55);
  const cloudAdjustment = input.cloud_cover > 80 ? -120 : input.cloud_cover < 35 ? 180 : 0;
  return Math.max(120, Math.round((baseByStability[input.stability_class] ?? 700) + windAdjustment + cloudAdjustment));
}

function lossRateSummary(fullGrid, cmax, xmax, input) {
  if (input?.loss_rate_override !== undefined) {
    return {
      percent_per_km: Number(input.loss_rate_override.toFixed(2)),
      downwind_reference_m: xmax,
      reference_concentration_ug_m3: Number(cmax.toFixed(4))
    };
  }
  const downwindMaxima = new Map();

  for (const point of fullGrid) {
    if (point.x < Math.max(100, xmax) || point.concentration <= 0) continue;
    const current = downwindMaxima.get(point.x) ?? 0;
    downwindMaxima.set(point.x, Math.max(current, point.concentration));
  }

  const rows = [...downwindMaxima.entries()]
    .map(([x, concentration]) => ({ x, concentration }))
    .sort((a, b) => a.x - b.x);

  const endpoint = rows[rows.length - 1];
  if (!endpoint || cmax <= 0 || endpoint.x <= xmax) {
    return {
      percent_per_km: 0,
      downwind_reference_m: endpoint?.x ?? xmax,
      reference_concentration_ug_m3: Number((endpoint?.concentration ?? cmax).toFixed(4))
    };
  }

  const distanceKm = (endpoint.x - xmax) / 1_000;
  const retainedFraction = Math.max(0, Math.min(1, endpoint.concentration / cmax));

  return {
    percent_per_km: Number((((1 - retainedFraction) / distanceKm) * 100).toFixed(2)),
    downwind_reference_m: endpoint.x,
    reference_concentration_ug_m3: Number(endpoint.concentration.toFixed(4))
  };
}

function envelopeForThreshold(fullGrid, threshold) {
  const byX = new Map();

  for (const point of fullGrid) {
    if (point.x < 100 || point.concentration < threshold) continue;
    const existing = byX.get(point.x) ?? 0;
    byX.set(point.x, Math.max(existing, Math.abs(point.y)));
  }

  const rows = [...byX.entries()]
    .map(([x, maxY]) => ({ x, maxY: Math.max(50, maxY) }))
    .sort((a, b) => a.x - b.x);

  if (rows.length < 2) return null;

  const upper = rows.map((row) => [row.x, row.maxY]);
  const lower = [...rows].reverse().map((row) => [row.x, -row.maxY]);
  return [...upper, ...lower, upper[0]];
}

function thresholdColor(threshold) {
  if (threshold >= 65) return "#FF0000";
  if (threshold >= 35) return "#FF7E00";
  if (threshold >= 25) return "#FFFF00";
  return "#00E400";
}

function buildIsopleths(input, fullGrid) {
  const features = [];

  for (const threshold of THRESHOLDS) {
    const envelope = envelopeForThreshold(fullGrid, threshold);
    if (!envelope) continue;

    features.push({
      type: "Feature",
      properties: {
        threshold_ug_m3: threshold,
        color_hex: thresholdColor(threshold),
        pollutant: "PM2.5",
        model: "KSEIP GPDE",
        resolution_m: 100
      },
      geometry: {
        type: "Polygon",
        coordinates: [envelope.map(([x, y]) => modelPointToLonLat(input, x, y))]
      }
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}

export async function runPlumeModel(body = {}) {
  const startedAt = performance.now();
  const input = validatePlumeInput(body);
  const { fullGrid, grid_json, cmax, xmax, stats } = computeGrid(input);
  const isopleths_geojson = buildIsopleths(input, fullGrid);
  const mixingHeightM = estimateMixingHeight(input);
  const lossRate = lossRateSummary(fullGrid, cmax, xmax, input);
  const effectiveHeight = input.effective_height_override !== undefined
    ? input.effective_height_override
    : input.stack_height + plumeRise(Math.max(xmax, 100), input);
  
  const result = {
    grid_json,
    isopleths_geojson,
    cmax,
    xmax,
    stats,
    exposure_summary: exposureSummary(fullGrid),
    beyond_range: false,
    metadata: {
      model: "steady-state Gaussian plume",
      stability_class: input.stability_class,
      grid_resolution_m: 50,
      transmitted_grid_resolution_m: 100,
      source: {
        lat: input.source_lat,
        lon: input.source_lon
      },
      diagnostics: {
        mixing_height_m: mixingHeightM,
        effective_stack_height_m: Number(effectiveHeight.toFixed(2)),
        deposition_velocity_m_s: input.deposition_velocity,
        loss_rate: lossRate,
        wind_speed_m_s: input.wind_speed,
        wind_direction_deg: input.wind_dir
      },
      assumptions: {
        terrain: "flat",
        valid_x_range_m: [100, 10_000],
        sigma_source: "Briggs 1973 open-country Pasquill-Gifford parameterisation",
        plume_rise: "Briggs 1975 buoyancy flux formulation"
      }
    }
  };

  const elapsedMs = performance.now() - startedAt;
  logger.info("GPDE model executed", {
    elapsed_ms: Number(elapsedMs.toFixed(2)),
    cmax_ug_m3: cmax,
    xmax_m: xmax
  });
  return result;
}
