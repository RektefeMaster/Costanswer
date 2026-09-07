# P2 State Tax Engine — final report

Status as of 2026-09-07. Snapshot `us-tax-2026-v1`.

This is the P2 acceptance record. Coverage was not the optimisation target.
Verified 2026 (or declared mixed-year) rules, provenance, and fail-closed
behaviour were. New York is supported from 2026 Form IT-2105-I.

## Coverage

**51 / 51 supported.**

| Class | Count | Jurisdictions |
| --- | ---: | --- |
| Income-tax schedule | 42 | AL AR AZ CA CO CT DC DE GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NJ NM NY OH OK OR PA RI SC UT VA VT WI WV |
| No individual wage income tax | 9 | AK FL NH NV SD TN TX WA WY |
| Unsupported | 0 | — |

New York uses the 2026 IT-2105-I annual rate schedules, standard deduction,
dependent exemption, and recapture worksheets. NYC and Yonkers remain omitted
local tax, named with the official city schedule and 16.75% Yonkers surcharge.

## Validation

| Gate | Result |
| --- | --- |
| `npm run verify:tax` | PASS at close — 42 schedules, 194 golden vectors, 7 warnings. **Count is a close-date snapshot.** Live count comes from `npm run verify:tax`; do not treat 194 as a forever total. |
| `npx vitest run tests/tax.spec.ts` | PASS |
| Schema validation | PASS (embedded in `verify:tax`) |
| Source / provenance | PASS — production figures from government documents only |
| Boundary tests | PASS — rule-shape boundaries covered where the shape creates them |
| Existing 38-state regression | PASS (superseded by the 41-state golden set) |

### Golden vectors (close-date snapshot: 194)

Informational. Re-run `npm run verify:tax` for the current count.

| Basis | Count | Meaning |
| --- | ---: | --- |
| published-table | 43 | Official tax-table row |
| published-example | 21 | Official worked example |
| published-threshold | 22 | Official breakpoint / lump / first-taxable-dollar figure |
| worked-from-schedule | 108 | Arithmetic from the transcribed official schedule |

Warnings (not failures): AL, MO, OR require `federalIncomeTax`; MA requires `employeeFica` (fail-fast reminders). CA, MT and ND have brackets but every vector is worked from the schedule; no official published table row was transcribed for those three.

### Audit corrections (same snapshot)

These were silent errors in an earlier 50/51 row, not new coverage:

- **MA** personal exemption and Form 1 line 11 FICA cap ($2,000/earner) were missing; tax was overstated.
- **NJ** regular exemption and the $10,000 / $20,000 no-tax floor were missing.
- **MN** two-rate standard-deduction limitation was missing.
- **CO** federal-standard-deduction addback above $300,000 AGI was missing.
- **NC** is a 2026 statute row (3.99% + G.S. 105-153.5), not a 2025 hybrid.
- **PA** omitted-local band now runs through Philadelphia’s 3.735% resident wage tax.
- **DE** names Wilmington’s 1.25% city tax instead of implying Delaware has none.
- **HI** 2026 standard deduction is Act 46 ($8,000 / $16,000 / $12,000); 2025 N-11 amounts overstated 2026 tax.
- **MT** 2026 Publication 1 / HB 337 (4.7% / 5.65% at $47,500); 2025 5.9% / $21,100 overstated 2026 tax.
- **OK** H.B. 2764 / 68 O.S. 2355(D) (0 / 2.5 / 3.5 / 4.5%); 2025 0.25%–4.75% table overstated 2026 tax.
- **OH** H.B. 96 / R.C. 5747.02(A)(3)(c): 2026 is $332 + 2.75% above $26,050; the 2025 $100,000 / 3.125% band overstated high-income tax. Exemption MAGI cutoff is $500,000, not $750,000.
- **NY** 2026 IT-2105-I annual schedules and recapture worksheets; previously unsupported.
- **CT** Table A personal exemption is one return-level amount. The engine had multiplied it by dependents, understating tax whenever the salary/paycheck dependents field was non-zero and Table A was still positive.
- **IL / MI / NM / VT / RI** grant a per-person exemption to dependents. The salary and paycheck calculators collect dependents; those five rows omitted them and overstated tax.

## Tax year

The snapshot year is 2026. Each state row declares `scheduleTaxYear`. There is
no silent 2026-rate + 2025-deduction hybrid inside a row. North Carolina was
previously labelled a hybrid; it is not. The 3.99% rate is Session Law 2023-134
for years after 2025, and the standard deduction is the amount currently in
G.S. 105-153.5 ($12,750 / $25,500 / $19,125). Senate Bill 437 would have raised
those deductions and did not pass.

### Full 2026 official material (21)

GA, HI, IL, IN, KY, LA, MA, ME, MI, MN, MS, MT, NC, NE, NY, OH, OK, PA, SC, WI, WV.

### Legitimate mixed-year (21) — 2025 official schedule, declared

AL, AR, AZ, CA, CO, CT, DC, DE, IA, ID, KS, MD, MO, ND, NJ, NM,
OR, RI, UT, VA, VT.

These are 2025 documents used because the 2026 annual form was not published, or
because the 2025 packet is the latest complete official computation. The year is
on the row and in the take-home assumption line (`Schedule year …`).

Within-row notes that are *not* errors:

- **ID** stores the 2025 federal standard deduction printed on 2025 Form 40
  (`$15,750 / $31,500 / $23,625`), not the 2026 IRS snapshot. Forward-filling
  the 2026 federal deduction would have been a silent hybrid.
- **IN** 2026 rate (SEA 451, 2.95%) with the statutory `$1,000` personal
  exemption (DOR IB117 / IC 6-3-1-3.5), which is not an indexed annual amount.
- **AZ** 2.5% from A.R.S. 43-1011. 2026 session H.B. 4168 / S.B. 1861 kept the
  standard deduction at `$15,750 / $31,500 / $23,625` rather than the pre-OBBBA
  federal `$8,350` some third-party tables show. 2026 Form 140 was not
  published, so the row still declares schedule year 2025.

### Unsupported because 2026 data unavailable

None. New York is modeled from 2026 IT-2105-I.

## Local tax limitations

Local tax is named, never invented as a `typicalRate`, never folded into the
state liability.

| Jurisdiction | What is omitted |
| --- | --- |
| PA | Local earned income tax (municipality + school district; Act 32 1% floor through Philadelphia’s 3.735% resident wage tax as of 1 July 2026) |
| IA | School district surtax (DOR table band published) |
| MD | County / Baltimore City income tax (Comptroller band published) |
| OH | Municipal and school-district income tax (size not stated) |
| KY | Occupational license tax (size not stated) |
| MI | City income tax (size not stated) |
| AL | Municipal occupational tax (size not stated) |
| MO | Kansas City and St. Louis earnings tax (size not stated) |
| IN | County income tax (size not stated; DOR county dataset is a future ZIP resolver, not a default rate) |
| DE | City of Wilmington 1.25% earned income tax (named; not estimated for the rest of Delaware) |
| NY | NYC resident income tax (2026 IT-2105-I city schedule) and Yonkers 16.75% of state tax |

The take-home page says the state/federal figure is the computed scope. Where a
local tax exists, the assumption text states that real take-home is lower.

## Sources

| Class | Role |
| --- | --- |
| State DOR publications, statutes, estimated-tax forms, employer guides | Production transcription |
| IRS Rev. Proc. / Pub 15 | Federal production |
| PolicyEngine-US (AGPL-3.0) | Discovery / official-source index; one figure taken directly and labelled |
| GitHub construction / tax datasets | Not copied into production |
| CWICR (CC BY-NC 4.0 data) | Rejected — licence and non-US geography |

**Production data copied from third-party repositories: one figure.** Arizona's
$125 dependent tax credit for 2026 was read from the PolicyEngine-US parameter
set citing HB 4168, because the Department of Revenue's own site was not
reachable at verification. Its golden vectors carry the `secondary-source`
basis so the difference from a transcribed figure is visible in the gate rather
than lost. What was taken is a dollar amount fixed by Arizona statute — a fact
about the law rather than the repository's expression of it — so the AGPL does
not reach it, and no file, structure or wording came with it.

That the rest is transcribed from the states is not a formality. The same
repository had Maine's dependent-credit phase-out at $20 for each $1,000 where
Maine's own instructions say $500, a factor of two on the reduction for every
affected filer. See `DATA_SOURCE_REGISTRY.md`.

## Architecture

Reusable shapes added during P2 (no state-named hacks):

| Shape | Forced by | Why a new shape |
| --- | --- | --- |
| `federalDeduction.shareOfFederalTax` | MO | AGI staircase % of federal tax, then cap |
| `steppedStandardDeduction` | AL | 21-row AGI deduction chart |
| `standardDeductionRatePhaseOut` | WI | Multi-stage “amount less X% over Y”; HOH is two-rate |
| `taxAddOnSteps` | CT | Table C add-back + Table D recapture dollar staircases |
| `exemptionCredit.rateStepsByFilingStatus` | CT | Table E credit = tax × AGI-looked-up rate |
| `perDependentExemption` on flat policies | GA, IN | Dependent deduction on a flat state |
| `localAddOn` without a typical rate | KY, OH, MI, AL, MO, IN, DE | Name the levy; do not invent a band |
| `steppedPersonalExemption.includeDependents` | CT | Table A is one return-level amount; OH/MD still count dependents |
| `standardDeductionLimitation` | MN | 3% then 10% of AGI, 80% cap, forced above $1,107,750 |
| `federalStandardDeductionAddBack` | CO | Above $300,000 AGI, add back federal SD over $12,000 / $16,000 joint |
| `localAddOn.omissionNote` | PA, DE | A range that would hide Philadelphia 3.735% or Wilmington 1.25% |

Earlier P2 shapes retained: `additionalTax.thresholdByFilingStatus`,
`TaxBracket.baseTax`, `steppedPersonalExemption`, `personalExemptionPhaseOut`.

Follow-on shapes after close, forced by the dependents pass:

| Shape | Forced by | Why a new shape |
| --- | --- | --- |
| `steppedDependentExemption` | AL, NC | Personal exemption is flat; the dependent amount is its own AGI chart |
| `steppedPhaseOut.appliesTo` | ME vs CA | Maine takes $20 off the credit once; California takes $6 off every exemption |
| `proportionalPhaseOut` | AZ | 5% of the credit per $1,000, so one dependent and three reach zero at the same income |
| `perDependentAmountStepsByFilingStatus` | CO | Child tax credit is $1,200 / $600 / $200 by AGI, wider for joint filers |
| `taxForgiveness` | PA | Share of the tax; poverty floor rises $9,500 per dependent child |
| `familySizeTaxCredit` | KY | Share of the tax on FPL for family size; last two bands are not 4% |
| `dependentAllowanceStatus` | ID vs AZ | “The state gives nothing” and “the figure rests on an assumption” are not the same sentence |

Fail-closed: missing `federalIncomeTax` (AL/MO/OR), `employeeFica` (MA), or
`federalStandardDeduction` (federal-taxable-income states) throws. Unknown is
not zero.

## Federal ↔ state contract

Canonical pipeline: federal income tax and FICA are computed first; state
receives `federal.tax` and `federal.standardDeduction` from that same pass.

| Path | Contract |
| --- | --- |
| Annual salary | `estimateAnnualTaxLiability` |
| Hourly / paycheck frequencies | Annualize, then the same annual function |
| Bonus | Independent federal before/after, then state before/after; not the federal supplemental withholding rate |
| Filing status | Passed through unchanged |
| Dependents | Optional 0–20 on salary-after-tax and paycheck; occupation wage profiles stay at 0 |
| Missing federal / FICA input | Fail-fast; no `0` / `undefined` fallback |

## Known limitations

Real remaining gaps, not polish items:

1. **NYC / Yonkers / other local wage taxes** named, not computed without a city.
2. **21 states** still on 2025 official annual material inside the 2026 snapshot
   (declared). Several of those 2025 figures remain the 2026 law.
3. **IN** extra qualifying-child / adopted-child / age-blind exemptions not
   modeled.
4. **AZ** charitable-contribution standard-deduction increase not modeled.
5. **GA** 2026 Form 500 not published; 2026 Employer’s Tax Guide used for the
   annual computation.
6. **ID** 2026 indexed 0% threshold not published; 2025 Form 40 packet used
   (`scheduleTaxYear` 2025).
7. **CT** 2025 TCS tables; Table B published examples round to the dollar,
   engine does not.
8. **MT and ND** lack a published-table golden vector. California now has
    published-table rows from the 2025 Form 540 tax table (printed tax less the
    printed exemption credit).
9. Itemized deductions, most credits, capital gains, AMT, and age/blindness
    extras are out of scope. Dependent exemptions and credits apply where the
    snapshot carries them, including Alabama’s AGI chart, California’s
    exemption credits, Maine’s $305 credit, South Carolina’s $4,930, Arizona’s
    $125 under-17 credit, North Carolina’s child deduction, Pennsylvania Tax
    Forgiveness, Colorado’s under-six child tax credit, the District’s $1,000
    child tax credit, Kentucky’s family size tax credit, and the per-person
    amounts in IL, MI, NM, VT, RI, OH, MD and others. Where a modelled figure
    rests on an assumption (age, qualifying-child status, eligibility income
    equal to wages, refundability capped at tax), the row states which way
    the estimate is wrong.
10. **MA** 2026 Form 1 was not published; the exemption and $2,000 FICA cap are
    the current Mass.gov / 2025 Form 1 amounts, declared in the row notes.
11. **NY** household credit (below $28,000 / $32,000 FAGI) is not modeled.
12. **CA SDI, NJ TDI/FLI, WA Cares**, and similar payroll levies are outside
    the income-tax engine. Take-home is federal + FICA + state income tax only.
13. Cost-of-living gross-salary conversion does not pass `children` as tax
    dependents. Salary-after-tax and paycheck do.

## Production readiness

**PASS for 51/51 state wage tax**, with declared mixed-year rows and named local omissions.

Ready for salary / take-home in every jurisdiction: every shipped number has an
official source, mixed years are declared, local tax is named rather than
zeroed, federal/state inputs fail closed, and `verify:tax` plus the tax spec
pass.

Not an unconditional “every 2026 Form 1040 packet is in hand” pass, because
twenty-one income-tax states still rest on 2025 official annual forms, and
local taxes remain omitted by design. Those are stated limitations, not silent
errors.

P2 is closed. Coverage work does not reopen. Remaining state-tax work is
either a newly published 2026 annual form that replaces a declared 2025 row,
or a local-tax engine keyed on city/ZIP.
