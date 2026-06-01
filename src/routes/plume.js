import express from "express";
import { runPlumeModel } from "../services/gpde.js";

const router = express.Router();

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
    const result = await runPlumeModel(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;