import express from "express";
import { getAqiHistory, getAqiHistoryExport, getAqiLocations, getAqiPollingConfig, getCurrentAqi } from "../services/aqiService.js";

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
    console.log(`Received AQI request for location: ${location}`); // Basic logging
    const data = await getCurrentAqi(location);
    console.log(`Returning AQI data for location: ${data.location_id || data.location}`); // Verify what's being returned
    res.json(data);
  } catch (error) {
    console.error(`Error getting current AQI for location ${req.query.location}:`, error);
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
    const hours = req.query.hours ?? 168;
    const data = await getAqiHistory(location, hours);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

async function sendAqiHistoryExport(req, res, next) {
  try {
    const location = req.query.location ?? "lokoja";
    const hours = req.query.hours ?? 168;
    const format = req.query.format ?? "csv";
    const exportPayload = await getAqiHistoryExport(location, hours, format);
    res.setHeader("Content-Type", exportPayload.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportPayload.filename}"`);
    res.send(exportPayload.body);
  } catch (error) {
    next(error);
  }
}

router.get("/history/export", sendAqiHistoryExport);
router.get("/export", sendAqiHistoryExport);

router.get("/locations", (req, res) => {
  res.json({
    locations: getAqiLocations()
  });
});

router.get("/polling-config", (req, res) => {
  res.json({
    locations: getAqiPollingConfig()
  });
});

export default router;
