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

**Vercel is the host.** It builds `master` on every push, from `vercel.json`:
`npm run build && node scripts/emit-vercel-output.mjs`, which writes the Vercel
Build Output API to `.vercel/output`.

The Cloudflare Vite plugin is skipped on Vercel (`VERCEL=1`), and two things
follow from that, both handled in `vite.config.ts`:

- `cloudflare:*` is marked external. `lib/data/store/read.ts` reaches for the
  ASSETS binding through `await import('cloudflare:workers')` inside a
  try/catch so that a runtime without it falls back to reading the promoted
  files from disk. The bundler cannot see that and fails to resolve the
  specifier, so the build has to hand the decision to the runtime.
- The Workers config is named `wrangler.worker.jsonc`, not `wrangler.jsonc`.
  vinext refuses to build when a wrangler config sits in the root without the
  Cloudflare plugin registered; the file explains the rename.

### Cloudflare Workers (kept working, manual)

```text
npm run deploy
```

Builds with `NEXT_PUBLIC_SITE_URL=https://costanswer.com`, then deploys
`dist/server/wrangler.json` — the config the build emits, with `main`, the
assets directory, cache and observability resolved. Do not point `wrangler` at
`wrangler.worker.jsonc`: `main` there is a package specifier the build resolves,
and wrangler alone reports it as a missing entry point.

`.github/workflows/deploy.yml` runs the same command but only on
`workflow_dispatch`, so a push does not deploy to two hosts at once. It needs
repository secret `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers) — without it
the job prints a skip notice and succeeds, so a green run is not by itself
evidence that anything deployed. D1 / monetization secrets are not required to
serve pages.

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
