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

## Registry

| Source | Purpose | Coverage | Freshness | Licence | Commercial use | Authority | Engine |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BLS OEWS | Occupational wages | National · state · metro | May 2025, annual | Public domain | Yes | primary | Salary, Job Cost (labour) |
| BLS CPI-U | Inflation, time normalisation | National | Monthly | Public domain | Yes | primary | Inflation |
| BLS PPI | Construction input prices | National | Monthly | Public domain | Yes | primary | Job Cost (materials) |
| BLS ECEC | Labour burden | National · region | Quarterly | Public domain | Yes | primary | Job Cost (labour) |
| BEA RPP | Geographic price adjustment | State · metro | 2024, annual | Public domain | Yes | primary | Salary, Cost of living |
| IRS Rev. Proc. / Pub 15 | Federal tax | National | TY2026 | Public domain | Yes | primary | Tax |
| State DOR publications | State tax | 51 jurisdictions | TY2026 where published | State works | Yes | primary | Tax, Salary |
| **PolicyEngine-US** | **Finding the official state-tax document** | 51 jurisdictions | Continuous | **AGPL-3.0** | **No — nothing copied** | **discovery** | Tax (as an index) |
| **CWICR** | — | **No US data** | 2026-08 | **CC BY-NC 4.0 (data)** | **No** | **rejected** | — |
| FEMA equipment rates | Equipment hourly cost | National | ~Annual | Public domain | Yes | primary | Job Cost (equipment) |
| Davis-Bacon determinations | Trade wages by county | County × trade | Continuous | Public domain | Yes | primary | Job Cost (labour) |
| Census Building Permits | Observed project valuation | National · metro · municipal | Monthly | Public domain | Yes | primary | Job Cost (calibration) |
| State DOT bid tabulations | Observed unit prices | State | Per letting | State works | Yes | primary | Job Cost (calibration) |
| NREL ResStock | Building stock and HVAC context | National · county | Irregular | Open | Yes | primary | Job Cost (context) |

## Findings that changed a decision

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
`licenseVerifiedFrom`, `commercialUse`, `attribution`, `trustLevel`, `status`,
`usefulFields`, `consumers`, `validationSource`, `limitations`, `lastVerified`.

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
