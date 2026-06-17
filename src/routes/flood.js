import express from "express";
import { getFloodLocations, getFloodRisk } from "../services/floodService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Flood
 *   description: Flood risk assessment API
 */

/**
 * @swagger
 * /api/flood/risk:
 *   get:
 *     summary: Get flood risk assessment data
 *     tags: [Flood]
 *     responses:
 *       200:
 *         description: Flood risk assessment data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   region:
 *                     type: string
 *                     description: Name of the region
 *                   riskLevel:
 *                     type: string
 *                     enum: [low, moderate, high, severe]
 *                     description: Flood risk level for the region
 *                   probability:
 *                     type: number
 *                     description: Probability percentage of flooding
 *                   affectedArea:
 *                     type: number
 *                     description: Area likely to be affected in square kilometers
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/risk", async (req, res, next) => {
  try {
    const data = await getFloodRisk(req.query.location ?? "lokoja");
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/locations", (req, res) => {
  res.json({
    locations: getFloodLocations()
  });
});

export default router;
