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
 * $80,000, $1,900 to $749,999 and nothing above — a staircase, not a taper, so
 * the proportional phase-out shape would give the wrong figure everywhere
 * except at the step edges.
 */
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
  exemptionCredit: exemptionCreditSchema.optional(),
  federalDeduction: federalDeductionSchema.optional(),
  localAddOn: localAddOnSchema.optional(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const flatWithSurtaxStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('flatWithSurtax'),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  exemptionCredit: exemptionCreditSchema.optional(),
  localAddOn: localAddOnSchema.optional(),
  rate: z.number().finite().min(0).max(1),
  surtaxRate: z.number().finite().min(0).max(1),
  surtaxThreshold: z.number().finite().positive(),
  notes: z.array(z.string().min(1)).min(1),
}).strict();

const progressiveStateSchema = stateMetadataSchema.extend({
  status: z.literal('supported'),
  kind: z.literal('progressive'),
  sourceStatus: z.literal('verified'),
  scheduleTaxYear: z.number().int().min(2000).max(2100),
  taxableIncomeBasis: taxableIncomeBasisSchema.optional(),
  standardDeductionByFilingStatus: filingStatusNumberSchema,
  /** Where the deduction is a share of income rather than a flat amount. */
  percentageStandardDeduction: percentageDeductionSchema.optional(),
  /** Where the deduction shrinks with income rather than staying flat. */
  standardDeductionPhaseOut: proportionalPhaseOutSchema.optional(),
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
  personalExemptionByFilingStatus: filingStatusNumberSchema.optional(),
  personalExemptionPhaseOut: proportionalPhaseOutSchema.optional(),
  /** Where the exemption steps down with income instead of being flat. */
  steppedPersonalExemption: steppedExemptionSchema.optional(),
  /** A separate schedule that replaces this one below a stated income. */
  alternativeLowIncomeSchedule: alternativeLowIncomeScheduleSchema.optional(),
  perDependentExemption: z.number().finite().min(0).optional(),
  exemptionCredit: exemptionCreditSchema.optional(),
  federalDeduction: federalDeductionSchema.optional(),
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
