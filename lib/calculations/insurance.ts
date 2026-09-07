import { z } from 'zod';
import { getInsuranceStateRate, insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { isStateCode, US_STATES, type StateCode } from '@/lib/location/states';
import { formatMoney, formatNumber, round, type CalculationResult } from './contracts';

export const INSURANCE_BUDGET_ENGINE_ID = 'insurance-budget-v1.0.0';
export const INSURANCE_DEDUCTIBLE_ENGINE_ID = 'insurance-deductible-v1.0.0';
export const INSURANCE_PREMIUM_FREQUENCIES = ['monthly', 'six-month', 'annual'] as const;
export type InsurancePremiumFrequency = (typeof INSURANCE_PREMIUM_FREQUENCIES)[number];

// Form number strings are accepted, but empty inputs, booleans, null, arrays,
// hexadecimal strings, and other JavaScript coercions must never become money.
function strictNumber(label: string, minimum: number, maximum: number) {
  return z.preprocess((value) => {
    if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) {
      return Number(value.trim());
    }
    return value;
  }, z.number({ error: `Enter a number for ${label.toLowerCase()}.` })
    .finite(`${label} must be finite.`)
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be no more than ${maximum}.`));
}

function moneyAmount(label: string, minimum = 0, maximum = 1_000_000) {
  return strictNumber(label, minimum, maximum).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000_001,
    `${label} can have no more than two decimal places.`,
  );
}

const premiumSchema = moneyAmount('Premium', 0.01);
const frequencySchema = z.enum(INSURANCE_PREMIUM_FREQUENCIES);

export const insuranceBudgetInputSchema = z.object({
  stateCode: z.string().refine(isStateCode, 'Choose a U.S. state or Washington, D.C.').transform((value) => value as StateCode),
  housingType: z.enum(['homeowners', 'renters', 'none']),
  includeAuto: z.boolean(),
  vehicleCount: strictNumber('Vehicle count', 1, 6).refine(Number.isInteger, 'Vehicle count must be a whole number.'),
  housingBasis: z.enum(['benchmark', 'custom']),
  housingPremium: z.unknown().optional(),
  housingFrequency: frequencySchema,
  autoBasis: z.enum(['benchmark', 'custom']),
  autoPremium: z.unknown().optional(),
  autoFrequency: frequencySchema,
  planningBufferPercent: strictNumber('Planning buffer', 0, 100).optional().default(0),
}).superRefine((input, context) => {
  if (input.housingType === 'none' && !input.includeAuto) {
    context.addIssue({ code: 'custom', path: ['housingType'], message: 'Include housing insurance, auto insurance, or both.' });
  }
  for (const [field, isActive] of [
    ['housingPremium', input.housingType !== 'none' && input.housingBasis === 'custom'],
    ['autoPremium', input.includeAuto && input.autoBasis === 'custom'],
  ] as const) {
    if (!isActive) continue;
    const parsed = premiumSchema.safeParse(input[field]);
    if (!parsed.success) {
      context.addIssue({ code: 'custom', path: [field], message: parsed.error.issues[0]?.message ?? 'Enter a valid premium.' });
    }
  }
}).transform((input) => ({
  ...input,
  // Hidden custom fields do not participate in benchmark or excluded lines.
  housingPremium: input.housingType !== 'none' && input.housingBasis === 'custom'
    ? premiumSchema.parse(input.housingPremium) : undefined,
  autoPremium: input.includeAuto && input.autoBasis === 'custom'
    ? premiumSchema.parse(input.autoPremium) : undefined,
}));

export type InsuranceBudgetInput = z.infer<typeof insuranceBudgetInputSchema>;

export type InsuranceBenchmarkContext = {
  stateCode: string;
  stateName: string;
  snapshotId: string;
  observationPeriod: string;
  homeownersAnnualPremium: number | null;
  rentersAnnualPremium: number | null;
  autoAnnualExpenditure: number | null;
  autoUnit: 'insured-vehicle';
  caveats?: string[];
};

export type InsuranceBenchmarkUse = {
  coverage: 'homeowners' | 'renters' | 'auto';
  annualPerUnit: number;
  unit: 'policy' | 'insured-vehicle';
  units: number;
  observationPeriod: string;
  snapshotId: string;
};

export type InsuranceBudgetValue = {
  stateCode: string;
  stateName: string;
  housingAnnual: number;
  autoAnnual: number;
  monthlyTotal: number;
  annualTotal: number;
  planningBufferPercent: number;
  annualBuffer: number;
  monthlyWithBuffer: number;
  annualWithBuffer: number;
  annualPlanningRange: [number, number];
  monthlyPlanningRange: [number, number];
  benchmarkUses: InsuranceBenchmarkUse[];
};

function annualPremium(amount: number, frequency: InsurancePremiumFrequency): number {
  const paymentsPerYear = { monthly: 12, 'six-month': 2, annual: 1 } as const;
  return round(amount * paymentsPerYear[frequency]);
}

function defaultBenchmarkContext(stateCode: StateCode): InsuranceBenchmarkContext {
  const row = getInsuranceStateRate(stateCode);
  if (!row) throw new Error(`No published insurance benchmark is available for ${stateCode}. Enter your own premium.`);
  return {
    ...row,
    snapshotId: insuranceSnapshot.snapshotId,
    observationPeriod: insuranceSnapshot.observationPeriod,
    autoUnit: 'insured-vehicle',
  };
}

export function calculateInsuranceBudget(
  rawInput: unknown,
  benchmarkContext?: InsuranceBenchmarkContext,
): CalculationResult<InsuranceBudgetValue> {
  const input = insuranceBudgetInputSchema.parse(rawInput);
  const usesHousingBenchmark = input.housingType !== 'none' && input.housingBasis === 'benchmark';
  const usesAutoBenchmark = input.includeAuto && input.autoBasis === 'benchmark';
  const usesBenchmark = usesHousingBenchmark || usesAutoBenchmark;
  const benchmark = usesBenchmark ? benchmarkContext ?? defaultBenchmarkContext(input.stateCode) : undefined;
  if (benchmark && (
    benchmark.stateCode !== input.stateCode
    || typeof benchmark.snapshotId !== 'string' || !benchmark.snapshotId.trim()
    || typeof benchmark.observationPeriod !== 'string' || !/^\d{4}$/.test(benchmark.observationPeriod)
  )) {
    throw new Error('The insurance benchmark must identify the selected state, source snapshot, and observation year.');
  }

  const benchmarkUses: InsuranceBenchmarkUse[] = [];
  function applyBenchmark(coverage: InsuranceBenchmarkUse['coverage'], units: number): number {
    if (!benchmark) throw new Error('A published insurance benchmark is required.');
    const amount = coverage === 'homeowners' ? benchmark.homeownersAnnualPremium
      : coverage === 'renters' ? benchmark.rentersAnnualPremium : benchmark.autoAnnualExpenditure;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      throw new Error(`No usable ${coverage} benchmark is available for ${input.stateCode}. Enter your own premium.`);
    }
    if (coverage === 'auto' && benchmark.autoUnit !== 'insured-vehicle') {
      throw new Error('An auto benchmark must be measured per insured vehicle per year.');
    }
    benchmarkUses.push({
      coverage,
      annualPerUnit: amount,
      unit: coverage === 'auto' ? 'insured-vehicle' : 'policy',
      units,
      observationPeriod: benchmark.observationPeriod,
      snapshotId: benchmark.snapshotId,
    });
    return round(amount * units);
  }

  const housingAnnual = input.housingType === 'none' ? 0
    : usesHousingBenchmark ? applyBenchmark(input.housingType, 1)
      : annualPremium(input.housingPremium!, input.housingFrequency);
  // An entered auto premium covers all selected vehicles; only the published
  // expenditure per insured vehicle is multiplied by vehicle count.
  const autoAnnual = !input.includeAuto ? 0
    : usesAutoBenchmark ? applyBenchmark('auto', input.vehicleCount)
      : annualPremium(input.autoPremium!, input.autoFrequency);
  const annualTotal = round(housingAnnual + autoAnnual);
  const monthlyTotal = round(annualTotal / 12);
  const annualBuffer = round(annualTotal * input.planningBufferPercent / 100);
  const annualWithBuffer = round(annualTotal + annualBuffer);
  const monthlyWithBuffer = round(annualWithBuffer / 12);
  const stateName = US_STATES[input.stateCode as StateCode];
  const assumptions = [
    'This is a premium budget, not an insurance quote, coverage recommendation, or prediction of your premium.',
    'Your own premiums are annualized as 12 monthly payments, two six-month payments, or one annual payment. Billing fees and installment discounts are not added.',
    'Only the selected insurance lines are included. Deductibles, uncovered losses, policy limits, exclusions, and separate flood, earthquake, or wind policies are not included in the premium total.',
    `The ${formatNumber(input.planningBufferPercent, { maximumFractionDigits: 2 })}% planning buffer is your chosen additional budget scenario, not a statistical range, confidence interval, or forecast of rate changes.`,
  ];
  if (benchmark) {
    assumptions.push(`Published benchmarks describe ${benchmark.observationPeriod} insurance experience. They are not current quotes and are not adjusted to today's prices.`);
    if (usesHousingBenchmark) {
      assumptions.push(input.housingType === 'homeowners'
        ? 'The homeowners benchmark is the state average annual HO-3 policy premium across insured homes and coverage amounts. Home value, rebuilding cost, and individual risk are not used to predict a premium.'
        : 'The renters benchmark is the state average annual HO-4 policy premium across coverage amounts. Your property limit, deductible, and individual risk can change a quote.');
    }
    if (usesAutoBenchmark) {
      assumptions.push('Auto uses annual average expenditure per liability-insured vehicle: total premiums across coverages divided by liability written exposures (car-years). It reflects the coverage mix actually purchased, not a standard full-coverage package or a per-driver premium.');
      assumptions.push(`The auto benchmark is multiplied by ${input.vehicleCount} insured vehicle${input.vehicleCount === 1 ? '' : 's'}. No multi-car or bundled-policy discount is assumed.`);
    }
    if (benchmark.caveats) assumptions.push(...benchmark.caveats);
  }
  if (input.includeAuto && input.autoBasis === 'custom') {
    assumptions.push('Your own auto premium is the total for all selected vehicles. Vehicle count does not multiply this entered amount.');
  }

  return {
    value: {
      stateCode: input.stateCode, stateName, housingAnnual, autoAnnual, monthlyTotal, annualTotal,
      planningBufferPercent: input.planningBufferPercent, annualBuffer, monthlyWithBuffer, annualWithBuffer,
      annualPlanningRange: [annualTotal, annualWithBuffer],
      monthlyPlanningRange: [monthlyTotal, monthlyWithBuffer],
      benchmarkUses,
    },
    calculationVersion: INSURANCE_BUDGET_ENGINE_ID,
    datasetSnapshotIds: [...new Set(benchmarkUses.map((use) => use.snapshotId))],
    breakdown: [
      ...(input.housingType === 'none' ? [] : [{
        label: input.housingType === 'homeowners' ? 'Homeowners insurance / year' : 'Renters insurance / year',
        value: formatMoney(housingAnnual),
        detail: usesHousingBenchmark ? `${benchmark!.observationPeriod} ${stateName} average per policy` : 'Your entered premium, annualized',
      }]),
      ...(!input.includeAuto ? [] : [{
        label: 'Auto insurance / year', value: formatMoney(autoAnnual),
        detail: usesAutoBenchmark ? `${benchmark!.observationPeriod} expenditure per vehicle × ${input.vehicleCount}` : 'Your entered total for all selected vehicles, annualized',
      }]),
      { label: 'Monthly premium budget', value: formatMoney(monthlyTotal), detail: `${formatMoney(annualTotal)} per year ÷ 12` },
      ...(input.planningBufferPercent === 0 ? [] : [{
        label: 'Monthly budget with your buffer', value: formatMoney(monthlyWithBuffer),
        detail: `${formatNumber(input.planningBufferPercent)}% extra budget selected by you`,
      }]),
    ],
    assumptions,
  };
}

export const deductibleComparisonInputSchema = z.object({
  annualPremiumA: moneyAmount('Option A annual premium'),
  deductibleA: moneyAmount('Option A deductible'),
  annualPremiumB: moneyAmount('Option B annual premium'),
  deductibleB: moneyAmount('Option B deductible'),
  coveredLossAmount: moneyAmount('Covered loss amount', 0, 10_000_000),
});

export type DeductibleComparisonInput = z.infer<typeof deductibleComparisonInputSchema>;
type ComparisonWinner = 'a' | 'b' | 'tie';
export type DeductibleComparisonValue = {
  noClaimCostA: number;
  noClaimCostB: number;
  oneClaimCostA: number;
  oneClaimCostB: number;
  outOfPocketA: number;
  outOfPocketB: number;
  noClaimWinner: ComparisonWinner;
  oneClaimWinner: ComparisonWinner;
  annualPremiumSavings: number;
  lowerPremiumOption: 'a' | 'b' | null;
  additionalOutOfPocket: number;
  breakEvenClaimsPerYear: number | null;
  claimFreeYearsToRecover: number | null;
};

export function calculateDeductibleComparison(rawInput: unknown): CalculationResult<DeductibleComparisonValue> {
  const input = deductibleComparisonInputSchema.parse(rawInput);
  const outOfPocketA = Math.min(input.coveredLossAmount, input.deductibleA);
  const outOfPocketB = Math.min(input.coveredLossAmount, input.deductibleB);
  const noClaimCostA = input.annualPremiumA;
  const noClaimCostB = input.annualPremiumB;
  const oneClaimCostA = round(noClaimCostA + outOfPocketA);
  const oneClaimCostB = round(noClaimCostB + outOfPocketB);
  const winner = (a: number, b: number): ComparisonWinner => a === b ? 'tie' : a < b ? 'a' : 'b';
  const noClaimWinner = winner(noClaimCostA, noClaimCostB);
  const lowerPremiumOption = noClaimWinner === 'tie' ? null : noClaimWinner;
  const annualPremiumSavings = round(Math.abs(noClaimCostA - noClaimCostB));
  const additionalOutOfPocket = lowerPremiumOption === null ? 0
    : round(Math.max(0, lowerPremiumOption === 'a' ? outOfPocketA - outOfPocketB : outOfPocketB - outOfPocketA));
  const hasTradeoff = annualPremiumSavings > 0 && additionalOutOfPocket > 0;
  const breakEvenClaimsPerYear = hasTradeoff ? annualPremiumSavings / additionalOutOfPocket : null;
  const claimFreeYearsToRecover = hasTradeoff ? additionalOutOfPocket / annualPremiumSavings : null;

  return {
    value: {
      noClaimCostA, noClaimCostB, oneClaimCostA, oneClaimCostB, outOfPocketA, outOfPocketB,
      noClaimWinner, oneClaimWinner: winner(oneClaimCostA, oneClaimCostB),
      annualPremiumSavings, lowerPremiumOption, additionalOutOfPocket,
      breakEvenClaimsPerYear, claimFreeYearsToRecover,
    },
    calculationVersion: INSURANCE_DEDUCTIBLE_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Option A with no claims', value: formatMoney(noClaimCostA), detail: 'Annual premium only' },
      { label: 'Option B with no claims', value: formatMoney(noClaimCostB), detail: 'Annual premium only' },
      { label: 'Option A with one covered claim', value: formatMoney(oneClaimCostA), detail: `${formatMoney(noClaimCostA)} premium + ${formatMoney(outOfPocketA)} of the covered loss` },
      { label: 'Option B with one covered claim', value: formatMoney(oneClaimCostB), detail: `${formatMoney(noClaimCostB)} premium + ${formatMoney(outOfPocketB)} of the covered loss` },
    ],
    assumptions: [
      'Compare two actual premiums for otherwise identical coverage, limits, policy terms, and insured property or vehicles. This does not estimate the discount an insurer offers for a deductible.',
      'The one-claim scenario adds the smaller of the entered covered loss and the dollar deductible to one annual premium. No claim means annual premium only.',
      'The deductible must apply separately to this covered claim. Percentage deductibles, aggregate deductibles, liability coverage without a deductible, separate catastrophe deductibles, exclusions, depreciation, and losses above policy limits are outside this model.',
      'Break-even claims per year divides annual premium savings by the extra out-of-pocket amount for this same-sized covered loss. It is an arithmetic threshold, not a prediction or probability of a claim. Multiple claims are assumed to incur the same deductible independently.',
      'Claim-free years to recover divides that extra one-claim cost by annual premium savings. Both break-even measures are omitted when there is no positive premium-saving versus out-of-pocket tradeoff.',
      'Premiums are held constant. Future rate increases after a claim, changes at renewal, discounts, taxes, fees, interest, and investment returns are not modeled.',
    ],
  };
}
