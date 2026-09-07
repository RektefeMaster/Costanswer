import { z } from 'zod';
import { isStateCode, STATE_CODES, type StateCode } from '@/lib/location/states';
import { FILING_STATUSES, type FilingStatus } from '@/lib/calculations/tax/types';

const isoDateTime = z.string().datetime();
const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);
const sourceUrl = z.string().url();

export const taxBracketSchema = z.object({
  notOver: z.number().finite().positive().nullable(),
  rate: z.number().finite().min(0).max(1),
  /** Tax at this bracket's floor, where the state publishes it outright. */
  baseTax: z.number().finite().min(0).optional(),
}).strict();

const filingStatusNumberSchema = z.object({
  single: z.number().finite().min(0),
  marriedFilingJointly: z.number().finite().min(0),
  marriedFilingSeparately: z.number().finite().min(0),
  headOfHousehold: z.number().finite().min(0),
}).strict();

const filingStatusBracketsSchema = z.object({
  single: z.array(taxBracketSchema).min(1),
  marriedFilingJointly: z.array(taxBracketSchema).min(1),
  marriedFilingSeparately: z.array(taxBracketSchema).min(1),
  headOfHousehold: z.array(taxBracketSchema).min(1),
}).strict();

function addBracketIssues(
  brackets: z.infer<typeof taxBracketSchema>[],
  path: Array<string | number>,
  context: z.RefinementCtx,
) {
  let previous = 0;
  const lastIndex = brackets.length - 1;
  for (const [index, bracket] of brackets.entries()) {
    const isLast = index === lastIndex;
    if (isLast && bracket.notOver !== null) {
      context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'The top tax bracket must be open-ended.' });
    }
    if (!isLast && bracket.notOver === null) {
      context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'Only the top tax bracket may be open-ended.' });
    }
    if (bracket.notOver !== null) {
      if (!(bracket.notOver > previous)) {
        context.addIssue({ code: 'custom', path: [...path, index, 'notOver'], message: 'Bracket thresholds must be strictly increasing.' });
      }
      previous = bracket.notOver;
    }
  }
}

const stateMetadataSchema = z.object({
  stateCode: z.string().refine(isStateCode, 'Unknown U.S. state code.'),
  provider: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  version: z.string().min(1),
}).strict();

const unsupportedStateSchema = stateMetadataSchema.extend({
  status: z.literal('unsupported'),
  reason: z.string().min(1),
  sourceStatus: z.literal('unsupported'),
}).strict();

const noneStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('none'),
  sourceStatus: z.literal('verified'),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const exemptionStepsSchema = z.array(z.object({
  /** Highest income this step covers; null for the open top step. */
  notOver: z.number().finite().positive().nullable(),
  amount: z.number().finite().min(0),
}).strict()).min(1);

/** A rate looked up by income, the way Missouri's federal-tax percentage is. */
const incomeRateStepsSchema = z.array(z.object({
  notOver: z.number().finite().positive().nullable(),
  rate: z.number().finite().min(0).max(1),
}).strict()).min(1);

/**
 * A per-person credit subtracted after tax is computed.
 *
 * Many states give an exemption as a credit against tax rather than a deduction
 * from income, and the two are not interchangeable: a $100 deduction is worth
 * the marginal rate, a $100 credit is worth $100. Modelling one as the other
 * moves the answer by more than a rounding difference at low incomes, which is
 * exactly where a take-home figure matters most.
 */
const exemptionCreditSchema = z.object({
  perFilerByFilingStatus: filingStatusNumberSchema,
  perDependent: z.number().finite().min(0),
  /**
   * Part of the credit stated as a share of the federal standard deduction.
   *
   * Utah is the case this exists for: its taxpayer tax credit is six percent of
   * the federal standard deduction plus state exemptions, so the credit moves
   * every time the IRS indexes that deduction. Writing today's product into
   * `perFilerByFilingStatus` would work for one filing season and then be
   * quietly wrong, in the direction of overcharging, for every one after.
   */
  rateOfFederalStandardDeduction: z.number().finite().min(0).max(1).optional(),
  /**
   * Income above which the credit is not allowed at all.
   *
   * A cliff rather than a taper, which is how Oregon writes it: above $100,000
   * of adjusted gross income single, or $200,000 otherwise, the instruction is
   * to enter zero. A linear phase-out cannot express that without inventing a
   * ramp the state does not have.
   */
  disallowedAboveIncomeByFilingStatus: filingStatusNumberSchema.optional(),
  /** Some states phase the credit out. Absent means it does not. */
  phaseOut: z.object({
    startIncomeByFilingStatus: filingStatusNumberSchema,
    /** Credit reduced by this fraction of income above the start, to zero. */
    ratePerDollar: z.number().finite().min(0).max(1),
  }).strict().optional(),
  /**
   * A phase-out that counts whole increments and bites each exemption.
   *
   * California's AGI Limitation Worksheet, and the reason the linear
   * `phaseOut` above cannot express it. Three things differ. The increment is
   * counted whole and rounded up, so a dollar over the threshold costs the
   * same as $2,499. The reduction is per exemption, so a couple with three
   * children loses five times what the worksheet computes once. And the filer
   * credits and the dependent credits are floored at zero separately, so a
   * filer whose personal credit has already been wiped out still loses the
   * full reduction from each dependent credit.
   *
   * Treating it as a linear taper on the combined figure would understate the
   * tax of every high-income California filer with children.
   */
  steppedPhaseOut: z.object({
    startIncomeByFilingStatus: filingStatusNumberSchema,
    /** Income step that counts as one increment; California halves it for separate filers. */
    incrementByFilingStatus: filingStatusNumberSchema,
    /** Dollars each whole increment takes off. */
    reductionPerIncrement: z.number().finite().min(0),
    /**
     * Whether the reduction bites once or once per exemption.
     *
     * Maine takes $20 for each $500 "or fraction thereof" off the credit as a
     * whole. California takes $6 for each $2,500 off every exemption
     * separately. Same staircase, and a factor of five apart for a couple with
     * three children, so it cannot be left implicit.
     */
    appliesTo: z.enum(['total', 'each-exemption']),
    /** Exemptions the filer claims before dependents. Only read for 'each-exemption'. */
    filerExemptionCountByFilingStatus: filingStatusNumberSchema.optional(),
  }).strict().optional(),
  /**
   * A phase-out that removes a share of the credit rather than a sum of money.
   *
   * Arizona cuts 5% of the dependent credit for each $1,000 of federal AGI
   * over $200,000, so the credit is gone at $220,000 whatever it was worth.
   * A fixed dollar taper cannot express that: one dependent and three
   * dependents have to reach zero at the same income, and only a proportion
   * does that.
   */
  proportionalPhaseOut: z.object({
    startIncomeByFilingStatus: filingStatusNumberSchema,
    incrementByFilingStatus: filingStatusNumberSchema,
    /** Share of the credit removed per whole increment, capped at all of it. */
    rateOfCreditPerIncrement: z.number().finite().min(0).max(1),
  }).strict().optional(),
  /**
   * A credit that is a percentage of the tax itself, looked up on AGI.
   *
   * Connecticut Table E is the case: 75% of the tax at low AGI, stepping down
   * to nothing. A dollar credit, or a linear phase-out of one, cannot express
   * those published decimals.
   */
  rateStepsByFilingStatus: z.object({
    single: incomeRateStepsSchema,
    marriedFilingJointly: incomeRateStepsSchema,
    marriedFilingSeparately: incomeRateStepsSchema,
    headOfHousehold: incomeRateStepsSchema,
  }).strict().optional(),
}).strict();

/**
 * A standard deduction stated as a share of income, within bounds.
 *
 * A handful of states compute it as a percentage with a floor and a ceiling
 * rather than a flat amount. Storing only the ceiling — the obvious shortcut —
 * overstates the deduction for every income below the cap.
 */
const percentageDeductionSchema = z.object({
  rate: z.number().finite().min(0).max(1),
  minimumByFilingStatus: filingStatusNumberSchema,
  maximumByFilingStatus: filingStatusNumberSchema,
}).strict();

/**
 * A standard deduction written as "amount less X% of income over Y", in stages.
 *
 * The existing proportional phase-out shrinks the whole deduction across one
 * band. Wisconsin's head-of-household schedule does that twice, at two rates,
 * and the second stage reuses the single filer's remaining amount. Stages are
 * the smallest shape that can follow the published rows without approximating.
 */
const deductionRateStageSchema = z.object({
  /** Inclusive top of this stage; null on the residual (usually $0) stage. */
  notOver: z.number().finite().positive().nullable(),
  amount: z.number().finite().min(0),
  /** Subtract this rate times income above `excessOver`. Absent means a flat amount. */
  rate: z.number().finite().min(0).max(1).optional(),
  excessOver: z.number().finite().min(0).optional(),
}).strict();

const standardDeductionRatePhaseOutSchema = z.object({
  stagesByFilingStatus: z.object({
    single: z.array(deductionRateStageSchema).min(1),
    marriedFilingJointly: z.array(deductionRateStageSchema).min(1),
    marriedFilingSeparately: z.array(deductionRateStageSchema).min(1),
    headOfHousehold: z.array(deductionRateStageSchema).min(1),
  }).strict(),
}).strict();

/**
 * A deduction or exemption that shrinks in proportion to income above a start.
 *
 * Maine is the case: above about $102,000 of adjusted gross income the standard
 * deduction is reduced by the fraction of a $75,000 band the filer has crossed,
 * reaching zero at the top of it. Ignoring that overstates the deduction for
 * anyone in the band and understates their tax, in a range where a great many
 * of this site's readers actually sit — unlike the phase-outs that only bite
 * above a quarter of a million dollars.
 */
const proportionalPhaseOutSchema = z.object({
  startIncomeByFilingStatus: filingStatusNumberSchema,
  /** Dollars of income over which the amount falls from full to nothing. */
  rangeByFilingStatus: filingStatusNumberSchema,
  /**
   * Some states round the reduction down to a step before applying it.
   *
   * South Carolina rounds it down to the next lowest $10, which leaves the
   * filer slightly more deduction than the raw fraction would. It is worth
   * about half a dollar of tax — small enough to look like noise, which is
   * exactly why it is stated rather than silently dropped.
   */
  roundReductionDownToMultipleOf: z.number().finite().positive().optional(),
}).strict();

/**
 * A standard deduction reduced by two successive rates, then capped.
 *
 * Minnesota is the case: 3% of AGI over the first threshold, plus 10% over
 * the second, never more than 80% of the deduction, and the 80% cut is forced
 * above an indexed millionaire line. A single proportional band cannot make
 * that switch.
 */
const standardDeductionLimitationSchema = z.object({
  startIncomeByFilingStatus: filingStatusNumberSchema,
  secondStartIncomeByFilingStatus: filingStatusNumberSchema,
  firstRate: z.number().finite().min(0).max(1),
  secondRate: z.number().finite().min(0).max(1),
  maximumReductionShare: z.number().finite().min(0).max(1),
  fullLimitationIncomeByFilingStatus: filingStatusNumberSchema,
}).strict();

/**
 * Add back part of the federal standard deduction above a high-income line.
 *
 * Colorado is the case: above $300,000 of federal AGI the state adds back the
 * federal deduction over $12,000 ($16,000 joint). Ignoring it understates tax
 * for those filers.
 */
const federalStandardDeductionAddBackSchema = z.object({
  appliesAboveIncomeByFilingStatus: filingStatusNumberSchema,
  keepAmountByFilingStatus: filingStatusNumberSchema,
}).strict();

/**
 * A second schedule that replaces the ordinary one for low incomes.
 *
 * Arkansas is the case. Below about $17,500 single or $29,000 filing jointly a
 * qualifying filer uses the Low Income Tax Table instead of the regular one,
 * and its instructions say to enter zero for the standard deduction — so it is
 * not an adjustment to the normal calculation but a different calculation. A
 * single filer with $14,643 of income owes nothing at all, where the regular
 * schedule would have charged about $112. Leaving it out would overstate tax
 * for exactly the people with least room for it.
 *
 * A zero threshold means the alternative never applies to that filing status,
 * which is how Arkansas excludes separate filers from it.
 */
const alternativeLowIncomeScheduleSchema = z.object({
  appliesAtOrBelowByFilingStatus: filingStatusNumberSchema,
  /** Applied to income before any deduction or exemption, and instead of them. */
  bracketsByFilingStatus: filingStatusBracketsSchema,
}).strict();

/**
 * A per-person exemption that steps down as income rises.
 *
 * Ohio's is $2,400 up to $40,000 of modified adjusted gross income, $2,150 to
 * $80,000, $1,900 below $500,000 of MAGI in 2026, and nothing at or above
 * $500,000 — a staircase, not a taper, so the proportional phase-out shape
 * would give the wrong figure everywhere except at the step edges.
 */
/**
 * A per-dependent amount that steps down as income rises.
 *
 * Distinct from `steppedPersonalExemption`, which multiplies one staircase by
 * filers plus dependents. Alabama and North Carolina both give the filer a
 * flat amount and the dependents a different, income-stepped one, so the two
 * cannot share a staircase: Alabama's personal exemption is $1,500 or $3,000
 * regardless of income while its dependent exemption falls $1,000 → $500 →
 * $300, and North Carolina gives no personal exemption at all.
 *
 * The step is read on the income the state's own worksheet reads it on, which
 * for both of these is the income before the deductions and subtractions that
 * follow — Alabama Form 40 line 10, North Carolina Form D-400 line 6.
 */
const steppedDependentExemptionSchema = z.object({
  /**
   * Per status, because North Carolina's staircase is twice as wide for joint
   * filers as for single ones. Alabama's is one table for everybody and is
   * written out four times rather than given a shape of its own; a second
   * shape would have to be kept in step with this one forever.
   */
  amountStepsByFilingStatus: z.object({
    single: exemptionStepsSchema,
    marriedFilingJointly: exemptionStepsSchema,
    marriedFilingSeparately: exemptionStepsSchema,
    headOfHousehold: exemptionStepsSchema,
  }).strict(),
  /**
   * What the state counts. North Carolina's table is per qualifying child with
   * a federal child tax credit, not per dependent, so a filer with a dependent
   * parent gets less than this model gives them. Alabama counts any dependent.
   * Stated here so the difference is on the record rather than in a comment.
   */
  countedAs: z.enum(['dependent', 'qualifying-child']),
}).strict();

const steppedExemptionSchema = z.object({
  /**
   * Amount per exemption, by the income it applies at, per filing status.
   *
   * Per status because Maryland's staircase starts $50,000 higher for joint
   * filers than for single ones while Ohio's is the same for everybody. One
   * shared array would have quietly applied the single thresholds to couples.
   */
  amountStepsByFilingStatus: z.object({
    single: exemptionStepsSchema,
    marriedFilingJointly: exemptionStepsSchema,
    marriedFilingSeparately: exemptionStepsSchema,
    headOfHousehold: exemptionStepsSchema,
  }).strict(),
  /** Exemptions a filer claims before dependents: one, or two filing jointly. */
  countByFilingStatus: filingStatusNumberSchema,
  /**
   * Whether the dependents input adds to that count.
   *
   * Ohio and Maryland grant the same per-person amount to dependents, so the
   * default is to include them. Connecticut Table A is one return-level amount
   * looked up on AGI — multiplying it by dependents would invent a deduction
   * Connecticut does not give.
   */
  includeDependents: z.boolean().optional(),
}).strict();

/**
 * Federal income tax deducted from state taxable income.
 *
 * A few states allow it, some with a cap. It makes state tax depend on federal
 * tax, which is why the engine computes federal first and passes the result
 * down rather than each layer standing alone.
 */
const federalDeductionSchema = z.object({
  /** Cap on the deduction, or null where the state allows it in full. */
  capByFilingStatus: filingStatusNumberSchema.nullable(),
  /**
   * Where the cap itself falls away as income rises.
   *
   * Oregon's subtraction is $8,500 up to $125,000 of adjusted gross income and
   * then drops in five steps to nothing by $145,000 — $250,000 to $290,000 on
   * a joint return. Treating the headline $8,500 as the cap would hand a
   * deduction to precisely the filers Oregon takes it away from, and be wrong
   * by up to $8,500 of taxable income.
   */
  capStepsByFilingStatus: z.object({
    single: exemptionStepsSchema,
    marriedFilingJointly: exemptionStepsSchema,
    marriedFilingSeparately: exemptionStepsSchema,
    headOfHousehold: exemptionStepsSchema,
  }).strict().optional(),
  /**
   * Which federal figure is deducted.
   *
   * `income-tax` is regular federal income tax as this engine computes it —
   * Form 1040 tax after the standard deduction, without refundable credits.
   * Missouri multiplies that figure (MO-1040 line 11) by an AGI-based share.
   * Alabama's worksheet starts from Form 1040 line 22, adds NIIT and subtracts
   * refundable credits; for a wage-only filer with none of those, it is the
   * same number. The engine always receives `federalIncomeTax`; this field
   * records what that number is supposed to represent, rather than stretching
   * a cap to fake a percentage.
   */
  federalTaxBase: z.enum([
    'income-tax',
    'income-tax-plus-niit-minus-refundable-credits',
  ]).optional(),
  /**
   * Share of that federal tax allowed, looked up on the filer's AGI.
   *
   * Missouri is the case: 35% at or below $25,000 of Missouri AGI, then 25%,
   * 15%, 5% and 0%, after which the product is capped. Reusing `capSteps` for
   * those percentages would store a rate in a dollar field and still not
   * multiply, so the share is a separate shape.
   */
  shareOfFederalTax: z.object({
    rateStepsByFilingStatus: z.object({
      single: incomeRateStepsSchema,
      marriedFilingJointly: incomeRateStepsSchema,
      marriedFilingSeparately: incomeRateStepsSchema,
      headOfHousehold: incomeRateStepsSchema,
    }).strict(),
  }).strict().optional(),
}).strict();

/**
 * A standard deduction looked up from an income chart, not a single figure.
 *
 * Alabama is the case: $8,500 filing jointly at or below $25,999 of Alabama
 * AGI, then $175 less in each $500 band down to $5,000. Storing the $8,500,
 * or approximating the drop as a linear phase-out, misses every interior row
 * of the published chart.
 */
const steppedDeductionSchema = z.object({
  amountStepsByFilingStatus: z.object({
    single: exemptionStepsSchema,
    marriedFilingJointly: exemptionStepsSchema,
    marriedFilingSeparately: exemptionStepsSchema,
    headOfHousehold: exemptionStepsSchema,
  }).strict(),
}).strict();

/**
 * A local income tax on top of the state's own.
 *
 * Ohio municipalities, Maryland counties, Pennsylvania's local EIT, New York
 * City, several Michigan cities, Indiana and Kentucky counties all levy one,
 * and for many people it is a larger line than the state tax.
 *
 * It is modelled as an explicit, defaulted-off add-on rather than applied
 * silently, because the site knows a state and does not know a municipality.
 * Applying a typical rate would be inventing a number; omitting it without
 * saying so would understate the answer. So the page names the omission, and a
 * reader who knows their own rate can supply it.
 */
const localAddOnSchema = z.object({
  label: z.string().min(1),
  /** What the reader would have to know to fill this in. */
  basis: z.enum(['municipality', 'county', 'school-district']),
  /**
   * Range actually levied, where an official source states one.
   *
   * Optional on purpose. Kentucky's occupational license taxes are set by
   * hundreds of cities and counties and no state agency publishes a statewide
   * band, so a range here would be a number this project made up — which is
   * worse than saying the size is unknown. A state with no verified band names
   * the omission without pretending to size it.
   */
  typicalRateRange: z.object({
    low: z.number().finite().min(0).max(1),
    high: z.number().finite().min(0).max(1),
  }).strict().optional(),
  appliesTo: z.enum(['taxable-income', 'state-tax-liability']),
  /**
   * Extra sentence the take-home page prints, where the range alone would
   * mislead. Pennsylvania's Act 32 band is not Philadelphia's wage tax;
   * Delaware's only local income tax is Wilmington's 1.25%.
   */
  omissionNote: z.string().min(1).optional(),
}).strict();

/**
 * Where a state's taxable income starts.
 *
 * Several states do not compute their own deduction at all: they take federal
 * taxable income — income *after* the federal standard deduction — and apply a
 * rate to it. Treating that as gross wages taxes the standard deduction twice
 * over and overstates the bill by the rate times about sixteen thousand
 * dollars, every time.
 *
 * Copying the federal figure into the state row instead would work until the
 * year it changes, and then be silently wrong. So the row says which base it
 * uses and the engine reads the federal number from the same snapshot.
 */
const taxableIncomeBasisSchema = z.enum(['gross-wages', 'federal-taxable-income']);

const flatStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('flat'),
  taxableIncomeBasis: taxableIncomeBasisSchema.optional(),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  rate: z.number().finite().min(0).max(1),
  exemptionByFilingStatus: filingStatusNumberSchema,
  standardDeductionByFilingStatus: filingStatusNumberSchema.optional(),
  /** A dependent deduction, where the state states one separately from the filer's. */
  perDependentExemption: z.number().finite().min(0).optional(),
  steppedDependentExemption: steppedDependentExemptionSchema.optional(),
  /**
   * What this state does about dependents, where the dependents input still
   * changes nothing.
   *
   * There are four of these and they are not the same fact. `none` is Idaho,
   * whose $205 child tax credit sunset by its own terms — no figure exists to
   * transcribe. `not-modelled` is Pennsylvania and the District of Columbia,
   * which do give something but through a mechanism this engine has no input
   * for: an income-tested forgiveness schedule, a credit gated on a child's
   * age. `assumption` is a state whose figure is modelled but on terms the
   * reader should know — Arizona's credit is $125 for a dependent under 17 and
   * $25 for an older one, and there is no age input here. Absent is the
   * fourth, and means nobody has checked yet.
   *
   * Saying "this snapshot has no figure" about Idaho invents a gap on our
   * side; saying it about Pennsylvania hides one; saying nothing at all about
   * Arizona lets a reader with grown dependents take a number that is too low.
   */
  dependentAllowanceStatus: z.object({
    kind: z.enum(['none', 'not-modelled', 'assumption']),
    reason: z.string().min(1),
    verifiedAt: z.string().datetime(),
  }).strict().optional(),
  exemptionCredit: exemptionCreditSchema.optional(),
  federalDeduction: federalDeductionSchema.optional(),
  federalStandardDeductionAddBack: federalStandardDeductionAddBackSchema.optional(),
  localAddOn: localAddOnSchema.optional(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const flatWithSurtaxStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('flatWithSurtax'),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  exemptionByFilingStatus: filingStatusNumberSchema,
  perDependentExemption: z.number().finite().min(0).optional(),
  steppedDependentExemption: steppedDependentExemptionSchema.optional(),
  /**
   * What this state does about dependents, where the dependents input still
   * changes nothing.
   *
   * There are four of these and they are not the same fact. `none` is Idaho,
   * whose $205 child tax credit sunset by its own terms — no figure exists to
   * transcribe. `not-modelled` is Pennsylvania and the District of Columbia,
   * which do give something but through a mechanism this engine has no input
   * for: an income-tested forgiveness schedule, a credit gated on a child's
   * age. `assumption` is a state whose figure is modelled but on terms the
   * reader should know — Arizona's credit is $125 for a dependent under 17 and
   * $25 for an older one, and there is no age input here. Absent is the
   * fourth, and means nobody has checked yet.
   *
   * Saying "this snapshot has no figure" about Idaho invents a gap on our
   * side; saying it about Pennsylvania hides one; saying nothing at all about
   * Arizona lets a reader with grown dependents take a number that is too low.
   */
  dependentAllowanceStatus: z.object({
    kind: z.enum(['none', 'not-modelled', 'assumption']),
    reason: z.string().min(1),
    verifiedAt: z.string().datetime(),
  }).strict().optional(),
  /**
   * Cap on Social Security + Medicare withheld, deducted from income.
   *
   * Massachusetts Form 1 line 11 is $2,000 per earner. Absent means the state
   * does not allow that subtraction. Required at runtime as `employeeFica`.
   */
  ficaDeductionCap: z.number().finite().min(0).optional(),
  exemptionCredit: exemptionCreditSchema.optional(),
  localAddOn: localAddOnSchema.optional(),
  rate: z.number().finite().min(0).max(1),
  surtaxRate: z.number().finite().min(0).max(1),
  surtaxThreshold: z.number().finite().positive(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const nyRecaptureStepSchema = z.object({
  /** Inclusive taxable-income cap of this worksheet; null for the open top below `topRateAgi`. */
  notOver: z.number().finite().positive().nullable(),
  recaptureBase: z.number().finite().min(0),
  incrementalBenefit: z.number().finite().min(0),
  /** AGI floor used on the worksheet's "excess of line 1 over …" line. */
  agiThreshold: z.number().finite().positive(),
}).strict();

const progressiveStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('progressive'),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  taxableIncomeBasis: taxableIncomeBasisSchema.optional(),
  /**
   * Flat deduction by filing status. Optional where `steppedStandardDeduction`,
   * `percentageStandardDeduction` or `standardDeductionRatePhaseOut` is the
   * actual rule — a dummy constant would be an approximation of a chart the
   * engine can already look up.
   */
  standardDeductionByFilingStatus: filingStatusNumberSchema.optional(),
  /** Where the deduction is a share of income rather than a flat amount. */
  percentageStandardDeduction: percentageDeductionSchema.optional(),
  /** Where the deduction is a published income chart rather than one number. */
  steppedStandardDeduction: steppedDeductionSchema.optional(),
  /** Where the deduction shrinks with income rather than staying flat. */
  standardDeductionPhaseOut: proportionalPhaseOutSchema.optional(),
  /** Two-rate high-income limitation, as Minnesota writes it. */
  standardDeductionLimitation: standardDeductionLimitationSchema.optional(),
  /**
   * Where the deduction is a published rate formula, possibly in more than one
   * stage, rather than a single proportional band.
   *
   * Wisconsin is the case. Head of household phases $18,030 at 22.515% until
   * $58,827, then follows the single 12% schedule. One `proportionalPhaseOut`
   * cannot make that switch, and approximating it with the first rate would
   * understate the deduction (and overstate tax) in the second stage.
   */
  standardDeductionRatePhaseOut: standardDeductionRatePhaseOutSchema.optional(),
  bracketsByFilingStatus: filingStatusBracketsSchema,
  additionalTax: z.object({
    name: z.string().min(1),
    /*
     * Per filing status, because Maine's surcharge starts at $1,000,000 single,
     * $750,000 filing separately and $1,500,000 filing jointly. A single number
     * would have quietly applied the wrong one to three filers out of four.
     */
    thresholdByFilingStatus: filingStatusNumberSchema,
    rate: z.number().finite().min(0).max(1),
  }).strict().optional(),
  /**
   * Dollar amounts added to the tax after the brackets, looked up on AGI.
   *
   * Connecticut Tables C and D are the case: a 2% phase-out add-back and a
   * recapture staircase. `additionalTax` is a single rate above a threshold and
   * cannot follow those published rows.
   */
  taxAddOnSteps: z.array(z.object({
    name: z.string().min(1),
    amountStepsByFilingStatus: z.object({
      single: exemptionStepsSchema,
      marriedFilingJointly: exemptionStepsSchema,
      marriedFilingSeparately: exemptionStepsSchema,
      headOfHousehold: exemptionStepsSchema,
    }).strict(),
  }).strict()).optional(),
  /**
   * New York's high-AGI recapture (IT-2105-I tax computation worksheets).
   *
   * Below `minAgi` the rate schedule is the whole tax. Above `topRateAgi` the
   * tax is taxable income times `topRate`. Between those, the first band
   * interpolates the schedule up to a flat rate on all taxable income, and
   * later bands add a published recapture base plus a fraction of the
   * incremental benefit. A single `additionalTax` rate cannot follow that.
   */
  nySupplementalTax: z.object({
    minAgi: z.number().finite().positive(),
    phaseInLength: z.number().finite().positive(),
    topRateAgi: z.number().finite().positive(),
    topRate: z.number().finite().min(0).max(1),
    firstBandNotOverByFilingStatus: filingStatusNumberSchema,
    firstBandRateByFilingStatus: z.object({
      single: z.number().finite().min(0).max(1),
      marriedFilingJointly: z.number().finite().min(0).max(1),
      marriedFilingSeparately: z.number().finite().min(0).max(1),
      headOfHousehold: z.number().finite().min(0).max(1),
    }).strict(),
    recaptureStepsByFilingStatus: z.object({
      single: z.array(nyRecaptureStepSchema).min(1),
      marriedFilingJointly: z.array(nyRecaptureStepSchema).min(1),
      marriedFilingSeparately: z.array(nyRecaptureStepSchema).min(1),
      headOfHousehold: z.array(nyRecaptureStepSchema).min(1),
    }).strict(),
  }).strict().optional(),
  personalExemptionByFilingStatus: filingStatusNumberSchema.optional(),
  personalExemptionPhaseOut: proportionalPhaseOutSchema.optional(),
  /** Where the exemption steps down with income instead of being flat. */
  steppedPersonalExemption: steppedExemptionSchema.optional(),
  /** A separate schedule that replaces this one below a stated income. */
  alternativeLowIncomeSchedule: alternativeLowIncomeScheduleSchema.optional(),
  perDependentExemption: z.number().finite().min(0).optional(),
  steppedDependentExemption: steppedDependentExemptionSchema.optional(),
  /**
   * What this state does about dependents, where the dependents input still
   * changes nothing.
   *
   * There are four of these and they are not the same fact. `none` is Idaho,
   * whose $205 child tax credit sunset by its own terms — no figure exists to
   * transcribe. `not-modelled` is Pennsylvania and the District of Columbia,
   * which do give something but through a mechanism this engine has no input
   * for: an income-tested forgiveness schedule, a credit gated on a child's
   * age. `assumption` is a state whose figure is modelled but on terms the
   * reader should know — Arizona's credit is $125 for a dependent under 17 and
   * $25 for an older one, and there is no age input here. Absent is the
   * fourth, and means nobody has checked yet.
   *
   * Saying "this snapshot has no figure" about Idaho invents a gap on our
   * side; saying it about Pennsylvania hides one; saying nothing at all about
   * Arizona lets a reader with grown dependents take a number that is too low.
   */
  dependentAllowanceStatus: z.object({
    kind: z.enum(['none', 'not-modelled', 'assumption']),
    reason: z.string().min(1),
    verifiedAt: z.string().datetime(),
  }).strict().optional(),
  exemptionCredit: exemptionCreditSchema.optional(),
  federalDeduction: federalDeductionSchema.optional(),
  federalStandardDeductionAddBack: federalStandardDeductionAddBackSchema.optional(),
  localAddOn: localAddOnSchema.optional(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

export const stateTaxPolicySchema = z.union([
  unsupportedStateSchema,
  noneStateSchema,
  flatStateSchema,
  flatWithSurtaxStateSchema,
  progressiveStateSchema,
]);

export const federalTaxYearSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.literal('Internal Revenue Service'),
  sourceName: z.string().min(1),
  sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  standardDeductionByFilingStatus: filingStatusNumberSchema,
  bracketsByFilingStatus: filingStatusBracketsSchema,
}).strict().superRefine((federal, context) => {
  for (const status of FILING_STATUSES) {
    addBracketIssues(federal.bracketsByFilingStatus[status], ['bracketsByFilingStatus', status], context);
  }
});

export const ficaTaxYearSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.literal('Social Security Administration'),
  sourceName: z.string().min(1),
  sourceUrl,
  additionalMedicareSourceUrl: sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  socialSecurityWageBase: z.number().finite().positive(),
  socialSecurityRate: z.number().finite().min(0).max(1),
  medicareRate: z.number().finite().min(0).max(1),
  additionalMedicareRate: z.number().finite().min(0).max(1),
  additionalMedicareThresholdByFilingStatus: filingStatusNumberSchema,
}).strict();

/**
 * Flat-rate withholding on supplemental wages: bonuses, commissions, severance.
 *
 * This is a withholding rule, not a tax rate. An employer withholds a flat
 * percentage at payout and the year's real liability is settled on the return,
 * which is why a bonus so often looks over-taxed on the stub.
 */
export const supplementalWithholdingSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.literal('Internal Revenue Service'),
  sourceName: z.string().min(1),
  sourceUrl,
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  /** Optional flat rate, allowed up to the yearly threshold. No other percentage is permitted. */
  optionalFlatRate: z.number().finite().min(0).max(1),
  /** Mandatory rate on supplemental wages above the threshold, applied regardless of Form W-4. */
  mandatoryFlatRate: z.number().finite().min(0).max(1),
  /** Cumulative supplemental wages in the calendar year above which the mandatory rate applies. */
  mandatoryRateThreshold: z.number().finite().positive(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

export const taxYearSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal('us-tax-v1.0.0'),
  snapshotId: z.string().min(1),
  taxYear: z.number().int().min(2000).max(2100),
  provider: z.string().min(1),
  publishedAt: isoDateTime,
  verifiedAt: isoDateTime,
  sourceStatus: z.literal('verified'),
  version: z.string().min(1),
  federal: federalTaxYearSchema,
  fica: ficaTaxYearSchema,
  supplemental: supplementalWithholdingSchema,
  states: z.array(stateTaxPolicySchema).length(51),
  normalizedSha256: sha256Hex,
}).strict().superRefine((snapshot, context) => {
  const expectedSnapshotId = `us-tax-${snapshot.taxYear}-v1`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    context.addIssue({ code: 'custom', path: ['snapshotId'], message: `Snapshot ID must be ${expectedSnapshotId}.` });
  }
  if (snapshot.federal.taxYear !== snapshot.taxYear) {
    context.addIssue({ code: 'custom', path: ['federal', 'taxYear'], message: 'Federal tax year must match the snapshot tax year.' });
  }
  if (snapshot.fica.taxYear !== snapshot.taxYear) {
    context.addIssue({ code: 'custom', path: ['fica', 'taxYear'], message: 'FICA tax year must match the snapshot tax year.' });
  }
  if (snapshot.supplemental.taxYear !== snapshot.taxYear) {
    context.addIssue({ code: 'custom', path: ['supplemental', 'taxYear'], message: 'Supplemental withholding tax year must match the snapshot tax year.' });
  }
  if (snapshot.supplemental.mandatoryFlatRate < snapshot.supplemental.optionalFlatRate) {
    context.addIssue({
      code: 'custom',
      path: ['supplemental', 'mandatoryFlatRate'],
      message: 'The mandatory rate above the threshold cannot be lower than the optional flat rate below it.',
    });
  }
  if (snapshot.fica.socialSecurityWageBase <= 0) {
    context.addIssue({ code: 'custom', path: ['fica', 'socialSecurityWageBase'], message: 'Social Security wage base must be positive.' });
  }
  const seen = new Set<StateCode>();
  const sortedCodes = [...snapshot.states].map((row) => row.stateCode).sort();
  for (const [index, row] of snapshot.states.entries()) {
    if (seen.has(row.stateCode)) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateCode'], message: `Duplicate state code: ${row.stateCode}` });
    }
    seen.add(row.stateCode);
    if (row.stateCode !== sortedCodes[index]) {
      context.addIssue({ code: 'custom', path: ['states', index, 'stateCode'], message: 'State rows must be sorted by state code.' });
    }
    if (row.status === 'supported' && row.kind === 'progressive') {
      for (const status of FILING_STATUSES) {
        addBracketIssues(row.bracketsByFilingStatus[status], ['states', index, 'bracketsByFilingStatus', status], context);
      }
    }
  }
  const missing = STATE_CODES.filter((stateCode) => !seen.has(stateCode));
  if (missing.length > 0) {
    context.addIssue({ code: 'custom', path: ['states'], message: `Missing state codes: ${missing.join(', ')}` });
  }
});

export type FederalTaxYear = z.infer<typeof federalTaxYearSchema>;
export type SupplementalWithholding = z.infer<typeof supplementalWithholdingSchema>;
export type FicaTaxYear = z.infer<typeof ficaTaxYearSchema>;

/*
 * The state policy union is written out rather than inferred through
 * `z.union`.
 *
 * Inferring a five-variant union of strict objects — several now carrying
 * nested optional records keyed by filing status — is exponential work for the
 * compiler. Adding the credit, federal-deduction and local-add-on shapes took
 * the whole-project typecheck from 8 seconds to past 20 minutes, which is the
 * kind of cost that gets a release gate switched off.
 *
 * Inferring each variant separately is cheap; it is combining them inside the
 * schema type that is not. The runtime union is unchanged, so validation
 * behaves exactly as before.
 */
export type UnsupportedStatePolicy = z.infer<typeof unsupportedStateSchema>;
export type NoneStatePolicy = z.infer<typeof noneStateSchema>;
export type FlatStatePolicy = z.infer<typeof flatStateSchema>;
export type FlatWithSurtaxStatePolicy = z.infer<typeof flatWithSurtaxStateSchema>;
export type ProgressiveStatePolicy = z.infer<typeof progressiveStateSchema>;

export type SupportedStatePolicy =
  | NoneStatePolicy
  | FlatStatePolicy
  | FlatWithSurtaxStatePolicy
  | ProgressiveStatePolicy;

export type StateTaxPolicy = UnsupportedStatePolicy | SupportedStatePolicy;

/** Same reason: the snapshot embeds an array of that union. */
export type TaxYearSnapshot = Omit<z.infer<typeof taxYearSnapshotSchema>, 'states'> & {
  states: StateTaxPolicy[];
};

export function filingStatusValues<T>(value: T): Record<FilingStatus, T> {
  return {
    single: value,
    marriedFilingJointly: value,
    marriedFilingSeparately: value,
    headOfHousehold: value,
  };
}
