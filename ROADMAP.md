# KSEIP Roadmap

This document tracks planned work across the frontend and backend. Items are grouped by horizon and labelled with current status.

Status legend: `✅ Done` · `🔄 In Progress` · `📋 Planned` · `💡 Under Consideration`

---

## v1.0 — Public Launch Baseline

**Target:** Initial stable release for Kogi State Government operations

| # | Item | Scope | Status |
|---|---|---|---|
| 1 | AQI monitoring — Open-Meteo primary + WAQI/OpenAQ validation | Backend | ✅ Done |
| 2 | Hourly AQI history endpoint (24 h) | Backend | ✅ Done |
| 3 | EPA AQI band advisory engine | Backend | ✅ Done |
| 4 | Gaussian plume dispersion service | Backend | ✅ Done |
| 5 | Climate trend endpoint (NASA POWER) | Backend | ✅ Done |
| 6 | NASA FIRMS fire/hotspot integration | Backend | ✅ Done |
| 7 | Niger–Benue flood screening index | Backend | ✅ Done |
| 8 | Swagger UI at `/api-docs` | Backend | ✅ Done |
| 9 | React SPA dashboard (AQI, Climate, Fire/Flood, Health, Plume) | Frontend | ✅ Done |
| 10 | Responsive Tailwind layout with mobile nav | Frontend | ✅ Done |
| 11 | Replace placeholder contact details in footer | Frontend | 📋 Planned |
| 12 | Production CORS configuration (Vercel domain) | Backend | 📋 Planned |

---

## v1.1 — Stability & Observability

**Focus:** Make the platform production-hardened before wider rollout

| # | Item | Scope | Status |
|---|---|---|---|
| 13 | Persistent cache layer (Redis or SQLite) — survive restarts | Backend | 📋 Planned |
| 14 | Structured logging (replace `console.log` with pino or winston) | Backend | 📋 Planned |
| 15 | `/api/status` rich response — upstream API reachability, cache age | Backend | 📋 Planned |
| 16 | Expand test coverage — route-level integration tests | Backend | 📋 Planned |
| 17 | Frontend error boundary components with retry UI | Frontend | 📋 Planned |
| 18 | Loading skeleton screens (replace spinner-only states) | Frontend | 📋 Planned |
| 19 | CI/CD pipeline (GitHub Actions — lint, test, build on PR) | Both | 📋 Planned |
| 20 | Docker Compose setup for local full-stack development | Both | 📋 Planned |

---

## v1.2 — Data Depth

**Focus:** Extend monitored coverage and data resolution

| # | Item | Scope | Status |
|---|---|---|---|
| 21 | Extend AQI history window from 24 h to 7 days | Backend | 📋 Planned |
| 22 | Add Kabba and Idah as monitored nodes | Backend | 📋 Planned |
| 23 | PM2.5 / PM10 dedicated chart in AQI dashboard panel | Frontend | 📋 Planned |
| 24 | Climate: add SPI (Standardized Precipitation Index) visualisation | Frontend | 📋 Planned |
| 25 | Export panel data as PDF report (jsPDF integration) | Frontend | 📋 Planned |
| 26 | Offline-capable service worker — cache last-known readings | Frontend | 💡 Under Consideration |

---

## v2.0 — Platform Expansion

**Focus:** Broader ecosystem integrations and multi-stakeholder access

| # | Item | Scope | Status |
|---|---|---|---|
| 27 | User authentication — role-based access (ministry vs. public) | Backend | 💡 Under Consideration |
| 28 | Alert subscription API — email/SMS on threshold breach | Backend | 💡 Under Consideration |
| 29 | Data export API — CSV/GeoJSON download of historical readings | Backend | 💡 Under Consideration |
| 30 | Mobile-first PWA packaging | Frontend | 💡 Under Consideration |
| 31 | Kogi LGA boundary overlay on plume and fire maps | Frontend | 💡 Under Consideration |
| 32 | Multi-language support (English + Yoruba/Igala) | Frontend | 💡 Under Consideration |
| 33 | Public dashboard embed widget for gov.ng portals | Frontend | 💡 Under Consideration |

---

## Known Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| In-memory cache lost on restart | Medium | Addressed in v1.1 item 13 |
| No rate limiting on the Express API itself | Medium | Add `express-rate-limit` before public exposure |
| `tsconfig.json` present in frontend but project is JS-only | Low | Either adopt TypeScript or remove the config |
| Placeholder contact details in footer | Low | Replace with real government contacts before launch |
| `node-cron` polling not configurable per-location | Low | Refactor to support per-location intervals |

---

To propose a new roadmap item, open a GitHub Issue with the label `roadmap` and describe the problem, not just the solution.
