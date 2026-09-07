import { z } from 'zod';
import {
  MEDICARE_FILING_STATUSES, medicareIrmaaBracketFor, medicareSnapshot, type MedicareSnapshot,
} from '@/lib/data/medicare';
import { formatMoney, formatNumber, round, type CalculationResult } from './contracts';

export const MEDICARE_ENGINE_ID = 'medicare-cost-v1.0.0';

// Blank strings, booleans, and null must never become a free premium.
const dollars = (label: string, maximum: number) => z.number({ error: `${label} must be a number.` })
  .finite(`${label} must be finite.`).min(0, `${label} cannot be negative.`).max(maximum, `${label} is too large.`);

export const medicareCostInputSchema = z.object({
  coverageYear: z.literal(2026),
  filingStatus: z.enum(MEDICARE_FILING_STATUSES),
  /** MAGI from the return two years before the coverage year, not today's income. */
  annualMagi: dollars('Modified adjusted gross income', 100_000_000),
  /**
   * Part A is premium-free with 40 quarters of Medicare-taxed work. Fewer than
   * that means a monthly premium, and the amount depends on how many quarters.
   */
  partAQuarters: z.enum(['40-or-more', '30-to-39', 'under-30']),
  /** What a chosen Part D or Medicare Advantage drug plan charges, before IRMAA. */
  monthlyDrugPlanPremium: dollars('Drug plan premium', 10_000).default(0),
  /**
   * Whether the person is enrolled in Part D or a Medicare Advantage drug plan.
   *
   * Part D IRMAA is owed only with that coverage. A $0-premium plan still owes
   * it; having no plan does not. When omitted, enrollment is inferred from a
   * positive premium so a typed plan is never ignored, and a blank premium is
   * never charged an adjustment the person would not pay.
   */
  hasDrugCoverage: z.boolean().optional(),
  /** A Medigap policy is priced by its insurer and is not part of any federal table. */
  monthlyMedigapPremium: dollars('Medigap premium', 10_000).default(0),
  /** Whole months of coverage in the year, for a mid-year start. */
  coverageMonths: z.number().int().min(1).max(12).default(12),
}).transform((input) => ({
  ...input,
  hasDrugCoverage: input.hasDrugCoverage ?? input.monthlyDrugPlanPremium > 0,
}));
export type MedicareCostInput = z.infer<typeof medicareCostInputSchema>;

export type MedicareCostValue = {
  coverageYear: 2026;
  irmaaIncomeTaxYear: 2024;
  irmaaBracketIndex: number;
  irmaaApplies: boolean;
  /** Income at which the next rung starts, so the cliff is visible. */
  nextIrmaaThreshold: number | null;
  nextIrmaaThresholdIsInclusive: boolean | null;
  distanceToNextThreshold: number | null;
  /** What crossing that threshold would add for a whole year. */
  annualCostOfNextThreshold: number | null;
  hasDrugCoverage: boolean;
  partAMonthlyPremium: number;
  partBStandardPremium: number;
  partBIrmaa: number;
  partBMonthlyPremium: number;
  partDIrmaa: number;
  drugPlanMonthlyTotal: number;
  medigapMonthlyPremium: number;
  monthlyTotal: number;
  coveragePeriodTotal: number;
  annualPremiumTotal: number;
  /** Deductibles are per benefit period or per year and sit on top of premiums. */
  partADeductible: number;
  partBDeductible: number;
};

/**
 * What a year on Medicare costs in premiums, and where the income cliffs are.
 *
 * Every figure here is a premium or a deductible from the published tables. The
 * part nobody can put in a table is what care costs after the deductible: Part B
 * pays 80% of the approved amount with no cap on the remaining 20%, which is
 * why the totals below are premiums and not a cost of care.
 */
export function calculateMedicareCost(
  rawInput: unknown,
  snapshot: MedicareSnapshot = medicareSnapshot,
): CalculationResult<MedicareCostValue> {
  const input = medicareCostInputSchema.parse(rawInput);
  const { bracket, index, nextThreshold } = medicareIrmaaBracketFor(input.annualMagi, input.filingStatus, snapshot);

  const partAMonthlyPremium = input.partAQuarters === '40-or-more' ? 0
    : input.partAQuarters === '30-to-39' ? snapshot.partA.monthlyPremium30To39Quarters
      : snapshot.partA.monthlyPremiumUnder30Quarters;
  const partBMonthly = round(snapshot.partB.standardMonthlyPremium + bracket.partBMonthlyAdjustment);
  const drugTotal = input.hasDrugCoverage
    ? round(input.monthlyDrugPlanPremium + bracket.partDMonthlyAdjustment)
    : 0;
  const monthlyTotal = round(partAMonthlyPremium + partBMonthly + drugTotal + input.monthlyMedigapPremium);

  const nextBracket = snapshot.irmaaBrackets[input.filingStatus][index + 1];
  const partDStep = input.hasDrugCoverage && nextBracket
    ? nextBracket.partDMonthlyAdjustment - bracket.partDMonthlyAdjustment
    : 0;
  const stepUp = nextBracket
    ? round(((nextBracket.partBMonthlyAdjustment - bracket.partBMonthlyAdjustment) + partDStep) * 12)
    : null;

  const value: MedicareCostValue = {
    coverageYear: snapshot.coverageYear,
    irmaaIncomeTaxYear: snapshot.irmaaIncomeTaxYear,
    irmaaBracketIndex: index,
    irmaaApplies: index > 0,
    nextIrmaaThreshold: nextThreshold,
    nextIrmaaThresholdIsInclusive: nextBracket?.thresholdIsInclusive ?? null,
    distanceToNextThreshold: nextThreshold === null ? null : round(Math.max(0, nextThreshold - input.annualMagi)),
    annualCostOfNextThreshold: stepUp,
    hasDrugCoverage: input.hasDrugCoverage,
    partAMonthlyPremium: round(partAMonthlyPremium),
    partBStandardPremium: round(snapshot.partB.standardMonthlyPremium),
    partBIrmaa: round(bracket.partBMonthlyAdjustment),
    partBMonthlyPremium: partBMonthly,
    partDIrmaa: round(bracket.partDMonthlyAdjustment),
    drugPlanMonthlyTotal: drugTotal,
    medigapMonthlyPremium: round(input.monthlyMedigapPremium),
    monthlyTotal,
    coveragePeriodTotal: round(monthlyTotal * input.coverageMonths),
    annualPremiumTotal: round(monthlyTotal * 12),
    partADeductible: snapshot.partA.inpatientDeductiblePerBenefitPeriod,
    partBDeductible: snapshot.partB.annualDeductible,
  };

  const assumptions = [
    `These are ${snapshot.coverageYear} premiums and deductibles from the published CMS tables. They are not a bill, and enrolling, plan availability, and any late-enrollment penalty are decided by Medicare and SSA.`,
    `Income-related adjustments for ${snapshot.coverageYear} are set from the modified adjusted gross income on your ${snapshot.irmaaIncomeTaxYear} return, which is adjusted gross income plus tax-exempt interest. Today's income does not change this year's premium.`,
    'The adjustment is a cliff, not a taper: one dollar over a threshold applies the whole next step for the year. Each spouse on Medicare pays their own adjustment, so a couple filing jointly can pay it twice.',
    'A life-changing event such as retirement, the death of a spouse, or a work stoppage can be reported on form SSA-44 to have a more recent year used instead. SSA decides that, not this calculator.',
    'Part A is premium-free with 40 quarters of Medicare-taxed work. The premiums shown for fewer quarters are the voluntary-enrollment amounts, and a spouse’s work record can qualify you without your own.',
    'The Part A deductible is per benefit period, not per year: a new hospital stay more than 60 days after the last one starts a new one, so it can be owed more than once in a year.',
    'Part B pays 80% of the approved amount after its annual deductible, and the remaining 20% has no cap. A total cost of care cannot be produced from these tables, which is why only premiums and deductibles are totalled here.',
    input.hasDrugCoverage
      ? 'Drug plan and Medigap premiums are whatever the insurer charges and are entered by you. Any income adjustment on Part D is added to your plan premium and paid separately, usually to Medicare rather than the plan.'
      : 'No Part D or Medicare Advantage drug plan is enrolled in this scenario, so the Part D income adjustment is not in the total. It would be added if you enrol, even on a plan with a $0 premium.',
    'Medicare Advantage replaces the way Parts A and B pay rather than the Part B premium, which is still owed. Its own premium, network, and cost sharing are outside these tables.',
    'Medicaid, a Medicare Savings Program, Extra Help, employer retiree coverage, and state pharmaceutical assistance can all reduce these amounts and are not modelled.',
  ];

  return {
    value,
    calculationVersion: MEDICARE_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      ...(partAMonthlyPremium === 0
        ? [{ label: 'Part A hospital', value: 'No premium', detail: '40 or more quarters of Medicare-taxed work' }]
        : [{ label: 'Part A hospital', value: formatMoney(partAMonthlyPremium), detail: input.partAQuarters === '30-to-39' ? '30 to 39 quarters, reduced voluntary premium' : 'Fewer than 30 quarters, full voluntary premium' }]),
      { label: 'Part B medical', value: formatMoney(partBMonthly), detail: value.irmaaApplies ? `${formatMoney(snapshot.partB.standardMonthlyPremium)} standard + ${formatMoney(bracket.partBMonthlyAdjustment)} income adjustment` : 'Standard premium, no income adjustment' },
      ...(input.hasDrugCoverage && drugTotal === 0 && bracket.partDMonthlyAdjustment === 0 ? [] : input.hasDrugCoverage
        ? [{ label: 'Drug coverage', value: formatMoney(drugTotal), detail: bracket.partDMonthlyAdjustment > 0 ? `${formatMoney(input.monthlyDrugPlanPremium)} plan + ${formatMoney(bracket.partDMonthlyAdjustment)} income adjustment` : 'Your entered plan premium' }]
        : value.irmaaApplies
          ? [{ label: 'Drug coverage', value: 'Not enrolled', detail: `Part D income adjustment of ${formatMoney(bracket.partDMonthlyAdjustment)} a month is not included; it would apply if you enrol` }]
          : []),
      ...(input.monthlyMedigapPremium === 0 ? [] : [{ label: 'Medigap', value: formatMoney(input.monthlyMedigapPremium), detail: 'Your entered supplement premium' }]),
      { label: 'Monthly premium total', value: formatMoney(monthlyTotal), detail: `${formatMoney(value.annualPremiumTotal)} across twelve months` },
      { label: 'Before any of it pays', value: formatMoney(value.partBDeductible, 0), detail: `Part B annual deductible, plus ${formatMoney(value.partADeductible, 0)} per hospital benefit period` },
    ],
    assumptions: value.irmaaApplies
      ? [`Your ${snapshot.irmaaIncomeTaxYear} income places you on rung ${index} of ${snapshot.irmaaBrackets[input.filingStatus].length - 1}, adding ${formatMoney(round((bracket.partBMonthlyAdjustment + (input.hasDrugCoverage ? bracket.partDMonthlyAdjustment : 0)) * 12))} over a year${input.hasDrugCoverage ? '' : ', not counting Part D because this scenario has no drug plan'}.`, ...assumptions]
      : [`Your ${snapshot.irmaaIncomeTaxYear} income is below the first adjustment threshold, so the standard premium applies. The next rung starts ${nextBracket?.thresholdIsInclusive ? 'at' : 'above'} ${nextThreshold === null ? 'the top of the table' : formatNumber(nextThreshold, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`, ...assumptions],
  };
}
