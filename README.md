# HowMuchUSA

HowMuchUSA is a U.S.-focused answer-engine platform for practical quantitative decisions. The first milestone proves a reusable architecture across deterministic pay, authoritative location data, estimates, comparisons, dates, shopping units and recipe quantities.

## Requirements

- Node.js 22.13 or newer
- npm
- An EIA API key only when refreshing the electricity snapshot

## Local development

```text
npm install
npm run dev
```

The default local URL is `http://localhost:3000`.

## Verification

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`test:e2e` starts or reuses a local server, drives real calculator inputs in a
browser, and accepts `E2E_BASE_URL`. CI should install Playwright Chromium;
local runs may set `PLAYWRIGHT_EXECUTABLE_PATH` to an existing browser binary.
Production builds also require the public canonical origin, for example
`NEXT_PUBLIC_SITE_URL=https://www.example.com npm run build`. The build fails
closed when that value is missing so localhost canonicals cannot be published.

## Data refresh

Create a free EIA key, keep it outside source control, then run:

```text
EIA_API_KEY=your-key npm run data:eia
```

The adapter validates all 50 states plus DC, units, duplicates, positive values and the revenue/sales price invariant. Suspicious revisions are rejected instead of replacing the promoted snapshot.

## Documentation

- `docs/ARCHITECTURE.md` — decisions, boundaries and scale strategy
- `docs/ROADMAP.md` — phased acceptance criteria and expansion waves
- `docs/ADDING_A_TOOL.md` — quality and implementation checklist
