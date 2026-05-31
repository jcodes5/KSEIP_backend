import express from "express";
import { getClimateTrend } from "../services/climateService.js";

const router = express.Router();

router.get("/trend", async (req, res, next) => {
  try {
    const data = await getClimateTrend(req.query.param ?? "T2M", req.query.years ?? 30);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

