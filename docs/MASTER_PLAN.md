# CostAnswer master plan

Status: **v3, rebased 2026-09-07 after P2 closed** · drafted 2026-09-06
(state tax: `docs/P2_STATE_TAX_FINAL.md`; living sequence: §L and `docs/ROADMAP.md`)
owner: site owner · executor: coding agents

> **Read this first.** Do not trust a historical HEAD SHA recorded in this
> document. Reconcile against repository state **at execution time**. Before
> starting a phase, record: current branch, commit SHA, dirty files, registry
> tool count (`tools.length`), unit-test count, and dataset snapshot status
> (`npm run verify:tax` for tax). A SHA in an older paragraph is an audit
> artifact, not a baseline to restore against.

v1's audit described the repository *before* the monetization layer existed.
Handing that version to an agent risked it reverting shipped work. §A.0 lists
what must be preserved.

This plan is written to be executed sequentially by coding agents. Each **open**
phase states its goal, files, work, data dependencies, tests, acceptance,
risks and rollback. Closed phases are historical: do not re-execute them.
Nothing in it is a new product idea; where it differs from the brief it says so.

Read `docs/ARCHITECTURE.md` first. It is accurate and still governs. This plan
extends it; it does not replace it.

---

## 0. Three corrections to the brief, up front

**0.1 There are 60 calculators, not ~53.** The last inventory in this file
said 58; two P4 tax tools (`effective-tax-rate`, `federal-tax-bracket`) have
landed. Confirm `tools.length` at execution time. §C still lists 43 candidate
ids that would land on 101 without duplicate intent. **101 is a catalog target,
not a sacred product number.** A smaller set of high-value tools plus Job Cost
Engine V1 outranks filling the list.

**0.2 The v2 ten-day day-map is archived.** It assumed P2 was the live Lane A
work. P2 is closed. §L is now the 2026-09-07 execution sequence, not a
calendar of ten days. Medical Cost remains wave 2. Full ES-US parity remains
waves 2–4. Nothing in the brief is dropped.

**0.3 The state tax engine was the largest correctness defect; P2 closed it.**
`data/tax/2026.json` is 51/51 `supported` (42 income-tax schedules + 9 no
wage tax). Mixed-year 2025 annual packets stay declared where 2026 forms are
unpublished. Local city/county tax is named, not computed. Further state-tax
work waits on newly published 2026 forms or a city/ZIP local-tax engine
(`docs/P2_STATE_TAX_FINAL.md`).

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
| Tool registry contract | Solid | 60 typed entries, indexability evidence, typed relationship edges, cluster graph |
| Calculation engines | Solid | 44 modules under `lib/calculations/`, pure, versioned, `CalculationResult<T>` with `breakdown`/`assumptions`/`datasetSnapshotIds` |
| Numeric quality | Solid | `finance/loan.ts` uses `log1p`/`expm1` for rate stability; OEWS packing proved lossless value-by-value |
| Data provenance | Strong | 16 datasets under `lib/data/`, envelope with provider/period/hashes/validation, atomic promotion, quarantine on suspicious revision |
| Freshness model | Strong design | `lib/data/freshness.ts` models each provider's own release calendar; `current` / `update-due` / `stale` is the right three-state answer |
| Salary family | Shipped | 761 occupations, 51 state hubs, 30,807 leaves exist; **leaves are staged** (`occupationInState: 'staged'`) so the live sitemap is the 813 hubs/occupation pages until GSC is measured |
| Editorial depth | Shipped | Every tool has guide + FAQ + glossary + tips + caveats; registry asserts coverage |
| Calculation Receipt | Shipped (unnamed) | `ResultDetails` renders "How we got this" / "What we assumed" / method version + snapshot ids |
| SEO plumbing | Shipped | Self-canonicals, sitemap index + family partitioning, JSON-LD (`WebApplication`, `Article`, `BreadcrumbList`, `FAQPage`, `Occupation`, `Dataset`), robots |
| Tests | Good | 36 spec files, 683 unit tests, all green; Playwright journey suites for tools and monetization |
| Security headers | Shipped | CSP, HSTS, COOP, frame-deny, permissions-policy in `next.config.ts` |

**Last inventory in this document (2026-09-07).** Re-measure before a phase;
do not treat these as HEAD.

| | v1 audit | 2026-09-07 inventory |
| --- | --- | --- |
| Registry tools | 58 | **60** — confirm `tools.length` |
| Unit tests | 496 | hundreds, green — confirm `npx vitest run` |
| Lint | 2 errors | **0 errors** (P1 closed this) |
| Typecheck | 538s | **~8s** (P1 closed this) |
| Largest client chunk | 3.84 MB raw CMS dump | React-sized; measure gzip via `scripts/check-bundle-budget.mjs` |
| Worker JS | — | **budget: ≤ 2.8 MiB gzip** (ours, not Cloudflare's ceiling) |
| Client route chunk | — | **budget: ≤ 150 KiB gzip** |
| State wage tax | 14/51 | **51/51 — P2 closed** |
| Salary leaves | 31,621 indexable in v1 code | **staged** in current code — crawl/indexation, not tax (§J.1) |

### A.2 What is incomplete

| Gap | Detail | Blocks |
| --- | --- | --- |
| **State tax** | **P2 closed.** Do not re-open. Local/payroll tax is a separate engine | — |
| **Localization** | Zero. Root `app/layout.tsx` hardcodes `<html lang="en">`. Nested `/es` cannot change it — P6 needs dual root layouts (§G.2) | ES-US slice |
| **Content engine** | No `/guides` surface. Per-tool editorial in `lib/tool-content/` is the only long-form | P8 |
| **Job Cost Engine** | Does not exist | P7 — the product moat; do not bury it behind 43 generic tools |
| **Medical Cost Engine** | Medicare *premium* calculator only | wave 2 |
| **Analytics sink** | Local `CustomEvent` bus; `analyticsEnabled` off | Connect **as soon as the custom domain is live**, not on a final launch day |
| **Search Console / Bing** | Not connected | Same: the day the domain is live, not P9 |
| ~~Missing analytics events~~ | **P5 closed.** All seven added to `lib/analytics.ts` behind the strict field allowlist. `related_calculator_clicked` was deliberately not added: `related_tool_click` already carries it | — |
| ~~Basic/Advanced / compare / reverse / confidence~~ | **P5 closed.** `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceChip`, `CalculationReceipt` in `CalculatorUI.tsx`, logic in `lib/calculators/depth.ts`, 24 tests | — |
| ~~GSA per diem refresh + published-vs-effective~~ | **P3 closed.** In the refresh script; `data/gsa-perdiem/releases.json` exists | — |
| ~~Freshness enforcement + clock~~ | **P3 closed.** Runtime clock via `utcCalendarDate()`; CI `verify:freshness` | — |
| **Custom domain** | Not deployed | **Launch blocker** (P1 deploy). D1 is not. |

### A.3 Architectural debt

#### Historical defects — closed (do not re-fix)

P1 closed: CMS marketplace snapshot no longer ships in a client chunk; lint
errors that made `verify` disagree with CI; three iCloud conflict copies;
nine-minute typecheck; salary hub/state edge cache; Playwright nvm path and
CI `lint` / `test:e2e`. P2 closed: 51/51 state wage tax.

Do not reopen those as current bugs. Evidence is in the P1 and P2 cards.

#### Current architectural debt

1. **Reference-data size discipline.** Job recipes, material tables and any
   medical files go to **tier 2** (Worker static assets), not the JS bundle.
   Policy: client route-specific chunk ≤ **150 KiB gzip**; Worker JS ≤ **2.8 MiB
   gzip**. `scripts/check-bundle-budget.mjs` currently measures client chunks as
   **raw 200 KiB** and the Worker as gzip 2.8 MiB — **align the script to the
   gzip policy** before treating the numbers as the same gate.
2. **No money primitive / property tests.** No integer-cents type, no
   `fast-check`. Each engine defines its own valid properties — do **not**
   assert global “tax is monotonic in income” once credits exist.
3. ~~`components/calculators/` is still a flat directory.~~ **Closed.** Cluster
   subfolders (`money/`, `home/`, `car/`, …) shipped before the P4 wave.
4. ~~Freshness SLA and runtime clock (P3).~~ **Closed.**
5. **Custom-domain deploy** (P1 remaining). Launch blocker.
6. **Analytics + Search Console + Bing** the day the domain is live, not at
   the end of the catalog.
7. **Localization architecture** (P6) — dual root layouts for `<html lang>`.
8. **Job Cost Engine** (P7) — the product moat; data model rules in §D.
9. ~~Monolithic `lib/tool-registry.ts`.~~ **Closed.** Fragments live under
   `lib/tools/registry/` with a generated index.

### A.4 Blockers, in order

| # | Item | Phase | Status |
| --- | --- | --- | --- |
| B1 | CMS snapshot in the client bundle | P1 | **closed** |
| B2 | Missing state income-tax schedules | P2 | **closed** |
| B3 | Production deploy on `costanswer.com` | P1 | **open — launch blocker** |
| B4 | Analytics, Search Console, Bing | P1 deploy day | **open — start the day B3 ships, not P9** |
| B5 | `verify` vs CI lint mismatch | P1 | **closed** |
| B6 | Mortgage cron weekday vs PMMS Thursday | P3 | **closed** |
| B7 | 30,807 salary leaves | J.1 | Tax defect **closed**. Leaves stay staged for **new-domain crawl/indexation**, not because state tax is missing |
| B8 | Nine-minute typecheck | P1 | **closed** |
| B9 | D1 + monetization secrets | Monetization activation | **not a public-launch blocker** while providers stay off |

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
| **Storage tiering** | `lib/data/store/` | Job + Medical data cannot live in the JS bundle (§B.3) |
| **Locale layer** | `lib/i18n/`, dual root layouts `app/(en)/`, `app/(es)/es/` | ES-US is half the product; nested `/es` cannot set `<html lang>` |
| **Content family** | `lib/content/`, `app/guides/` | Guides are a family like salary, not registry tools |
| **Job engine** | `lib/job/` | Product moat — sequence step 5, not after 43 generic tools |
| **Medical engine** | `lib/medical/` | New vertical (wave 2) |
| **Shared depth primitives** | `components/calculators/CalculatorUI.tsx` | `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceChip`, `CalculationReceipt` — **before P4** |

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

**On the Worker size budget.** v1 justified a 2.8 MiB gzipped budget as a
platform ceiling. That justification was wrong — Cloudflare's own Worker size
limit is far above it. The budget stays, with the honest reason:

> 2.8 MiB gzip is **our** budget, not the platform's. It protects cold-start
> and deploy time, and it is the thing that stops a dataset drifting into the
> bundle. A budget set at the platform limit never fires, and the failure it
> would have caught arrives on somebody's phone instead.

Enforced by `scripts/check-bundle-budget.mjs` in CI. One **policy** standard,
gzip only:

- client **route-specific** JS chunk ≤ **150 KiB gzip**
- total Worker JS ≤ **2.8 MiB gzip**

Do not mix raw bytes with gzipped bytes in the same comparison. As of
2026-09-07 the script still uses **200 KiB raw** for client chunks and gzip
only for the Worker. Aligning the script to this policy is remaining P1 work;
until then, do not cite the script output as if it already measured 150 KiB gzip.

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

48 − 5 = **43 candidate tools.** 58 + 43 = **101 catalog target.** 101 is not a
sacred ship number (§0.1, §L). Job Cost Engine V1 outranks filling this list.

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
| 13 | `effective-tax-rate` | `/money/effective-tax-rate` | `us-tax` federal + state (**P2 closed**) |
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
| **Total** | **58** | **43 candidates** | **101 target** |

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
Location pages (`/cost/:job/:state`) are **not** opened at first public launch —
see §J. **Sequence: Job Cost V1 is step 5**, after P5 primitives and P4 tax
tools, before remaining catalogue expansion. Do not bury it behind 43 generic
calculators.

### D.2 Data model

`lib/job/types.ts`

Every numeric field that enters an estimate **names its source**. A bag of
`sources[]` next to a bag of numbers is not a mapping. Use field-level
provenance:

```ts
type SourcedValue<T> = {
  value: T;
  sourceId: string;
};

type RecipeSource =
  | { kind: 'official_data'; provider: string; url: string; retrievedAt: string }
  | { kind: 'published_specification'; publisher: string; document: string; retrievedAt: string }
  | { kind: 'observed_market'; dataset: string; observations: number; window: string }
  | { kind: 'model_transformation';
      inputs: string[];           // sourceIds this number is derived from
      method: string;             // one sentence
      rationale: string;
      confidenceImpact: 'none' | 'lowers_to_medium' | 'lowers_to_low';
      reviewedBy: string; reviewedAt: string }
  | { kind: 'model_assumption';
      rationale: string;
      confidenceImpact: 'none' | 'lowers_to_medium' | 'lowers_to_low';
      reviewedBy: string; reviewedAt: string };

type JobRecipe = {
  jobId: string;
  version: string;
  unit: JobUnit;
  trade: TradeId;
  crew: CrewMember[];
  laborHoursPerUnit: SourcedValue<number>;
  materials: MaterialLine[];      // each line: componentId, quantity, waste, critical
  equipment: EquipmentLine[];
  permit: PermitRule;
  disposal: DisposalRule;
  modifiers: ModifierSpec[];
  /** Business overhead on direct cost. Must not re-include ECEC labor burden. */
  overheadRate: SourcedValue<number>;
  /**
   * Markup on (direct + overhead), not a profit *margin*.
   * expected = subtotal × (1 + profitMarkupRate).
   * A 20% *margin* would be sellingPrice = subtotal / (1 - targetMargin).
   * V1 uses markup and says so on the page.
   */
  profitMarkupRate: SourcedValue<number>;
  contingencyRate: SourcedValue<number>;
  baseConfidence: Confidence;
  sources: Record<string, RecipeSource>;
};
```

A recipe fails validation if any `sourceId` is missing from `sources`, or if a
`SourcedValue` has no id. `model_assumption` is legitimate for overhead and
markup; it must not masquerade as a measurement, and it lowers confidence by
its own declaration.

### D.3 Calculation model

```
directLaborBurden = OEWS(soc, area).hourly × ECEC_loading_factor
  ECEC is a modelled national/regional compensation loading, not “this city's
  contractor loaded wage for this SOC”. Source kind: model_transformation
  over OEWS + ECEC. Do not also put benefits / payroll tax into overheadRate.

labor    = Σ(crew.count × laborHoursPerUnit × units × directLaborBurden)
material = Σ(qtyPerUnit × units × (1+waste) × componentPrice(componentId, asOf))
           componentPrice = baseline × (PPI_now / PPI_baseline)
           NO BEA RPP multiplier on materials in V1.
equipment= Σ(hoursPerUnit × units × equipmentProxyRate(rateId))
           FEMA Schedule of Equipment Rates is a public *cost proxy*,
           not a contractor market rental price. Label it that way.
permit, disposal per rule
────────────────────────────────────────────────────────
direct   = labor + material + equipment + permit + disposal
subtotal = direct × (1 + overheadRate)
expected = subtotal × (1 + profitMarkupRate) × (1 + contingencyRate) × Π(modifiers)
low/high = expected × confidenceBand(confidence, modifierSpread)
```

**Critical missing material.** If any `critical: true` material line is
unpriced, **do not produce a complete LOW/EXPECTED/HIGH**. Return an incomplete
result: labor and known lines may be shown, with an explicit statement that
verified material data is insufficient for a full price range. Quote Checker
returns `outside what we can assess`. A non-critical unpriced line may drop
out and lower confidence.

The result is a `CalculationResult<JobEstimate>` — same contract as every other
engine. Every modifier is its own `BreakdownStep`. **No unnamed adjustment.**

The band is **CostAnswer estimated range**, never “normal range” or a market
quantile. After permit/bid calibration (wave 2) the vocabulary can change.

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
| **BLS ECEC** | modelled labor-burden factor on OEWS hourly (not a local contractor loaded wage) | NEW |
| **BLS PPI** | material price escalation from a dated national baseline | NEW |
| **FEMA Schedule of Equipment Rates** | equipment *cost proxy*, labelled as such — not market rental | NEW |
| **BEA RPP** | labor-location fallback / confidence context where OEWS suppresses a trade. **Not a material price multiplier in V1** | **already ingested** |
| **HUD / ZIP geography** | user ZIP → county. Prefer HUD USPS ZIP crosswalk if available; shipped `zcta-county` is an **approximate ZIP/ZCTA match** and must be labelled that way | **already ingested** |
| **CostAnswer Material Basket** | 300–500 components, baseline price + PPI series mapping | NEW — CostAnswer IP |

**Explicitly excluded from V1** (§19): CWICR cost data (CC BY-NC 4.0 — not usable
commercially), RSMeans (no scraping, no dependency). Permit and DOT bid data are
**wave 2 calibration**, not V1 inputs (§D.8).

### D.6 Material Basket

`data/material-basket/` + `lib/job/materials.ts`.

```ts
type MaterialComponent = {
  componentId: string;
  unit: MaterialUnit;
  qualityTier: 'builder' | 'mid' | 'premium';
  baselinePrice: number;      // integer cents
  baselineDate: string;
  baselineSource: SourceRef;
  ppiSeriesId: string;
  /** V1 is always 'none'. RPP is not a construction-material index. */
  regionalAdjustment: 'none';
  critical: boolean;          // missing + critical → no complete estimate
  confidence: Confidence;
};

type MaterialLine = {
  componentId: string;
  quantityPerUnit: SourcedValue<number>;
  wastePercent: SourcedValue<number>;
  critical: boolean;
};
```

Current price = `baselinePrice × (PPI_now / PPI_baseline)`. Geography in V1
enters mainly through **labor** (OEWS area). RPP may appear as a confidence
or context signal, not as a silent material multiplier.

**Where a baseline may come from:** public procurement and bid data,
manufacturer-published prices, licensed or permitted price feeds, open
commercial catalogue data. **Never scraped from a retailer.**

**Where it may not come from:** a guess. An unpriced **critical** component
blocks a complete range. An unpriced **non-critical** component may drop out
and lower confidence. Filling rows with plausible numbers is the failure this
state exists to prevent.

V1 target: **as many of ~120 components as have real sources**, covering the 10
recipes. 300–500 is the wave-2 target.

### D.7 Confidence

Three levels, derived — never asserted. Do **not** use “≥80% of material cost
sourced” as the sole test: an unpriced expensive line is absent from the
denominator and can fake a high percentage.

| Level | Condition (all that apply are named on the page) |
| --- | --- |
| `high` | OEWS publishes the trade wage for the state; every **critical** material line is priced from a baseline < 12 months old; required material-line coverage is complete; no modifier at an extreme; no heavy model_assumption |
| `medium` | state wage falls back to national, OR material baselines 12–24 months, OR one extreme modifier, OR non-critical lines missing, OR labor burden is the ECEC model_transformation |
| `low` | trade wage suppressed, OR any critical baseline > 24 months, OR composite recipe, OR incomplete required-line coverage |

If any critical line is unpriced, skip the three-level chip and return
**incomplete** instead of `high` with a hole in the total.

Ranges are never presented to the dollar: `$7,900–$9,300`. Call it
**CostAnswer estimated range**.

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
Contractor quote              $14,800
CostAnswer expected           $11,900
CostAnswer estimated range    $10,600 – $13,700
Verdict                       Above our estimated range
```

Verdict vocabulary is fixed and never accusatory:
`below our estimated range` · `at the low end` · `within our estimated range` ·
`at the high end` · `above our estimated range` · `outside what we can assess`.

If any critical material is unpriced, the only legal verdict is
`outside what we can assess`.

Every "above" verdict is followed by the *reasons a higher quote can be correct*
(emergency service, premium materials, difficult access, permit and disposal
included, code upgrades, warranty, unmodeled scope). The word "overcharge" and
any synonym do not appear in the codebase. This is asserted by a test.

### D.10 UX flow

1. What job? (10 cards, searchable)
2. Where? (ZIP → county. Prefer HUD USPS ZIP crosswalk; otherwise the shipped
   ZCTA match, disclosed as approximate)
3. Scope (1–3 numeric inputs; the unit is named in plain words: "roof squares — about 1 per 100 sq ft")
4. Key modifiers (max 4, each with a plain-language option list, defaults pre-selected)
5. Result: LOW / **EXPECTED** / HIGH as **CostAnswer estimated range**, plus confidence — or an incomplete result
6. Breakdown: direct labor (with burden) · materials · equipment (FEMA proxy) · permit · disposal · overhead · profit markup
7. "Why this amount" — the modifier deltas, named
8. Compare a quote / refine

Steps 1–4 are one scrolling mobile screen, not a wizard. No ad slot between
step 4 and step 5.

### D.11 Files

```
lib/job/
  types.ts          recipe, estimate, modifier, confidence types
  recipes/          one file per job; 10 files
  labor.ts          OEWS hourly × ECEC modelled burden (not a local loaded wage)
  materials.ts      basket + PPI escalation; no RPP material multiplier
  equipment.ts      FEMA schedule as cost proxy, labelled as such
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
| `us-tax` | fed/state/FICA | yearly | state | US Gov PD + state | hand-transcribed | mixed-year packet or named local omission — **no `unsupported` wage-tax row remains** | tax family, salary |
| `census-omb-geography` | place identity | irregular | all | US Gov PD | file | last snapshot | location |
| `census-acs5` | median income | yearly | state/county | US Gov PD | API | last snapshot | salary |
| `hud-fmr` | rents | yearly (FY) | metro/county | US Gov PD | file + `releases.json` | prior FY | COL |
| `bea-rpp` | price parity | yearly | state/metro | US Gov PD | API | national | salary, COL; Job V1 **context/confidence only**, not a material multiplier |
| `usda-food-plans` | food cost | monthly | national | US Gov PD | file | last snapshot | COL |
| `irs-retirement-limits` | 401k/IRA caps | yearly | national | US Gov PD | hand-transcribed | prior year + label | retirement family |
| `gsa-perdiem` | per diem | yearly (FY) | ZIP/county | US Gov PD | API | CONUS standard | travel |
| `naic-insurance` | avg premium | ~yearly | state | NAIC (attributed) | file | last snapshot | insurance |
| `cms-marketplace` | premiums | yearly | county | US Gov PD | zip PUF | 30 states only | ACA family |

New for this plan:

| Dataset | Use | Cadence | Geo | License | Ingestion | Validation | Fallback | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `us-tax` **states** | 51/51 supported (P2 closed) | yearly | state | state agencies, PD | hand-transcribed + hash | golden vectors vs the state's own table | named local omission; mixed-year 2025 packets stay declared | P2 closed |
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
| `material-basket` | component prices | quarterly | national | CostAnswer IP over cited sources | manual + PPI | every component cites a source | critical unpriced → no complete estimate | P7 |
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
- **`<html lang>` is per-locale, via two root layouts.** Nested `app/es/**`
  cannot override the root `<html>`. App Router proof-of-concept **before**
  writing Spanish copy:

  ```
  app/
    (en)/
      layout.tsx          <html lang="en">
      …english routes…
    (es)/
      es/
        layout.tsx        <html lang="es">
        …spanish routes…
  ```

  Do not start P6 content until this PoC renders the correct `lang` on both
  `/` and `/es`.
- **Input preservation across the switch is privacy-scoped.** Non-sensitive
  UI state (locale, unit, filing-status *label*, selected tool) may travel in
  the query string. **Salary, household income, debt, insurance, health, and
  other calculation inputs must not.** Those go in `sessionStorage` on the
  client, or they reset. Putting them in the URL leaks them into history,
  server logs, referrers and analytics — which would void the “we do not send
  calculator inputs” policy. A reset is acceptable; a silently wrong or
  leaked value is not.

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
app/(en)/layout.tsx   English root: <html lang="en">
app/(es)/es/layout.tsx  Spanish root: <html lang="es">
app/(es)/es/…           Spanish surfaces
```

`lib/i18n/routes.ts` asserts at module load that the slug map is a bijection and
that no Spanish slug collides with an English one. A collision is a build failure.

### G.5 Launch scope

Full parity across 101 tools + 31,621 salary pages + guides is **not** a first
sequence deliverable and would be unwise before English traffic is measured. Launch ships
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
 → citation check             (schema/path/date on the record are valid)
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
hard gates are intent duplication, **citation schema/path/date correctness**,
and the quality score.

**Live URL resolution is not a deploy blocker.** Government sites 403, time
out, and rotate bot protection. Schema and path checks run in normal CI.
Fetching the live URL belongs in a **scheduled** job that opens an issue or
warning. A broken official URL is a content/ops ticket, not a reason to hold
a CostAnswer deploy. Critical source *replacement* is a separate editorial
decision.

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
| First public launch (after GSC is collecting) | 30 | 10 |
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

**Moved to wave 2.** Reasoning in §L. Medical stays out of the first execution
sequence. Local tax stays out of P2.

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

### J.1 The salary staging decision

`SALARY_PUBLICATION` in `lib/salary-pages.ts` currently has
`occupationInState: 'staged'`. The site ships 813 salary URLs — family hub,
state index, 51 state hubs, 761 occupation pages. The 30,807 occupation×state
leaves exist as routes but are `noindex` and out of the sitemap.

**State-tax correctness is no longer the staging blocker.** P2 is a resolved
prerequisite: those leaves would compute 51-jurisdiction wage tax. They stay
staged solely because a **new domain should not expose 30,807 programmatic
URLs before indexation behavior is measured.**

Open the leaves when Search Console shows, on the levels already live:

- indexed ratio worth expanding
- impressions on hubs/occupation pages
- duplication / canonical health (no mass soft-404 or near-duplicate clusters)

Then open in waves, measuring between them:

```text
P2 closed (resolved)
+ Search Console: indexed ratio + impressions + canonical health on 813 URLs
        ↓
    10k leaves → measure → next wave → measure → 30,807
```

Reversing this is still one word in `SALARY_PUBLICATION`. Opening them because
“the tax engine is done” is the wrong reason. Opening them because GSC says
the domain can absorb them is the right one.

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
| Unit — engines | vitest | every pure engine, boundaries, invariants | confirm count at execution |
| Schema | zod + vitest | missing / malformed / non-finite / out-of-range | ✅ |
| **Golden vectors** | `npm run verify:tax` + vitest | tax tools reproduce official worked examples. **Count is informational** — record the current vector count in the phase report; do not freeze a number in this document | P2 closed; P4 tax tools add theirs |
| **Property tests** | fast-check | **NEW, per engine:** amortization terminates at zero; extra payments never lengthen a term; `round()` is stable; every `CalculationResult` has ≥1 breakdown step. **Not** a global “tax is monotonic in income” — EITC, refundable credits and phase-outs make net tax non-monotonic | P5 |
| Cross-source validation | vitest | OEWS median vs ACS median is a **warning / investigation signal**, not a CI hard-fail (different populations and taxonomies). State tax vs an independent published effective rate at 3 incomes is a review check | P2/P4 |
| Data quality | ingest scripts | schema · units · geography · uniqueness · completeness · finiteness · domain invariants · previous-period diff · secret scrubbing | ✅ |
| **Freshness** | CI job + runtime or daily manifest | **NEW:** build fails if any dataset is `stale`; warns on `update-due`. User-facing current/update-due/stale uses **runtime `new Date()`** or a daily `freshness-status.json`, not a frozen build timestamp | P3 |
| Route smoke | `tests/e2e/routes.ts` | 200 + metadata on critical routes | ✅ |
| Browser journeys | Playwright | real inputs, keyboard, axe WCAG A/AA | in CI after P1 |
| **Lighthouse regression** | Lighthouse CI | **NEW:** perf ≥90 mobile on the tool template, LCP < 2.5s, CLS < 0.1, TBT < 200ms | after domain is live |
| **Bundle budget** | `scripts/check-bundle-budget.mjs` | **Policy:** client route-specific chunk ≤ **150 KiB gzip**; Worker JS ≤ **2.8 MiB gzip**. Script today: 200 KiB **raw** client, gzip Worker — align before citing them as one gate | P1 remaining |

**P1 CI items (closed):** `lint` and `test:e2e` in `verify.yml`; nvm path
removed from `playwright.config.ts`. Do not re-do them.

---

## L. Execution sequence (rebased 2026-09-07)

> This is a **priority sequence**, not a ten-day calendar. The v2 three-lane
> day-map assumed P2 was live Lane A work. That map is **historical** and must
> not be executed. Quality gates in §M still decide what ships; a gate that
> has not passed is a reason to hold, not a reason to lower the gate.
>
> Medical Cost remains wave 2. Local/payroll tax remains a separate engine.
> Full ES-US parity remains waves 2–4.

### L.0 Historical launch cut v2 — do not execute

The 10-day table (Lane A = P2 days 1–4, Lane B = 43 calculators, Lane C =
platform, Day 10 = Search Console) is archived. It is useful only as a record
of what the pre-P2 plan believed. Coding agents must not treat “Day 1–4 =
P2” as current work.

### L.1 Current sequence

| Step | Work | Why this order |
| --- | --- | --- |
| **0** | **Clean checkpoint.** Commit the dirty working tree (CT Table A, IL/MI/NM/VT/RI dependents, snapshot, tests, this rebase). Record branch, SHA, dirty files, `tools.length`, test count, `npm run verify:tax` vector count | P2 close must have a clean baseline before any new phase |
| **1** | **Production deploy + measurement.** Custom domain, TLS, `www` redirect. The day the domain is live: analytics, **Google Search Console**, Bing Webmaster Tools. Lighthouse/smoke as available | GSC is the data source for later expansion, not a last-day checklist item. D1 + monetization secrets are an **activation** blocker, not a public-launch blocker while providers stay off |
| **2** | ~~P3 Freshness SLA~~ **closed** | Runtime clock and per-cadence refresh shipped |
| **3** | ~~P5 shared primitives~~ **closed** | Done. P4 is now unblocked |
| **4** | **P4 tax / high-value finance tools** — two landed (`effective-tax-rate`, `federal-tax-bracket`); remaining W-4, refund, EITC, CTC, quarterly, capital gains, plus adjacent high-intent finance | Unblocked by P2 and P5 |
| **5** | **P7 Job Cost Engine V1** | The product moat. Do not wait for 43 generic calculators. Field-level `SourcedValue`, `profitMarkupRate`, critical materials, no RPP-on-materials — §D |
| **6** | **Remaining P4 catalogue** | Fill toward 101 only after Job V1 exists. 60 → ~67 quality tools + Job Engine can outrank 101 generic tools |
| **7** | **P6 Spanish slice / P8 guides** | After some GSC signal exists. Dual-root-layout PoC before P6 copy. Similarity is a review signal, not a hard 0.85 CI gate |
| **—** | **Launch / expansion gates** | Salary leaves, more guides, `/cost/:job/:state`, catalog to 101 — all gated on GSC indexed ratio, impressions, duplication/canonical health |

### L.2 Dependency arrows

```
0 checkpoint ──► 1 deploy
1 deploy ──► GSC + Bing + analytics (same day as live DNS, not “P9”)
P1c tier-2 ──► P7 (job data has no bundle room otherwise)
P2 closed ──► P4 tax tools (refund / W-4 / EITC / CTC)   [resolved]
P2 closed ──► J.1 as a tax prerequisite                  [resolved; crawl budget remains]
P5 ──► P4 (any new calculator)
P5 ──► P7 UI
P6 dual-root-layout PoC ──► P6 Spanish copy
P7 types (§D.2) ──► P7 recipes
```

### L.3 Parallelism

P3 can overlap late P1 deploy work. After P5, P4 tax tools can run as one
agent per tool **if** the registry is fragmented (`lib/tools/registry/*.ts` +
generated index). A monolithic `lib/tool-registry.ts` **will** conflict when
ten agents append to the same file. Job Engine data ingest can overlap P4 tax
tools once types exist. P6 architecture PoC can overlap P4/P7; P6 copy should
not.

**Rule: one agent per tool, one commit per tool** — after the registry is no
longer a single append-only file.

### L.4 Still out of the first sequence, and why

**Medical Cost pilot → wave 2.** Hospital MRF files are the least standardized
public dataset in this plan. A rushed medical-price page is the highest-liability
surface on the site.

**Full ES-US parity → waves 2–4.** Architecture + a complete ~60-page slice
first. Machine-translating to hit a count produces thin duplicates.

**Permit / DOT-bid calibration → wave 2.** V1 is engineering-first. The
calibration seam ships in V1; the evidence does not.

**Local / payroll tax → its own engine.** Do not reopen P2 for city rates.

### L.5 Later waves

| Wave | Window | Contents |
| --- | --- | --- |
| 2 | after GSC has a few weeks of data | Medical pilot (TX, 15 procedures) · permit + DOT-bid calibration · salary leaves wave 1 only if indexed-ratio/impressions/canonicals look healthy · guides to 150 EN / 60 ES · material basket to 300 |
| 3 | following | Event-driven content · job recipes 11–20 · `/cost/:job/:state` where data moves the answer · further salary-leaf waves · ES slice to 60 tools |
| 4 | following | Medical expansion beyond TX · guides to 600/250 · Real Quote Dataset (optional) · ES full parity on tools |

---

## M. Acceptance criteria by phase

**P1 — Platform and blockers** — met except custom-domain deploy
- ✅ `npm run verify` exits 0; lint has zero errors.
- ✅ `verify.yml` runs `lint`, the bundle budget and `test:e2e`; no absolute local path in `playwright.config.ts`.
- ✅ Bundle budget **script exists** in CI. **Policy:** client route-specific chunk ≤ **150 KiB gzip**; Worker JS ≤ **2.8 MiB gzip**. Script still measures client as **200 KiB raw** — aligning it is remaining P1 work. No dataset chunk in client JS.
- ✅ Worker JS ≤ **2.8 MiB gzip** — **our** budget, not a platform ceiling.
- ✅ The three conflict copies are deleted.
- ✅ Typecheck under 30s.
- ⬜ `https://costanswer.com` serves the production build over TLS; `www` redirects. **This is the public-launch blocker.**
- ⬜ Analytics + Search Console + Bing connected **the day the domain is live**.
- ⬜ `/money/marketplace-plans` and `/money/health-insurance` re-verified in a browser after the tier move.
- D1 provisioned, migrated, and `MONETIZATION_*` secrets set — **monetization activation blocker**, not a public-launch blocker while every provider stays off.

**P2 — State tax — CLOSED 2026-09-07. Do not execute.**
- `data/tax/2026.json` has **51 supported** rows; zero `unsupported`.
- Every state carries `sourceUrl`, `publishedAt`, `verifiedAt` and `scheduleTaxYear`.
- `npm run verify:tax` **must pass**. Golden-vector count is informational; record the current count in any report. Do not treat a number written here as the required total.
- Acceptance record: `docs/P2_STATE_TAX_FINAL.md`. Remaining mixed-year rows and named local omissions are stated limitations, not open P2 work.

**P3 — Freshness SLA — CLOSED 2026-09-07. Do not execute.**
- Every `scheduled` dataset has a cron whose day-of-week matches the provider's own release day (PMMS Thursday, EIA gasoline Monday, BLS mid-month).
- `gsa-perdiem` is in `scripts/refresh-snapshots.ts`.
- `data/gsa-perdiem/releases.json` exists and `resolveEffectivePerDiemRelease` mirrors the HUD implementation; a test proves FY2027 is *published* and *not effective* on 2026-09-30, and effective on 2026-10-01.
- CI fails when any dataset evaluates `stale`; warns on `update-due`.
- User-facing current / update-due / stale uses **runtime `evaluateFreshness(dataset, new Date())`** or a daily-deployed `freshness-status.json`. A build timestamp is **not** sufficient: it does not age on a long-lived deploy. SEO publication decisions may still use the build snapshot.
- No dataset is `stale` at public launch.

**P4 — Calculators (after P5)**
- **Execution dependency: P5 must be completed first.**
- Catalog target is 101; it is not a sacred ship number. High-value tax/finance tools + Job Engine outrank filling the list.
- Every **shipped** tool has: engine with `calculationVersion` + `datasetSnapshotIds` + `breakdown` + `assumptions`; a unique `ToolEditorial`; a self-canonical page; valid JSON-LD; regression tests.
- No two tools share a `searchTerms` primary phrase (duplicate-intent guard, asserted).
- Every tax tool has a golden vector against the IRS's own published example.
- Registry fragments under `lib/tools/registry/` (or equivalent) so parallel agents do not share one append-only file.

**P5 — Depth primitives (before P4)**
- `AdvancedSection`, `ScenarioCompare`, `ReverseSolve`, `ConfidenceChip`, `CalculationReceipt` exported from `CalculatorUI.tsx`, each with a test.
- Every tool with more than 5 inputs uses `AdvancedSection`; asserted by a lint rule or a test over the component set.
- No tool renders a confidence claim without a derived reason string.
- Zero ad slots between an input and a primary result; asserted by the Playwright suite.

**P6 — Localization**
- Dual root layouts: `/` serves `<html lang="en">`, `/es` serves `<html lang="es">`. PoC before copy.
- `lib/i18n/routes.ts` slug map is a proven bijection; build fails on collision.
- Every localized page emits reciprocal `hreflang` (`en-US`, `es-US`, `x-default`) and a self-canonical.
- Spanish sitemaps are separate files; no Spanish URL appears in an English sitemap.
- No IP-based redirect exists anywhere in the codebase (asserted by grep test).
- All 60 slice pages have authored Spanish copy; zero pages mix languages.
- Language switcher never puts salary/income/debt/insurance/health inputs in the query string.

**P7 — Job Cost Engine**
- 10 recipes validate; every numeric field is a `SourcedValue` whose `sourceId` exists in `sources: Record<string, RecipeSource>`.
- Field is named `profitMarkupRate` (markup, not margin). `expected = subtotal × (1 + profitMarkupRate)`.
- Direct labor burden (OEWS × ECEC model_transformation) is separate from business `overheadRate`; benefits are not double-counted.
- Materials: national baseline × PPI. No BEA RPP material multiplier in V1.
- FEMA equipment output is labelled a **cost proxy**, not a market rental rate.
- ZIP geography provenance names HUD USPS crosswalk or **approximate ZIP/ZCTA match**.
- A `critical: true` unpriced material line yields **no complete estimate**; Quote Checker returns `outside what we can assess`.
- UI copy: **CostAnswer estimated range** / **Within our estimated range** — not “normal range”.
- Confidence uses required/critical line coverage, labor geography, baseline age, assumption weight, calibration evidence — not “% of priced material dollars” alone.
- `/cost/estimate` returns LOW / EXPECTED / HIGH + confidence + a breakdown whose lines sum to the expected value within $1 — or an incomplete result.
- Every applied modifier appears as a named breakdown step; a test asserts no unnamed adjustment can change the total.
- `/cost/check-quote` returns one of the six fixed verdicts and, for any "above" verdict, at least three legitimate reasons.
- A test asserts the strings "rip off", "ripoff", "overcharge", "scam" appear nowhere in `lib/job/` or `components/job/`.
- Job data lives in tier 2, not the bundle; Worker budget still met.

**P8 — Content engine**
- 30 EN + 10 ES guides live under `/guides` and `/es/guias`.
- Every guide names ≥1 calculator, ≥1 dataset, its sources with dates, and a last-reviewed date.
- Similarity score is **calculated and recorded**; flagged documents require review. **No hard <0.85 CI gate** until 500–1,000 guides exist to calibrate against (§H.2).
- Citation schema/path/date correctness is in normal CI. Live URL fetch is scheduled; a 403/timeout does not fail deploy.
- `lib/content/publication.ts` can withdraw a cluster in one edit.

**P9 — Go/no-go (not “connect GSC”)**
- Custom domain already live; GSC/Bing/analytics already collecting (step 1).
- Every remaining item in §N checked and evidenced.
- Expansion (salary leaves, more tools, more guides) uses GSC indexed ratio + impressions + canonical health.

---

## N. Launch checklist

**Public-launch blockers**
- [ ] `costanswer.com` resolves; TLS valid; `www` → apex 301
- [ ] `NEXT_PUBLIC_SITE_URL=https://costanswer.com` at build; no localhost canonical anywhere in the output
- [ ] Security headers present in production response (CSP, HSTS, COOP, X-CTO, frame-deny, permissions-policy)
- [ ] Edge cache headers on `/salary/:occupation` and `/salary/states/:state`, not just the leaves

**Measurement — same day the custom domain is live, not a last-day item**
- [ ] Analytics enabled with no calculator input values in any payload (asserted by the event boundary test)
- [ ] Cookie/consent posture matches what analytics actually sets
- [ ] Google Search Console verified; sitemap submitted
- [ ] Bing Webmaster Tools verified; sitemap submitted

**Monetization activation (not required to serve the public site)**
- [ ] D1 provisioned and migrated; `MONETIZATION_*` secrets set — only when a provider is being turned on
- [ ] Lead capture stays disabled if D1 is absent

**Crawl and index**
- [ ] `/robots.txt` correct; sitemap absolute URL
- [ ] `/sitemap.xml` index resolves; every child sitemap returns 200 and validates
- [ ] Self-canonical on every page; no cross-canonical
- [ ] `hreflang` reciprocal and `x-default` present on all localized pairs
- [ ] `noindex` on staged families verified by fetching three sampled URLs
- [ ] Structured data validates in the Rich Results Test for each page type

**Correctness**
- [ ] `npm run verify` green
- [ ] All 51 states supported in the tax snapshot (`npm run verify:tax` passes; record the vector count)
- [ ] No dataset `stale`; none `update-due` without a scheduled job about to fix it
- [ ] Every calculator's golden vectors pass
- [ ] Data page (`/methodology/data`) lists all datasets with observation period, publication date and freshness status

**Experience**
- [ ] Lighthouse mobile: performance ≥90, a11y ≥95, best practices ≥95, SEO 100 on the tool template, home, a salary page and a job page
- [ ] LCP < 2.5s, CLS < 0.1, TBT < 200ms on 4G throttle
- [ ] Client route-specific chunk ≤ 150 KiB gzip; Worker JS ≤ 2.8 MiB gzip
- [ ] Playwright suite green including axe WCAG A/AA
- [ ] Keyboard-only pass on one tool per category
- [ ] 375px-wide pass on the ten highest-traffic pages
- [ ] No ad slot between input and primary result (asserted)

**Links and errors**
- [ ] Zero broken internal links (crawl)
- [ ] 404 page useful and returns HTTP 404
- [ ] Every redirect in `next.config.ts` resolves in one hop
- [ ] External citation URLs: schema/path checked in CI; live fetch is scheduled (a 403 does not block deploy)

**Legal and trust**
- [ ] Privacy policy live with effective date and version
- [ ] Terms live
- [ ] Contact route works and reaches a monitored inbox
- [ ] Attribution present for NAIC and Freddie Mac

**Smoke**
- [ ] Production smoke: one calculation per category returns a correct known value
- [ ] `/cost/estimate` and `/cost/check-quote` return a result in production (once P7 ships)
- [ ] One Spanish page renders fully in Spanish with correct `hreflang` (once P6 ships)

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
  D1 + secrets + migrations are the **activation** prerequisite for that change,
  not a reason to hold the public site.
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

Open cards are executable as written. **Closed cards are historical — do not
re-execute them.** Reconcile repository state before starting any open phase.

---

### P1 — Platform, deployment, and the bundle blocker · **DONE except deploy**

**Goal.** A live custom domain, a green release gate, and no dataset in the
browser.

**What landed.**

| # | Was | Now |
| --- | --- | --- |
| 1 | 3,842,883-byte CMS chunk shipped to every visitor of two YMYL pages | **0.** Priced server-side via `app/api/marketplace/quote`. Script exists; **align it** to 150 KiB gzip client / 2.8 MiB gzip Worker (today: 200 KiB raw client) |
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

**Still open.**

**Public-launch blocker (credentials, not engineering):**
- `wrangler deploy`; bind `costanswer.com`; verify TLS and the apex/www redirect
- The day DNS is live: analytics, Search Console, Bing

**Monetization activation (not required to serve pages):**
- `wrangler d1 create costanswer-monetization`, then `npm run monetization:migrate`
- Set `MONETIZATION_D1_DATABASE_ID`, `MONETIZATION_HASH_PEPPER`, `MONETIZATION_ADMIN_TOKEN`

**Acceptance.** §M P1 — met except the public-launch items above.

**Rollback.** The tier boundary is one route and one hook; reverting restores
the bundled imports and the budget check is the only thing that then fails.

### P2 — CLOSED. Historical phase. Do not execute.

**Closed 2026-09-07.** 51/51 supported. Authoritative record:
`docs/P2_STATE_TAX_FINAL.md`.

Do **not** transcribe schedules, extend the policy union, leave states
unsupported, or treat New York as 2025-only. Those instructions described the
pre-close world and will make an agent re-open finished work.

What actually shipped (summary only — do not re-implement): NY 2026 production
with recapture/supplemental computation; Wisconsin piecewise standard
deduction; stepped deductions; exemption credits; federal-tax deduction; FTI
basis; bracket base-tax; dependent rules; local omission metadata; and more
shapes than the original three-member union. Mixed-year 2025 annual packets
remain **declared** where 2026 forms are unpublished.

State tax may be reopened only when:

- an official 2026 annual source supersedes a declared mixed-year parameter,
- a verified tax-law change is discovered,
- or a separately scoped local/payroll tax engine is approved.

Anything else is out of scope for this card.

---

### P3 — Data freshness SLA and missed-release monitoring — **CLOSED 2026-09-07**

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
5. Address the frozen clock. `evaluateFreshness` must not treat a **build
   timestamp** as “now”. A build timestamp is fixed for the life of that
   deploy: six months later the label still says the build date, so it does
   not age.

   Pick **one** of:

   - **A.** Server/runtime: `evaluateFreshness(dataset, new Date())` for
     user-facing current / update-due / stale chips.
   - **B.** A daily workflow writes `freshness-status.json` (or equivalent)
     and deploys it as a static asset; the UI reads that manifest.

   SEO publication decisions (index vs noindex, sitemap inclusion) may keep
   using the build snapshot. User-visible freshness must use a runtime clock
   or a regularly updated manifest.

**Data dependencies.** None new.

**Tests.** Per-provider next-release-date tests · GSA published-vs-effective
across the 1 Oct boundary · a test that every `refreshMode: 'scheduled'` dataset
appears in a refresh script (this is the assertion that would have caught GSA).

**Acceptance.** §M P3.

**Risks.** More frequent crons mean more PRs. Mitigate by auto-merging refresh
PRs that pass `verify` and change only `data/**`.

**Rollback.** Revert to the weekly cron; freshness labels stay honest either way.

---

### P4 — High-value calculators, then catalogue expansion

**Execution dependency: P5 must be completed first.** Do not start this card
until the shared primitives exist. Sequence inside this card: tax / high-value
finance tools first (step 4), remaining catalogue after Job Cost V1 (step 6).
101 is a target, not a ship requirement.

**Goal.** Each new tool meets the §4 standard. Prefer W-4, refund, EITC, CTC,
effective tax, quarterly estimated tax, and capital gains before generic
catalogue fillers.

**Files.** Per tool: `lib/calculations/<domain>/<tool>.ts` ·
`components/calculators/<cluster>/<Tool>Calculator.tsx` ·
`app/money/<slug>/page.tsx` · a `ToolEditorial` in the matching
`lib/tool-content/` file · `tests/<tool>.spec.ts` · one module under
`lib/tools/registry/<tool-id>.ts`. Plus new datasets per §E.

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
   adding a large wave — a 95-file flat directory is not navigable.
4. One agent per tool, one commit per tool. **Do not append to a single
   `lib/tool-registry.ts`.** Git will conflict. Split into
   `lib/tools/registry/*.ts` with a generated or globbed `index.ts` (or
   build-time fragments). That is the parallel-agent model.

**Data dependencies.** §E new rows: `irs-pub15t`, `irs-credits`, `irs-rmd`,
`ssa-benefits`, `irs-hsa`, `fha-va`, `sofr-index`. State-aware tools use the
closed P2 snapshot.

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
golden vector against the IRS's own published example. Per engine: only that
engine's mathematically valid properties — **not** global tax-monotonicity.
Registry-wide: no duplicate primary search phrase, editorial coverage
(already asserted). Do not assert `tools.length === 101` as a release gate
until the owner decides the catalogue is the priority over Job Engine quality.

**Acceptance.** §M P4.

**Risks.** Volume. The mitigation is engine reuse — 28 of the 43 are
re-parameterizations of `finance/loan`, `finance/interest`, `finance/credit-card`
or `tax/annual`, all shipped and tested. The 15 that need new rule data are the
schedule risk.

**Rollback.** Per tool: remove its registry fragment. The route 404s; nothing else
breaks.

---

### P5 — Shared depth primitives — **CLOSED 2026-09-07**

**Ran before P4.** Sequence step 3. P4's phase number is historical; this card
was the dependency and it is now met.

**What shipped.** The five primitives are exported from `CalculatorUI.tsx`,
with their arithmetic and text in `lib/calculators/depth.ts` so it is testable
in the node environment the suite already uses and is not bundled per tool.

Nineteen tools opened with more than five inputs; all now fold their optional
ones away. Three of them — auto coverage, health insurance, Medicare — had
hand-rolled the same disclosure as a bare `<details className="health-advanced">`,
which is exactly the duplication this card existed to remove, so they were
switched to the primitive rather than left alongside it.

One documented exemption: duration arithmetic takes two durations as
hours/minutes/seconds, so it counts as six fields while asking for two things.
Folding any of them would hide half of one duration. The test names the
exemption and fails if that panel ever stops being crowded.

`ReverseSolve` reports `unreachable`, `flat` and `invalid-range` as named
outcomes rather than returning the closest value, because the closest value
looks like a yes. Its solver is bisection and requires monotonicity across the
bracket — which is why §M's warning about net tax not being monotonic in income
is a real constraint on where it may be pointed, not a formality.

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

**Files.** `lib/i18n/*` · `app/(en)/layout.tsx` · `app/(es)/es/layout.tsx` ·
`app/(es)/es/**` · `lib/seo.ts` · `lib/seo/sitemaps.ts` ·
`components/site/SiteHeader.tsx` · registry `slugEs?`.

**Work.** §G in full. Order: **dual-root-layout PoC that proves `<html lang>`**
→ locale types → route map with bijection assert → `alternates.ts` → sitemap
families → header switcher (non-sensitive query; sensitive inputs in
sessionStorage or reset) → the 60-page slice. Do not write Spanish copy until
the PoC is green.

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

**Work.** Order: **types with `SourcedValue` and `profitMarkupRate`** → labor
(OEWS hourly × ECEC modelled burden, not a local loaded wage; burden ≠
overhead) → materials (national + PPI; **no RPP multiplier**) → equipment
(FEMA as cost proxy) → permits → modifiers → estimate (critical unpriced →
incomplete) → confidence (coverage, not priced-dollar %) → calibration seam →
recipes → routes → quote check (estimated-range copy; incomplete → outside
what we can assess) → UI.

**Data dependencies.** OEWS (shipped) · ECEC, PPI, FEMA · material basket v0 ·
geography: prefer HUD USPS ZIP crosswalk; otherwise shipped `zcta-county`
labelled as approximate ZIP/ZCTA. BEA RPP is **context/confidence only** in
V1. All job data goes to tier 2, which is why P1c is a hard dependency.

**Tests.** Recipe validation (every `SourcedValue.sourceId` resolves) ·
breakdown sums to expected within $1 · every modifier is a named step · unnamed
adjustments are impossible · critical missing material blocks a complete range
· confidence cannot go high when a required/critical line is unpriced · the
six fixed verdicts · the forbidden-vocabulary assertion · one golden estimate
per recipe pinned against a hand-computed value.

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

**Files.** `lib/content/*` · `app/guides/**` · `app/(es)/es/guias/**` ·
`lib/seo/sitemaps.ts` · `data/guides/`.

**Work.** §H. The pipeline is code where it can be (duplication check,
similarity *score*, citation schema/path, quality score) and review where it must
be (editorial pass, financial fact check, flagged-similarity decisions). Live
URL fetch is scheduled, not part of deploy CI.

**Data dependencies.** Whatever each guide cites; no new dataset.

**Tests.** Every guide binds ≥1 tool and ≥1 dataset · citation schema/path/date
are valid in normal CI · **live URL fetch is scheduled, not a deploy gate** ·
similarity score recorded; flagged docs require review (**no hard <0.85**) ·
quality score ≥75 · `FAQPage` markup only where the questions are visible text.

**Acceptance.** §M P8.

**Risks.** The temptation to scale generation ahead of the indexation table in
§H.4. The gate in `lib/content/publication.ts` is what makes that a decision
rather than a drift.

**Rollback.** Set the guide family `staged`.

---

### P9 — Go / no-go

**Goal.** Confirm the public site is safe to keep live and that expansion
gates have data. **Do not wait until this card to connect Search Console.**
That happens in sequence step 1, the day the custom domain is live.

**Files.** `.env` production values · `app/robots.ts` · analytics provider wiring ·
`docs/ROADMAP.md` update.

**Work.** Remaining §N boxes. Lighthouse CI and Unlighthouse. Full smoke pass.
Record GSC indexed ratio, impressions, and canonical health as the input to
salary-leaf and guide expansion.

**Acceptance.** Every §N box that applies to what has actually shipped.

**Risks.** Treating this card as “the measurement day” repeats the v2 mistake.

**Rollback.** The Worker keeps its previous version; `wrangler rollback` restores
it. Data snapshots are immutable and versioned, so a rollback cannot lose data.
