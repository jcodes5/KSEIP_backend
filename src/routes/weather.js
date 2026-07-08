import express from "express";
import {
  getCurrentWeather,
  getCurrentWeatherByCoordinates,
  getWeatherForecast,
  getWeatherIntelligence,
  getWeatherLgas,
  getWeatherMap
} from "../services/weatherService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Weather
 *   description: LGA-level weather intelligence for Kogi State
 */

router.get("/lgas", (req, res) => {
  res.json({
    locations: getWeatherLgas()
  });
});

router.get("/current", async (req, res, next) => {
  try {
    const data = await getCurrentWeather(req.query.lga ?? "lokoja", {
      forceRefresh: req.query.refresh === "true"
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/current-by-coordinates", async (req, res, next) => {
  try {
    const data = await getCurrentWeatherByCoordinates(req.query.lat, req.query.lon, {
      accuracy: req.query.accuracy,
      forceRefresh: req.query.refresh === "true"
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/forecast", async (req, res, next) => {
  try {
    const data = await getWeatherForecast(req.query.lga ?? "lokoja", req.query.days ?? 7, {
      forceRefresh: req.query.refresh === "true"
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/intelligence", async (req, res, next) => {
  try {
    const data = await getWeatherIntelligence(req.query.lga ?? "lokoja", {
      forceRefresh: req.query.refresh === "true"
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/map", async (req, res, next) => {
  try {
    const data = await getWeatherMap({
      forceRefresh: req.query.refresh === "true"
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
