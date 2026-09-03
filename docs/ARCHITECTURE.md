# CostAnswer architecture

Status: accepted for milestone 1 · 2026-09-01

## Product boundary

CostAnswer is an answer-engine platform, not a calculator directory. The live catalog covers Money, Home, Auto, Everyday, Food, and Shopping:

| Tool | Class | Shared capability proved |
| --- | --- | --- |
| Hourly to salary | deterministic financial math | money, frequency, scenarios |
| Mortgage payment | external rate + amortizing math | Freddie Mac PMMS weekly averages, YMYL labeling |
| Home affordability | inverse amortizing math + take-home bands | Comfortable / stretch / risky on net pay, stress cases |
| Inflation / buying power | external time series | BLS CPI-U NSA monthly index since 1913 |
| Electricity cost by state | external data + location | versioned EIA snapshots, geography |
| Concrete estimator | uncertain estimate | ranges, waste, material units |
| EV vs. gas energy cost | comparison | shared energy/location data, scenarios |
| Road-trip fuel cost | external price + quantity | EIA weekly gasoline geographies, manual override |
| Appliance electricity cost | reusable energy engine | watts to kWh, weekly usage pattern, EIA state rate or manual |
| Car affordability | composed engines + decision | Finance, Tax and Energy in one screen; take-home bands; forward and inverse |
| Business-days calculator | date utility | calendars, federal holidays |
| Unit-price comparator | shopping comparison | normalized units, ranked options |
| Recipe scaler | food/unit utility | rational quantities, ingredient units |

The release now includes a mortgage payment estimator, a home-affordability planning screen, and a CPI-U inflation calculator. Housing tools are labeled as estimates: rates are a national weekly average, not a lender quote, and affordability bands use take-home pay rather than the classic gross-pay 28/36 rule. After-tax pay, ZIP-level gas prices, local contractor-price pages, and occupation × state salary pages remain deferred.

## Decision record

### Application and deployment

**Chosen:** a TypeScript modular monolith using the App Router programming model, Vinext/Vite, React server components by default, small client islands for interactive forms, and Cloudflare-compatible ESM output.

**Alternatives considered:** conventional Next.js on Vercel, Astro, and separate frontend/API services.

**Why:** the generated Sites/Cloudflare deployment surface provides global delivery and a simple release path while preserving the familiar Next App Router model. A modular monolith keeps calculations, content, and rendering in one typed codebase. Microservices add coordination and failure modes without solving a current constraint.

**Known risk:** Vinext is beta. Framework-specific code is kept at the route/composition edge; calculation engines, schemas, registries, datasets, and tests stay framework-neutral. A migration to conventional Next.js should not require rewriting domain logic.

### Runtime data model

**Chosen:** immutable, versioned, checked-in normalized snapshots for milestone 1. Government APIs are called by ingestion scripts, never during a user request.

**Alternative considered:** runtime API calls or a database-backed cache.

**Why:** static snapshots give fast pages, deterministic results, no API-key exposure, reproducible calculations, and fail-closed behavior. D1 is deferred until historical snapshots, editorial workflow, or Search Console imports justify persistence.

The publication flow is:

`fetch → retain raw response → validate → normalize → semantic checks → diff → candidate manifest → atomic promotion`

Only the promoted manifest is imported by application code. A rejected update leaves the last verified snapshot live.

### Tool contract

Every tool is represented by two layers:

1. A registry entry: identity, intent, category, route, description, search aliases, relationships, freshness and indexability metadata.
2. A domain engine: runtime input schema, pure calculation, versioned output, explanation steps and assumptions.

Interactive React components own formatting and input state only. They may call domain functions but may not contain business formulas or source data.

```ts
type ToolDefinition = {
  id: string;
  slug: string;
  category: Category;
  engine: string;
  searchTerms: string[];
  relationships: ToolRelationship[];
  seo: IndexabilityEvidence;
};

type CalculationResult<T> = {
  value: T;
  calculationVersion: string;
  datasetSnapshotIds: string[];
  breakdown: BreakdownStep[];
  assumptions: string[];
};
```

### Vehicle ownership layer

**Chosen:** `lib/calculations/vehicle/` composes the existing engines instead of adding vehicle math of its own. It has four small parts: `financing.ts` turns price, taxes and fees, down payment and trade-in into an amount financed and hands it to the Finance Engine; `operating.ts` prices driving energy through the Energy Engine (gasoline or EV battery and charging loss) and adds insurance, upkeep and registration; `ownership.ts` composes those into a monthly and yearly cash cost; `affordability.ts` holds the take-home thresholds, the verdict, and the inverse that turns a budget back into a sticker price.

**Alternatives considered:** a standalone auto-loan calculator, and a generic "asset ownership" framework covering vehicles, homes and equipment.

**Why:** the interesting product question is the whole monthly cost against take-home pay, not the payment. Every number it needs already existed — amortization, fuel, battery and wall energy, period normalization, take-home estimation — so the layer is composition, not new formulas. A generic ownership framework would have to abstract over cost structures that do not actually match; housing already has its own screen with its own thresholds.

**Known limits:** there is no vehicle-price, insurance or depreciation provider, so price, insurance and upkeep are user inputs and resale value is out of the model. The result is cash out of pocket, not total cost of ownership. Affordability bands are a documented product assumption (`VEHICLE_AFFORDABILITY_BANDS`), centralized in the rules layer and never inlined in a component.

### Location

Milestone 1 uses canonical two-letter state codes and a single typed state registry. Tools receive a state code, then resolve data by snapshot and geography. ZIP, county and city are future adapters over the same location identity rather than fields copied into each calculator.

### Search and discovery

Milestone 1 uses a build-time search index generated from the tool registry. It supports names, aliases, category and natural-language intent. This is faster and cheaper than a hosted search service at the current corpus size. The search interface can move to a worker/database index when measured corpus size or analytics shows a need.

### SEO and indexability

Routes are human-readable and category-owned, for example `/money/hourly-to-salary` and `/home/electricity-cost`. Tool state, filters, sorting and arbitrary combinations are never indexable URLs.

Generated families begin `noindex` and may enter sitemaps only when all hard gates pass:

- real distinct data or functionality;
- validated provenance and visible freshness;
- meaningful result, method, assumptions and limitations;
- no name-only location/occupation substitution;
- self-canonical 200 page with crawlable inbound links;
- reviewed YMYL/safety claims where relevant.

The quality score is 100 points: search-intent evidence 20, unique data/function 25, answer depth 15, provenance/freshness 15, internal-link value 10, mobile/performance 10, maintainability 5. Indexing requires 75+, including at least 15/25 uniqueness and 10/15 provenance.

Sitemaps are split by family once volume requires it. Structured data is limited to valid `WebSite`, `WebApplication`, `BreadcrumbList`, `Article` and `Dataset` cases; no FAQ markup is added merely for visibility.

### Internal links

The registry stores typed edges: `uses-engine`, `uses-dataset`, `sibling`, `next-decision` and `methodology`. Each tool page renders breadcrumbs, its hub, relevant siblings, next decisions and source/method links. This creates a crawlable entity graph without hand-maintaining page-level link lists.

### Advertising and analytics

Ad placements are named, reusable slots with reserved space: `after-result`, `in-content`, and `desktop-rail`. They are empty in milestone 1. No slot sits between an input and its result.

Analytics uses a provider-neutral event boundary. Allowed events are `tool_opened`, `calculation_started`, `calculation_completed`, `result_interaction`, `search`, `related_tool_click` and `share`. Raw financial amounts, dates, ZIP codes and free-text queries are not sent by default.

### Security and privacy

All inputs are validated at runtime and bounded before calculation. There is no dynamic evaluation, account system or public mutation endpoint. Ingestion credentials exist only in the update environment and are removed from stored source URLs. Client analytics payloads use allowlisted fields.

## Data provenance

Every external snapshot records provider, dataset/series, observation range, source status, fetched/verified/published timestamps, adapter/schema versions, validation status, source URL without secrets, attribution, and raw/normalized hashes where available. Calculation results retain `snapshotId` and `calculationVersion`.

Milestone 1 uses EIA monthly residential electricity prices by state, EIA weekly regular gasoline, BLS grocery averages, BLS CPI-U, and Freddie Mac PMMS weekly mortgage rates. Each is labeled as a published average—not a personal quote—and exposes a manual override where that is the honest next step. Abnormal, incomplete, duplicate, unit-changed or historically rewritten candidates are quarantined.

## Testing strategy

- Unit tests cover every pure engine, boundary values and invariants.
- Schema tests cover missing, malformed, non-finite and out-of-range input.
- Regression fixtures pin representative results and calculation versions.
- Adapter tests use recorded official responses and golden normalized snapshots; CI is offline.
- Route smoke tests verify critical pages, metadata, robots and sitemaps.
- Production build and lint/type checking are release gates.

## Scale checks

- **500 tools:** registry entries and domain engines remain independent; category and relation indexes are derived at build time.
- **100,000 URLs:** sitemap families paginate at 50,000 URLs; indexability evidence is computed before URL publication.
- **External outage:** request paths never depend on provider uptime; last promoted snapshot survives.
- **Dataset revision:** snapshot identity and calculation version keep results auditable.
- **Large client bundle:** pages render content on the server; only one calculator island hydrates per tool page.

