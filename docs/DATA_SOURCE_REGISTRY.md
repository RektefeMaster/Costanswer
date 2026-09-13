# Data source registry

Every dataset CostAnswer uses, is evaluating, or has rejected — with the licence
read from the source's own files rather than remembered or inferred.

The machine-readable copy is [`data/source-registry.json`](../data/source-registry.json).
That file is the one the ingest scripts read; this one explains the reasoning.

## The rule this registry exists to enforce

> Learn to use data where it exists. Do not invent it where it does not.
> Normalise it when it is old. Validate it against a primary source when it is
> second-hand. Keep it out of production when the licence is unclear.

Which resolves into a division of labour that never blurs:

| Open source / GitHub | Government / primary publisher |
| --- | --- |
| Discovery — *which* document holds the number | Validation — *what* the number is |
| Bootstrap — a candidate value to check against | Final authority — the value that ships |
| Implementation intelligence — how others modelled it | The rule being modelled |

A number is never production truth because it appears in a repository. Equally,
we do not re-research from scratch what good open infrastructure already indexes.

## Trust levels

- **primary** — the body that creates the number. Its own publication is the authority.
- **secondary** — republishes or compiles primary figures. Usable to find and cross-check, never as the final value.
- **discovery** — not a data source at all. Used to locate the primary document, or to learn structure.
- **rejected** — evaluated and excluded, with the reason recorded so it is not re-evaluated.

## Tiers

Trust level says *who* published a figure. Tier says *what role it plays in an
answer*, which is the thing a reader actually needs, because a page prints four
different kinds of number next to each other and used to print them all in the
same font under one "this is an estimate" note.

| Tier | What it means | Printed as |
| --- | --- | --- |
| **A** | The publisher sets the number or the rule. Reproducing it correctly is the whole job. | `VERIFIED` |
| **B** | The publisher measures something and we use the measurement. | `OBSERVED` |
| **C** | Real observations that cannot be quoted as a price on their own; they calibrate a model. | `MODELED` |
| **D** | A value CostAnswer chose and reviews. | `MODELED` |
| none | Not shipped: a discovery aid, an evaluated candidate, or a rejected source. | — |

Anything the reader types over one of our defaults is `USER ENTERED`. That class
is produced at request time and is never authored in the registry, because no
file can know it in advance.

`lib/data/data-sources.ts` is the code that reads these tiers, and
`tests/data-manifest.spec.ts` asserts the two agree — a source cannot be tiered
in one place and not the other, and a row tiered `none` cannot be reachable from
a shipped tool.

Two tierings differ from the obvious reading, deliberately:

- **GSA per diem is A, not B.** GSA does not survey hotel prices and report
  them; it *sets* the ceiling a federal traveller may claim, and that ceiling is
  the answer the per-diem page exists to give.
- **CMS marketplace premiums stay B.** The landscape file records what issuers
  filed, which is a measurement of the market rather than a rule, and the
  premium a particular household is offered can differ from it.

### Compiled sources

A row with `partOf` is one document inside a compiled source. The tax snapshot
is transcribed from IRS Rev. Proc. 2025-32, Schedule SE, Form 1040-ES, Schedule
8812, the NIIT guidance and 51 state revenue departments, and ships as a single
source called `us-tax`. Each document keeps its own row, its own licence and its
own `lastVerified`; only the compilation is named on a page.

## What a calculator is allowed to depend on

Every tool in the registry carries a data manifest — `requiresData`,
`requiredDatasets`, `optionalDatasets`, `fallbackBehavior` and
`maxStalenessDays` — and `assertToolDataManifest` runs over the whole catalogue
at import.

The rule it enforces: **a calculator that can be solved from its own inputs must
never break because a government website changed a URL.** Most of this
catalogue is arithmetic. Amortisation, payoff order, unit price, compound
interest and the rest need no dataset at any point, and for the ones that seed a
field from official data — a mortgage rate, an electricity rate — that figure is
a courtesy default the reader can overwrite.

The converse is why the field is not advisory. `salary-after-tax` without the
2026 tables is not a slightly worse answer; it is a wrong one. A tool that
declares `requiresData: true` may not present a complete result when a required
source is missing or past its staleness limit, and the only fallback the type
system allows it is `blocked`.

| Fallback | What the page does | Example |
| --- | --- | --- |
| `blocked` | Says the answer is unavailable, and why | Salary after tax, per diem, marketplace plans |
| `user-entered` | Asks for the figure it was defaulting | Mortgage payment, electricity cost |
| `formula-only` | Drops a context line and keeps the answer | Insurance budget, business days |

`modeledInputs` covers the fourth kind of number: a dollar figure the page prints
that nobody publishes at all. The mortgage page's PMI line is the case this was
written for — private mortgage insurance is risk-based private pricing with no
national rate table, so the 0.5% we apply is ours, and the receipt says so
under `MODELED` rather than letting it sit unlabelled beside a Freddie Mac
average. Closing costs and homeowners insurance are the same shape and will
declare themselves the same way when they ship. A modelled input that does not
say where its figure came from fails the assertion.

`maxStalenessDays` is never invented: it is one release interval plus the grace
the freshness policy already allows for a missed release plus the provider's own
publication lag. Anything tighter blanks a page because BLS published on
schedule and we were not looking.

Of the 70 tools shipping today, 24 require official data and 46 do not.

## Registry

| Source | Tier | Purpose | Coverage | Freshness | Licence | Commercial use | Engine |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IRS Rev. Proc. / Pub 15 | A | Federal tax | National | TY2026 | Public domain | Yes | Tax |
| IRS Schedule SE / 1040-ES / 8812 / NIIT | A | SE tax, estimated tax, CTC, NIIT | National | TY2026 | Public domain | Yes | Tax |
| State DOR publications | A | State tax | 51 jurisdictions | TY2026 where published | State works | Yes | Tax, Salary |
| IRS retirement limits | A | Contribution caps and phase-outs | National | 2026 | Public domain | Yes | 401(k), Roth IRA |
| IRS HSA / HDHP amounts | A | Contribution cap and HDHP tests | National | 2026 | Public domain | Yes | HSA contribution |
| IRS Pub. 590-B Table III | A | Uniform Lifetime RMD factors | National | 2022 table, 2026 use | Public domain | Yes | RMD |
| FHFA conforming loan limits | A | County loan-limit values | County + territories | CY2026 | Public domain | Yes | Conforming loan limit |
| VA funding fee charts | A | VA loan funding-fee rates | National | Effective 2023-04-07 | Public domain | Yes | VA funding fee |
| IRS / HHS ACA rules | A | Premium tax credit | National | 2026 coverage | Public domain | Yes | Health insurance |
| CMS Medicare amounts | A | Part A/B/D and IRMAA | National | 2026 | Public domain | Yes | Medicare |
| GSA per diem | A | Lodging ceiling and M&IE | CONUS destinations | FY2026 effective | Public domain | Yes | Per diem |
| OPM federal holidays | A | Holiday calendar | National | 2026 | Public domain | Yes | Business days |
| Manufacturer bag yields | A | Concrete yield per bag | Product spec | On product change | Published specification | Yes | Concrete |
| BLS OEWS | B | Occupational wages | National · state · metro | May 2025, annual | Public domain | Yes | Salary, Job Cost (labour) |
| BLS CPI-U | B | Inflation, time normalisation | National | Monthly | Public domain | Yes | Inflation |
| BLS PPI | B | Construction input prices | National | Monthly | Public domain | Yes | Job Cost (materials) |
| BLS ECEC | B | Labour burden | National · region | Quarterly | Public domain | Yes | Job Cost (labour) |
| BLS Average Price Data | B | Item prices | U.S. city average · region | Monthly | Public domain | Yes | Where cheaper |
| BEA RPP | B | Geographic price adjustment | State · metro | 2024, annual | Public domain | Yes | Salary, Cost of living |
| Census ACS 5-Year | B | Income and housing context | Place · county · metro · state | Annual | Public domain | Yes | Cost of living, Salary |
| Census / OMB geography | B | Place, county, CBSA, ZCTA | National | Irregular | Public domain | Yes | Location |
| **Census Economic Census, construction** | **B** | **Contractor cost structure by trade** | **National by NAICS** | **2022, five-yearly** | **Public domain** | **Yes** | **Job Cost (business cost)** |
| HUD FMR | B | Area rent benchmark | FMR area · county · ZIP | FY2026 | Public domain | Yes | Cost of living |
| USDA Food Plans | B | Food-at-home cost | National (+AK/HI) | Monthly | Public domain | Yes | Cost of living |
| EIA electricity | B | Retail rate | National · state | Monthly | Public domain | Yes | Energy, Cost of living |
| EIA gasoline | B | Retail fuel price | National · PADD · state | Weekly | Public domain | Yes | Vehicle, Cost of living |
| Freddie Mac PMMS | B | Mortgage rate benchmark | National | Weekly | Freddie Mac terms | Yes | Mortgage, Refinance |
| NAIC insurance database | B | State average premium | State | Annual, 2–3 years behind | NAIC terms | Yes | Insurance |
| CMS marketplace landscape | B | Filed plan premiums | County · rating area | 2026 plan year | Public domain | Yes | Marketplace plans |
| FEMA equipment rates | C | Equipment cost proxy | National | ~Annual | Public domain | Yes | Job Cost (equipment) |
| **NREL REMDB 2024** | **C** | **Retrofit measure material cost** | **National** | **2024 release** | **CC BY 4.0** | **Yes** | **Job Cost (materials)** |
| **EIA Appendix A** | **C** | **Residential equipment retail price** | **National (N/S)** | **2022 typical** | **Public domain** | **Yes** | **Job Cost (materials)** |
| CostAnswer material basket | D | Component baselines and escalation | National | On source change | Compilation of sourced public baselines | Yes | Job Cost (materials) |
| CostAnswer job recipes | D | Crew, productivity, scope | National | On review | CostAnswer editorial | Yes | Job Cost |
| **PolicyEngine-US** | none | **Finding the official state-tax document** | 51 jurisdictions | Continuous | **AGPL-3.0** | **Index only** | Tax (as an index) |
| **CWICR** | none | — | **No US data** | 2026-08 | **CC BY-NC 4.0 (data)** | **No** | — |
| Austin issued permits | none | Observed job valuation | Austin, TX | Daily | Public domain | Yes | Evaluated, not used |
| LA building permits | none | Observed job valuation | Los Angeles | Daily | **Not stated** | **Unclear** | Evaluated, not used |
| USACE EP 1110-1-8 | none | Regional equipment rates | 12 regions | Irregular | Public domain | Yes | Evaluated, not used |
| Census Economic Census, sector 56 | none | Landscaping cost structure | National by NAICS | 2022 | Public domain | Yes | Evaluated, not used |
| Davis-Bacon determinations | none | Trade wages by county | County × trade | Continuous | Public domain | Yes | Planned |
| Census Building Permits | none | Observed project valuation | National · metro | Monthly | Public domain | Yes | Planned |
| State DOT bid tabulations | none | Observed unit prices | State | Per letting | State works | Yes | Planned |
| NREL ResStock | none | Building stock and HVAC context | National · county | Irregular | Open | Yes | Planned |

## Findings that changed a decision

### The largest number in the Job Cost engine was the one nobody had measured

Every recipe priced a contractor's business cost with two figures we chose: 12%
overhead on direct cost, then a 20% markup on the subtotal, then 8%
contingency. One pair of rates for a painter and a concrete crew alike.
Together they were 45% of the answer, and they were the only part of the engine
with no source behind them.

The 2022 Economic Census asks every construction establishment in the country
what it took in and what it spent, by NAICS industry. On the *net* value of
construction work — receipts less work subcontracted out, so the same dollar is
never on both sides — the split falls out directly:

```
direct   = materials + construction-worker wages + their share of fringe
           + equipment rentals + fuel and power
overhead = office payroll + its share of fringe + depreciation
           + communication, repair, advertising, professional services
           + taxes and licence fees + temporary staff + other operating
profit   = the remainder
```

| Trade | NAICS | Direct | Overhead | Profit | Direct → price |
| --- | --- | ---: | ---: | ---: | ---: |
| Poured concrete | 238110 | 70.5% | 13.2% | 16.3% | 1.418× |
| Drywall and insulation | 238310 | 67.6% | 15.2% | 17.2% | 1.479× |
| Glass and glazing | 238150 | 66.6% | 21.0% | 12.3% | 1.501× |
| Plumbing, heating, air-conditioning | 238220 | 66.5% | 19.1% | 14.4% | 1.504× |
| Electrical | 238210 | 66.0% | 16.8% | 17.3% | 1.515× |
| Residential remodelers | 236118 | 66.2% | 18.8% | 15.1% | 1.512× |
| All other specialty trade | 238990 | 65.3% | 19.6% | 15.2% | 1.533× |
| Siding | 238170 | 64.1% | 19.9% | 16.0% | 1.560× |
| Finish carpentry | 238350 | 63.2% | 21.0% | 15.8% | 1.583× |
| Painting and wall covering | 238320 | 60.7% | 17.4% | 22.0% | 1.649× |

The assumed rates came to 1.34× before contingency and 1.45× with it. **Every
trade in the file is above 1.34×, and the labour-heavy ones are far above it**,
so the engine had been under-pricing every job it priced — a painting estimate
by about 14%.

Three consequences, all of them the point:

1. **The shares are shares of price, not markups on cost.** Direct is
   `directShare` of the price, so the price is `direct ÷ directShare`. Treating
   33.5% as a markup instead of a margin loses $1,700 on a $10,000 direct cost.
2. **Contingency comes out of the expected figure** where the observed share is
   used. The multiplier is what contractors actually charged across a census
   year, so it already carries how they price risk; adding an allowance on top
   would put the expected figure above the market it was measured from. Scope
   uncertainty widens the range instead.
3. **Permit fees and disposal stop being marked up.** The census counts licences
   and waste disposal inside the overhead it measures. Multiplying a pass-through
   by 1.5 and then adding the overhead that already contains it charges twice.

Profit here is a residual of a residual — the operating surplus after the costs
the census enumerates — so the page calls it that rather than a reported margin.

Tree removal is the one job in the catalogue that keeps the modelled rates.
Arborists are NAICS 561730, landscaping services, and the sector 56 census file
reports revenue, payroll and employment but not materials, hours or fringe, so
the same residual cannot be computed. It is not borrowed from a neighbouring
construction trade; the estimate says the rates are assumptions and the
confidence reflects it.

### Permit valuation cannot be attributed to a scope

Municipal permit data was proposed as the observed-market layer for jobs where
no price dataset exists. Austin's Issued Construction Permits is the strongest
candidate available: explicitly **Public Domain U.S. Government** in the
dataset's own Socrata metadata, updated daily, with valuation, work description,
square footage and location. Two facts killed it as a calibration source.

**Trade permits carry no valuation.** Of Austin residential permits issued since
2023 — 46,054 electrical, 45,752 plumbing, 28,800 mechanical — the valuation
columns are populated in *single-digit* counts. Only building permits carry
`total_job_valuation`, and they carry it 17,451 times. So the jobs where a
market observation would help most, HVAC and water-heater and panel
replacement, are precisely the ones the data cannot see.

**Valuation is per permit, not per scope.** Among building permits, the average
valuation of one whose description mentions a deck is **$226,107**; one
mentioning a bathroom, **$376,427**. Those are not deck and bathroom prices.
They are whole-house remodels that happen to include a deck or a bathroom, and
keyword matching attributes the entire job to one line item.

A strict filter does recover a real signal — 109 Austin permits since 2023 are
window replacement and nothing else, median $10,350, IQR $5,680 to $20,000 —
but that is one metro, a handful of scopes, and a figure declared before the
work rather than invoiced after it. It is recorded in the registry as
`evaluated-not-used` with the numbers, so the next person does not rediscover
it from scratch.

Los Angeles fails earlier: `data.lacity.org` states **no licence** on its
permits dataset, and this project does not ship a source whose commercial use is
not cleared. It also has building permits only, so it shares Austin's blind spot.

### Four "sources" in the proposal are not datasets

Worth recording, because scanning them for prices finds nothing and the empty
result reads as a dead end rather than a category error:

- **`NREL/buildstock-fetch`** is a downloader for ResStock and ComStock outputs.
- **OpenTakeoff, `qto` and similar** are quantity-takeoff software. They measure
  drawings; they carry no unit prices.
- **The ResStock GitHub repository** is model code, housing characteristic
  distributions and measure definitions. The 2.2-million-dwelling dataset is on
  OEDI, and the registry row now points there.
- **USACE EP 1110-1-8** is real and is genuinely better than the FEMA schedule
  already in use — it carries regional, age and standby factors FEMA does not —
  but the publications host answers automated requests with HTTP 403 and ships
  the schedule as regional PDFs. Adopting it is a transcription project, not a
  fetch, so it stays a named candidate.

### NREL REMDB and EIA Appendix A were already load-bearing and undocumented

Both were supplying material baselines through `data/material-basket` — REMDB's
envelope intercepts for windows, doors, drywall and the 200A panel, EIA's
Appendix A retail prices for air conditioners, furnaces, heat pumps and water
heaters — without a registry row of their own. Both now have one, at tier C,
with the two ways they mislead written down: REMDB's installed-cost figures
carry labour multipliers of commercial-database origin and only its material
intercepts are taken, and a retail equipment price is above what a contractor
pays, so a business markup on top of it double-counts part of the distributor
margin.


### PolicyEngine-US is an index, not a dataset

`PolicyEngine/policyengine-us` carries parameters for all 51 jurisdictions under
`policyengine_us/parameters/gov/states/<st>/tax/income/`, split into `rates`,
`deductions`, `exemptions`, `credits`, `additions` and `subtractions`. Kentucky's
rate file is representative:

```yaml
values:
  2021-01-01: 0.05
  2023-01-01: 0.045
  2024-01-01: 0.04
  2026-01-01: 0.035
metadata:
  reference:
    - title: House Bill 1 (Bill Text)
      href: https://apps.legislature.ky.gov/recorddocuments/bill/25RS/hb1/bill.pdf#page=3
    - title: Kentucky Statutes 141.020
      href: https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=54585
```

Two things are worth having there, and only one of them is the number. The
`values` map says *when* a rate changes, which is exactly what a search engine
will not tell you and what makes a stale figure look current. The
`metadata.reference[]` hrefs name the official document.

The licence settles how it is used: **AGPL-3.0**, verified from the repository
itself. A copyleft licence means neither its code nor its parameter compilation
enters this project. What is taken is the pointer. The figure is then fetched
from the official document and transcribed from there, exactly as if the pointer
had come from a table of contents.

So the workflow per state is:

```
PolicyEngine reference[]  →  official PDF or statute  →  transcribe
    →  schema  →  three golden vectors  →  verify-states gate  →  production
```

If the repository and the official source disagree, the official source wins and
the repository entry is treated as out of date. The verification standard does
not drop because a candidate value was available.

#### That disagreement is not hypothetical

Maine reduces its dependent exemption tax credit by $20 for each **$500** of
Maine adjusted gross income over the threshold, "or fraction thereof". The
repository had the increment at $1,000. At $104,000 of income with two
dependents that is $450 of surviving credit against $530 — a factor of two on
the reduction, for every affected Maine filer. The official 2025 Form 1040ME
instructions settled it. Nothing here is a criticism of the repository, which
is maintained openly and covers ground no official source consolidates; it is
the reason the pointer is what gets taken and not the number.

#### A candidate was taken, then replaced by the statute it cited

Arizona's 2026 dependent tax credit is $125 under HB 4168 / Laws 2026, Ch. 140.
That figure was first read from the repository's parameter set citing the bill,
because the Department of Revenue's own site was not reachable at the first
pass. Production now cites the enacted session law itself — the same bill the
repository pointed at — and the golden vectors for that credit are
`worked-from-schedule` against that law, not `secondary-source`.

The AGPL never reached it. What was in question was a dollar amount fixed by
Arizona statute. The registry row says "index only" because nothing from the
repository ships; the episode is recorded so a later reader does not think the
pointer was unused, or that the number is still second-hand.

### CWICR is rejected twice over

`datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR` — 231 stars, ~1.67 GB,
last pushed 2026-08-21. GitHub reports its licence as "Other", which is why the
actual files had to be read rather than guessed.

**First reason — the data licence.** `LICENSE` states a dual licence:

> Copyright (c) 2022-2026 Artem Boiko / DataDrivenConstruction.io … 1. DATA
> LICENSE - Creative Commons Attribution-NonCommercial 4.0 International

with `LICENSE-CODE.txt` being Apache-2.0 and the authored long-form PDFs "fully
reserved". CostAnswer is a commercial product. NonCommercial data cannot enter it,
with or without attribution.

**Second reason — there is no US data in it.** The country directories are
Asia-China-Dinge, Asia-Indonesia-AHSP, Asia-Vietnam-Dinh-Muc, CIS-Russia-GESN-FER-TER,
Europe-Greece-GGDE, Europe-Italy-Prezzario-Toscana, Europe-Spain-BCCA,
Europe-Turkey-Birim-Fiyat and SouthAmerica-Brazil-SINAPI. Even under a permissive
licence it would price nothing this site is asked about.

What remains usable is the *idea*, which no licence covers: a work item decomposed
into labour, material and equipment resources, each with a quantity per unit of
work, so a job's cost is `Σ (quantity × unit cost)` with productivity as the
labour driver. That is the shape the Job Cost Engine takes. The Apache-2.0 code
may also be read for structure. None of the numbers are used.

### P2 state tax: government facts only in production

Every rate, deduction, exemption, credit and recapture that ships in
`data/tax/2026.json` was transcribed from a state DOR publication, statute, or
IRS procedure. PolicyEngine-US was used as a document index. One candidate
(Arizona's 2026 $125 dependent credit) was first seen there and then replaced
by the enacted session law it cited. No PolicyEngine parameter file, no GitHub
dataset, and no third-party projection ships. CWICR remains rejected for both
licence and geography.

That same registry is the handoff to the Job Cost Engine. Construction sources
already recorded there (BLS, BEA, Census, FEMA, Davis-Bacon, DOT bid tabs,
NREL) are not re-researched from scratch.

### The generic GitHub search for US construction cost data comes back empty

Searches across construction cost estimating, quantity takeoff, unit price
databases, RSMeans alternatives and assembly catalogues return repositories with
near-zero stars, no licence, no provenance and no maintenance. There is no
open-source equivalent of RSMeans for the United States.

This is a real finding, not a gap in the search: **the US unit-cost layer has to
be built from primary observed data** — DOT bid tabulations, permit valuations,
FEMA equipment rates, Davis-Bacon wages and PPI movement — rather than adopted
from a repository. It is the single largest data-construction task in the project,
and it means every unit cost will carry a provenance envelope naming which of
those it came from and how it was normalised.

## What each field means

`data/source-registry.json` carries, per source: `id`, `name`, `owner`, `url`,
`categories`, `geography`, `version`, `updateFrequency`, `formats`, `license`,
`licenseVerifiedFrom`, `commercialUse`, `attribution`, `tier`, `partOf`,
`trustLevel`, `status`, `usefulFields`, `consumers`, `validationSource`,
`limitations`, `lastVerified`.

`licenseVerifiedFrom` is the field that matters most. It records *where the licence
was read*, so a later reviewer can tell a verified licence from a remembered one.
An entry without it has not been cleared for production.

`limitations` is not a disclaimer section. It is the list of ways the source
would be misused — FEMA rates are disaster reimbursement rather than rental
market price, Davis-Bacon is federally funded work rather than residential,
permit valuation is an estimate filed before the job rather than an invoice
after it. Each of those is a specific wrong answer this project would otherwise
publish confidently.

## Adding a source

1. Read the LICENSE, NOTICE and terms of the exact release or dataset being used. Not the README, not the repository name, not what it was licensed as last year.
2. If commercial use is not clearly permitted, it may be a `discovery` source and nothing more.
3. Record the limitations before the fields — what would go wrong if someone used this the obvious way.
4. Name the `validationSource`. `"self"` is only correct for a primary publisher.
5. Pin the version. A source without a version cannot be re-checked when a number looks wrong.
6. Give it a `tier` from the role it plays in an answer, not from who published
   it, and add it to `lib/data/data-sources.ts` with the same tier and a
   one-line `misuse`. A source tiered `A` through `D` but unreachable from any
   shipped tool fails `tests/data-manifest.spec.ts`, and so does one tiered
   `none` that a tool reaches.
7. Add it to the `requiredDatasets` or `optionalDatasets` of the tools that read
   it, and be honest about which. Required means the page refuses to answer
   without it.
