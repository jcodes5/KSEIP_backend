import express from "express";
import { getAqiHistory, getCurrentAqi } from "../services/aqiService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AQI
 *   description: Air Quality Index API
 */

/**
 * @swagger
 * /api/aqi/current:
 *   get:
 *     summary: Get current AQI data for a location
 *     tags: [AQI]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to get AQI data for. Default is lokoja
 *     responses:
 *       200:
 *         description: Current AQI data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 location:
 *                   type: string
 *                   description: The location name
 *                 aqi:
 *                   type: number
 *                   description: Air Quality Index value
 *                 pollutant:
 *                   type: string
 *                   description: Main pollutant affecting the AQI
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
    const location = req.query.location ?? "lokoja";
    const data = await getCurrentAqi(location);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/aqi/history:
 *   get:
 *     summary: Get historical AQI data for a location
 *     tags: [AQI]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to get AQI history for. Default is lokoja
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *         description: Number of hours to retrieve data for. Default is 24
 *     responses:
 *       200:
 *         description: Historical AQI data
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
 *                     description: Time when the data was recorded
 *                   aqi:
 *                     type: number
 *                     description: Air Quality Index value
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/history", async (req, res, next) => {
  try {
    const location = req.query.location ?? "lokoja";
    const hours = req.query.hours ?? 24;
    const data = await getAqiHistory(location, hours);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;