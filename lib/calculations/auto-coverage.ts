import { z } from 'zod';
import { getInsuranceStateRate, insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { isStateCode, US_STATES, type StateCode } from '@/lib/location/states';
import { formatMoney, formatNumber, round, type CalculationResult } from './contracts';

export const AUTO_COVERAGE_ENGINE_ID = 'auto-coverage-v1.0.0';

// Form strings are accepted, but blanks, booleans, null, and hexadecimal must
// never become money.
function strictNumber(label: string, minimum: number, maximum: number) {
  return z.preprocess((value) => {
    if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return Number(value.trim());
    return value;
  }, z.number({ error: `Enter a number for ${label.toLowerCase()}.` })
    .finite(`${label} must be finite.`)
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be no more than ${maximum}.`));
}

export const autoCoverageInputSchema = z.object({
  stateCode: z.string().refine(isStateCode, 'Choose a U.S. state or Washington, D.C.').transform((value) => value as StateCode),
  /** What the car would actually be worth the day before a total loss. */
  vehicleValue: strictNumber('Vehicle value', 0, 500_000),
  collisionDeductible: strictNumber('Collision deductible', 0, 25_000),
  comprehensiveDeductible: strictNumber('Comprehensive deductible', 0, 25_000),
  premiumBasis: z.enum(['benchmark', 'custom']),
  /** Your own annual premiums, used only when `premiumBasis` is custom. */
  annualCollisionPremium: z.unknown().optional(),
  annualComprehensivePremium: z.unknown().optional(),
}).superRefine((input, context) => {
  if (input.premiumBasis !== 'custom') return;
  for (const field of ['annualCollisionPremium', 'annualComprehensivePremium'] as const) {
    const parsed = strictNumber('Premium', 0, 100_000).safeParse(input[field]);
    if (!parsed.success) {
      context.addIssue({ code: 'custom', path: [field], message: parsed.error.issues[0]?.message ?? 'Enter a valid annual premium.' });
    }
  }
}).transform((input) => ({
  ...input,
  annualCollisionPremium: input.premiumBasis === 'custom' ? strictNumber('Premium', 0, 100_000).parse(input.annualCollisionPremium) : undefined,
  annualComprehensivePremium: input.premiumBasis === 'custom' ? strictNumber('Premium', 0, 100_000).parse(input.annualComprehensivePremium) : undefined,
}));
export type AutoCoverageInput = z.infer<typeof autoCoverageInputSchema>;

export type AutoCoverageValue = {
  stateCode: string;
  stateName: string;
  observationPeriod: string;
  usesBenchmark: boolean;
  annualLiabilityPremium: number | null;
  annualCollisionPremium: number;
  annualComprehensivePremium: number;
  annualPhysicalDamagePremium: number;
  /** The most the two coverages can pay on a total loss: value less the deductible. */
  collisionMaximumPayout: number;
  comprehensiveMaximumPayout: number;
  /** Years of premium that equal the largest single payout available. */
  yearsOfPremiumToEqualPayout: number | null;
  premiumAsPercentOfValue: number | null;
  /** True once a year of premium buys less than ten times itself in cover. */
  payoutBelowTenTimesPremium: boolean;
  /** The value at which the coverages could pay nothing at all. */
  worthlessBelowValue: number;
  coverageIsWorthless: boolean;
};

/**
 * What collision and comprehensive can actually return on a given car.
 *
 * These two coverages pay the car's actual cash value less the deductible, so
 * the benefit is capped by what the car is worth, while the premium is not.
 * On an old car the ceiling can fall below a couple of years of premium, or
 * below the deductible entirely, at which point the cover cannot pay out at all.
 * That is the comparison here; it is arithmetic about a ceiling, not a claim
 * about how likely a crash is.
 */
export function calculateAutoCoverage(rawInput: unknown): CalculationResult<AutoCoverageValue> {
  const input = autoCoverageInputSchema.parse(rawInput);
  const usesBenchmark = input.premiumBasis === 'benchmark';
  const row = getInsuranceStateRate(input.stateCode);
  const collision = usesBenchmark ? row.autoCollisionAnnualPremium : input.annualCollisionPremium!;
  const comprehensive = usesBenchmark ? row.autoComprehensiveAnnualPremium : input.annualComprehensivePremium!;
  const physicalDamage = round(collision + comprehensive);

  const collisionPayout = round(Math.max(0, input.vehicleValue - input.collisionDeductible));
  const comprehensivePayout = round(Math.max(0, input.vehicleValue - input.comprehensiveDeductible));
  const bestPayout = Math.max(collisionPayout, comprehensivePayout);
  const yearsToEqual = physicalDamage > 0 && bestPayout > 0 ? round(bestPayout / physicalDamage, 2) : null;
  const percentOfValue = input.vehicleValue > 0 ? round((physicalDamage / input.vehicleValue) * 100, 2) : null;
  const smallestDeductible = Math.min(input.collisionDeductible, input.comprehensiveDeductible);

  const stateName = US_STATES[input.stateCode];
  const value: AutoCoverageValue = {
    stateCode: input.stateCode,
    stateName,
    observationPeriod: insuranceSnapshot.observationPeriod,
    usesBenchmark,
    annualLiabilityPremium: usesBenchmark ? row.autoLiabilityAnnualPremium : null,
    annualCollisionPremium: round(collision),
    annualComprehensivePremium: round(comprehensive),
    annualPhysicalDamagePremium: physicalDamage,
    collisionMaximumPayout: collisionPayout,
    comprehensiveMaximumPayout: comprehensivePayout,
    yearsOfPremiumToEqualPayout: yearsToEqual,
    premiumAsPercentOfValue: percentOfValue,
    payoutBelowTenTimesPremium: physicalDamage > 0 && bestPayout < physicalDamage * 10,
    worthlessBelowValue: round(smallestDeductible),
    coverageIsWorthless: bestPayout === 0,
  };

  const assumptions = [
    'This compares what two coverages can pay against what they cost. It is not advice to keep or drop coverage, and it says nothing about how likely a claim is.',
    'Collision and comprehensive pay the vehicle’s actual cash value at the time of loss, less the deductible, so the payout is capped by the car’s value while the premium is not.',
    'Use the car’s actual cash value: what it would sell for the day before the loss, not what you paid, not the loan balance, and not a dealer’s asking price. Insurers set it themselves and it falls every year.',
    'Liability coverage is not part of this comparison. It pays other people, is required in almost every state, and its value is not capped by what your own car is worth.',
    'Dropping physical damage cover on a financed or leased vehicle usually breaches the loan or lease. Gap cover, rental reimbursement, roadside assistance, and custom-equipment cover are separate and not counted here.',
    'A single deductible is assumed to apply per claim. Diminished value, depreciation disputes, total-loss thresholds, and state-specific settlement rules can move an actual payout.',
  ];
  if (usesBenchmark) {
    assumptions.push(`Premiums are the NAIC ${insuranceSnapshot.observationPeriod} average written premium per insured car-year for ${stateName}, across every policy in the state. They are historical averages, not a quote, and your own car, record, and coverage limits can differ substantially.`);
    if (row.caveats.length > 0) assumptions.push(...row.caveats);
  } else {
    assumptions.push('The premiums used are the amounts you entered. Enter the collision and comprehensive lines only, not the whole policy: liability, medical, and fees belong outside this comparison.');
  }

  return {
    value,
    calculationVersion: AUTO_COVERAGE_ENGINE_ID,
    datasetSnapshotIds: usesBenchmark ? [insuranceSnapshot.snapshotId] : [],
    breakdown: [
      { label: 'Collision and comprehensive / year', value: formatMoney(physicalDamage), detail: `${formatMoney(round(collision))} collision + ${formatMoney(round(comprehensive))} comprehensive` },
      { label: 'Most collision can pay', value: formatMoney(collisionPayout), detail: `${formatMoney(input.vehicleValue, 0)} value − ${formatMoney(input.collisionDeductible, 0)} deductible` },
      { label: 'Most comprehensive can pay', value: formatMoney(comprehensivePayout), detail: `${formatMoney(input.vehicleValue, 0)} value − ${formatMoney(input.comprehensiveDeductible, 0)} deductible` },
      {
        label: 'Years of premium to equal that payout',
        value: yearsToEqual === null ? 'No payout is possible' : `${formatNumber(yearsToEqual, { maximumFractionDigits: 2 })}`,
        detail: yearsToEqual === null
          ? 'The deductible is at or above the car’s value, so a total loss returns nothing.'
          : `${formatMoney(bestPayout)} ÷ ${formatMoney(physicalDamage)} a year`,
      },
    ],
    assumptions,
  };
}
