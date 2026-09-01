# HowMuchUSA implementation roadmap

## Phase 0 — Repository and product baseline

Acceptance criteria:

- Node 22.13+ runtime is documented and used.
- Production-oriented App Router/Vinext project compiles.
- Product identity replaces starter content.
- Architecture decisions and first-release boundary are recorded.

## Phase 1 — Answer-engine foundation

Acceptance criteria:

- Typed tool/category/relation registry exists.
- Pure calculation engines expose versioned, explainable results.
- Shared units, money, dates and location primitives have runtime validation.
- Tool-shell, source panel, result card, breadcrumbs and related-tool components are reusable.
- Unit and regression tests execute in CI-compatible offline mode.

## Phase 2 — Representative tools and authoritative data

Acceptance criteria:

- Seven useful tools across six categories are live; no placeholder tool routes.
- EIA electricity data is normalized into an immutable snapshot with provenance.
- An ingestion adapter, validation report and failure fixtures exist.
- Electricity and EV/gas tools reuse the same state-energy dataset.
- Estimate tools show ranges/assumptions rather than invented local prices.

## Phase 3 — Discovery, SEO and monetization readiness

Acceptance criteria:

- Search resolves natural-language aliases from the registry.
- Topic hubs and related links are generated from typed relationships.
- Canonicals, metadata, breadcrumbs, valid JSON-LD, robots and sitemap are present.
- Indexability evidence is explicit; transient tool state cannot create crawlable pages.
- Empty, reserved ad slots and a privacy-conscious analytics boundary are available.

## Phase 4 — Verification and launch

Acceptance criteria:

- Typecheck, lint, unit/integration tests and production build pass.
- Critical routes return 200 and expose the expected metadata.
- Keyboard, touch and reduced-motion behavior are supported.
- Adversarial scale/data/SEO/mobile review finds no unresolved material defect.
- A versioned deployment is published.

## Expansion wave 1 — Data-led traffic

- BLS OEWS salary explorer plus 20 high-intent national occupation pages.
- 51 state/DC salary hubs only after each page passes the quality gate.
- BLS CPI-U inflation/value-over-time tool with a versioned time-series adapter.
- Search Console import and opportunity scoring.

Do not launch occupation × state × metro combinations in this wave.

## Expansion wave 2 — Reuse-led tools

- Road-trip fuel cost using supported EIA geographies plus manual override.
- IRS mileage reimbursement with effective-date rules.
- Appliance running cost and home charging cost using the energy engine.
- Additional concrete shapes and material estimators.
- FoodData Central-backed ingredient density mappings.

## Expansion wave 3 — Local benchmarks

- Census ACS normalization with estimates, margins of error and annotation handling.
- Location profiles for state/county/city only where genuinely distinct data supports the page.
- Quality-gated local comparisons; no city-name substitution pages.

