import express from "express";
import { getCurrentMeteo, getMeteoForecast } from "../services/meteoService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Meteo
 *   description: Meteorological data API
 */

/**
 * @swagger
 * /api/meteo/current:
 *   get:
 *     summary: Get current meteorological data
 *     tags: [Meteo]
 *     responses:
 *       200:
 *         description: Current meteorological data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 temperature:
 *                   type: number
 *                   description: Current temperature in Celsius
 *                 humidity:
 *                   type: number
 *                   description: Current humidity percentage
 *                 pressure:
 *                   type: number
 *                   description: Current atmospheric pressure in hPa
 *                 windSpeed:
 *                   type: number
 *                   description: Current wind speed in m/s
 *                 windDirection:
 *                   type: number
 *                   description: Wind direction in degrees
 *                 precipitation:
 *                   type: number
 *                   description: Precipitation amount in mm
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time when the data was recorded
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/current", async (req, res, next) => {
  try {
    const data = await getCurrentMeteo();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/meteo/forecast:
 *   get:
 *     summary: Get meteorological forecast data
 *     tags: [Meteo]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *         description: Number of hours to forecast ahead. Default is 48
 *     responses:
 *       200:
 *         description: Meteorological forecast data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     description: Forecast time
 *                   temperature:
 *                     type: number
 *                     description: Forecasted temperature in Celsius
 *                   humidity:
 *                     type: number
 *                     description: Forecasted humidity percentage
 *                   precipitation:
 *                     type: number
 *                     description: Forecasted precipitation amount in mm
 *                   condition:
 *                     type: string
 *                     description: Weather condition description
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/forecast", async (req, res, next) => {
  try {
    const data = await getMeteoForecast(req.query.hours ?? 48);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;