import express from "express";
import { getCurrentMeteo, getMeteoForecast } from "../services/meteoService.js";

const router = express.Router();

router.get("/current", async (req, res, next) => {
  try {
    const data = await getCurrentMeteo();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/forecast", async (req, res, next) => {
  try {
    const data = await getMeteoForecast(req.query.hours ?? 48);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

