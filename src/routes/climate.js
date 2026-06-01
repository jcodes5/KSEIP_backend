import express from "express";
import { getClimateTrend } from "../services/climateService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Climate
 *   description: Climate trend data API
 */

/**
 * @swagger
 * /api/climate/trend:
 *   get:
 *     summary: Get climate trend data
 *     tags: [Climate]
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *         description: Climate parameter to get trend for. Default is T2M for temperature
 *       - in: query
 *         name: years
 *         schema:
 *           type: integer
 *         description: Number of years to include in trend analysis. Default is 30
 *     responses:
 *       200:
 *         description: Climate trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parameter:
 *                   type: string
 *                   description: The climate parameter analyzed
 *                 trend:
 *                   type: number
 *                   description: Trend value over the specified period
 *                 dataPoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                         description: Year of the data point
 *                       value:
 *                         type: number
 *                         description: Climate value for that year
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get("/trend", async (req, res, next) => {
  try {
    const data = await getClimateTrend(req.query.param ?? "T2M", req.query.years ?? 30);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;