# Contributing to KSEIP

Thank you for considering a contribution to the Kogi State Environmental Intelligence Platform. This document covers everything you need to make a clean, reviewable pull request.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [Development Setup](#development-setup)
- [Branch Conventions](#branch-conventions)
- [Commit Style](#commit-style)
- [Pull Request Checklist](#pull-request-checklist)
- [Code Style](#code-style)
- [Adding a New API Route (Backend)](#adding-a-new-api-route-backend)
- [Adding a New Dashboard Panel (Frontend)](#adding-a-new-dashboard-panel-frontend)
- [Reporting Bugs](#reporting-bugs)
- [Proposing Features](#proposing-features)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Before You Start

1. Search [open issues](https://github.com/jcodes5/KSEIP_backend/issues) and [PRs](https://github.com/jcodes5/KSEIP_backend/pulls) before opening a new one.
2. For non-trivial changes, open an issue first and describe what you want to do. This avoids wasted effort if the direction conflicts with existing plans.
3. Read [ROADMAP.md](./ROADMAP.md) to understand what is already planned and where priorities sit.

---

## Development Setup

Follow the full installation instructions in [README.md](./README.md). The short version:

```bash
# Backend
cd KSEIP_backend && npm install && cp .env.example .env && npm run dev

# Frontend (new terminal)
cd KSEIP_frontend && npm install && cp .env.example .env && npm run dev
```

Both repos require **Node.js 18 or later**.

---

## Branch Conventions

Branch from `main` unless otherwise directed.

| Prefix | Use for |
|---|---|
| `feat/` | New features — `feat/lokoja-pm25-chart` |
| `fix/` | Bug fixes — `fix/waqi-token-bucket-refill` |
| `docs/` | Documentation only — `docs/api-reference-update` |
| `refactor/` | Code restructuring with no behaviour change |
| `chore/` | Build scripts, dependencies, CI changes |
| `test/` | Adding or updating tests only |

Keep branch names lowercase and hyphen-separated. Do not use slashes beyond the prefix.

---

## Commit Style

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short description>

[optional body — wrap at 72 chars]

[optional footer: BREAKING CHANGE or Closes #issue]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

**Scopes:** `aqi`, `meteo`, `climate`, `fire`, `flood`, `health`, `plume`, `status`, `frontend`, `deps`, `ci`

**Examples:**

```
feat(aqi): add 7-day history endpoint with Open-Meteo hourly data

fix(cors): handle trailing slashes in CORS_ORIGINS env variable

docs(readme): add Docker Compose section to installation guide

chore(deps): update express to 4.21.2
```

Rules:
- Subject line: imperative mood, no period at the end, 72 characters maximum.
- Body: explain *why*, not *what*. The diff shows what.
- Reference issues: `Closes #42` or `Relates to #38`.

---

## Pull Request Checklist

Before requesting review, confirm every item below:

### General

- [ ] Branch is up to date with `main`
- [ ] PR title follows Conventional Commits format
- [ ] PR description explains *what* changed and *why*
- [ ] Linked to the relevant issue (if one exists)

### Backend

- [ ] New routes have JSDoc `@swagger` annotations
- [ ] `npm run docs` regenerates cleanly
- [ ] `npm test` passes
- [ ] External API keys are **not** referenced in frontend code
- [ ] New environment variables are added to `.env.example` with a comment
- [ ] No `console.log` left in hot paths (use structured logging or remove)

### Frontend

- [ ] `npm run build` succeeds with no errors
- [ ] No hardcoded `localhost` or API base URLs — use `import.meta.env.VITE_API_BASE_URL`
- [ ] New components placed under `src/components/<ComponentName>/`
- [ ] Tailwind classes only — no inline `style={{}}` blocks for layout
- [ ] Loading and error states handled for every async operation

### Both

- [ ] No secrets, tokens, or credentials committed
- [ ] `.env` files are `.gitignore`d and not staged

---

## Code Style

Neither repo currently enforces a linter via CI, but please follow these conventions manually until ESLint is added (tracked in the roadmap):

**JavaScript / JSX**
- Two-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- Arrow functions for callbacks and component internals
- Named exports for utilities; default exports for React components and Express routers

**Backend specifics**
- ESM (`import`/`export`) — no `require()`
- Async/await over `.then()` chains
- Pass errors to `next(error)` in route handlers; do not `res.json` error responses directly
- Use the `serviceError(message, code, status)` utility from `aqiService.js` as the error factory pattern

**Frontend specifics**
- Component files: `PascalCase.jsx`
- Hook and utility files: `camelCase.js`
- Keep components under ~200 lines; extract sub-components or hooks when they grow beyond that

---

## Adding a New API Route (Backend)

1. Create `src/routes/<name>.js` and `src/services/<name>Service.js`.
2. Write JSDoc `@swagger` annotations on every route handler.
3. Register the router in `src/server.js`:
   ```js
   import newRoutes from './routes/new.js';
   app.use('/api/new', newRoutes);
   ```
4. Add any required environment variables to `.env.example`.
5. Run `npm run docs` to verify the Swagger spec generates without errors.
6. Add at least one test in `src/services/<name>.test.js`.

---

## Adding a New Dashboard Panel (Frontend)

1. Create `src/components/<PanelName>/<PanelName>.jsx`.
2. Add a `<PanelName>.gitkeep` placeholder (convention in this repo).
3. Accept `loading`, `error`, and data props — every panel must handle all three states.
4. Add the panel to `DashboardPage` in `src/App.jsx`.
5. If the panel requires a new backend call, add the function to `src/services/apiClient.js`.

---

## Reporting Bugs

Open a GitHub Issue with the following information:

- **Environment:** Node version, OS, browser (if frontend)
- **Steps to reproduce** — numbered, minimal, exact
- **Expected behaviour**
- **Actual behaviour** — include full error messages and stack traces
- **Relevant `.env` variables** — with keys redacted

---

## Proposing Features

Open a GitHub Issue with the label `enhancement`. Describe:

1. The problem you are solving, not the solution you have in mind
2. Who benefits and how often
3. Any alternatives you considered
4. If relevant, which ROADMAP.md item this relates to

---

## Security Vulnerabilities

Do **not** open a public issue for security vulnerabilities. Email the maintainer directly with a description of the issue and steps to reproduce. You will receive acknowledgement within 72 hours.
