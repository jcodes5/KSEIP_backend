# KSEIP Backend

> Express API server for the **Kogi State Environmental Intelligence Platform** — scientific data aggregation, caching, advisory logic, and plume modelling for Kogi State, Nigeria.

[![Node ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/) [![Express 4](https://img.shields.io/badge/express-4-000)](https://expressjs.com/) [![Swagger](https://img.shields.io/badge/docs-swagger-85ea2d)](http://localhost:4000/api-docs)

---

## Table of Contents

- [API Overview](#api-overview)
- [Architecture](#architecture)
- [Data Storage](#data-storage)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running in Production](#running-in-production)
- [Frontend Repository](#frontend-repository)
- [License](#license)

---

## API Overview

The KSEIP Backend is a Node.js REST API that sits between the React frontend and a set of external scientific data sources. Its responsibilities are:

- Aggregate and normalise environmental data from Open-Meteo, WAQI, OpenAQ, NASA FIRMS, and NASA POWER
- Keep all third-party API keys **server-side only** — nothing is exposed to the browser
- Apply in-memory caching with per-service TTLs and a token-bucket rate limiter for WAQI
- Run Gaussian plume dispersion calculations on the server
- Translate raw AQI values into structured, plain-language health advisories
- Serve an interactive Swagger UI at `/api-docs`
- Pre-warm caches on startup via background polling (`node-cron`)

**Base URL (local):** `http://localhost:4000`  
**Interactive docs:** `http://localhost:4000/api-docs`  
**Health check:** `http://localhost:4000/health`

---

## Architecture

```
                    KSEIP React Frontend
                           │
                           │ HTTP (CORS-controlled)
                           ▼
            ┌──────────────────────────────┐
            │        Express Server        │
            │         port 4000            │
            │                              │
            │  Middleware stack:           │
            │  compression → json →        │
            │  cors → routes               │
            └──────┬───────────────────────┘
                   │
     ┌─────────────┼──────────────────────────┐
     │             │                          │
     ▼             ▼                          ▼
┌─────────┐  ┌──────────┐            ┌───────────────┐
│  /api/  │  │  /api/   │            │    /api/      │
│  aqi    │  │  meteo   │            │  fire / flood │
│         │  │  climate │            │               │
│ Primary │  │  plume   │            │  NASA FIRMS   │
│ source: │  │  health  │            │  Flood index  │
│ Open-   │  │  status  │            └───────────────┘
│ Meteo   │  └──────────┘
│         │
│ Validation:
│ WAQI (token bucket)
│ OpenAQ v3
└─────────┘
```

### Request Lifecycle

```
Incoming request
      │
      ▼
CORS check (origin allowlist from CORS_ORIGINS)
      │
      ▼
Route handler
      │
      ├── Cache hit? ──Yes──► Return cached reading (withFreshness flag)
      │
      No
      │
      ▼
Primary source fetch (Open-Meteo or NASA)
      │
      ├── Parallel: optional validation sources (WAQI, OpenAQ)
      │
      ▼
Merge + conservativeAqi() — take max of primary and validated readings
      │
      ▼
Push to in-memory cache
      │
      ▼
Return JSON response
```

### Background Polling

On startup, `startAqiPolling()` and `startMeteoRefresh()` register `setInterval` timers (via node-cron) that force-refresh caches for all monitored locations. Interval duration is configurable via `WAQI_POLL_MINUTES` and `OPEN_METEO_REFRESH_HOURS`.

### Error Handling

All route handlers delegate errors to `next(error)`. A global error middleware normalises them to:

```json
{
  "error": true,
  "message": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Network-level errors (DNS failures, upstream timeouts) are logged with `error.cause.code` and `error.cause.hostname` for diagnostics.

---

## Data Storage

**There is no database.** The backend uses JavaScript `Map` objects as in-memory caches. This is intentional for v1 — it keeps the deployment footprint to a single Node process with no external dependencies.

### Implications

| Behaviour | Detail |
|---|---|
| Cache survives | For the lifetime of the Node process |
| Cache is lost on | Process restart / deploy |
| Persistence across restarts | Not available — tracked as a v1.1 roadmap item |
| Concurrency | Single-process; no locking needed |
| Scale-out | Not supported without replacing the cache layer |

### Cache configuration

| Cache | TTL control variable | Default |
|---|---|---|
| AQI readings (retention window) | `AQI_CACHE_HOURS` | 24 hours |
| AQI fresh threshold (serve without re-fetch) | `WAQI_POLL_MINUTES` | 60 minutes |
| Stale badge threshold | hardcoded | 2 hours |
| Climate data | `CLIMATE_CACHE_DAYS` | 30 days |

### Upgrading to a persistent store (future)

When persistence is needed, replace the `Map` in `aqiService.js` with a Redis client or an SQLite adapter. The `pushCache`, `latestCached`, and `getAqiHistory` functions are the only places to update — the route handlers are unaffected.

---

## API Endpoints

Full interactive documentation is at **`/api-docs`** (Swagger UI). The table below is a quick reference.

### AQI — `/api/aqi`

| Method | Path | Query params | Description |
|---|---|---|---|
| GET | `/api/aqi/current` | `location` | Current AQI, dominant pollutant, validation sources, advisory AQI |
| GET | `/api/aqi/history` | `location`, `hours` (1–24) | Hourly AQI and PM2.5 time series |

**`location` values:** `lokoja` (default) · `obajana` · `okene` · `anyigba` · `nearest`

**Example:**
```
GET /api/aqi/current?location=obajana
```

```json
{
  "location": "Obajana",
  "location_id": "obajana",
  "aqi": 42,
  "dominant_pollutant": "pm10",
  "pm25": 11.2,
  "pm10": 28.4,
  "so2": 1.1,
  "no2": 3.8,
  "co": 180,
  "o3": 44.2,
  "timestamp": "2024-01-15T09:00:00.000Z",
  "stale": false,
  "primary_source": "Open-Meteo Air Quality",
  "validation_sources": [...],
  "advisory_aqi": 42,
  "cached_at": "2024-01-15T09:01:03.000Z"
}
```

---

### Meteorology — `/api/meteo`

| Method | Path | Query params | Description |
|---|---|---|---|
| GET | `/api/meteo/current` | `location` | Live weather conditions — temperature, humidity, wind, pressure |

---

### Climate — `/api/climate`

| Method | Path | Query params | Description |
|---|---|---|---|
| GET | `/api/climate/trend` | `location` | 30-year climate trend analysis from NASA POWER |

---

### Plume Dispersion — `/api/plume`

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET/POST | `/api/plume` | Source params (location, emission rate, stack height, wind) | Gaussian plume model — returns concentration grid |

---

### Health Advisories — `/api/health`

| Method | Path | Query params | Description |
|---|---|---|---|
| GET | `/api/health/advisory` | `location` | EPA AQI band → structured advisory for sensitive groups, activities |

**Response includes:**
- `category` (Good / Moderate / Unhealthy for Sensitive Groups / Unhealthy / Very Unhealthy / Hazardous)
- `advisory_text` — general public message
- `sensitive_groups_text` — guidance for at-risk populations
- `activities` — `exercise`, `school_sport`, `farming`, `construction` flags

---

### Fire Detection — `/api/fire`

| Method | Path | Description |
|---|---|---|
| GET | `/api/fire/hotspots` | NASA FIRMS VIIRS/SNPP NRT hotspot detections within the Kogi State bounding box |

Requires `NASA_FIRMS_MAP_KEY` in `.env`. Returns an empty hotspot list (not an error) when the key is absent.

---

### Flood Screening — `/api/flood`

| Method | Path | Description |
|---|---|---|
| GET | `/api/flood/risk` | Niger–Benue confluence flood screening index with risk level and recommended actions |

---

### System Status — `/api/status`

| Method | Path | Description |
|---|---|---|
| GET | `/api/status` | Service and data-source health summary |

---

### Server Health — `/health`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe — returns `{ status: "ok" }` |

---

## Environment Variables

Copy `.env.example` to `.env` before starting the server.

```bash
cp .env.example .env
```

### Required

| Variable | Description |
|---|---|
| *(none strictly required)* | The server starts without any keys. AQI data (Open-Meteo primary) works out of the box. All key-dependent features degrade gracefully. |

### Strongly Recommended

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `WAQI_API_KEY` | [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/) — free | WAQI validation source disabled; advisory AQI falls back to Open-Meteo only |
| `NASA_FIRMS_MAP_KEY` | [firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key/) — free | Fire/hotspot endpoint returns empty dataset |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port the server listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `OPENAQ_API_KEY` | — | [api.openaq.org](https://api.openaq.org/) — enables second AQI validation layer |
| `FIRMS_SOURCE` | `VIIRS_SNPP_NRT` | FIRMS satellite product identifier |
| `FIRMS_KOGI_BBOX` | `5.3,6.4,7.9,8.8` | Bounding box (lon_min,lat_min,lon_max,lat_max) for fire queries |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins — replace with your Vercel domain in production |
| `LOKOJA_LAT` / `LOKOJA_LON` | `7.80` / `6.74` | Lokoja study coordinates |
| `OBAJANA_LAT` / `OBAJANA_LON` | `7.50` / `6.32` | Obajana study coordinates |
| `ANYIGBA_LAT` / `ANYIGBA_LON` | `7.48` / `6.90` | Anyigba study coordinates |
| `WAQI_POLL_MINUTES` | `60` | Background AQI polling interval (minutes) |
| `OPEN_METEO_REFRESH_HOURS` | `3` | Meteo cache refresh interval (hours) |
| `AQI_CACHE_HOURS` | `24` | AQI reading retention window |
| `CLIMATE_CACHE_DAYS` | `30` | Climate data cache duration |
| `WAQI_DAILY_LIMIT` | `1000` | WAQI token bucket capacity (daily requests) |
| `FETCH_TIMEOUT_MS` | `30000` | Upstream API HTTP timeout (milliseconds) |

> **Security:** Never commit your `.env` file. The `.gitignore` already excludes it. API keys belong in your hosting provider's secret manager or environment variable settings, not in source control.

---

## Installation

### Prerequisites

- Node.js 18 or later
- npm (bundled with Node)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/jcodes5/KSEIP_backend.git
cd KSEIP_backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — add API keys as needed

# 4. Start the development server (auto-restarts on file changes)
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with `node --watch` (no extra tool needed) |
| `npm start` | Production server |
| `npm test` | Run tests with Node's built-in test runner |
| `npm run docs` | Regenerate `docs/swagger.json` from JSDoc annotations |

### Verify it is running

```bash
curl http://localhost:4000/health
# {"status":"ok","service":"kseip-backend","timestamp":"..."}

curl "http://localhost:4000/api/aqi/current?location=lokoja"
# Returns live AQI JSON
```

Swagger UI: open **http://localhost:4000/api-docs** in a browser.

---

## Running in Production

1. Set `NODE_ENV=production` in your environment.
2. Update `CORS_ORIGINS` to the deployed frontend domain (e.g. `https://kseip.vercel.app`).
3. Set all API keys via your hosting provider's secret manager — not in a committed `.env` file.
4. Start with `npm start` behind a process manager (PM2, systemd, or a container runtime).

```bash
# Example with PM2
npm install -g pm2
pm2 start src/server.js --name kseip-backend
pm2 save
pm2 startup
```

For containerised deployments, the server has no filesystem dependencies — all state is in-memory and all configuration comes from environment variables. A minimal `Dockerfile` would be:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
EXPOSE 4000
CMD ["node", "src/server.js"]
```

---

## Frontend Repository

The React dashboard that consumes this API:

**[https://github.com/jcodes5/KSEIP_frontend](https://github.com/jcodes5/KSEIP_frontend)**

Set `VITE_API_BASE_URL` in the frontend `.env` to the URL where this backend is running.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

Third-party data services used by this backend have separate terms:

- [Open-Meteo Terms](https://open-meteo.com/en/terms)
- [WAQI Terms](https://aqicn.org/terms/)
- [OpenAQ Terms](https://openaq.org/about/terms/)
- [NASA FIRMS Data Policy](https://www.earthdata.nasa.gov/engage/open-data-services-and-software/data-and-information-policy)
- [NASA POWER](https://power.larc.nasa.gov/docs/services/api/)
