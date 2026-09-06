# State tax transcription matrix

Working document for P2. Status as of 2026-09-06.

**Supported: 16 / 51** — seven with a real schedule, nine that levy no wage tax.
Remaining: 35.

Landed since this document was written: **Minnesota** (2026 brackets, standard
deduction and dependent exemption, from the statutory inflation-adjustment
table cross-checked against the department's rates page) and **North Carolina**
(2026 rate confirmed from NC-30, the agency's own 2026 withholding publication).

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

### The access route that works

Most state revenue sites refuse programmatic HTML requests: of eleven probed,
four returned HTTP 403, two failed DNS, one 404'd on its own published path and
one sat behind bot detection.

**PDFs are the way through.** A fetched PDF is saved locally even when its text
layer will not extract, and can then be read directly. North Carolina's 2026
rate was confirmed this way from NC-30 (Web 11-25) — the agency's own 2026
withholding publication — after the HTML rate page had declined to state it.

So the working order per state is: instruction booklet PDF → withholding guide
PDF → HTML rate page → statute. Third-party sites are used only to *locate* an
official document, never as the source of a figure.

## What each tax model needs

| Model | Required data pieces |
| --- | --- |
| Flat | rate · standard deduction or exemption by filing status · schedule year |
| Flat + credit | rate · credit amount · phase-out start and rate · schedule year |
| Progressive | brackets × 4 filing statuses · standard deduction × 4 · personal/dependent exemption or credit · schedule year |
| + federal deduction | all of the above · the cap, or that there is none |
| + local tax | the band actually levied and its basis, to name the omission |

Every state also needs a source URL, a source document name, and **three golden
vectors** reproducing the state's own published figure at three incomes.

## The 36 remaining

Model column is a hypothesis to verify against the source, not data. Access is
measured where probed and estimated otherwise.

### In flight

| State | Verified so far | Still needed | Blocker |
| --- | --- | --- | --- |
| IA | Flat **3.8% for 2026** (IDR press release, 2025-10-21) | IA 1040 standard deduction ×4 | Withholding formula gives a *withholding* deduction and says so explicitly — not the annual figure |
| KY | 2026 standard deduction **$3,360** (DOR announcement, KRS 141.081) | the 2026 rate | DOR page states "four (4) percent" without naming a year; the rate statute was not reachable |
| GA | — | rate, deductions | Document downloads 403 |
| CO | — | rate | Every agency URL 403, including via curl |

Both IA and KY are one verified figure short. Neither is entered: a rate without
its deduction, or a deduction without its rate, is not a tax calculation.

### Flat rate — 11 states

| State | Tax model | Required pieces | Official sources to use | Missing | Access |
| --- | --- | --- | --- | --- | --- |
| AZ | Flat | rate, std deduction ×4 | AZ Form 140 instructions; withholding pub | all | HTML **403** — use PDF |
| CO | Flat on federal taxable income | rate; confirm no state std deduction | DR 0104 booklet; Income Tax Topics | all | HTML **403** — use PDF |
| GA | Flat, rate stepping down | rate, std deduction ×4, dependent exemption | IT-511 booklet; employer withholding guide | all | untested |
| IA | Flat since 2025 | rate, std deduction ×4 | IA 1040 instructions; withholding tables | all | untested |
| ID | Flat | rate, std deduction (federal-conformed?) | Form 40 instructions; withholding guide | all | untested |
| IN | Flat + **county** rate | state rate, exemptions; county band | IT-40 booklet; Departmental Notice #1 | all | untested |
| KY | Flat | rate, std deduction | 740 instructions; withholding tables | all | untested |
| LA | Flat since 2025 | rate, std deduction / exemption | IT-540 instructions; withholding tables | all | untested |
| MI | Flat + **city** tax | rate, personal exemption; city band | MI-1040 book; Treasury rate page | all | HTML **403** — use PDF |
| MS | Flat, stepping down | rate, exemption, std deduction | 80-100 instructions; withholding | all | untested |
| UT | Flat + **taxpayer credit** | rate, credit, phase-out start and rate | TC-40 instructions; Pub 14 | all | HTML **403** — use PDF |

### Progressive — 25 states

| State | Tax model | Required pieces | Official sources to use | Missing | Access |
| --- | --- | --- | --- | --- | --- |
| AL | Progressive + **federal deduction** + local occupational | brackets ×4, std deduction ×4 (income-phased), exemptions, federal deduction rule | Form 40 booklet; Reg. 810-3-15 | all | untested |
| AR | Progressive, low-income tables | brackets ×4, std deduction, credits | AR1000F instructions; withholding formula | all | untested |
| CT | Progressive + phase-out recapture | brackets ×4, personal exemption phase-out, credits | CT-1040 instructions; IP withholding | all | untested |
| DC | Progressive | brackets ×4, std deduction ×4 | D-40 booklet; OTR withholding | all | untested |
| DE | Progressive + **credit** exemptions | brackets ×4, std deduction, personal credits | 200-01 instructions; withholding guide | all | untested |
| HI | Progressive, 12 brackets | brackets ×4, std deduction ×4, exemptions | N-11 instructions; Booklet A | all | untested |
| KS | Progressive, 2 brackets | brackets ×4, std deduction ×4, exemptions | K-40 instructions; withholding KW-100 | all | untested |
| MD | Progressive + **county** tax | brackets ×4, std deduction (percentage w/ floor and cap), exemptions; county band | Resident booklet; Withholding Guide | all | untested |
| ME | Progressive, indexed | brackets ×4, std deduction ×4, personal exemption | 1040ME instructions; withholding tables | all | untested |
| ~~MN~~ | ~~Progressive~~ | — | **DONE** — statutory inflation-adjustment PDF + rates page | — | solved via PDF |
| MO | Progressive + **federal deduction** (capped) | brackets, std deduction (federal-conformed), federal deduction cap | MO-1040 instructions; withholding | all | untested |
| MT | Progressive + **federal deduction** (capped) | brackets ×4, std deduction, federal deduction cap | Form 2 instructions; withholding | all | untested |
| ND | Progressive, low rates | brackets ×4, uses federal taxable income | ND-1 instructions; withholding | all | untested |
| NE | Progressive, stepping down | brackets ×4, std deduction ×4, personal exemption credit | 1040N booklet; Circular EN | all | untested |
| NM | Progressive | brackets ×4, std deduction (federal-conformed), exemptions | PIT-1 instructions; FYI-104 | all | untested |
| NY | Progressive + **NYC/Yonkers** | brackets ×4, std deduction ×4, supplemental tax recapture | IT-201 instructions; Pub NYS-50-T-NYS | **2026 not published** — index stops at 2025 | HTML OK but year missing |
| OH | Progressive + **municipal** tax | brackets, exemption credit, joint filer credit | IT 1040 instructions; annual rates page | all | HTML **404** on published path — use PDF |
| OK | Progressive | brackets ×4, std deduction ×4, exemptions | 511 packet; withholding tables | all | untested |
| OR | Progressive + **federal subtraction** (capped, phased) | brackets ×4, std deduction ×4, federal subtraction cap and phase-out | OR-40 instructions; withholding formulas | all | untested |
| RI | Progressive, indexed | brackets ×4, std deduction ×4 (phased out), exemption | RI-1040 instructions; withholding booklet | all | untested |
| SC | Progressive with large 0% band | brackets, std deduction (federal-conformed) | SC1040 instructions; withholding WH-1603 | all | untested |
| VA | Progressive, 4 brackets | brackets, std deduction ×4, personal exemption | 760 instructions; Pub 15-A withholding | all | **DNS failure** — use PDF via direct link |
| VT | Progressive | brackets ×4, std deduction ×4, personal exemption | IN-111 instructions; withholding booklet | all | untested |
| WI | Progressive, 4 brackets | brackets ×4, std deduction (income-phased) ×4, exemption | Form 1 instructions; withholding Pub W-166 | all | **DNS failure** — use PDF via direct link |
| WV | Progressive, rate stepping down | brackets ×4, personal exemption | IT-140 instructions; withholding | all | untested |

## Local income taxes

Nine of these levy a local tax the site cannot compute without knowing a
municipality or county. **No rate is invented.** The state figure is computed
correctly and the local tax is named as an omission with the band actually
levied, so the reader knows the direction and rough size of what is missing.

| State | Basis | Notes |
| --- | --- | --- |
| MD | county | Large — often comparable to the state tax itself |
| OH | municipality + school district | Two separate levies |
| PA | municipality + school district | **Already modelled as an omission** |
| NY | NYC and Yonkers only | Not statewide |
| MI | city | A minority of cities |
| IN | county | Statewide, county-set |
| KY | county / city occupational | Statewide |
| AL | municipality occupational | A minority of municipalities |
| MO | Kansas City and St. Louis only | Earnings tax |

ZIP or city level support is a later phase. It changes nothing about the state
figure being right.

## Order of work

Simplest complete data first, so each state lands verified rather than half-done:

1. **Flat, no local, no credit** — CO, ID, KY, LA, MS, GA, IA, AZ
2. **Flat with a wrinkle** — UT (credit), IN (county), MI (city)
3. **Progressive, plain** — MN (deduction only), KS, ND, SC, NM, VT, ME, OK, DC, HI, RI, NE, WV, AR, CT, DE, VA, WI
4. **Progressive with a federal deduction** — MO, MT, OR, AL
5. **Progressive with a large local layer** — MD, OH
6. **Blocked on publication** — NY, until its 2026 schedules exist

A state is only entered when every required piece is in hand. Minnesota has its
2026 brackets and not its deduction; a bracket table without the deduction it
applies to is not a tax calculation, so it waits for the M1 booklet rather than
shipping half-right.
