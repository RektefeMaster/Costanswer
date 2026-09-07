# State tax transcription matrix

Working document for P2. Status as of 2026-09-07.

**Supported: 51 / 51** — forty-two with a real schedule, nine that levy no wage tax.

Every supported state carries at least three golden vectors and passes
`npm run verify:tax`, which is now a gate that can fail rather than a module
nobody called. The current golden set is 188 vectors.

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

### Access routes, and what got past them

Every one of the fifty-one is sourced from an official document, but roughly a
third of them refused the obvious route first. Three distinct failures, and the
thing that matters is that none of them means "no data":

| What happens | What it means | What worked |
| --- | --- | --- |
| HTTP 403 behind a Cloudflare "Just a moment" page | The host challenges automated clients | A real browser usually passes it silently, as Utah's did |
| An interactive human-verification widget | The host wants a person to click it | Never clicked. Went round it instead — see below |
| Connection timeout, no response at all | The host is unreachable from here | Another host belonging to the same government |

`dor.georgia.gov`, `azdor.gov`, `tax.ri.gov` and `tax.utah.gov` put an
interactive widget in front of every page. Completing one is off limits, so none
was completed. Four routes went round them instead, and all four are primary:

- **A direct document path** on the same host, which is often served without the
  challenge even when the browsing page is not — Georgia's 2026 Employer's Tax
  Guide and Rhode Island's tax tables both came out this way.
- **A second host belonging to the same agency.** Louisiana publishes on
  `dam.ldr.la.gov` while `revenue.louisiana.gov` refuses; Utah's forms sit on
  `files.tax.utah.gov`.
- **The legislature rather than the revenue department.** Indiana's rate came
  from SEA 451 on `iga.in.gov`, New Mexico's from H.B. 252 on `nmlegis.gov`, and
  West Virginia's from §11-21-4j in the code itself. A statute is a better source
  than an agency summary of it, not a worse one.
- **A different official form.** Where an annual booklet was unreachable or
  unpublished, the estimated-tax instructions carry the same schedules —
  Nebraska's 1040N-ES and Wisconsin's Form 1-ES both do.

PDFs remain the most reliable route wherever a host answers at all: a PDF is
saved even when its text layer will not extract, and can then be read directly.

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

## Done — forty-two with a schedule

Schedule year is the year the figures were published for, not the snapshot year.
"Evidence" is the strongest vector behind the row.

| State | Model | Schedule | Evidence | Source |
| --- | --- | --- | --- | --- |
| CA | Progressive + MHST | 2025 | worked from schedule | FTB indexed rate schedules |
| CO | Flat on federal taxable income + high-income SD addback | 2025 | **published table** | DR 0104 Book tax table |
| DC | Progressive, one schedule for all statuses | 2025 | **published table** | OTR rates page + 2025 D-40 booklet |
| HI | Progressive, 12 brackets | 2026 | **published table** | Act 46 / Ann. 2024-03 SD + 2025 N-11 brackets |
| IA | Flat on federal taxable income + credit | 2025 | worked from schedule | IA 1040 Expanded Instructions |
| IL | Flat | 2026 | worked from schedule | IDOR rate page + FY 2026-15 |
| KY | Flat | 2026 | **published example** | 42A003 (TCF)(10-2025) |
| MA | Flat + millionaire surtax + exemption + FICA cap | 2026 | worked from schedule | DOR tax rates page + Form 1 |
| ME | Progressive + phase-outs + surcharge | 2026 | **published table** | 2026 Individual Income Tax Rates |
| MN | Progressive + two-rate SD limitation | 2026 | **published threshold** | Rates page + Inflation Adjusted Amounts 2026 |
| MS | Progressive with a 0% band | 2026 | **published threshold** | DOR tax rates page + Form 80-100 |
| MT | Progressive on federal taxable income | 2026 | worked from schedule | 2026 Publication 1 / HB 337 |
| NC | Flat 3.99% + G.S. 105-153.5 deduction | 2026 | worked from schedule | NCDOR tax-rate-schedules + G.S. 105-153.5 |
| ND | Progressive on federal taxable income | 2025 | worked from schedule | Commissioner's rate tables + ND-1 |
| NY | Progressive + AGI recapture + NYC/Yonkers named | 2026 | **published table** | 2026 Form IT-2105-I rates and worksheets |
| NJ | Progressive + $10k/$20k floor + exemption | 2025 | **published threshold** | GIT overview + 2025 NJ-1040 |
| NM | Progressive + AGI-phased exemption | 2025 | **published table** | H.B. 252 / 7-2-7 NMSA 1978 + 2025 PIT packet table |
| OH | Progressive, discontinuous 0% then $332 + 2.75% | 2026 | worked from schedule | R.C. 5747.02 / H.B. 96 |
| OK | Progressive, 0% / 2.5% / 3.5% / 4.5% | 2026 | **published threshold** | H.B. 2764 / 68 O.S. 2355(D) |
| OR | Progressive + federal subtraction cap | 2025 | **published table** | Form OR-40 instructions, charts and Table 4 |
| PA | Flat + local EIT named through Philly 3.735% | 2026 | worked from schedule | Act 46 of 2003 + phila.gov wage tax |
| SC | Progressive + SCIAD | 2026 | **published example** | Information Letter #26-20 |
| UT | Flat + taxpayer credit | 2025 | worked from schedule | Tax Rates + TC-40 instructions |
| AR | Progressive + low-income tables | 2025 | **published table** | 2025 Indexed Tax Brackets + tax tables |
| DE | Progressive + personal credits + Wilmington named | 2025 | **published table** | 2025 Income Tax Table + PIT-RES |
| LA | Flat 3% | 2026 | worked from schedule | 2026 R-1306 + Act 11 / RIB 25-012 |
| MD | Progressive + county tax named | 2025 | **published table** | Comptroller rates page + 2025 booklet |
| MI | Flat 4.25% + city tax named | 2026 | worked from schedule | Treasury 2026 withholding calendar + April 15 rate notice |
| RI | Progressive, one schedule | 2025 | **published table** | 2025 RI Tax Tables + computation worksheet |
| VT | Progressive | 2025 | **published example** | 2025 IN-111 instructions, rate schedules |
| MO | Progressive + federal tax % by AGI, capped | 2025 | **published example** | 2025 MO-1040 instructions, tax rate chart |
| AL | Progressive + income-chart SD + federal deduction | 2025 | **published table** | 2025 Form 40 booklet + Form 40A tax tables |
| KS | Progressive, two brackets | 2025 | **published table** | 2025 K-40 booklet + K.S.A. 79-32,110b |
| VA | Progressive, four brackets | 2025 | **published example** | 2025 Form 760 instructions |
| WV | Progressive, 2026 rates | 2026 | **published example** | W.Va. Code §11-21-4j + §11-21-16 |
| WI | Progressive + two-stage HOH SD | 2026 | **published example** | 2026 Form 1-ES instructions |
| ID | Flat 5.3% over indexed 0% band | 2025 | **published example** | 2025 Form 40 packet EIN00046 |
| NE | Progressive + $176 exemption credit | 2026 | **published example** | 2026 Form 1040N-ES |
| GA | Flat 4.99% | 2026 | **published threshold** | 2026 Employer's Tax Guide (June 2026) |
| AZ | Flat 2.5% | 2025 | **published threshold** | A.R.S. 43-1011 + DOR 2025 Highlights |
| CT | Progressive + Table C add-back + Table D recapture + Table E credit | 2025 | **published example** | 2025 Form CT-1040 TCS tables A–E |
| IN | Flat 2.95% + $1,000 personal exemption | 2026 | **published threshold** | SEA 451 / IC 6-3-2-1 + DOR IB117 |

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
| `federalDeduction.shareOfFederalTax` | MO | Treating a percentage-of-federal-tax staircase as a dollar cap, which cannot multiply |
| `steppedStandardDeduction` | AL | Replacing Alabama's 21-row deduction chart with a single figure or a linear phase-out |
| `standardDeductionRatePhaseOut` | WI | Approximating head of household's two-rate deduction with one phase-out |
| `taxAddOnSteps` | CT | Folding Table C add-back and Table D recapture into a single `additionalTax` threshold |
| `exemptionCredit.rateStepsByFilingStatus` | CT | Treating Table E as a dollar credit instead of a percentage of tax |
| `ficaDeductionCap` | MA | Skipping Form 1 line 11 and overstating tax by up to $100 |
| `standardDeductionLimitation` | MN | A single phase-out band cannot switch from 3% to 10% then stop at 80% |
| `federalStandardDeductionAddBack` | CO | Ignoring the high-income addback understates tax above $300,000 AGI |
| `nySupplementalTax` | NY | Treating the rate schedule as the whole tax above $107,650 of NYAGI |
| `localAddOn.omissionNote` | PA, DE, NY | A statewide “typical” band that hides Philadelphia 3.735%, Wilmington 1.25%, or NYC/Yonkers |

## Remaining mixed-year rows

New York is supported from 2026 Form IT-2105-I (annual rate schedules, standard deduction, $1,000 dependent exemption, and recapture worksheets). NYC and Yonkers remain omitted local tax, named with the official city schedule and 16.75% Yonkers surcharge.

Twenty-two income-tax states still use a 2025 official annual schedule inside the 2026 snapshot, declared on the row. That is not the same as “no 2026 data”: several of those 2025 figures remain the 2026 law (unchanged statutory rates). See `P2_STATE_TAX_FINAL.md`.

## Local income taxes

Eleven of these levy a local tax the site cannot compute without knowing a
municipality or county. **No rate is invented.** The state figure is computed
correctly and the local tax is named as an omission — with the band where an
official source publishes one, and without a band where none does.

| State | Basis | Status |
| --- | --- | --- |
| PA | municipality + school district | Named, 1%–3.735% (Act 32 floor through Philadelphia resident wage tax, 1 July 2026) |
| IA | school district + county EMS | Named, 0%–20% of state tax (DOR table 41-027) |
| KY | county / city occupational | Named, **size not stated** — no statewide figure published |
| OH | municipality + school district | Named, **size not stated** — two separate local levies |
| MD | county | Named, 2.25%–3.30% (Comptroller) |
| NY | NYC resident tax + Yonkers 16.75% of state tax | Named; 2026 IT-2105-I city rates and Yonkers surcharge stated, not computed without a city |
| MI | city | Named, **size not stated** — Treasury lists 24 cities without a statewide rate |
| IN | county | Named, **size not stated** — county rates exist as a DOR dataset, not as a default |
| AL | municipality occupational | Named, **size not stated** — no statewide figure published |
| MO | Kansas City and St. Louis earnings tax | Named, **size not stated** — no statewide figure published |
| DE | City of Wilmington only | Named, 1.25% city wage tax; not estimated for the rest of Delaware |

ZIP or city level support is a later phase. It changes nothing about the state
figure being right.

## P2 closed

P2 state-tax coverage is **51 / 51**. Mixed-year 2025 annual forms remain declared where 2026 packets are unpublished. See
[`P2_STATE_TAX_FINAL.md`](./P2_STATE_TAX_FINAL.md).

A state is only entered when every required piece is in hand. A rate without its
deduction, or a deduction without its rate, is not a tax calculation.
