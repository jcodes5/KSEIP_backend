import express from "express";
import { getFireHotspots } from "../services/fireService.js";

const router = express.Router();

router.get("/hotspots", async (req, res, next) => {
  try {
    const data = await getFireHotspots(req.query.days ?? 5);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

