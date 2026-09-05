# CostAnswer architecture

Status: accepted for milestone 1 · 2026-09-01

## Product boundary

CostAnswer is an answer-engine platform, not a calculator directory. The live catalog covers Money, Home, Car, Everyday, Food, and Shopping:

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

One dataset departs from this in what it commits. The BLS OEWS normalized snapshot is 12 MB — larger than the application — so the repository holds the archives BLS served, a receipt fixing their digests, a manifest carrying the normalized hash, and two derived files the application imports: a 541 KB index of occupations and coverage, and 3.4 MB of wage columns packed as integers. `npm run data:oews:rebuild` regenerates the snapshot from the committed archives and refuses to write one that does not hash to the promoted value, so the uncommitted file stays auditable and CI proves it on every run. The packing is lossless by construction — OEWS publishes annual wages in whole tens of dollars and hourly wages in whole cents — and `verifyOewsWagesRoundTrip` proves it value by value before anything is written. Deriving hourly wages from annual ones was measured and rejected: BLS rounds the two independently, so a recomputed hourly wage differs by a cent on 12% of values.

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

**Alternatives considered:** a standalone car-loan calculator, and a generic "asset ownership" framework covering vehicles, homes and equipment.

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

Sitemaps are split by family once volume requires it. Structured data is limited to valid `WebSite`, `WebApplication`, `BreadcrumbList`, `Article` and `Dataset` cases. `FAQPage` markup is added only when the same questions are visible on the page (site FAQ, and each tool’s editorial FAQ).

Long-tail queries (loan type + year, “$400,000 30-year payment”) belong in tool `searchTerms`, optional `metaTitle` / `metaDescription`, and a `longTail` section inside `lib/tool-content/`. They do not become generated URL families. FHA-limit-by-county pages remain deferred until they have distinct data, not a name swap.

### Generated page families

**Chosen:** a family owns its own routes, its own gate and its own publication schedule, separate from the tool registry. The first is salary (`lib/salary-pages.ts`, `app/salary/`).

**Why the registry could not absorb it:** a tool is one page someone built and scored by hand on seven criteria. That is the right instrument for fifty tools and the wrong one for 34,250 pages. A family instead derives its pages from the data: a page exists where BLS published a detailed occupation with both an employment count and a wage, and nowhere else (`isPageWorthyEstimate`). Suppressed estimates produce no URL rather than a thin one, which is the same hard gate the registry applies, enforced by the data instead of by review.

**Levels and publication:** `SALARY_PUBLICATION` records how far the family has been opened. Every level is currently open — the hub, the state index, 51 state hubs, 761 occupation pages and 30,807 occupation-in-state pages, 31,621 URLs across four `sitemaps/salary` files. That is the site owner's decision, taken over the recommendation to open the leaves only after the levels above them had been measured; publishing a corpus this size from a domain with no history is the profile most likely to be crawled slowly or left largely unindexed. The gate is kept because it makes the decision reversible: setting `occupationInState` back to `staged` withdraws those URLs from the sitemap and marks them `noindex` in one edit, without touching a route or a template.

The salary family pages at 10,000 URLs per sitemap file rather than the protocol's 50,000. One file holding the whole family is about six megabytes the Worker rebuilds on every cache miss, and one file a crawler must re-fetch whole whenever any page in it changes.

**Distinctness:** each page composes OEWS wages with the state tax engine (take-home on the median), BEA regional price parities (what the wage buys at national prices), ACS median household income, and the occupation's location quotient. Every one of those varies by state, so the pages differ by data rather than by a substituted place name — which is what the indexability rule above actually asks for.

**Naming.** OEWS titles are classification labels: "Heavy and Tractor-Trailer Truck Drivers", "Secretaries and Administrative Assistants, Except Legal, Medical, and Executive". They are correct and nobody searches them. Three layers separate what was measured from what a page is called:

- The snapshot derives a `displayTitle` by cutting the ", Except …" clause and a trailing ", All Other" — bookkeeping that keeps categories from overlapping, not meaning. Compound titles that genuinely name several jobs are left whole, because shortening them would name a narrower job than the one surveyed.
- `lib/salary-content.ts` holds hand-written singular, plural and alias names for the occupations most people work in — about 130 entries covering three quarters of measured employment. They are written, not derived: a rule that turns "Waiters and Waitresses" into "Waitress" is worse than no rule. Anything uncurated falls back to the official title.
- `lib/salary-pages.ts` builds the URL from the curated name where one exists, so the address reads `/salary/hvac-technician` rather than `/salary/heating-air-conditioning-and-refrigeration-mechanics-and-installers`. The family owns addresses; the ingest must not reach up into editorial to describe itself.

The official title always appears on the page beside the figure, so the heading can read naturally without the citation losing what BLS actually measured.

**Residual categories.** OEWS closes each group with an "All Other" bucket so its totals add up. Those carry real figures and get no page — 69 occupations and 2,562 combinations that would never have answered a search. `isPageWorthyEstimate` is where that is enforced, next to the suppression check.

**Questions and structured data.** Every page carries five or six questions in the wording people type, each answered from a different figure the page already shows — the wage, the tax computed on it, the national comparison, the local price level, the distribution, the employment count. `FAQPage` markup is added only because those questions are visible text; `Occupation` markup states the salary distribution in the vocabulary schema.org built for it. Neither restates the other.

**Rendering:** these pages have no inputs, so they are server components that ship no client JavaScript. Occupation-in-state responses carry `s-maxage=86400, stale-while-revalidate=604800`; the figures change once a year.

**Inbound links.** A family reached only from a sitemap is a family of orphans. The footer carries the hub, the state index and six occupations on every page in the site; the header carries the hub in primary navigation; the home page and the money hub each open onto it; and site search matches occupation names and aliases, so "RN" finds the registered nurse page. Inside the family, every occupation page links its states and every state page links its occupations, so the tables are also the link graph.

### Editorial depth on tool pages

Every tool has a `ToolEditorial` record in `lib/tool-content/`, keyed by tool id. `ToolPage` renders `CalculatorEditorial` (guide, FAQ, glossary, tips/caveats) under the calculator. Adding a tool requires a unique editorial entry or the registry assert fails.

### Advertising and analytics

Ad placements are named, reusable slots with reserved IAB space: `header-leaderboard` (~728×90, after the H1, desktop only), `desktop-rail` (~300×250 empty / 300×600 when advertising is on), and `in-content` (between the calculator and the guide). Empty slots are quiet reserved height with an `aria-label` — no hatched “fake ad” chrome. Below 921px, empty slots hide. A reserved in-content 300×250 may remain on larger phones. A reserved rail hides below 681px so the calculator stays first. No slot sits between an input and its result.

Affiliate / lead-gen cards render only when affiliates are enabled and a real `https` partner URL exists (`lib/affiliates.ts`). FTC disclosure is shown only in that live state. Example names in `AFFILIATE_PARTNERS` are placeholders, not tracking IDs. Offers are labeled advertising and are never the calculator’s answer.

Analytics uses a provider-neutral event boundary. Allowed events are `tool_opened`, `calculation_started`, `calculation_completed`, `result_interaction`, `search`, `related_tool_click` and `share`. Raw financial amounts, dates, ZIP codes and free-text queries are not sent by default.

### Internal links

The registry stores typed edges: `uses-engine`, `uses-dataset`, `sibling`, `next-decision` and `methodology`. Each tool page renders breadcrumbs, its hub, relevant siblings, next decisions and source/method links. This creates a crawlable entity graph without hand-maintaining page-level link lists.

### Security and privacy

All inputs are validated at runtime and bounded before calculation. There is no dynamic evaluation, account system or public mutation endpoint. Ingestion credentials exist only in the update environment and are removed from stored source URLs. Client analytics payloads use allowlisted fields.

## Data provenance

Every external snapshot records provider, dataset/series, observation range, source status, fetched/verified/published timestamps, adapter/schema versions, validation status, source URL without secrets, attribution, and raw/normalized hashes where available. Calculation results retain `snapshotId` and `calculationVersion`.

Milestone 1 uses EIA monthly residential electricity prices by state, EIA weekly regular gasoline, BLS grocery averages, BLS CPI-U, BLS OEWS occupation wages, and Freddie Mac PMMS weekly mortgage rates. Each is labeled as a published average—not a personal quote—and exposes a manual override where that is the honest next step. Abnormal, incomplete, duplicate, unit-changed or historically rewritten candidates are quarantined.

## Testing strategy

- Unit tests cover every pure engine, boundary values and invariants.
- Schema tests cover missing, malformed, non-finite and out-of-range input.
- Regression fixtures pin representative results and calculation versions.
- Adapter tests use recorded official responses and golden normalized snapshots; CI is offline.
- Route smoke tests verify critical pages, metadata, robots and sitemaps.
- Production build and lint/type checking are release gates.

## Scale checks

- **500 tools:** registry entries and domain engines remain independent; category and relation indexes are derived at build time.
- **100,000 URLs:** sitemap families paginate at 50,000 URLs; indexability evidence is computed before URL publication. The salary family adds 31,620 URLs against a measured 2.55 MB gzipped Worker bundle, of which its packed wage columns are 1.16 MB.
- **External outage:** request paths never depend on provider uptime; last promoted snapshot survives.
- **Dataset revision:** snapshot identity and calculation version keep results auditable.
- **Large client bundle:** pages render content on the server; only one calculator island hydrates per tool page.

