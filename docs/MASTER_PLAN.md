# CostAnswer master plan

Status: **v2, reconciled against HEAD** · drafted 2026-09-06 · revised 2026-09-06
owner: site owner · executor: coding agents

> **Read this first.** v1's audit described the repository *before* the
> monetization layer existed. Handing that version to an agent risked it
> reverting work that is now shipped. This version is reconciled against the
> current HEAD (`14e4d0e`), and §A.0 lists what must be preserved.

This plan is written to be executed sequentially by coding agents. Each phase
states its goal, the files it touches, the work, its data dependencies, its
tests, objective acceptance criteria, its risks and its rollback. Nothing in it
is a new product idea; where it differs from the brief it says so explicitly and
gives the measurement that forced the change.

Read `docs/ARCHITECTURE.md` first. It is accurate and still governs. This plan
extends it; it does not replace it.

---

## 0. Three corrections to the brief, up front

**0.1 There are 58 calculators, not ~53.** `lib/tool-registry.ts` holds 58
entries. The catalog therefore needs **43** more to reach 101, not 48. The
proposed 48-item list in the brief contains five tools that duplicate intent
with something already shipped or with each other; §C removes exactly those five
and the arithmetic lands on 101 without adding filler.

**0.2 The 10-day window does not hold all of the frozen scope.** Summed at the
phase level below, the frozen scope is roughly 30 engineer-days of work. Ten
calendar days with three parallel lanes is 30 lane-days with zero slack, zero
rework and no verification time. Section L therefore draws an explicit cut line:
what ships on day 10, and what ships in waves 2–4 on dated commitments. The two
items moved out of the launch window are the **Medical Cost pilot** and **full
ES-US parity**; §L.4 gives the reasoning and the alternative if the owner
disagrees. Nothing is dropped — everything in the brief has a phase and a date.

**0.3 The single largest correctness defect is the state tax engine, and it
poisons the largest page family.** `data/tax/2026.json` marks 37 of 51
jurisdictions `unsupported`. Nine of the 14 "supported" rows are no-income-tax
states, so exactly **five** states have a real 2026 wage schedule: CA, IL, MA,
NJ, PA. Every one of the 30,807 `/salary/:occupation/:state` pages sells
take-home pay as a headline figure, and on ~72% of them that figure silently
omits state income tax. New York, Ohio, Georgia, North Carolina, Virginia,
Michigan, Maryland, Minnesota, Colorado, Arizona are all in the omitted set.
This is fixed before launch or the salary corpus does not go to search.

---

## A. Current state audit

### A.0 Already built — preserve, do not re-plan

Three commits after v1 was written, the monetization layer is real. It is
**existing architecture**, not future work, and no phase below may remove or
rebuild it.

| Shipped | Where |
| --- | --- |
| Calculation/monetization boundary, enforced three ways | `lib/monetization/boundary.ts`, `tests/monetization-boundary.spec.ts` |
| Per-page eligibility policy (data, not inference) | `lib/monetization/policy.ts` |
| Feature flags: env floor + stored kill switches | `lib/monetization/flags.ts` |
| Lead engine: coverage → consent → routing → delivery | `lib/monetization/leads/` |
| Versioned consent, hashed as rendered, both locales | `lib/monetization/consent/` |
| Affiliate engine: relevance scored apart from commerce | `lib/monetization/affiliate/` |
| Advertising provider abstraction, slots, consent gating | `lib/monetization/ads/` |
| Pay-per-call model and persistence | `lib/monetization/calls/`, `call_campaigns` |
| Revenue ledger, five statuses, signed reversals | `lib/monetization/revenue/` |
| First-party attribution, no cookie | `lib/monetization/attribution/` |
| **19 D1 tables**, two migrations | `lib/monetization/store/migrations/` |
| 10 API routes incl. admin, webhooks, drain | `app/api/monetization/`, `app/api/marketplace/` |
| 16 commercial components | `components/monetization/` |
| Admin dashboard + privacy tooling | `app/admin/monetization/`, `lib/monetization/admin/` |
| Disclosure page, Do Not Sell control | `app/disclosure/`, `components/monetization/PrivacyChoices.tsx` |

**54 TypeScript modules under `lib/monetization/`.** Every external provider is
disabled; the infrastructure is not.

**The sentence v1 got wrong.** It said affiliate and lead-gen "stay unbuilt
until traffic justifies them". Correct statement:

> Affiliate and lead-generation infrastructure is already implemented and must
> be preserved. External providers remain disabled until approval, credentials,
> current provider documentation and compliance review are all satisfied.
> **Launch does not depend on activating any provider.**

### A.1 What exists and works

| Area | State | Evidence |
| --- | --- | --- |
| Application shell | Solid | Vinext/Vite + React Server Components, Cloudflare Worker output, `npm run build` green |
| Tool registry contract | Solid | 58 typed entries, indexability evidence, typed relationship edges, cluster graph |
| Calculation engines | Solid | 44 modules under `lib/calculations/`, pure, versioned, `CalculationResult<T>` with `breakdown`/`assumptions`/`datasetSnapshotIds` |
| Numeric quality | Solid | `finance/loan.ts` uses `log1p`/`expm1` for rate stability; OEWS packing proved lossless value-by-value |
| Data provenance | Strong | 16 datasets under `lib/data/`, envelope with provider/period/hashes/validation, atomic promotion, quarantine on suspicious revision |
| Freshness model | Strong design | `lib/data/freshness.ts` models each provider's own release calendar; `current` / `update-due` / `stale` is the right three-state answer |
| Salary family | Shipped | 761 occupations, 51 state hubs, 30,807 leaves, 31,621 sitemap URLs, curated naming layer, residual buckets suppressed |
| Editorial depth | Shipped | Every tool has guide + FAQ + glossary + tips + caveats; registry asserts coverage |
| Calculation Receipt | Shipped (unnamed) | `ResultDetails` renders "How we got this" / "What we assumed" / method version + snapshot ids |
| SEO plumbing | Shipped | Self-canonicals, sitemap index + family partitioning, JSON-LD (`WebApplication`, `Article`, `BreadcrumbList`, `FAQPage`, `Occupation`, `Dataset`), robots |
| Tests | Good | 36 spec files, 683 unit tests, all green; Playwright journey suites for tools and monetization |
| Security headers | Shipped | CSP, HSTS, COOP, frame-deny, permissions-policy in `next.config.ts` |

**Measured at HEAD (`14e4d0e` + P1) on Node 22.23.1:**

| | v1 audit | Now |
| --- | --- | --- |
| Registry tools | 58 | 58 |
| Unit tests | 496 | **683**, 36 files |
| Browser tests | 34 (6 failing) | **42 (3 failing, all pre-existing)** |
| Lint | 2 errors, 14 warnings | **0 errors**, 14 warnings |
| Typecheck | 538s | **8s** |
| Largest client chunk | 3.84 MB | **186 KB** |
| Worker, gzipped | 2.35 MB | 2.26 MB |
| Supported state tax schedules | 14/51 | 14/51 — **still P2** |
| Salary URLs indexable | 31,621 | **813** (leaves staged) |

### A.2 What is incomplete

| Gap | Detail | Blocks |
| --- | --- | --- |
| **State tax coverage** | 37/51 unsupported; only CA/IL/MA/NJ/PA have real schedules | Salary corpus, paycheck, salary-after-tax, cost-of-living, every new tax tool |
| **Tax schema expressiveness** | `lib/data/tax/schema.ts` supports `none`/`flat`/`flatWithSurtax`/`progressive` only. It cannot express exemption *credits*, federal-tax deductibility (AL, LA, MO, MT, OR), local/municipal tax (OH, MD, PA-EIT, NY-NYC, MI, IN, KY), or percentage-of-income standard deductions | Completing the 37 states |
| **Localization** | Zero. `app/layout.tsx` hardcodes `<html lang="en">`. No `/es/`, no `hreflang`, no `alternates` | The entire ES-US half of the product |
| **Content engine** | No `/guides` surface exists. Per-tool editorial in `lib/tool-content/` is the only long-form content | Content Engine, event-driven content |
| **Job Cost Engine** | Does not exist. No recipe model, no labor/material/equipment data, no route | The vertical the brief calls major |
| **Medical Cost Engine** | Does not exist. `lib/calculations/medicare.ts` is a Medicare *premium* calculator, not hospital pricing | Medical vertical |
| **Analytics sink** | `lib/analytics.ts` is a provider-neutral local `CustomEvent` bus with no destination, and `analyticsEnabled` is off | All launch KPIs |
| **Search Console / Bing** | Not connected. `docs/ROADMAP.md` names this "the gate on everything below" and it is still open | Indexation measurement, the staging decision |
| **Missing analytics events** | Registry lacks `advanced_opened`, `compare_used`, `reverse_used`, `quote_checked`, `source_clicked`, `guide_to_calculator`, `language_switched` | KPI reporting |
| **Basic/Advanced pattern** | Not standardized. Eight components hand-roll `<details>`; `CalculatorUI.tsx` exports no advanced-section primitive | The §4 calculator standard applied consistently across 101 tools |
| **Scenario compare / reverse solve / confidence** | Ad hoc where present (`home-affordability` has an inverse; `concrete` has ranges). No shared contract | §4 depth promise |
| **GSA per diem refresh** | Policy says `refreshMode: 'scheduled'` but the script is in neither `scripts/refresh-snapshots.ts` nor `scripts/ingest-location-official.ts`. It never refreshes | FY2027 per diem (effective 2026-10-01) |
| **GSA published-vs-effective** | HUD does this correctly via `data/hud-fmr/releases.json`. GSA has a single snapshot and derives `publishedAt` as `${fy-1}-10-01`, which is wrong twice over: GSA announces a fiscal year and publishes its dataset on two different earlier dates | Per diem correctness across the 1 Oct boundary |
| **Freshness enforcement** | `evaluateFreshness` is computed and displayed but no CI gate fails on `stale`, and nothing alerts on a missed release | Data-freshness SLA |
| **Frozen freshness clock** | `evaluateFreshness(..., asOf = PUBLISHING_SNAPSHOT_DATE)`. A deployed build that is never rebuilt keeps claiming `current` forever | Freshness honesty between deploys |
| **Custom domain** | Not deployed. `.openai/hosting.json` has `d1: null, r2: null`; `.wrangler/deploy/config.json` points at a local build | Launch |

### A.3 Architectural debt — ranked

1. **A 3.84 MB client chunk on two YMYL pages.** `components/calculators/HealthInsuranceCalculator.tsx:11` and
   `components/calculators/MarketplacePlansCalculator.tsx:12` import
   `@/lib/data/cms-marketplace-snapshot` from a `'use client'` module. The build
   emits `dist/client/_next/static/chunks/cms-marketplace-snapshot-D1lfB0p4.js`
   at **3,842,883 bytes raw / 425,580 bytes gzipped**, lazily fetched whenever
   either island hydrates. This is 2,055 counties of premium columns shipped to
   a phone. It directly contradicts the rule the OEWS module states about itself
   ("the wage columns never leave the server"). **Launch blocker.**
2. **Two lint errors fail `npm run verify`.** `components/calculators/CalculatorUI.tsx:199`
   and `components/calculators/CostOfLivingCalculator.tsx:85` trip
   `react-hooks/set-state-in-effect`. `verify` chains lint, so the repo's own
   release gate is currently red even though CI (`verify.yml`) does not run lint
   and therefore passes. CI and the documented gate disagree.
3. **Three iCloud conflict copies are committed:** `lib/plural 2.ts`,
   `lib/data/verify 2.ts`, `lib/calculations/col/coverage 2.ts`. Unimported, but
   `verify 2.ts` is a *stale* copy of the dataset verifier missing eight
   snapshots — exactly the file someone would edit by mistake.
4. **Worker bundle headroom.** Measured **2.35 MB gzipped**. Cloudflare's free
   Worker ceiling is 3 MB gzipped and the paid ceiling is 10 MB. The Job Engine
   material basket, recipes and any medical data cannot be bundled the way OEWS
   and CMS were. A storage decision is required before the Job Engine ships
   data, not after.
5. **Edge caching is incomplete.** `next.config.ts` sets
   `s-maxage=86400, stale-while-revalidate=604800` on `/salary/:occupation/:state`
   only. `/salary/:occupation` (761 pages) and `/salary/states/:state` (51) are
   dynamic with no cache header, so the Worker executes on every hit for pages
   whose figures change once a year.
6. **Playwright cannot run in CI.** `playwright.config.ts` hardcodes
   `PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` in `webServer.command`,
   and `verify.yml` never invokes `test:e2e`. The browser suite is local-only.
7. **No property-based tests and no money primitive.** No `fast-check`, no
   integer-cents type. The finance math is careful, but nothing proves invariants
   (a payment schedule always amortizes to zero; extra payments never lengthen a
   term) across generated inputs.
8. **`components/calculators/` is flat and getting crowded** — 52 files today,
   ~95 after the 43 new tools. Needs subfolders by cluster before, not after.

### A.4 Blockers to launch, in order

| # | Blocker | Phase | Status |
| --- | --- | --- | --- |
| B1 | CMS snapshot in the client bundle | P1 | **closed** |
| B2 | 37 states have no income tax schedule | P2 | open — the launch blocker |
| B3 | No production deployment on a custom domain | P1 | open — needs credentials |
| B4 | No analytics sink, no Search Console, no Bing | P9 | open |
| B5 | `verify` red (lint), CI green — the gates disagree | P1 | **closed** |
| B6 | Mortgage rate `update-due`; cron is Tuesday for a Thursday release | P3 | open |
| B7 | 30,807 leaf URLs with a federal-only take-home, published at once | P2 / P9 | **staged** — reopens only after B2 |
| B8 | Nine-minute typecheck, so the release gate gets skipped | P1 | **closed** (538s → 8s) |

---

## B. Final product architecture

No rewrite. The existing boundaries are correct; four things are added and one
is corrected.

```
                        ┌──────────────────────────────────┐
                        │  Presentation (app/, components/) │
                        │  RSC by default · one client      │
                        │  island per interactive tool      │
                        │  en-US  ·  es-US  (P6)            │
                        └───────────────┬──────────────────┘
                                        │
   ┌───────────────┬────────────────────┼───────────────────┬────────────────┐
   │               │                    │                   │                │
┌──┴──────────┐ ┌──┴─────────────┐ ┌────┴────────┐ ┌────────┴─────┐ ┌────────┴────────┐
│ Calculation │ │ Salary/Location│ │  Job Cost   │ │  Content     │ │ Medical Cost    │
│ Engine      │ │ Engine         │ │  Engine     │ │  Engine      │ │ Engine (wave 2) │
│ lib/calcu-  │ │ lib/salary-*   │ │ lib/job/    │ │ lib/content/ │ │ lib/medical/    │
│ lations/    │ │ lib/location/  │ │  (P7)       │ │  (P8)        │ │                 │
└──────┬──────┘ └───────┬────────┘ └──────┬──────┘ └──────┬───────┘ └────────┬────────┘
       └────────────────┴─────────┬───────┴───────────────┴──────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │  Data Engine  lib/data/    │
                    │  envelope · policy ·       │
                    │  freshness · verify        │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        │  Storage tiers (NEW — see B.3)                      │
        │  1 bundled JSON   2 Worker static assets   3 KV     │
        └─────────────────────────────────────────────────────┘
```

### B.1 What stays exactly as it is

- Modular monolith, framework-neutral domain layer, RSC-first rendering.
- Ingest-time-only provider calls; request paths read promoted snapshots.
- Registry-gated tools; data-gated generated families.
- `CalculationResult<T>` as the universal engine return.

### B.2 What is added

| Addition | Where | Why |
| --- | --- | --- |
| **Storage tiering** | `lib/data/store/` | The bundle cannot hold Job + Medical data (A.3-4) |
| **Locale layer** | `lib/i18n/`, `app/es/` | ES-US is half the product |
| **Content family** | `lib/content/`, `app/guides/` | Guides are a family like salary, not registry tools |
| **Job engine** | `lib/job/` | New vertical |
| **Medical engine** | `lib/medical/` | New vertical (wave 2) |
| **Shared depth primitives** | `components/calculators/CalculatorUI.tsx` | `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceBadge`, `CalculationReceipt` — so §4 is a contract, not 101 hand-rolled variants |

### B.3 Storage tiering — reference data and transactional data are different problems

**Chosen:** split by what the data *is*, not by how big it is.

```text
REFERENCE / CALCULATOR DATA        TRANSACTIONAL MONETIZATION DATA
immutable, versioned, read-only    mutable, PII-bearing, queried, audited
        │                                        │
        ▼                                        ▼
  bundled JSON  +  Worker static assets        D1  (MONETIZATION_DB)
```

v1 said "CostAnswer does not use D1" and called it overengineering. Half of
that was right and it is worth keeping the right half:

- **D1 is unnecessary for calculator and reference datasets.** A mortgage rate,
  a wage table, a per diem schedule — these are immutable snapshots with a hash
  and a manifest. Putting them in a database adds a failure mode and removes an
  audit trail. That decision stands.
- **D1 is necessary for monetization.** A consent record is mutable,
  transactional, PII-bearing, queried four different ways, and legally required
  to be retrievable years later. It is already implemented against
  `MONETIZATION_DB`, an optional binding whose absence disables lead capture and
  leaves every calculator untouched.

| Tier | Mechanism | Holds |
| --- | --- | --- |
| 1 | Bundled JSON | tax, IRS limits, geography, RPP, ACS, CPI, EIA, PMMS, NAIC, ACA, Medicare, OEWS index, job recipes, locale strings |
| 2 | Worker static assets | OEWS wage columns, CMS premium columns, job labor/material tables, medical procedure tables |
| 3 | D1 (`MONETIZATION_DB`) | leads, consent, deliveries, provider events, revenue, campaigns, suppression, audit — **19 tables, shipped** |

**Why tier 2 for the large reference tables.** Cloudflare serves static asset
requests separately from Worker invocations, with a 25 MiB per-file ceiling and
tens of thousands of files per version. Packed wage and premium columns belong
there rather than inside the Worker's JavaScript.

**On the Worker size budget.** v1 justified a 2.8 MB gzipped budget as a
platform ceiling. That justification was wrong — Cloudflare's own Worker size
limit is far above it. The budget stays, with the honest reason:

> 2.8 MB gzipped is **our** budget, not the platform's. It protects cold-start
> and deploy time, and it is the thing that stops a dataset drifting into the
> bundle. A budget set at the platform limit never fires, and the failure it
> would have caught arrives on somebody's phone instead.

Enforced by `scripts/check-bundle-budget.mjs` in CI, alongside a 200 KB
per-chunk client budget.

### B.4 Deployment

**Chosen:** Cloudflare Workers via `wrangler deploy`, custom domain
`costanswer.com` bound as a Worker route. Vercel output emission
(`scripts/emit-vercel-output.mjs`, `vercel.json`) stays as an escape hatch and
is not the launch path.

**Why:** the build already emits `dist/server/wrangler.json`; the salary family's
`s-maxage`/`stale-while-revalidate` strategy is written for Cloudflare's cache;
static assets (tier 2) are a Workers primitive. Two hosts at launch is two sets
of cache semantics to reason about.

---

## C. The exact 101-calculator inventory

### C.1 Removed from the brief's 48-item list, with reasons

| Removed | Reason |
| --- | --- |
| **Personal Loan** | `/money/loan` already is this calculator. Adding it creates two pages competing for the same intent. Instead, `loan` gains personal-loan `searchTerms` and a `longTail` section. |
| **Credit Card Minimum Payment** | `/money/credit-card-payoff` already computes the minimum-payment trajectory and shows it against a fixed payment. A separate page is the same math with one output hidden. Becomes a *mode* inside the existing tool. |
| **APR (generic)** | Overlaps Mortgage APR (kept — it is the version with real fee inputs) and the loan calculator. A standalone "APR calculator" with no fee model is a thin page. |
| **Traditional IRA** | Three IRA pages (`roth-ira` shipped, `Roth vs Traditional`, `Traditional`) is duplicate intent. `roth-ira` covers growth; `roth-vs-traditional` covers the choice. |
| **LTV** | One division. Folded into **Down Payment** and **PMI**, both of which already have to compute and display LTV. |

48 − 5 = **43 new tools.** 58 + 43 = **101.** Exactly.

### C.2 The 43 new tools

Slugs are final. Category assignment follows the existing precedent that finance
lives under `/money` and *decision screens* live in their domain hub.

**Personal finance — 7**

| # | id | path | Engine reuse |
| --- | --- | --- | --- |
| 1 | `savings-goal` | `/money/savings-goal` | `finance/interest` (future value, solve for contribution) |
| 2 | `emergency-fund` | `/money/emergency-fund` | `tax/annual` take-home + new expense model |
| 3 | `budget` | `/money/budget` | `tax/paycheck` + new allocation model |
| 4 | `net-worth` | `/money/net-worth` | new (pure aggregation + trajectory) |
| 5 | `debt-to-income` | `/money/debt-to-income` | `finance/loan` payments |
| 6 | `credit-utilization` | `/money/credit-utilization` | new (pure ratio + scoring bands) |
| 7 | `dividend` | `/money/dividend` | `finance/interest` (reinvestment) |

**Debt and credit — 4**

| # | id | path | Engine reuse |
| --- | --- | --- | --- |
| 8 | `balance-transfer` | `/money/balance-transfer` | `finance/credit-card` + intro-APR phase |
| 9 | `debt-consolidation` | `/money/debt-consolidation` | `finance/debt-payoff` + `finance/loan` |
| 10 | `student-loan` | `/money/student-loan` | `finance/loan` + federal repayment plans |
| 11 | `student-loan-refinance` | `/money/student-loan-refinance` | `refinance` engine, re-parameterized |

**Taxes — 9**

| # | id | path | Data dependency |
| --- | --- | --- | --- |
| 12 | `federal-tax-bracket` | `/money/federal-tax-bracket` | `us-tax` federal brackets (have) |
| 13 | `effective-tax-rate` | `/money/effective-tax-rate` | `us-tax` federal + state (needs P2) |
| 14 | `tax-refund` | `/money/tax-refund` | `us-tax` + withholding (needs Pub 15-T) |
| 15 | `w4-withholding` | `/money/w4-withholding` | **NEW:** IRS Pub 15-T percentage-method tables |
| 16 | `self-employment-tax` | `/money/self-employment-tax` | `us-tax` FICA (have) + 92.35% factor |
| 17 | `quarterly-estimated-tax` | `/money/quarterly-estimated-tax` | `us-tax` + safe-harbor rules + due dates |
| 18 | `capital-gains` | `/money/capital-gains` | **NEW:** 2026 LTCG brackets + NIIT |
| 19 | `eitc` | `/money/eitc` | **NEW:** 2026 EITC tables |
| 20 | `child-tax-credit` | `/money/child-tax-credit` | **NEW:** 2026 CTC/ACTC amounts and phase-outs |

**Retirement — 7**

| # | id | path | Data dependency |
| --- | --- | --- | --- |
| 21 | `roth-vs-traditional` | `/money/roth-vs-traditional-ira` | `us-tax` + `irs-retirement` (have) |
| 22 | `roth-conversion` | `/money/roth-conversion` | `us-tax` brackets |
| 23 | `rmd` | `/money/rmd` | **NEW:** IRS Uniform Lifetime Table (Pub 590-B) |
| 24 | `social-security` | `/money/social-security` | **NEW:** SSA bend points, COLA, early/delayed credits |
| 25 | `fire` | `/money/fire` | `finance/interest` |
| 26 | `hsa` | `/money/hsa` | **NEW:** 2026 HSA/HDHP limits |
| 27 | `investment-fees` | `/money/investment-fees` | `finance/interest` |

**Education savings — 1**

| # | id | path |
| --- | --- | --- |
| 28 | `529` | `/money/529` |

**Mortgage and home finance — 9**

| # | id | path | Data dependency |
| --- | --- | --- | --- |
| 29 | `rent-vs-buy` | `/money/rent-vs-buy` | PMMS + CPI + `tax/annual` |
| 30 | `closing-costs` | `/money/closing-costs` | user input + documented typical ranges |
| 31 | `down-payment` | `/money/down-payment` | PMMS; absorbs LTV |
| 32 | `pmi` | `/money/pmi` | user input + documented ranges; absorbs LTV |
| 33 | `mortgage-apr` | `/money/mortgage-apr` | pure (Newton solve on fee-adjusted cash flows) |
| 34 | `mortgage-points` | `/money/mortgage-points` | PMMS |
| 35 | `arm` | `/money/arm` | **NEW:** SOFR index history |
| 36 | `fha-loan` | `/money/fha-loan` | **NEW:** FHA MIP schedule + FHA loan limits |
| 37 | `va-loan` | `/money/va-loan` | **NEW:** VA funding-fee table |

**Home equity — 2**

| # | id | path |
| --- | --- | --- |
| 38 | `heloc` | `/money/heloc` |
| 39 | `home-equity-loan` | `/money/home-equity-loan` |

**Auto finance — 4**

| # | id | path |
| --- | --- | --- |
| 40 | `auto-lease` | `/money/auto-lease` |
| 41 | `auto-refinance` | `/money/auto-refinance` |
| 42 | `auto-loan-payoff` | `/money/auto-loan-payoff` |
| 43 | `lease-vs-buy` | `/car/lease-vs-buy` |

### C.3 Final category distribution

| Category | Now | New | Final |
| --- | --- | --- | --- |
| money | 26 | 42 | **68** |
| car | 4 | 1 | **5** |
| everyday | 9 | 0 | **9** |
| home | 4 | 0 | **4** |
| health | 5 | 0 | **5** |
| math | 5 | 0 | **5** |
| shopping | 2 | 0 | **2** |
| education | 2 | 0 | **2** |
| food | 1 | 0 | **1** |
| **Total** | **58** | **43** | **101** |

68 tools under one hub is unusable as a flat list. `/topics/money` gains
cluster sub-sections (Pay · Taxes · Debt · Mortgage · Retirement · Auto ·
Insurance) driven by the existing `lib/clusters.ts` — **no new URL segments**, so
no redirects and no churn on shipped pages.

### C.4 Merge candidates, deliberately NOT actioned before launch

`date` vs `days-from-today` overlap heavily, and `interest` vs
`compound-interest` partially. Both pairs are already built, indexed-ready and
high-volume. Removing shipped pages to save a duplicate-intent complaint costs
redirects and link equity for no traffic gain on a domain with no history.
Re-evaluate against Search Console after 90 days.

---

## D. Job Cost Engine plan

### D.1 Position

One engine, many recipes. There is no per-job calculator. Two public entry
points over the same engine:

- `/cost/estimate` — "What should this job cost?"
- `/cost/check-quote` — "Is this quote fair?"

Plus one indexable page per job type: `/cost/:job` (e.g. `/cost/roof-replacement`).
Location pages (`/cost/:job/:state`) are **not** opened at launch — see §J.

### D.2 Data model

`lib/job/types.ts`

```ts
type JobRecipe = {
  jobId: string;                  // 'roof-replacement'
  version: string;                // 'roof-replacement-v1'
  unit: JobUnit;                  // 'roof-square' | 'sq-ft' | 'linear-ft' | 'each' | 'ton'
  trade: TradeId;                 // maps to SOC codes for OEWS labor
  crew: CrewMember[];             // { socCode, count, productivityShare }
  laborHoursPerUnit: number;      // crew-hours per unit
  materials: MaterialLine[];      // { componentId, quantityPerUnit, wastePercent }
  equipment: EquipmentLine[];     // { rateId, hoursPerUnit }
  permit: PermitRule;             // 'none' | { basis: 'flat'|'valuation', ... }
  disposal: DisposalRule;         // { unitsPerJob, ratePerUnit, sourceId }
  modifiers: ModifierSpec[];      // pitch, stories, tear-off layers, access, complexity
  overheadRate: number;           // fraction of direct cost
  profitRate: number;             // fraction of (direct + overhead)
  contingencyRate: number;
  baseConfidence: Confidence;     // 'high' | 'medium' | 'low'
  sources: RecipeSource[];        // every number above cites where it came from
};
```

Every scalar in a recipe carries a `RecipeSource`, and a recipe with an uncited
number fails its own validation test. But "cite everything" collapses the
moment a number has no source to cite — `overheadRate`, `profitRate` and
`contingencyRate` are the obvious cases, and a rule that demands a citation for
them produces a fabricated one. So a source declares which kind it is:

```ts
type RecipeSource =
  | { kind: 'official_data'; provider: string; url: string; retrievedAt: string }
  | { kind: 'published_specification'; publisher: string; document: string; retrievedAt: string }
  | { kind: 'observed_market'; dataset: string; observations: number; window: string }
  | { kind: 'model_assumption';
      rationale: string;          // why this value, in a sentence
      confidenceImpact: 'none' | 'lowers_to_medium' | 'lowers_to_low';
      reviewedBy: string; reviewedAt: string };
```

A `model_assumption` is a legitimate, honest input — an overhead rate is a
business assumption and always will be. What it must not do is masquerade as a
measurement, so it lowers the estimate's confidence by its own declaration and
the page can say which numbers are modelled rather than sourced.

### D.3 Calculation model

```
labor   = Σ(crew.count × laborHoursPerUnit × units × loadedHourlyRate(soc, area))
        loadedHourlyRate = OEWS(soc, area).hourly × ECEC loading factor
material = Σ(qtyPerUnit × units × (1+waste) × componentPrice(componentId, area, asOf))
equipment= Σ(hoursPerUnit × units × equipmentRate(rateId))
permit, disposal per rule
────────────────────────────────────────────────────────
direct   = labor + material + equipment + permit + disposal
subtotal = direct × (1 + overheadRate)
expected = subtotal × (1 + profitRate) × (1 + contingencyRate) × Π(modifiers)
low/high = expected × confidenceBand(confidence, modifierSpread)
```

The result is a `CalculationResult<JobEstimate>` — same contract as every other
engine — so the Calculation Receipt, breakdown and assumptions come for free.
Every modifier appears as its own `BreakdownStep` with its own dollar delta.
**No adjustment is applied that the breakdown does not name** (§16).

### D.4 Initial job inventory — 10 recipes, V1

Chosen for search volume × recipe tractability, from the brief's own priority list:

| # | jobId | Trade | Unit | Why first |
| --- | --- | --- | --- | --- |
| 1 | `roof-replacement` | roofing | roof-square | highest-volume home cost query; well-documented production rates |
| 2 | `hvac-replacement` | hvac | each (system) | high value; ResStock gives building context |
| 3 | `water-heater-replacement` | plumbing | each | simple recipe, high volume |
| 4 | `electrical-panel-upgrade` | electrical | each | well-bounded scope |
| 5 | `tree-removal` | tree | each | strong modifier story (height, access, proximity) |
| 6 | `deck-build` | carpentry | sq-ft | material-dominant, good basket exercise |
| 7 | `fence-install` | fencing | linear-ft | linear unit proves the unit model |
| 8 | `concrete-driveway` | concrete | sq-ft | reuses the shipped `concrete` engine's material math |
| 9 | `interior-painting` | painting | sq-ft | labor-dominant, proves productivity model |
| 10 | `bathroom-remodel` | multi | each | composite recipe; proves recipe composition |

### D.5 Datasets — V1 (all public, all commercially usable)

| Dataset | Role | Status |
| --- | --- | --- |
| **BLS OEWS** | trade wage by SOC × state | **already ingested** — this is the single biggest head start |
| **BLS ECEC** | wages→loaded-labor factor (benefits, taxes, insurance) | NEW |
| **BLS PPI** | material price escalation from a dated baseline | NEW |
| **FEMA Schedule of Equipment Rates** | equipment hourly rates | NEW |
| **BEA RPP** | secondary location signal where OEWS suppresses a trade | **already ingested** |
| **HUD crosswalks** | ZIP → county → CBSA | **already ingested** (`zcta-county`) |
| **CostAnswer Material Basket** | 300–500 components, baseline price + PPI series mapping | NEW — CostAnswer IP |

**Explicitly excluded from V1** (§19): CWICR cost data (CC BY-NC 4.0 — not usable
commercially), RSMeans (no scraping, no dependency). Permit and DOT bid data are
**wave 2 calibration**, not V1 inputs (§D.8).

### D.6 Material Basket

`data/material-basket/` + `lib/job/materials.ts`.

```ts
type MaterialComponent = {
  componentId: string;        // 'asphalt-shingle-architectural-3tab'
  unit: MaterialUnit;         // 'square' | 'sheet' | 'linear-ft' | 'gallon' | 'cu-yd' | 'each'
  qualityTier: 'builder' | 'mid' | 'premium';
  baselinePrice: number;      // integer cents
  baselineDate: string;       // the date the baseline was observed
  baselineSource: SourceRef;  // must be a public/licensed source
  ppiSeriesId: string;        // BLS series that escalates it
  regionalAdjustment: 'rpp' | 'none';
  confidence: Confidence;
};
```

Current price = `baselinePrice × (PPI_now / PPI_baseline) × regionalFactor`.
The baseline date and the escalation factor are both shown on the page.

**Where a baseline may come from:** public procurement and bid data,
manufacturer-published prices, licensed or permitted price feeds, open
commercial catalogue data. **Never scraped from a retailer.**

**Where it may not come from:** a guess. A component with no usable source is
`unsupported` — it drops out of the recipe, the recipe says a material is
unpriced, and the estimate's confidence falls. Filling 120 rows with plausible
numbers to make the basket look complete is the failure this state exists to
prevent, because an invented material price is invisible inside a total.

V1 target: **as many of ~120 components as have real sources**, covering the 10
recipes; a recipe with unpriced components ships saying so. 300–500 is the
wave-2 target once more recipes need them.

### D.7 Confidence

Three levels, derived — never asserted:

| Level | Condition |
| --- | --- |
| `high` | OEWS publishes the trade wage for the state, ≥80% of the recipe's material cost is from components with a baseline < 12 months old, and no modifier is at an extreme |
| `medium` | state wage falls back to national, OR material baselines are 12–24 months old, OR one modifier is extreme |
| `low` | trade wage suppressed at state level, OR any material baseline > 24 months, OR the recipe is composite (`bathroom-remodel`) |

The page states *which* condition set the level, in one sentence. Ranges are
never presented to the dollar: `$7,900–$9,300`, not `$7,873–$9,341`.

### D.8 Calibration — wave 2, architected for now

`lib/job/calibration.ts` exists in V1 as a **pure pass-through** with the final
signature:

```ts
calibrate(estimate: JobEstimate, evidence: CalibrationEvidence[]): JobEstimate
```

V1 passes `[]`. Wave 2 supplies permit-valuation and DOT-bid observations. The
brief is right that permit valuation ≠ invoice; calibration will therefore
produce a *named breakdown line* ("Local market adjustment: +$760"), never a
silent multiplier. Building the seam now costs one file and prevents the rewrite.

### D.9 Quote Checker

Same engine. Input: job + location + scope + the contractor's number.

```
Contractor quote     $14,800
CostAnswer expected  $11,900
Normal range         $10,600 – $13,700
Verdict              Above the normal range
```

Verdict vocabulary is fixed and never accusatory:
`below the normal range` · `at the low end` · `in the normal range` ·
`at the high end` · `above the normal range` · `outside what we can assess`.

Every "above" verdict is followed by the *reasons a higher quote can be correct*
(emergency service, premium materials, difficult access, permit and disposal
included, code upgrades, warranty, unmodeled scope). The word "overcharge" and
any synonym do not appear in the codebase. This is asserted by a test.

### D.10 UX flow

1. What job? (10 cards, searchable)
2. Where? (ZIP → county via the shipped `zcta-county` crosswalk)
3. Scope (1–3 numeric inputs; the unit is named in plain words: "roof squares — about 1 per 100 sq ft")
4. Key modifiers (max 4, each with a plain-language option list, defaults pre-selected)
5. Result: LOW / **EXPECTED** / HIGH, confidence chip
6. Breakdown: labor · materials · equipment · permit · disposal · overhead · profit
7. "Why this amount" — the modifier deltas, named
8. Compare a quote / refine

Steps 1–4 are one scrolling mobile screen, not a wizard. No ad slot between
step 4 and step 5.

### D.11 Files

```
lib/job/
  types.ts          recipe, estimate, modifier, confidence types
  recipes/          one file per job; 10 files
  labor.ts          OEWS + ECEC → loaded hourly rate by SOC × area
  materials.ts      basket + PPI escalation + RPP regional factor
  equipment.ts      FEMA rates
  permits.ts        permit + disposal rules
  modifiers.ts      modifier application, always as named deltas
  estimate.ts       the composition; returns CalculationResult<JobEstimate>
  quote-check.ts    verdict + reasons
  calibration.ts    pass-through seam
  version.ts        JOB_ENGINE_ID
data/material-basket/
data/bls-ecec/  data/bls-ppi/  data/fema-equipment/
app/cost/
  page.tsx  estimate/  check-quote/  [job]/
components/job/
  JobPicker.tsx  ScopeForm.tsx  JobResult.tsx  QuoteVerdict.tsx  ConfidenceChip.tsx
```

---

## E. Dataset registry

Existing 16 (all already ingested, validated and shown with provenance):

| Dataset | Use | Cadence | Geo | License | Ingestion | Fallback | Engines |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `eia-electricity` | ¢/kWh | monthly | state | US Gov PD | API (key) | last snapshot | energy, COL |
| `eia-gasoline` | $/gal | weekly | PADD/state | US Gov PD | API + HTML | manual override | vehicle, COL |
| `bls-grocery` | item prices | monthly | national/region | US Gov PD | API | last snapshot | shopping |
| `bls-cpi` | CPI-U | monthly | national | US Gov PD | flat file + API | last snapshot | inflation |
| `bls-oews` | wages | yearly | national/state | US Gov PD | archive + rebuild | none (suppress page) | salary, **job labor** |
| `freddie-mac-pmms` | mortgage rate | weekly | national | Freddie ToU (attributed) | HTML | manual override | mortgage family |
| `us-tax` | fed/state/FICA | yearly | state | US Gov PD + state | hand-transcribed | `unsupported` status | tax family, salary |
| `census-omb-geography` | place identity | irregular | all | US Gov PD | file | last snapshot | location |
| `census-acs5` | median income | yearly | state/county | US Gov PD | API | last snapshot | salary |
| `hud-fmr` | rents | yearly (FY) | metro/county | US Gov PD | file + `releases.json` | prior FY | COL |
| `bea-rpp` | price parity | yearly | state/metro | US Gov PD | API | national | salary, COL, **job region** |
| `usda-food-plans` | food cost | monthly | national | US Gov PD | file | last snapshot | COL |
| `irs-retirement-limits` | 401k/IRA caps | yearly | national | US Gov PD | hand-transcribed | prior year + label | retirement family |
| `gsa-perdiem` | per diem | yearly (FY) | ZIP/county | US Gov PD | API | CONUS standard | travel |
| `naic-insurance` | avg premium | ~yearly | state | NAIC (attributed) | file | last snapshot | insurance |
| `cms-marketplace` | premiums | yearly | county | US Gov PD | zip PUF | 30 states only | ACA family |

New for this plan:

| Dataset | Use | Cadence | Geo | License | Ingestion | Validation | Fallback | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `us-tax` **states** | 37 missing schedules | yearly | state | state agencies, PD | hand-transcribed + hash | golden vectors per state vs the state's own tax table | keep `unsupported` per state | P2 |
| `irs-pub15t` | W-4 withholding | yearly | national | US Gov PD | PDF → table | reproduce IRS worked examples | none | P4 |
| `irs-credits` | EITC, CTC, LTCG, NIIT | yearly | national | US Gov PD | Rev. Proc. transcription | published table match | none | P4 |
| `irs-rmd` | Uniform Lifetime Table | rare | national | US Gov PD | Pub 590-B transcription | full-table checksum | none | P4 |
| `ssa-benefits` | bend points, COLA, credits | yearly | national | US Gov PD | SSA pages | SSA's own examples | none | P4 |
| `irs-hsa` | HSA/HDHP limits | yearly | national | US Gov PD | Rev. Proc. | published match | none | P4 |
| `fha-va` | MIP schedule, funding fee, limits | yearly | national/county | US Gov PD | HUD/VA files | published match | national limit | P4 |
| `sofr-index` | ARM index | daily→monthly avg | national | NY Fed PD | API | monotonic date, range | last value + date | P4 |
| `bls-ecec` | labor loading factor | quarterly | national/region | US Gov PD | API | ratio in 1.25–1.65 | 1.40 documented default | P7 |
| `bls-ppi` | material escalation | monthly | national | US Gov PD | API | index continuity | freeze + label | P7 |
| `fema-equipment` | equipment rates | ~yearly | national | US Gov PD | file | rate > 0, unit known | last schedule | P7 |
| `material-basket` | component prices | quarterly | national + RPP | CostAnswer IP over cited sources | manual + PPI | every component cites a source | none — component drops out | P7 |
| `cms-hospital-prices` | procedure prices | ~yearly | facility | US Gov PD mandate | MRF fetch + normalize | payer/plan/code schema | pilot states only | wave 2 |

**Universal ingestion contract** (unchanged from `docs/ARCHITECTURE.md`):
`fetch → retain raw → schema-validate → quality-assert → normalize → diff previous → candidate manifest → atomic promote`.

---

## F. Open-source dependency register

Current runtime dependencies are `next`, `react`, `react-dom`, `zod`. That
restraint is an asset and this plan preserves it.

| Library | Purpose | License | Decision | Risk | Alternative |
| --- | --- | --- | --- | --- | --- |
| **fast-check** | property tests on finance invariants | MIT | **ADOPT — devDependency, P5** | none (dev-only) | hand-written boundary tests (status quo) |
| **Dinero.js / decimal.js** | money primitive | MIT | **REJECT for V1** | a rewrite of 44 engines mid-launch is the highest-risk change available; math already uses `log1p`/`expm1` and a centralized `round()` | property tests prove the invariants Dinero would enforce, at 1% of the cost. Revisit only if a property test finds a real float defect. |
| **DuckDB** | ETL over permit/bid/MRF data | MIT | **ADOPT — wave 2 only**, in `scripts/`, never at runtime | none (offline) | pandas/polars |
| **Parquet** | analytical storage for wave-2 raw data | Apache-2.0 | **ADOPT — wave 2**, `data/**/raw/` only | none | gzipped CSV |
| **PostgreSQL / Supabase** | app backend | PostgreSQL / Apache-2.0 | **REJECT.** No query at launch needs it; snapshots are the model and it works | — | tier-2 static assets (§B.3) |
| **PostGIS** | geo lookups | GPL-2.0 | **REJECT.** ZIP→county is a shipped crosswalk | GPL in a commercial product needs care | `zcta-county` snapshot |
| **Frictionless metadata** | dataset schema/provenance | MIT | **REFERENCE ONLY.** `lib/data/envelope.ts` already carries more than the spec requires | adopting the spec means rewriting 16 working adapters | keep the envelope; borrow field names where they are clearer |
| **Great Expectations** | data quality | Apache-2.0 | **REFERENCE ONLY.** Python runtime in a TS repo for assertions Zod already makes | toolchain split | keep Zod refinements; borrow the *expectation vocabulary* for naming |
| **changedetection.io / urlwatch** | source change monitoring | Apache-2.0 / BSD | **REFERENCE ONLY.** Build the release-calendar monitor on the existing `lib/data/freshness.ts`, which already models cadence better than URL-diffing does | running another service | P3 scheduled job |
| **Unlighthouse** | site-wide Lighthouse sampling | MIT | **ADOPT — P9**, CI-optional | flaky in CI | Lighthouse CI on a fixed page list |
| **Lighthouse CI** | perf regression gate | Apache-2.0 | **ADOPT — P9** | budget tuning | manual PSI checks |
| **schema-dts** | typed JSON-LD | Apache-2.0 | **ADOPT — devDependency, P9.** `lib/seo.ts` hand-builds JSON-LD today | none (types only) | keep hand-built |
| **Docling** | official PDF/XLSX extraction | MIT | **ADOPT — P4/wave 2, `scripts/` only.** Pub 15-T and Pub 590-B are PDFs | Python in the ingest toolchain; output must still be hand-verified against the published table | manual transcription (what `data/tax` does today, and it works) |
| **Pagefind** | static search | MIT | **REJECT for V1.** Build-time registry index + `/api/location/search` already serve 101 tools and 761 occupations | adds a build artifact and an index to keep fresh | revisit if the guide corpus passes ~2,000 pages |
| **CWICR** | construction cost data | code Apache-2.0, **data CC BY-NC 4.0** | **DATA PROHIBITED.** Non-commercial licence. Code/architecture may be *read* | licence violation | own recipes over public data |
| **RSMeans** | cost book | proprietary | **PROHIBITED.** No scraping, no automated access, no V1 dependency | legal | possible licensed validation oracle later |

**Standing rule:** no new runtime dependency ships without a row in this table.

---

## G. EN-US / ES-US architecture

### G.1 URL and routing

| Surface | en-US | es-US |
| --- | --- | --- |
| Home | `/` | `/es` |
| Tool | `/money/mortgage-payment` | `/es/dinero/pago-hipoteca` |
| Topic hub | `/topics/money` | `/es/temas/dinero` |
| Guide | `/guides/:slug` | `/es/guias/:slug` |
| Salary | `/salary/:occupation` | `/es/salario/:ocupacion` |
| Job cost | `/cost/:job` | `/es/costo/:trabajo` |
| Search | `/search` | `/es/buscar` |

Spanish slugs are **authored**, not machine-translated, and stored in the
registry beside the English slug. A missing Spanish slug means that tool has no
Spanish page — never a fallback to English content at a Spanish URL.

### G.2 Rules

- **No IP-based redirects, ever.** A language switcher in the header, plus
  `hreflang` for discovery.
- **Reciprocal `hreflang`** on every localized pair: `en-US` ↔ `es-US`, plus
  `x-default` → the en-US URL.
- **Self-canonical** per locale. `/es/dinero/pago-hipoteca` canonicals to itself.
- **Separate sitemap families**: `sitemaps/pages-es`, `sitemaps/tools-es`, etc.
  A Spanish URL never appears in an English sitemap file.
- **`<html lang>` is per-locale.** `app/layout.tsx:43` currently hardcodes `en`.
- **Input preservation across the switch.** The switcher carries calculator
  state via the URL query where a tool already supports it; where it does not,
  the switcher is still shown and inputs reset — a reset is acceptable, a
  silently wrong value is not.

### G.3 Translation is not translation

Spanish copy is **written for US Spanish speakers about US finance**. English
financial terms stay in English where that is what a US Spanish speaker uses and
searches: `401(k)`, `W-4`, `IRS`, `FHA`, `VA`, `HSA`, `Roth`, `Social Security`
(with `Seguro Social` as the gloss on first use). Currency is USD, formatted
`es-US`. A word-for-word translation of the English guide is a rejected artifact
under the content-engine quality gate, same as a paraphrased duplicate.

### G.4 Files

```
lib/i18n/
  locales.ts       LOCALES = ['en-US','es-US']; type Locale
  routes.ts        slug map en↔es, both directions, asserted bijective
  strings/         en-US.ts, es-US.ts — UI chrome only, never calculator copy
  alternates.ts    hreflang + canonical builder used by every metadata function
app/es/…           mirrors app/ for localized surfaces
```

`lib/i18n/routes.ts` asserts at module load that the slug map is a bijection and
that no Spanish slug collides with an English one. A collision is a build failure.

### G.5 Launch scope

Full parity across 101 tools + 31,621 salary pages + guides is **not** a 10-day
deliverable and would be unwise before English traffic is measured. Launch ships
the **architecture complete** plus a **complete, non-partial Spanish slice**:

- `/es` home, `/es/temas/*` hubs, `/es/buscar`
- the 20 highest-intent Spanish-search calculators (paycheck, salary after tax,
  hourly to salary, mortgage payment, car loan, credit card payoff, loan,
  inflation, tip, BMI, percentage, unit conversion, cost of living, marketplace
  plans, health insurance subsidy, retirement, 401k, compound interest, home
  affordability, debt payoff)
- 10 Spanish guides
- privacy, terms, contact, methodology

"Complete slice" means: every page in the slice has real Spanish copy, real
`hreflang`, and is in a Spanish sitemap. No half-translated page ships. Waves 2–4
extend the slice; §L.5 has the dates.

---

## H. Content engine

### H.1 It is a family, not a set of registry tools

Guides get their own gate, like salary does — `lib/content/publication.ts` with
per-cluster levels, so a cluster can be opened or withdrawn in one edit.

### H.2 Pipeline

```
search intent
 → intent-duplication check   (reject if an existing page or guide owns the intent)
 → official-source research   (every factual claim gets a source with a date)
 → data/calculator binding    (each guide names ≥1 calculator and ≥1 dataset)
 → brief
 → draft
 → editorial pass             (voice, no spintax, no number-swapped variants)
 → financial fact check       (numbers reproduced from the cited source)
 → citation check             (every URL resolves; every date is real)
 → semantic similarity check  (review signal — see below)
 → quality score              (same 100-point rubric as the tool gate; ≥75 to publish)
 → publish | reject
```

Rejection is normal and logged. A rejected brief is not re-run with different
wording — that is the spintax failure mode §H forbids.

**On the similarity threshold.** v1 hard-rejected anything scoring ≥0.85 cosine
against the corpus. That number is a guess until there is a corpus to calibrate
it on, and a guessed threshold rejecting real work is worse than no threshold:
two guides about different states' tax rules *should* score high and are not
duplicates.

So similarity is a **review signal** first. It flags, a human decides, and the
decision is recorded. After the first 500–1,000 published guides the
distribution is known — the score where genuine near-duplicates actually sit —
and only then does it become a hard gate at a calibrated value. Until then the
hard gates are the ones that do not need calibration: intent duplication,
citation resolution, and the quality score.

### H.3 Guide page contract

Every guide exposes: sources with dates · last reviewed · relevant methodology ·
related calculators · at least one worked example computed by a real engine.
A guide that cannot bind a calculator or a dataset is not a guide; it is an
article, and it does not ship.

### H.4 Publication schedule

The brief's 50K + 50K target is a **destination, not a launch state**. Publishing
100K URLs onto a zero-history domain is the failure mode §7 and §25 both name.

| Window | EN guides live | ES guides live |
| --- | --- | --- |
| Launch (day 10) | 30 | 10 |
| +30 days | 150 | 60 |
| +90 days | 600 | 250 |
| +180 days | 2,000 | 900 |
| Beyond | gated entirely on measured indexation rate and average position |

Rate increases only when Search Console shows the previous tranche indexing at
>70%. Generation capacity and indexation strategy are separate systems (§7) and
this table governs the second one.

### H.5 Event-driven content (wave 3)

`lib/content/events/` — a Fed/CPI/jobs/SSA-COLA release is ingested as a
dataset, diffed against the prior release, and the diff drives a template that
computes impacts through real engines. The causal-honesty rule from §8 is
enforced in the template vocabulary: direct effects (credit-card APR follows
prime, which follows the fed funds target) and indirect effects (mortgage rates
follow the 10-year, which does *not* move 1:1 with the target) use different
sentence stems, and a linter test asserts the indirect stem is used for the
mortgage/auto/savings sections.

---

## I. Medical Cost pilot

**Moved out of the 10-day launch window.** Reasoning in §L.4.

Wave 2, weeks 3–5:

- **Scope:** Texas · 15 procedures (MRI brain, MRI knee, CT abdomen, CT head,
  colonoscopy screening, upper endoscopy, ER level 3, ER level 4, C-section,
  vaginal delivery, mammogram screening, ultrasound abdomen, ultrasound
  pregnancy, knee replacement, hip replacement) · the ~40 largest facilities.
- **Source:** CMS hospital price transparency machine-readable files. Each
  hospital publishes its own file; schemas vary widely even under the CMS
  template. Normalization, not fetching, is the hard part.
- **Display:** cash price · observed hospital range · median negotiated where
  published · **number of hospitals analyzed** · last updated · source link.
- **Never displayed as:** what the patient will pay. A negotiated rate is not
  patient responsibility, and the page says so above the number, not in a
  footnote.
- **URLs reserved now, published in wave 2:** `/cost/medical/:procedure` and
  `/cost/medical/:procedure/:state`.

---

## J. SEO and indexation

### J.1 The salary staging decision — a recommendation the owner must rule on

`SALARY_PUBLICATION` in `lib/salary-pages.ts:47` has every level `indexable`:
31,621 URLs. `docs/ARCHITECTURE.md:127` records that this was taken *against* the
architect's recommendation, and the code comment says so plainly.

Two facts have changed since that decision:

1. **72% of those leaf pages currently omit state income tax** from their
   headline take-home figure (§0.3). Publishing them now publishes the defect.
2. The domain still has **zero** Search Console history, and Search Console is
   still not connected.

**Decided: `occupationInState: 'staged'`.** Applied at HEAD. The site ships 813
salary URLs — hub, state index, 51 state hubs, 761 occupation pages — which is
already a substantial corpus and carries no such defect, because a hub reports a
distribution rather than one person's take-home.

The leaves open when **both** are true, in waves, measuring between them:

```text
51 verified state schedules (P2)
+ Search Console showing the levels above indexing
        ↓
    10k leaves → measure → next wave → measure → 30,807
```

Reversing this is one word. Opening it before P2 is not on the table: publishing
22,000 pages whose headline figure knowingly omits state income tax is worse
than publishing none of them.

### J.2 Launch indexation budget

| Family | URLs at launch |
| --- | --- |
| Tools | 101 |
| Topic hubs + site pages | ~20 |
| Salary (leaves staged) | 813 |
| Guides EN | 30 |
| Job cost | 13 (`/cost`, 2 entry points, 10 job pages) |
| ES slice | ~60 |
| **Total** | **≈ 1,040** |

A thousand genuinely distinct pages from a new domain is an aggressive but
defensible opening. Thirty-two thousand is not.

### J.3 Job-cost SEO

Attack long-tail utility intent, as §25 says — `roof replacement cost
calculator`, `2000 sq ft roof replacement cost`, `water heater replacement cost`,
`is my plumbing quote fair`. These live as `searchTerms` and `longTail` sections
on the 10 job pages. **`/cost/:job/:state` stays closed at launch** and opens
only per-job, only where the OEWS trade wage for that state genuinely moves the
answer — which is measurable, not assumed: open a state page only where the
modeled cost differs from the national figure by more than the recipe's own
confidence band.

### J.4 Structured data

`WebSite`, `WebApplication`, `BreadcrumbList`, `Article`, `FAQPage` (visible
questions only), `Dataset`, `Occupation` — all shipped. Job pages add
`HowTo`-free `Article` + `FAQPage`. No `Review`, no `AggregateRating`, no
`Product` — CostAnswer has no reviews and no products, and marking up either is
the fake-expertise failure §25 forbids.

---

## K. Testing and QA

| Layer | Tool | Gate | Status |
| --- | --- | --- | --- |
| Unit — engines | vitest | every pure engine, boundaries, invariants | ✅ 496 tests |
| Schema | zod + vitest | missing / malformed / non-finite / out-of-range | ✅ |
| **Golden vectors** | vitest fixtures | **NEW:** every tax tool reproduces the IRS's or the state's own published worked example, value for value | P2/P4 |
| **Property tests** | fast-check | **NEW:** amortization terminates at zero; extra payments never lengthen a term; tax is monotonic in income; `round()` is stable; every `CalculationResult` has ≥1 breakdown step | P5 |
| Cross-source validation | vitest | **NEW:** OEWS median vs ACS median within tolerance; state tax vs an independent published effective rate at 3 incomes | P2 |
| Data quality | ingest scripts | schema · units · geography · uniqueness · completeness · finiteness · domain invariants · previous-period diff · secret scrubbing | ✅ |
| **Freshness** | CI job | **NEW:** build fails if any dataset is `stale`; warns on `update-due` | P3 |
| Route smoke | `tests/e2e/routes.ts` | 200 + metadata on critical routes | ✅ |
| Browser journeys | Playwright | real inputs, keyboard, axe WCAG A/AA | ✅ 908 lines, **but not in CI** |
| **Lighthouse regression** | Lighthouse CI | **NEW:** perf ≥90 mobile on the tool template, LCP < 2.5s, CLS < 0.1, TBT < 200ms | P9 |
| **Bundle budget** | CI assertion | **NEW:** no client chunk > 150 KB gz; Worker ≤ 2.8 MB gz | P1 |

**Immediate CI corrections (P1):** add `lint` and `test:e2e` to `verify.yml`;
remove the hardcoded nvm path from `playwright.config.ts`.

---

## L. Ten-day execution plan

> **Day 10 is a go/no-go checkpoint, not an unconditional launch date.**
>
> The scope below is roughly 30 engineer-days. Three strong parallel agents make
> it reachable; nothing makes it certain. The quality gates in §M decide whether
> day 10 ships, and a gate that has not passed is a reason to hold, not a reason
> to lower the gate. Specifically: launching with fewer than 51 verified state
> tax schedules, or with the salary leaves open while any are missing, is a
> no-go regardless of the date.

Three lanes. **Lane A** = data and correctness. **Lane B** = calculators and UI.
**Lane C** = platform, i18n, job engine. Phases inside a lane are sequential;
lanes are parallel except where an arrow marks a dependency.

### L.1 Day map

| Day | Lane A — Data & correctness | Lane B — Calculators & UI | Lane C — Platform |
| --- | --- | --- | --- |
| 1 | **P2a** tax schema extension (credits, federal deductibility, local tax) | **P1b** fix CMS client-bundle leak; fix 2 lint errors; delete 3 conflict copies | **P1a** wrangler deploy → costanswer.com; DNS; TLS; CI adds lint + e2e |
| 2 | **P2b** 12 largest states by population (NY OH GA NC VA MI MD MN CO AZ IN MO) | **P5a** shared depth primitives: `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceChip`, `CalculationReceipt` | **P1c** tier-2 asset store; move OEWS + CMS columns off the bundle; bundle budget assertion in CI |
| 3 | **P2c** next 13 states | **P4a** tax tools 1–5 (bracket, effective rate, SE tax, quarterly, capital gains) | **P3** freshness SLA: per-dataset cron matched to provider calendar; PMMS moves to Thursday-evening; GSA added to refresh; GSA `releases.json`; stale gate in CI |
| 4 | **P2d** final 12 states + cross-source validation + golden vectors | **P4b** tax tools 6–9 (refund, W-4, EITC, CTC) ← needs P2 | **P6a** i18n architecture: locales, route map, alternates, `<html lang>`, ES sitemaps |
| 5 | **P4-data** new rule datasets: Pub 15-T, credits, RMD, SSA, HSA, FHA/VA, SOFR | **P4c** retirement 7 + education 1 | **P7a** job engine types, labor (OEWS+ECEC), equipment (FEMA), permits |
| 6 | **P7-data** ECEC, PPI, FEMA ingest + material basket v0 (120 components) | **P4d** mortgage 9 | **P7b** job estimate composition, modifiers, confidence, calibration seam |
| 7 | **P8-data** guide source research for the first 30 | **P4e** home equity 2 + auto 4 + personal finance 7 | **P7c** 10 recipes, each fully cited |
| 8 | freshness verification pass across all 26 datasets | **P4f** debt 4 + remaining; **101 reached** | **P7d** `/cost` routes, `/cost/estimate`, `/cost/check-quote`, 10 job pages, quote-check verdicts |
| 9 | data page + methodology updated for every new dataset | **P8** 30 EN guides + `/guides` family + gate | **P6b** ES slice: 20 tools + 10 guides + chrome |
| 10 | **P9** launch checklist · Lighthouse · Search Console · Bing · analytics live · smoke tests · go/no-go | | |

### L.2 Dependency arrows

```
P1a (deploy) ──► P9 (Search Console needs a live domain)
P1c (tier 2) ──► P7 (job data has no bundle room otherwise)
P2  (states) ──► P4b (tax refund/W-4/EITC/CTC need state tax)
P2  (states) ──► J.1 (leaf-page staging decision)
P5a (primitives) ──► P4a–P4f (43 tools must not each invent an advanced panel)
P6a (i18n arch) ──► P6b (ES content)
P7a+P7b ──► P7c ──► P7d
```

### L.3 What can run fully in parallel

P1b, P1c and P2a on day 1. P4a–P4f are internally parallel across as many
agents as are available — each tool is one engine + one component + one page +
one editorial record + one test file, touching no shared file except the
registry, which is append-only. **Rule: one agent per tool, one commit per tool.**

### L.4 What I moved out of the 10 days, and why

**Medical Cost pilot → wave 2 (weeks 3–5).** Hospital MRF files are the least
standardized public dataset in this plan: hundreds of megabytes per hospital,
inconsistent code systems, inconsistent payer naming, and genuine ambiguity
about what a "price" means. A rushed pilot on medical pricing is the single
highest-liability page type on the site. Reserving the URLs now costs nothing;
shipping a wrong MRI price costs trust that a new domain has none of to spend.

**Full ES-US parity → waves 2–4.** 101 calculators + 31,621 salary pages +
guides in authored (not machine-translated) US Spanish is a multi-week writing
project. The launch ships the complete architecture and a complete 60-page
slice; the slice grows on a schedule. Machine-translating to hit a date would
produce exactly the thin, duplicated pages §7 forbids, in a second language.

**Permit / DOT-bid calibration → wave 2.** V1 is engineering-first, which is what
§15 prescribes. The calibration seam ships in V1; the evidence does not.

If the owner would rather hold the launch than move these, the alternative is a
**17-day plan**: the same phases, with medical at days 11–14 and the ES slice
doubled at days 15–17. Say the word and I will re-cut the day map.

### L.5 Post-10-day waves

| Wave | Window | Contents |
| --- | --- | --- |
| 2 | weeks 3–5 | Medical pilot (TX, 15 procedures) · permit + DOT-bid calibration · salary leaves wave 1 (10k URLs) · guides to 150 EN / 60 ES · material basket to 300 |
| 3 | weeks 6–9 | Event-driven content · job recipes 11–20 · `/cost/:job/:state` where data moves the answer · salary leaves waves 2–3 · ES slice to 60 tools |
| 4 | weeks 10–16 | Medical expansion beyond TX · guides to 600/250 · Real Quote Dataset collection (optional, anonymous) · ES full parity on tools |

---

## M. Acceptance criteria by phase

**P1 — Platform and blockers** — met except deployment
- ✅ `npm run verify` exits 0; lint has zero errors.
- ✅ `verify.yml` runs `lint`, the bundle budget and `test:e2e`; no absolute local path in `playwright.config.ts`.
- ✅ No client chunk over **200 KB**; no dataset chunk at all. Asserted in CI.
- ✅ Worker ≤ 2.8 MB gzipped — **our** budget for cold-start and deploy time, not a platform ceiling.
- ✅ The three conflict copies are deleted.
- ✅ Typecheck under 30s.
- ⬜ `https://costanswer.com` serves the production build over TLS; `www` redirects.
- ⬜ D1 provisioned and migrated; `MONETIZATION_*` secrets set.
- ⬜ `/money/marketplace-plans` and `/money/health-insurance` re-verified in a browser after the tier move.

**P2 — State tax**
- `data/tax/2026.json` has **51 supported** rows; zero `unsupported`.
- Every state carries `sourceUrl`, `publishedAt`, `verifiedAt` and `scheduleTaxYear`.
- A golden vector per state reproduces that state's own published tax-table value at $40k, $75k and $150k single, within $1.
- Cross-source check: computed effective rate is within 1.5pp of an independent published figure for all 51.
- No `/salary/**` page renders "Not modelled".
- `npm run verify:tax` passes.

**P3 — Freshness SLA**
- Every `scheduled` dataset has a cron whose day-of-week matches the provider's own release day (PMMS Thursday, EIA gasoline Monday, BLS mid-month).
- `gsa-perdiem` is in `scripts/refresh-snapshots.ts`.
- `data/gsa-perdiem/releases.json` exists and `resolveEffectivePerDiemRelease` mirrors the HUD implementation; a test proves FY2027 is *published* and *not effective* on 2026-09-30, and effective on 2026-10-01.
- CI fails when any dataset evaluates `stale`; warns on `update-due`.
- No dataset is `stale` at launch.

**P4 — Calculators to 101**
- `tools.length === 101`, asserted by a test.
- Every tool has: engine with `calculationVersion` + `datasetSnapshotIds` + `breakdown` + `assumptions`; a unique `ToolEditorial`; a self-canonical page; valid JSON-LD; regression tests.
- No two tools share a `searchTerms` primary phrase (duplicate-intent guard, asserted).
- Every tax tool has a golden vector against the IRS's own published example.
- `/topics/money` renders 68 tools grouped by cluster, and no group has more than 12 items.

**P5 — Depth primitives**
- `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceChip`, `CalculationReceipt` exported from `CalculatorUI.tsx`, each with a test.
- Every tool with more than 5 inputs uses `AdvancedSection`; asserted by a lint rule or a test over the component set.
- No tool renders a confidence claim without a derived reason string.
- Zero ad slots between an input and a primary result; asserted by the Playwright suite.

**P6 — Localization**
- `lib/i18n/routes.ts` slug map is a proven bijection; build fails on collision.
- Every localized page emits reciprocal `hreflang` (`en-US`, `es-US`, `x-default`) and a self-canonical.
- `<html lang>` matches the locale on every route.
- Spanish sitemaps are separate files; no Spanish URL appears in an English sitemap.
- No IP-based redirect exists anywhere in the codebase (asserted by grep test).
- All 60 slice pages have authored Spanish copy; zero pages mix languages.

**P7 — Job Cost Engine**
- 10 recipes validate; every numeric field in every recipe has a `RecipeSource`, asserted.
- `/cost/estimate` returns LOW / EXPECTED / HIGH + confidence + a breakdown whose lines sum to the expected value within $1.
- Every applied modifier appears as a named breakdown step with its own dollar delta; a test asserts no unnamed adjustment can change the total.
- `/cost/check-quote` returns one of the six fixed verdicts and, for any "above" verdict, at least three legitimate reasons.
- A test asserts the strings "rip off", "ripoff", "overcharge", "scam" appear nowhere in `lib/job/` or `components/job/`.
- Confidence level is derived from the stated conditions, never hardcoded per recipe.
- Job data lives in tier 2, not the bundle; Worker budget still met.

**P8 — Content engine**
- 30 EN + 10 ES guides live under `/guides` and `/es/guias`.
- Every guide names ≥1 calculator, ≥1 dataset, its sources with dates, and a last-reviewed date.
- Semantic similarity of every published guide against the corpus is < 0.85; the check is in CI.
- `lib/content/publication.ts` can withdraw a cluster in one edit.

**P9 — Launch**
- Every item in §N checked and evidenced.

---

## N. Launch checklist

**Domain and delivery**
- [ ] `costanswer.com` resolves; TLS valid; `www` → apex 301
- [ ] `NEXT_PUBLIC_SITE_URL=https://costanswer.com` at build; no localhost canonical anywhere in the output
- [ ] Security headers present in production response (CSP, HSTS, COOP, X-CTO, frame-deny, permissions-policy)
- [ ] Edge cache headers on `/salary/:occupation` and `/salary/states/:state`, not just the leaves

**Crawl and index**
- [ ] `/robots.txt` correct; sitemap absolute URL
- [ ] `/sitemap.xml` index resolves; every child sitemap returns 200 and validates
- [ ] Self-canonical on every page; no cross-canonical
- [ ] `hreflang` reciprocal and `x-default` present on all localized pairs
- [ ] `noindex` on staged families verified by fetching three sampled URLs
- [ ] Structured data validates in the Rich Results Test for each page type
- [ ] Google Search Console verified; sitemap submitted
- [ ] Bing Webmaster Tools verified; sitemap submitted

**Correctness**
- [ ] `npm run verify` green
- [ ] All 51 states supported in the tax snapshot
- [ ] No dataset `stale`; none `update-due` without a scheduled job about to fix it
- [ ] Every calculator's golden vectors pass
- [ ] Data page (`/methodology/data`) lists all datasets with observation period, publication date and freshness status

**Experience**
- [ ] Lighthouse mobile: performance ≥90, a11y ≥95, best practices ≥95, SEO 100 on the tool template, home, a salary page and a job page
- [ ] LCP < 2.5s, CLS < 0.1, TBT < 200ms on 4G throttle
- [ ] No client chunk > 150 KB gz
- [ ] Playwright suite green including axe WCAG A/AA
- [ ] Keyboard-only pass on one tool per category
- [ ] 375px-wide pass on the ten highest-traffic pages
- [ ] No ad slot between input and primary result (asserted)

**Links and errors**
- [ ] Zero broken internal links (crawl)
- [ ] 404 page useful and returns HTTP 404
- [ ] Every redirect in `next.config.ts` resolves in one hop

**Legal and trust**
- [ ] Privacy policy live with effective date and version
- [ ] Terms live
- [ ] Contact route works and reaches a monitored inbox
- [ ] Attribution present for NAIC and Freddie Mac
- [ ] Analytics enabled with no calculator input values in any payload (asserted by the event boundary test)
- [ ] Cookie/consent posture matches what analytics actually sets

**Smoke**
- [ ] Production smoke: one calculation per category returns a correct known value
- [ ] `/cost/estimate` and `/cost/check-quote` return a result in production
- [ ] One Spanish page renders fully in Spanish with correct `hreflang`

---

## O. Post-launch backlog

Only previously agreed deferred work. Nothing new.

**Waves 2–4** as scheduled in §L.5.

**Deferred indefinitely, architected for but not built** (§29):
AI financial advisor or chatbot · AI recommendation engine · public API ·
white-label platform · complex personalization · mandatory accounts · premium
memberships · live alert systems · notification infrastructure · complex A/B
testing · full national hospital-price ingestion · full RepairPal-style
automotive engine.

**Accounts** (§5) stay optional and are not a launch blocker. Guest users get the
complete product: calculate, compare, reverse-solve, full results, all guides and
data pages. If accounts are added later they add save/resume/history and nothing
else. No registration wall, no email gate on a result — ever.

**Monetization.** The infrastructure is **already implemented pre-launch** and
must be preserved — see §A.0. What remains gated is activation, not
construction:

- Display advertising, affiliate commerce, home-services lead generation and
  pay-per-call all have working engines, adapters, consent, ledger and admin.
- **Every external provider is disabled.** Each is `configuration_required`
  because its posting specification, credentials or programme approval is
  genuinely outstanding — not because the code is missing.
- **Launch does not depend on activating any provider.** Turning one on is
  credentials plus a configuration change, staged per `docs/MONETIZATION.md` §12.
- Financial, insurance and health lead generation stay off by policy, and
  health calculators are `restricted`: no ads, no affiliate, no leads, whatever
  the flags say.

Still genuinely unbuilt and deliberately so: embeds, data products, a public
API, white-label, premium subscriptions.

**Real Quote Dataset** (§20): the optional anonymous "did you get a quote?"
capture. `lib/job/calibration.ts` is the seam it plugs into. Not required for
launch, not built now.

---

## Phase cards

Each card is executable as written.

---

### P1 — Platform, deployment, and the bundle blocker · **DONE except deploy**

**Goal.** A live custom domain, a green release gate, and no dataset in the
browser.

**What landed.**

| # | Was | Now |
| --- | --- | --- |
| 1 | 3,842,883-byte CMS chunk shipped to every visitor of two YMYL pages | **0.** Priced server-side via `app/api/marketplace/quote`; largest client chunk is 186 KB, which is React |
| 2 | 2 lint errors, so `npm run verify` was red while CI was green | **0 errors.** Both were state synced in an effect; both are now derived, which also fixed a one-frame stale suggestion list |
| 3 | 3 committed iCloud conflict copies, one a stale dataset verifier | Deleted |
| 4 | CI ran neither `lint` nor `test:e2e`; Playwright carried a developer's own nvm path | Both run; the path is gone |
| 5 | Nothing measured the bundle | `scripts/check-bundle-budget.mjs`, in CI and in `verify` |
| 6 | 812 salary pages ran the Worker on every request | Edge-cached like the leaves — same data, same annual cadence |
| 7 | — | **Typecheck 538s → 8s.** `resolveJsonModule` was inferring literal types for 5.7 MB of JSON that the code discards with `as unknown as`; `types/data-json.d.ts` declares those four modules instead |

Number 7 was not on v1's list because nobody had timed it. A nine-minute
release gate is a gate people skip, and every phase below pays for it.

**Files.** `app/api/marketplace/quote/route.ts` ·
`lib/data/cms-marketplace-client.ts` · `components/calculators/useCmsQuote.ts` ·
`components/calculators/{Health,MarketplacePlans}*.tsx` ·
`types/data-json.d.ts` · `scripts/check-bundle-budget.mjs` ·
`next.config.ts` · `.github/workflows/verify.yml` · `playwright.config.ts`

**Still open — needs credentials, not engineering.**

- `wrangler d1 create costanswer-monetization`, then `npm run monetization:migrate`
- Set `MONETIZATION_D1_DATABASE_ID`, `MONETIZATION_HASH_PEPPER`, `MONETIZATION_ADMIN_TOKEN`
- `wrangler deploy`; bind `costanswer.com`; verify TLS and the apex/www redirect

**Acceptance.** §M P1 — met except the deployment items above.

**Rollback.** The tier boundary is one route and one hook; reverting restores
the bundled imports and the budget check is the only thing that then fails.

### P2 — Complete the 2026 state tax engine

**Goal.** 51 supported jurisdictions. No page says "not modelled".

**Files.** `lib/data/tax/schema.ts` · `lib/calculations/tax/state.ts` ·
`scripts/update-tax-snapshot.ts` · `scripts/validate-tax-data.ts` ·
`data/tax/2026.json` · `tests/tax.spec.ts` · **new** `tests/tax-golden.spec.ts`.

**Work.**
1. Extend the policy union with the three shapes the current schema cannot
   express:
   - `exemptionCredit` — a per-filer/per-dependent credit subtracted after tax
     (most states that use credits rather than deductions).
   - `federalDeductible` — states allowing a federal income tax deduction,
     capped where applicable (AL, LA, MO, MT, OR).
   - `localAddOn` — an optional jurisdiction-level rate applied on top
     (OH municipal, MD county, PA local EIT, NY/NYC, MI cities, IN counties, KY).
     V1 models this as an **optional, explicitly-labeled** add-on that defaults
     to off, because the site does not know the user's municipality. A state page
     shows the state figure and names the local tax as an omission; the paycheck
     calculator offers it as an advanced input.
2. Transcribe 37 schedules from each state's own 2026 (or latest published)
   tables, recording `scheduleTaxYear` honestly where a state has not yet
   published 2026 — the existing CA/NJ precedent.
3. Extend `calculateSupportedStateTax` for the three new kinds; keep the
   exhaustive `never` check so a new kind cannot be silently unhandled.
4. Write `tests/tax-golden.spec.ts`: 51 states × 3 incomes × the state's own
   published table value.
5. Cross-source check against an independent published effective-rate figure.

**Data dependencies.** State revenue department publications. Where a state has
not published 2026, use the latest schedule and set `scheduleTaxYear` — the
existing honest fallback.

**Access constraint, measured 2026-09-06.** Most state revenue sites cannot be
read programmatically. Of eleven probed: NCDOR and Minnesota Revenue returned
usable content; Colorado, Arizona, Utah and Michigan returned HTTP 403;
Wisconsin and Virginia failed DNS resolution; Ohio 404'd on its published path;
New York publishes only through 2025 on its rate-schedule index; and
Minnesota's deduction page sits behind bot detection. Roughly one state in
three is machine-readable.

This does not change what the data has to be — it changes who fetches it.
Transcribing a bracket table from a search summary is exactly the unverifiable
input `verify-states.ts` exists to reject, so the remaining states need their
figures supplied from the primary source by someone who can open it. The
engineering is done and waiting: each state is one entry in
`scripts/update-tax-snapshot.ts` plus three golden vectors.

**Sequence, therefore:** do the reachable states as they are reached; leave the
rest `unsupported`, which the site already renders honestly, until their
figures arrive. **Do not** open the salary leaves on a partial transcription —
that is the failure this whole phase exists to prevent.

**Tests.** As above, plus: monotonicity in income for all 51; no state returns a
tax exceeding income; `unsupported` count is 0 (asserted).

**Acceptance.** §M P2.

**Risks.** Transcription error is the real risk and golden vectors are the
mitigation — a wrong digit fails the vector, exactly as the ACA rules file is
guarded by a hash. Local income taxes are genuinely hard; V1 names them as an
omission rather than modelling them wrong, which is the same posture the site
already takes with `unsupported`.

**Rollback.** Per state: flip that one row back to `unsupported`. The engine
already renders that state correctly.

---

### P3 — Data freshness SLA and missed-release monitoring

**Goal.** No dataset is silently behind, and the site never claims a figure is
current when the provider has published a newer one.

**Files.** `.github/workflows/refresh-snapshots.yml` · **new**
`.github/workflows/freshness.yml` · `scripts/refresh-snapshots.ts` ·
`lib/data/gsa-perdiem.ts` · **new** `data/gsa-perdiem/releases.json` ·
`scripts/ingest-gsa-perdiem.ts` · `lib/data/freshness.ts` · `lib/publishing.ts`.

**Work.**
1. Split the single Tuesday cron into per-cadence jobs matched to each
   provider's own calendar. The current Tuesday cron guarantees the mortgage
   rate is up to five days stale, which is exactly the freshness failure
   already on record.

   **A weekday is not a calendar.** PMMS normally publishes Thursday around
   noon ET, but a US holiday moves it earlier in the week. A cron pinned to
   Thursday therefore misses the release it was written for on precisely the
   weeks it matters. Freshness needs three parts, not one:

   ```text
   expected publication calendar   the provider's own stated cadence
   + holiday exceptions            federal holidays shift the release
   + release detection             poll, compare observation period, promote on change
   ```

   Detection is what makes the other two advisory rather than load-bearing: the
   job runs on a schedule that is usually right, and promotes on what it
   actually finds. EIA gasoline Monday, BLS monthly mid-month, annual datasets
   in their release month — same shape.
2. Add `gsa-perdiem` to `scripts/refresh-snapshots.ts` (its policy already says
   `scheduled` and it is in neither refresh script).
3. Give GSA the HUD treatment plus one date more than HUD needs.

   A fiscal year has three distinct moments and collapsing them loses the
   ability to answer "is this the newest data?" separately from "is this the
   rate that applies to my trip?":

   ```ts
   type PerDiemRelease = {
     fiscalYear: number;
     announcementPublishedAt: string;  // the bulletin
     datasetPublishedAt: string;       // the ZIP file the ingest reads
     effectiveFrom: string;            // travel on or after this date
     effectiveTo: string;
   };
   ```

   For FY2027 those are three different dates in three different weeks, with
   the rates applying from 1 October 2026. The invariants to hold, whatever the
   calendar says:

   ```text
   latest_published      = the newest datasetPublishedAt
   currently_effective   = the release whose window contains today
   ```

   Those must be allowed to name different fiscal years — that is the entire
   point — and `resolveEffectivePerDiemRelease` / `resolveLatestPublishedPerDiemRelease`
   are the two functions, mirroring `lib/data/hud-fmr.ts:126-138`.
4. New `freshness.yml`, daily: evaluate every dataset, fail on `stale`, open an
   issue on `update-due` that persists past its grace window.
5. Address the frozen clock: `evaluateFreshness` defaults `asOf` to
   `PUBLISHING_SNAPSHOT_DATE`. Add a `deployedAsOf` that reads the build
   timestamp so a long-lived deploy degrades its own labels honestly, while
   build-time SEO decisions keep using the frozen date (which is correct and
   deliberate — do not change that).

**Data dependencies.** None new.

**Tests.** Per-provider next-release-date tests · GSA published-vs-effective
across the 1 Oct boundary · a test that every `refreshMode: 'scheduled'` dataset
appears in a refresh script (this is the assertion that would have caught GSA).

**Acceptance.** §M P3.

**Risks.** More frequent crons mean more PRs. Mitigate by auto-merging refresh
PRs that pass `verify` and change only `data/**`.

**Rollback.** Revert to the weekly cron; freshness labels stay honest either way.

---

### P4 — 43 calculators to reach 101

**Goal.** Exactly 101 tools, each meeting the §4 standard.

**Files.** Per tool: `lib/calculations/<domain>/<tool>.ts` ·
`components/calculators/<cluster>/<Tool>Calculator.tsx` ·
`app/money/<slug>/page.tsx` · a `ToolEditorial` in the matching
`lib/tool-content/` file · `tests/<tool>.spec.ts` · one append to
`lib/tool-registry.ts`. Plus new datasets per §E.

**Work.** Follow `docs/ADDING_A_TOOL.md` unchanged — it is a good checklist —
with four additions:
1. Use the P5 primitives. Basic inputs visible; everything else inside
   `AdvancedSection`.
2. Every tool declares which of the §4 capabilities genuinely apply. Most get
   breakdown + assumptions + sources + receipt. Comparison tools
   (`rent-vs-buy`, `lease-vs-buy`, `roth-vs-traditional`, `balance-transfer`)
   get `ScenarioCompare`. Goal tools (`savings-goal`, `fire`, `down-payment`,
   `mortgage-points`) get `ReverseSolve`. Nothing gets a capability it does not
   need.
3. Reorganize `components/calculators/` into `money/`, `home/`, `car/`,
   `everyday/`, `health/`, `math/`, `education/`, `shopping/`, `food/` **before**
   adding the 43 — a 95-file flat directory is not navigable.
4. One agent per tool, one commit per tool. The registry is append-only so
   parallel agents do not conflict on it.

**Data dependencies.** §E new rows: `irs-pub15t`, `irs-credits`, `irs-rmd`,
`ssa-benefits`, `irs-hsa`, `fha-va`, `sofr-index`. P2 for anything state-aware.

**Rule-dependent tools do not ship to hit a count.** Nine of the 43 compute a
statutory entitlement rather than applying arithmetic to what someone typed:

> `student-loan` · `eitc` · `child-tax-credit` · `social-security` ·
> `fha-loan` · `va-loan` · `hsa` · `capital-gains` · `w4-withholding`

Each is bound to a dated official rule snapshot or it does not ship. The
existing 2026 federal snapshot is the model — it carries Rev. Proc. 2025-32 as
its source, its publication date, and a standard deduction of $16,100 single
and $32,200 married filing jointly, transcribed rather than estimated.

Student loan repayment is the sharpest case: federal plan rules are subject to
statutory and regulatory change, so the tool models **named plans with an
effective date and a source**, states which rules it applied, and refuses a
plan it has no verified rules for. It does not interpolate between regimes.

If a snapshot cannot be verified in time, **the tool waits.** The catalogue
reaching 101 is a target, not a deadline, and a wrong entitlement figure on a
YMYL page costs more than a missing calculator.

**Tests.** Per tool: boundary, invariant, regression fixture. Per tax tool: a
golden vector against the IRS's own published example. Registry-wide:
`tools.length === 101`, no duplicate primary search phrase, editorial coverage
(already asserted).

**Acceptance.** §M P4.

**Risks.** Volume. The mitigation is engine reuse — 28 of the 43 are
re-parameterizations of `finance/loan`, `finance/interest`, `finance/credit-card`
or `tax/annual`, all shipped and tested. The 15 that need new rule data are the
schedule risk, which is why their datasets land on day 5.

**Rollback.** Per tool: remove its registry entry. The route 404s; nothing else
breaks. The registry is the single switch.

---

### P5 — Shared depth primitives

**Goal.** The §4 standard is a contract, not 101 hand-rolled variants.

**Files.** `components/calculators/CalculatorUI.tsx` · `app/globals.css` ·
**new** `tests/calculator-ui.spec.ts`.

**Work.** Add and export:
- `AdvancedSection` — collapsed by default, remembers its open state per tool
  within the session, emits `advanced_opened`.
- `ScenarioCompare` — side-by-side A/B of two engine results with the deltas
  named; emits `compare_used`.
- `ReverseSolve` — swaps one input for the output and solves; emits `reverse_used`.
- `ConfidenceChip` — level + the derived reason, never a bare label.
- `CalculationReceipt` — formalizes what `ResultDetails` already does (breakdown
  · assumptions · method version · snapshot ids) and adds a copy-as-text action.

Extend `lib/analytics.ts` with `advanced_opened`, `compare_used`, `reverse_used`,
`quote_checked`, `source_clicked`, `related_calculator_clicked`,
`guide_to_calculator`, `language_switched` — keeping the strict field allowlist
so no calculator input value can ever be sent.

**Tests.** One per primitive. An event-boundary test asserting every new event
rejects unknown and extra fields, as the existing ones do.

**Acceptance.** §M P5.

**Risks.** None material — additive.

**Rollback.** Unused exports are harmless.

---

### P6 — EN-US / ES-US

**Goal.** The architecture is complete and a 60-page Spanish slice is real.

**Files.** `lib/i18n/*` · `app/layout.tsx` · `app/es/**` · `lib/seo.ts` ·
`lib/seo/sitemaps.ts` · `components/site/SiteHeader.tsx` ·
`lib/tool-registry.ts` (adds `slugEs?`).

**Work.** §G in full. Order: locale types → route map with bijection assert →
`alternates.ts` → `<html lang>` → sitemap families → header switcher → the
60-page slice.

**Data dependencies.** None. Number and currency formatting uses `Intl` with
`es-US`.

**Tests.** Bijection assert · reciprocal `hreflang` on a sampled pair ·
self-canonical per locale · no Spanish URL in an English sitemap · grep test
asserting no IP-based redirect · a test that every page in the slice has a
Spanish `ToolEditorial` (no English fallback at a Spanish URL).

**Acceptance.** §M P6.

**Risks.** Slug churn later is expensive, so the map is authored once and
reviewed before any Spanish page is published.

**Rollback.** Remove the ES sitemap family and set the slice `noindex`. The
English site is untouched.

---

### P7 — Job Cost Engine V1

**Goal.** One reusable engine, 10 cited recipes, two entry points, a quote
checker that is never accusatory.

**Files.** §D.11 in full.

**Work.** Order: types → labor → materials → equipment → permits → modifiers →
estimate → confidence → calibration seam → recipes → routes → quote check → UI.

**Data dependencies.** OEWS (shipped) · ECEC, PPI, FEMA (P7-data, day 6) ·
material basket v0 (day 6) · `zcta-county` (shipped) · BEA RPP (shipped). All
job data goes to tier 2, which is why P1c is a hard dependency.

**Tests.** Recipe validation (every number cited) · breakdown sums to expected
within $1 · every modifier is a named step · unnamed adjustments are impossible ·
confidence is derived · the six fixed verdicts · the forbidden-vocabulary
assertion · one golden estimate per recipe pinned against a hand-computed value.

**Acceptance.** §M P7.

**Risks.** Productivity rates are the hardest number and the brief is right that
no free nationwide dataset exists. V1 sources them from public engineering
manuals, manufacturer installation specifications and public procurement scopes,
and every one carries its citation. Where a rate is a documented industry
assumption rather than a measurement, the recipe says so and the confidence
drops. That is honest and it is improvable; an uncited number is neither.

**Rollback.** `/cost` is a new family with its own gate. Setting it `staged`
withdraws it from the sitemap and marks it `noindex` in one edit.

---

### P8 — Content engine and the first 30 guides

**Goal.** A guide family with a gate, and 30 EN + 10 ES guides that each bind to
a calculator and a dataset.

**Files.** `lib/content/*` · `app/guides/**` · `app/es/guias/**` ·
`lib/seo/sitemaps.ts` · `data/guides/`.

**Work.** §H. The pipeline is code where it can be (duplication check,
similarity check, citation resolution, quality score) and review where it must
be (editorial pass, financial fact check).

**Data dependencies.** Whatever each guide cites; no new dataset.

**Tests.** Every guide binds ≥1 tool and ≥1 dataset · every citation URL resolves ·
similarity < 0.85 against the corpus · quality score ≥75 · `FAQPage` markup only
where the questions are visible text.

**Acceptance.** §M P8.

**Risks.** The temptation to scale generation ahead of the indexation table in
§H.4. The gate in `lib/content/publication.ts` is what makes that a decision
rather than a drift.

**Rollback.** Set the guide family `staged`.

---

### P9 — Launch

**Goal.** Ship it.

**Files.** `.env` production values · `app/robots.ts` · analytics provider wiring ·
`docs/ROADMAP.md` update.

**Work.** §N end to end. Enable analytics with the privacy date, contact email
and policy version that `lib/integration-config.ts` requires. Verify Search
Console and Bing. Run Lighthouse CI and Unlighthouse. Full smoke pass. Go/no-go
against §M.

**Acceptance.** Every §N box checked, with evidence recorded in the launch issue.

**Risks.** Search Console verification needs live DNS, which is why P1a is day 1.

**Rollback.** The Worker keeps its previous version; `wrangler rollback` restores
it. Data snapshots are immutable and versioned, so a rollback cannot lose data.
