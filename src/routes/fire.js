import express from "express";
import { getFireHotspots } from "../services/fireService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Fire
 *   description: Fire hotspot monitoring API
 */

/**
 * @swagger
 * /api/fire/hotspots:
 *   get:
 *     summary: Get fire hotspot data
 *     tags: [Fire]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to include in hotspot analysis. Default is 5
 *     responses:
 *       200:
 *         description: Fire hotspot data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Latitude of the hotspot
 *                   longitude:
 *                     type: number
 *                     description: Longitude of the hotspot
 *                   brightness:
 *                     type: number
 *                     description: Brightness temperature of the hotspot
 *                   date:
 *                     type: string
 *                     format: date
 *                     description: Date of the hotspot detection
 *                   confidence:
 *                     type: string
 *                     description: Confidence level of the detection
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/hotspots", async (req, res, next) => {
  try {
    const data = await getFireHotspots(req.query.days ?? 5);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;