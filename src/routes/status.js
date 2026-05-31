import express from "express";

const router = express.Router();

function hasValue(value) {
  return Boolean(String(value ?? "").trim());
}

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "kseip-backend",
    timestamp: new Date().toISOString(),
    sources: {
      open_meteo: {
        configured: true,
        role: "Meteorology, AQI backbone, climate archive, flood screening"
      },
      waqi: {
        configured: hasValue(process.env.WAQI_API_KEY),
        role: "Supplementary observed AQI validation"
      },
      openaq: {
        configured: hasValue(process.env.OPENAQ_API_KEY),
        role: "Supplementary pollutant validation"
      },
      nasa_firms: {
        configured: hasValue(process.env.NASA_FIRMS_MAP_KEY),
        role: "Fire and hotspot detections"
      }
    }
  });
});

export default router;
