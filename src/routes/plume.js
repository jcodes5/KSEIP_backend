import express from "express";
import { runPlumeModel } from "../services/gpde.js";

const router = express.Router();

router.post("/run", async (req, res, next) => {
  try {
    const result = await runPlumeModel(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

