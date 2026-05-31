import express from "express";
import { getCurrentAqi } from "../services/aqiService.js";
import { buildHealthAdvisory } from "../services/advisoryEngine.js";

const router = express.Router();

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
