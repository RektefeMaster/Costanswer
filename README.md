# CostAnswer

CostAnswer is a U.S.-focused answer-engine for how much practical things cost. It covers pay, mortgage payments, inflation, energy, materials, dates, shopping units and recipe quantities.

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
`NEXT_PUBLIC_SITE_URL=https://costanswer.com npm run build`. The build fails
closed when that value is missing so localhost canonicals cannot be published.

## Deploy

Cloudflare Workers is the launch host. Vercel output remains an escape hatch.

```text
npm run deploy
```

That builds with `NEXT_PUBLIC_SITE_URL=https://costanswer.com` and runs
`wrangler deploy` using `wrangler.jsonc` (Worker name `costanswer`). Until
`costanswer.com` is a zone on this Cloudflare account the Worker is reachable
on `workers.dev`. After the domain is registered here, uncomment the custom
domain routes in `wrangler.jsonc` and redeploy. GitHub Actions
(`.github/workflows/deploy.yml`) needs repository secret `CLOUDFLARE_API_TOKEN`
(Edit Cloudflare Workers). D1 / monetization secrets are not required to serve
pages.

## Data refresh

Create a free EIA key, keep it outside source control, then run:

```text
EIA_API_KEY=your-key npm run data:refresh
```

Electricity ingest needs the EIA key. Gasoline, grocery, CPI-U, and Freddie Mac PMMS ingest use public pages or APIs and do not. Suspicious revisions are rejected instead of replacing the promoted snapshot.

## Documentation

- `docs/ARCHITECTURE.md` — decisions, boundaries and scale strategy
- `docs/ROADMAP.md` — phased acceptance criteria and expansion waves
- `docs/ADDING_A_TOOL.md` — quality and implementation checklist
- `docs/MONETIZATION.md` — the commercial layer, its boundary, and how to switch a channel on
- `docs/MASTER_PLAN.md` — current-state audit and the phased plan to launch
