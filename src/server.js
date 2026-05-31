import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import aqiRoutes from "./routes/aqi.js";
import climateRoutes from "./routes/climate.js";
import fireRoutes from "./routes/fire.js";
import floodRoutes from "./routes/flood.js";
import healthRoutes from "./routes/health.js";
import meteoRoutes from "./routes/meteo.js";
import plumeRoutes from "./routes/plume.js";
import statusRoutes from "./routes/status.js";
import { startAqiPolling } from "./services/aqiService.js";
import { startMeteoRefresh } from "./services/meteoService.js";

// Note: Use FETCH_TIMEOUT_MS environment variable to configure API request timeouts (default: 30000ms)
const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(Object.assign(new Error("Origin is not allowed by KSEIP CORS policy."), {
        code: "CORS_ORIGIN_DENIED",
        status: 403
      }));
    }
  })
);

app.use("/api/aqi", aqiRoutes);
app.use("/api/meteo", meteoRoutes);
app.use("/api/plume", plumeRoutes);
app.use("/api/climate", climateRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/fire", fireRoutes);
app.use("/api/flood", floodRoutes);
app.use("/api/status", statusRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "kseip-backend",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "The requested KSEIP API route was not found.",
    code: "ROUTE_NOT_FOUND"
  });
});

app.use((error, req, res, next) => {
  const status = Number(error.status) || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = status === 500 ? "An unexpected backend error occurred." : error.message;

  // Enhanced logging for network/DNS errors
  if (status >= 500) {
    if (error.cause && error.cause.code) {
      // Log specific details for network errors
      console.error(`[server] unhandled error: ${error.message}`, {
        code: error.cause.code,
        syscall: error.cause.syscall,
        hostname: error.cause.hostname,
        stack: error.stack
      });
    } else {
      console.error("[server] unhandled error:", error);
    }
  }

  res.status(status).json({
    error: true,
    message,
    code
  });
});

app.listen(port, () => {
  console.log(`[server] KSEIP backend listening on port ${port}`);
  console.log(`[server] CORS origins: ${corsOrigins.join(", ")}`);
  startAqiPolling();
  startMeteoRefresh();
});

export default app;
