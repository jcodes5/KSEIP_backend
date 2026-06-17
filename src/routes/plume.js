import express from "express";
import { runPlumeModel } from "../services/gpde.js";
import { determineStabilityClass, getMeteoForecast } from "../services/meteoService.js";

const router = express.Router();

function numeric(value, fallback = undefined) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

function clampDuration(value) {
  return Math.max(1, Math.min(72, Math.round(numeric(value, 24))));
}

function defaultManualMeteo(body, hourIndex = 0) {
  const timestamp = new Date(Date.now() + hourIndex * 60 * 60 * 1000).toISOString();
  const windSpeed = numeric(body.wind_speed, 5);
  const windDir = numeric(body.wind_dir, 45);
  const cloudCover = numeric(body.cloud_cover, 60);
  const tempK = numeric(body.ambient_temp_k ?? body.temp_k, 300);

  return {
    timestamp,
    wind_speed: windSpeed,
    wind_dir: windDir,
    temp_k: tempK,
    cloud_cover: cloudCover,
    stability_class: determineStabilityClass(windSpeed, cloudCover, new Date(timestamp)),
    source: "manual"
  };
}

function normalizeOverride(hourlyWinds, index) {
  const override = hourlyWinds?.[index] ?? hourlyWinds?.[String(index)] ?? null;
  if (!override) return {};

  return {
    wind_speed: numeric(override.wind_speed ?? override.speed, undefined),
    wind_dir: numeric(override.wind_dir ?? override.dir, undefined)
  };
}

async function buildMeteoTimeline(body, durationHours) {
  const weatherMode = String(body.weather_config ?? body.weather_mode ?? "auto").toLowerCase();
  const fallback = Array.from({ length: durationHours }, (_, index) => defaultManualMeteo(body, index));

  if (weatherMode !== "auto") {
    return { hourly: fallback, notice: null };
  }

  try {
    const forecast = await getMeteoForecast(durationHours);
    const hourly = Array.from({ length: durationHours }, (_, index) => ({
      ...fallback[index],
      ...(forecast.hourly?.[index] ?? {}),
      source: "auto"
    }));
    return { hourly, notice: null };
  } catch (error) {
    return {
      hourly: fallback,
      notice: error.message || "Auto-fetch unavailable; manual weather values were used."
    };
  }
}

async function runPlumeTimeline(body) {
  const durationHours = clampDuration(body.simulation_duration_hours ?? body.duration_hours);
  const meteoTimeline = await buildMeteoTimeline(body, durationHours);

  const frames = [];
  for (let index = 0; index < durationHours; index += 1) {
    const override = normalizeOverride(body.hourly_winds, index);
    const meteo = {
      ...meteoTimeline.hourly[index],
      ...(override.wind_speed !== undefined ? { wind_speed: override.wind_speed, source: "override" } : {}),
      ...(override.wind_dir !== undefined ? { wind_dir: override.wind_dir, source: "override" } : {})
    };

    const stabilityClass = body.stability_class && String(body.stability_class).toLowerCase() !== "auto"
      ? body.stability_class
      : meteo.stability_class;

    const result = await runPlumeModel({
      ...body,
      wind_speed: meteo.wind_speed,
      wind_dir: meteo.wind_dir,
      cloud_cover: meteo.cloud_cover,
      ambient_temp_k: meteo.temp_k,
      stability_class: stabilityClass
    });

    frames.push({
      hour: index + 1,
      timestamp: meteo.timestamp,
      duration_h: 1,
      meteo,
      result
    });
  }

  return {
    result: frames[0]?.result ?? null,
    meteo: frames[0]?.meteo ?? null,
    frames,
    duration_hours: durationHours,
    weather_config: String(body.weather_config ?? body.weather_mode ?? "auto").toLowerCase(),
    weather_notice: meteoTimeline.notice,
    generated_at: new Date().toISOString()
  };
}

/**
 * @swagger
 * tags:
 *   name: Plume
 *   description: Atmospheric plume modeling API
 */

/**
 * @swagger
 * /api/plume/run:
 *   post:
 *     summary: Run atmospheric plume model simulation
 *     tags: [Plume]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceLocation:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     description: Source latitude
 *                   lon:
 *                     type: number
 *                     description: Source longitude
 *               emissionRate:
 *                 type: number
 *                 description: Pollutant emission rate
 *               height:
 *                 type: number
 *                 description: Release height in meters
 *               pollutantType:
 *                 type: string
 *                 description: Type of pollutant
 *               meteorology:
 *                 type: object
 *                 description: Meteorological conditions
 *     responses:
 *       200:
 *         description: Plume model simulation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plumePath:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         description: Latitude
 *                       lon:
 *                         type: number
 *                         description: Longitude
 *                       concentration:
 *                         type: number
 *                         description: Pollutant concentration
 *                 maxConcentration:
 *                   type: number
 *                   description: Maximum concentration value
 *                 affectedArea:
 *                   type: string
 *                   description: Description of affected area
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/run", async (req, res, next) => {
  try {
    const result = await runPlumeTimeline(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
