# CostAnswer implementation roadmap

Status as of 2026-09-07. Execution detail lives in `docs/MASTER_PLAN.md` **v3
(rebased after P2 closed)**. P2 acceptance is `docs/P2_STATE_TAX_FINAL.md`.

Do not trust a historical HEAD SHA. Reconcile branch, commit, dirty files,
`tools.length`, tests and `npm run verify:tax` before starting a phase.

## Current

| Track | State |
| --- | --- |
| Phases 0–3 (shell, engines, first tools, SEO plumbing) | **Shipped** |
| Platform (MASTER_PLAN P1) | CI/lint/typecheck **shipped**. Client bundle gate is **150 KiB gzip**. Worker `costanswer` deploys with `npm run deploy`. Custom domain `costanswer.com` **open — public-launch blocker** (name was unregistered 2026-09-07). D1/secrets are a **monetization activation** blocker, not a public-launch blocker while providers stay off |
| State wage tax (MASTER_PLAN P2) | **Closed — do not execute.** 51/51 supported, 0 unsupported. Authority: `docs/P2_STATE_TAX_FINAL.md`. Dependents leftover (PA/CO/DC/KY) closed. Mixed-year rows are listed on every `npm run verify:tax` run |
| Registry | **66** calculators — confirm `registryTools.length` |
| Salary corpus | 761 occupations, 51 state hubs, 30,807 leaves **staged** (`occupationInState: 'staged'`). Staging reason is **crawl/indexation**, not missing state tax |
| Next work (MASTER_PLAN §L) | **1** finish public launch (`costanswer.com` zone + TLS + `www` + GSC + Bing + analytics) → **4b** P1c **shipped** → **5** P7 Job Cost V1 **shipped** (9 recipes, `/cost` family; sourced basket; roof and chain-link dropped — no materials-only baseline) → **6** remaining P4 (including IRS mileage) → **7** P6/P8 after GSC → **8** local/payroll tax engine. P3 and P5 are **closed**. P4 step-4 tax tools shipped except `w4-withholding`, which waits on Pub 15-T tables. |

Nothing in §L.4 is abandoned. Medical, full ES-US, and permit calibration stay in later waves because they have a trigger (GSC + Job V1), not because they are optional. Mixed-year 2026 forms are a **re-check on each tax refresh**, not a phase. Local tax is **step 8**, its own engine, official sources only.

101 is a catalog **target**, not a sacred ship number. Job Cost Engine V1 outranks filling the remaining generic calculators.

---

## Phase 0 — Repository and product baseline

**Shipped.**

- Node 22.13+ runtime is documented and used.
- Production-oriented App Router/Vinext project compiles.
- Product identity replaces starter content.
- Architecture decisions and first-release boundary are recorded.

## Phase 1 — Answer-engine foundation

**Shipped.**

- Typed tool/category/relation registry exists.
- Pure calculation engines expose versioned, explainable results.
- Shared units, money, dates and location primitives have runtime validation.
- Tool-shell, source panel, result card, breadcrumbs and related-tool components are reusable.
- Unit and regression tests execute in CI-compatible offline mode.

## Phase 2 — Representative tools and authoritative data

**Shipped.**

- Seven useful tools across six categories are live; no placeholder tool routes. The live catalog is now 58 tools, not seven.
- EIA electricity data is normalized into an immutable snapshot with provenance.
- An ingestion adapter, validation report and failure fixtures exist.
- Electricity and EV/gas tools reuse the same state-energy dataset.
- Estimate tools show ranges/assumptions rather than invented local prices.

## Phase 3 — Discovery, SEO and monetization readiness

**Shipped**, except connecting Search Console / Bing (needs the live domain).

- Search resolves natural-language aliases from the registry.
- Topic hubs and related links are generated from typed relationships.
- Canonicals, metadata, breadcrumbs, valid JSON-LD, robots and sitemap are present.
- Indexability evidence is explicit; transient tool state cannot create crawlable pages.
- Empty, reserved ad slots and a privacy-conscious analytics boundary are available. Affiliate/lead-gen code exists; external providers stay off until approval.

## Phase 4 — Verification and launch

**Partially shipped.**

- Typecheck, lint, unit/integration tests and production build pass.
- Keyboard, touch and reduced-motion behavior are supported.
- `npm run deploy` builds with `NEXT_PUBLIC_SITE_URL=https://costanswer.com`
  and publishes the `costanswer` Worker (`workers.dev` until the apex is a
  zone). Search Console, Bing, and analytics connect **the day the custom
  domain is live**, not as a final P9 checklist item. D1 is not required to
  serve the public site.

---

## Expansion wave 1 — Data-led traffic

- BLS CPI-U inflation/value-over-time tool with a versioned time-series adapter. **Shipped.**
- Freddie Mac PMMS mortgage payment estimator with national weekly averages. **Shipped.**
- Home affordability decision screen (this house vs. how much house) on take-home pay. **Shipped.**
- BLS OEWS salary explorer plus national occupation pages. **Shipped** — 761 pages, one per detailed occupation OEWS publishes a national wage for, excluding the residual "All Other" buckets.
- 51 state/DC salary hubs only after each page passes the quality gate. **Shipped** — each hub carries the state's own wage distribution, its most common and best-paid occupations, and the occupations most concentrated there.
- 2026 state wage-tax engine. **Shipped (P2 closed)** — salary-after-tax, paycheck, bonus, COL gross-salary, and occupation take-home use the same 51-jurisdiction snapshot. Local city/county tax is named, not computed.
- Search Console import and opportunity scoring. **Open** — connect the day
  `costanswer.com` is live. That feed gates salary-leaf waves and guide
  expansion, not P3/P5/P4 tax tools.

Occupation × state pages are **staged** (`occupationInState: 'staged'`).
State tax is a resolved prerequisite. They stay closed until GSC shows indexed
ratio, impressions and canonical health on the 813 live salary URLs. Metro
combinations remain unbuilt: the OEWS metro release is 40 MB and would not fit
the Worker bundle the state release fits in, so it needs a storage decision first.

## Expansion wave 2 — Reuse-led tools

- Road-trip fuel cost using supported EIA geographies plus manual override. **Shipped.**
- Car affordability / true monthly vehicle cost composing the finance, tax and energy engines, with home charging covered by its EV mode. **Shipped.**
- Auto coverage and household insurance cost. **Shipped** (this branch).
- Appliance running cost using the energy engine. **Shipped.**
- IRS mileage reimbursement with effective-date rules. **Not built.**
- Additional concrete shapes and material estimators.
- FoodData Central-backed ingredient density mappings.

## Expansion wave 3 — Local benchmarks

- Census ACS normalization with estimates, margins of error and annotation handling. **Not built.**
- Location profiles for state/county/city only where genuinely distinct data supports the page.
- Quality-gated local comparisons; no city-name substitution pages.
- Local wage income tax by city/ZIP (NYC, Yonkers, PA EIT, MD county, OH municipal, IN county, …). **Not built.** State tax names the omission; it does not invent a typical rate.
