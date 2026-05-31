import express from "express";
import { getFloodRisk } from "../services/floodService.js";

const router = express.Router();

router.get("/risk", async (req, res, next) => {
  try {
    const data = await getFloodRisk();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

