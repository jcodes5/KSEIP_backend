import express from "express";
import { getAqiHistory, getCurrentAqi } from "../services/aqiService.js";

const router = express.Router();

router.get("/current", async (req, res, next) => {
  try {
    const location = req.query.location ?? "lokoja";
    const data = await getCurrentAqi(location);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

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
