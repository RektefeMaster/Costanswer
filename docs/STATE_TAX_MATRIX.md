# State tax transcription matrix

Working document for P2. Status as of 2026-09-07.

**Supported: 38 / 51** — twenty-nine with a real schedule, nine that levy no wage tax.
Remaining: 13.

Every supported state carries at least three golden vectors and passes
`npm run verify:tax`, which is now a gate that can fail rather than a module
nobody called.

## How sources are obtained

Ranked by preference. A state is only `supported` when its figures come from
one of these, never from a search summary:

1. **Official DOR HTML** — rate schedules, bracket tables, deduction pages.
2. **Official withholding / employer guide PDFs** — usually the first place a
   new year's rate appears, published the autumn before.
3. **Individual income tax instruction booklets** — the authoritative source for
   brackets, standard deduction, exemptions and credits together.
4. **Official downloadable tables and datasets.**
5. **State statute or session law** — where a rate is set in law and the agency
   has not yet republished it.
6. **Several official sources combined**, where no single document is complete.

Search engines and third-party summaries are used only to *locate* an official
document. No figure is ever taken from a snippet: Georgia's own 2026 guide was
described in search results as both 5.19% and 4.99%, which is the whole argument
for opening the source.

### Access routes, and what blocks them

Three distinct failures, which need three different answers:

| What happens | What it means | What works |
| --- | --- | --- |
| HTTP 403 with a Cloudflare "Just a moment" page | The site challenges automated clients | A real browser usually passes silently — Utah did |
| An interactive human-verification widget | The site demands a person click it | **Nothing.** Completing it is off-limits, so the state stays unsupported |
| Connection timeout, no response at all | Unreachable from this machine | Nothing available here |

Measured on this machine: `dor.georgia.gov`, `azdor.gov` and `tax.utah.gov`
serve an interactive challenge. `in.gov`, `tax.idaho.gov`, `le.utah.gov`,
`tax.virginia.gov`, `revenue.wi.gov`, `ksrevenue.gov`, `revenue.nebraska.gov`,
`tax.wv.gov` and `portal.ct.gov` time out entirely. `revenue.louisiana.gov`,
`michigan.gov`, `tax.vermont.gov`, `dor.mo.gov` and `tax.ri.gov` return 403.

PDFs remain the most reliable route where a host answers at all: a PDF is saved
even when its text layer will not extract, and can then be read directly.

## What each tax model needs

| Model | Required data pieces |
| --- | --- |
| Flat | rate · standard deduction or exemption by filing status · schedule year |
| Flat + credit | rate · credit amount · phase-out start and rate · schedule year |
| Progressive | brackets × 4 filing statuses · standard deduction × 4 · personal/dependent exemption or credit · schedule year |
| + federal deduction | all of the above · the cap, or that there is none |
| + local tax | the band actually levied, or an honest statement that no state agency publishes one |

Every state also needs a source URL, a source document name, and **three golden
vectors** reproducing the state's own published figure at three incomes.

## Done — twenty-nine with a schedule

Schedule year is the year the figures were published for, not the snapshot year.
"Evidence" is the strongest vector behind the row.

| State | Model | Schedule | Evidence | Source |
| --- | --- | --- | --- | --- |
| CA | Progressive + MHST | 2025 | worked from schedule | FTB indexed rate schedules |
| CO | Flat on federal taxable income | 2025 | **published table** | DR 0104 Book tax table |
| DC | Progressive, one schedule for all statuses | 2025 | **published table** | OTR rates page + 2025 D-40 booklet |
| HI | Progressive, 12 brackets | 2025 | **published table** | Form N-11 instructions, Schedules I–III |
| IA | Flat on federal taxable income + credit | 2025 | worked from schedule | IA 1040 Expanded Instructions |
| IL | Flat | 2026 | worked from schedule | IDOR rate page + FY 2026-15 |
| KY | Flat | 2026 | **published example** | 42A003 (TCF)(10-2025) |
| MA | Flat + millionaire surtax | 2026 | worked from schedule | DOR tax rates page |
| ME | Progressive + phase-outs + surcharge | 2026 | **published table** | 2026 Individual Income Tax Rates |
| MN | Progressive | 2026 | worked from schedule | Rates page + Minn. Stat. 290.0123 |
| MS | Progressive with a 0% band | 2026 | **published threshold** | DOR tax rates page + Form 80-100 |
| MT | Progressive on federal taxable income | 2025 | **published example** | Tax Tables + Form 2 instructions |
| NC | Flat | 2025 | worked from schedule | NCDOR rate schedules + NC-30 |
| ND | Progressive on federal taxable income | 2025 | worked from schedule | Commissioner's rate tables + ND-1 |
| NJ | Progressive | 2025 | worked from schedule | NJ-1040 rate schedules |
| NM | Progressive + AGI-phased exemption | 2025 | **published example** | H.B. 252 / 7-2-7 NMSA 1978 + 2025 PIT-1 worksheet |
| OH | Progressive, discontinuous | 2025 | **published example** | Annual rates page + IT 1040 booklet |
| OK | Progressive, six bands | 2025 | **published table** | Form 511 packet tax table |
| OR | Progressive + federal subtraction cap | 2025 | **published table** | Form OR-40 instructions, charts and Table 4 |
| PA | Flat + local EIT named | 2026 | worked from schedule | Act 46 of 2003 |
| SC | Progressive + SCIAD | 2026 | **published example** | Information Letter #26-20 |
| UT | Flat + taxpayer credit | 2025 | worked from schedule | Tax Rates + TC-40 instructions |
| AR | Progressive + low-income tables | 2025 | **published table** | 2025 Indexed Tax Brackets + tax tables |
| DE | Progressive + personal credits | 2025 | **published table** | 2025 Income Tax Table + PIT-RES |
| LA | Flat 3% | 2025 | worked from schedule | 2025 IT-540 instructions + RIB 25-012 |
| MD | Progressive + county tax named | 2025 | **published table** | Comptroller rates page + 2025 booklet |
| RI | Progressive, one schedule | 2025 | **published table** | 2025 RI Tax Tables + computation worksheet |
| VT | Progressive | 2025 | **published example** | 2025 IN-111 instructions, rate schedules |

Nine levy no wage tax and need no schedule: AK, FL, NH, NV, SD, TN, TX, WA, WY.

## Shapes the real schedules forced

None of these were speculative. Each was added because a state publishes a rule
the model could not express, and pretending otherwise would have shipped a
number that was wrong in a specific, checkable way.

| Shape | Forced by | What it prevents |
| --- | --- | --- |
| `taxableIncomeBasis: 'federal-taxable-income'` | CO, IA, MT, ND | Taxing the federal standard deduction a second time |
| `exemptionCredit.rateOfFederalStandardDeduction` | UT | A credit frozen at today's federal deduction going stale each January |
| `standardDeductionPhaseOut` / `personalExemptionPhaseOut` | ME, SC, NM | Giving a full deduction to filers whose state takes it away |
| `roundReductionDownToMultipleOf` | SC | About fifty cents, stated rather than dropped |
| `additionalTax.thresholdByFilingStatus` | ME | A surcharge starting at the wrong income for three filers in four |
| `TaxBracket.baseTax` | OH, VT | Undercharging where the published constant does not sum from the bands beneath it |
| `steppedPersonalExemption` | OH, MD | An exemption that steps rather than tapers |
| `localAddOn.typicalRateRange` optional | KY, OH, MI | Inventing a band for taxes set by hundreds of separate jurisdictions |
| `personalExemptionPhaseOut` reused for a per-person AGI taper | NM | Treating the $2,500 low-income exemption as a flat deduction for filers between $20,000 and $36,667 |

## The 13 remaining

Model is a hypothesis to verify against the source, not data.

### Blocked by bot protection — the site demands a human

| State | Host | Note |
| --- | --- | --- |
| GA | dor.georgia.gov | Flat, rate stepping down; 2026 guide exists but is behind a human-verification widget |
| AZ | azdor.gov | Flat 2.5%; Form 140 instructions behind the same widget |

### Unreachable from this machine

| State | Host | Model hypothesis |
| --- | --- | --- |
| ID | tax.idaho.gov | Flat |
| IN | in.gov | Flat + county |
| VA | tax.virginia.gov | Progressive, 4 brackets |
| WI | revenue.wi.gov | Progressive, income-phased deduction |
| KS | ksrevenue.gov | Progressive, 2 brackets |
| NE | revenue.nebraska.gov | Progressive, stepping down |
| WV | tax.wv.gov | Progressive, stepping down |
| CT | portal.ct.gov | Progressive + phase-out recapture |

### Reachable, not yet transcribed

| State | Model hypothesis | Blocker |
| --- | --- | --- |
| MO | Progressive + **federal deduction** as a share of federal tax by AGI band, capped | Documents in hand; needs a new schema shape before it can be entered honestly |
| AL | Progressive + **federal deduction** + local occupational | 2025 Form 40 booklet in hand; standard-deduction chart and rate table not yet transcribed |

### Blocked on publication

| State | Note |
| --- | --- |
| NY | 2026 IT-201 resident rate schedules not published. 2026 withholding tables exist but are not annual liability and are not used as such. |

## Local income taxes

Nine of these levy a local tax the site cannot compute without knowing a
municipality or county. **No rate is invented.** The state figure is computed
correctly and the local tax is named as an omission — with the band where an
official source publishes one, and without a band where none does.

| State | Basis | Status |
| --- | --- | --- |
| PA | municipality + school district | Named, 1%–2.75% (Act 32) |
| IA | school district + county EMS | Named, 0%–20% of state tax (DOR table 41-027) |
| KY | county / city occupational | Named, **size not stated** — no statewide figure published |
| OH | municipality + school district | Named, **size not stated** — two separate local levies |
| MD | county | Named, 2.25%–3.30% (Comptroller) |
| NY | NYC and Yonkers only | Not yet reached |
| MI | city | Named, **size not stated** — Treasury lists 24 cities without a statewide rate |
| IN | county | Not yet reached |
| AL | municipality occupational | Not yet reached |
| MO | Kansas City and St. Louis only | Not yet reached |

ZIP or city level support is a later phase. It changes nothing about the state
figure being right.

## Order of remaining work

1. **Documents in hand, shape missing** — MO, AL: the official booklets are
   readable. Missouri deducts a *percentage* of federal tax that steps down
   with AGI, which this engine cannot yet express; Alabama's standard deduction
   is a chart by income. Both need a schema extension, not another search.
2. **Unreachable hosts** — ID, IN, VA, WI, KS, NE, WV, CT: nothing to try from
   here. These need a different network path, not a different approach.
3. **Human-verification widgets** — GA, AZ: out of reach on principle, not on
   capability.
4. **NY** — when its 2026 schedules are published.

A state is only entered when every required piece is in hand. A rate without its
deduction, or a deduction without its rate, is not a tax calculation.
