import express from "express";
import { getCurrentAqi } from "../services/aqiService.js";
import { buildHealthAdvisory } from "../services/advisoryEngine.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health advisory API based on environmental conditions
 */

/**
 * @swagger
 * /api/health/advisory:
 *   get:
 *     summary: Get health advisory based on environmental conditions
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to get health advisory for. Default is lokoja
 *     responses:
 *       200:
 *         description: Health advisory information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 condition:
 *                   type: string
 *                   description: Air quality condition category
 *                 healthImpacts:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Potential health impacts
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Recommended actions for protection
 *                 sensitiveGroups:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Groups particularly sensitive to these conditions
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time when the advisory was generated
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/advisory", async (req, res, next) => {
  try {
    const location = req.query.location ?? "lokoja";
    const current = await getCurrentAqi(location);
    const advisoryAqi = current.advisory_aqi ?? current.aqi ?? 0;
    const data = buildHealthAdvisory(advisoryAqi, advisoryAqi);
    res.json({
      ...data,
      timestamp: current.timestamp
    });
  } catch (error) {
    next(error);
  }
});

export default router;