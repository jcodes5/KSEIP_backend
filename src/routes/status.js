import express from "express";

const router = express.Router();

function hasValue(value) {
  return Boolean(String(value ?? "").trim());
}

/**
 * @swagger
 * tags:
 *   name: Status
 *   description: Service status and configuration API
 */

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get service status and external data source configuration
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Service status and data source configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Overall service status
 *                 service:
 *                   type: string
 *                   description: Service identifier
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time when the status was checked
 *                 sources:
 *                   type: object
 *                   description: External data sources configuration
 *                   properties:
 *                     open_meteo:
 *                       type: object
 *                       properties:
 *                         configured:
 *                           type: boolean
 *                           description: Whether OpenMeteo source is configured
 *                         role:
 *                           type: string
 *                           description: Role of the data source
 *                     waqi:
 *                       type: object
 *                       properties:
 *                         configured:
 *                           type: boolean
 *                           description: Whether WAQI source is configured
 *                         role:
 *                           type: string
 *                           description: Role of the data source
 *                     openaq:
 *                       type: object
 *                       properties:
 *                         configured:
 *                           type: boolean
 *                           description: Whether OpenAQ source is configured
 *                         role:
 *                           type: string
 *                           description: Role of the data source
 *                     nasa_firms:
 *                       type: object
 *                       properties:
 *                         configured:
 *                           type: boolean
 *                           description: Whether NASA FIRMS source is configured
 *                         role:
 *                           type: string
 *                           description: Role of the data source
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "kseip-backend",
    timestamp: new Date().toISOString(),
    sources: {
      open_meteo: {
        configured: true,
        role: "Meteorology, AQI backbone, climate archive, flood screening"
      },
      waqi: {
        configured: hasValue(process.env.WAQI_API_KEY),
        role: "Supplementary observed AQI validation"
      },
      openaq: {
        configured: hasValue(process.env.OPENAQ_API_KEY),
        role: "Supplementary pollutant validation"
      },
      nasa_firms: {
        configured: hasValue(process.env.NASA_FIRMS_MAP_KEY),
        role: "Fire and hotspot detections"
      }
    }
  });
});

export default router;