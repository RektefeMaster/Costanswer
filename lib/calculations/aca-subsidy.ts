import { z } from 'zod';
import { acaSubsidySnapshot, acaSubsidySnapshotSchema, type AcaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { isStateCode } from '@/lib/location/states';
import { formatMoney, formatNumber, round, type CalculationResult } from './contracts';

export const ACA_SUBSIDY_VERSION = 'aca-subsidy-v1.0.0';

// Unknown values such as null, booleans, or blank strings must not become $0.
const dollars = (name: string) => z.number({ error: `${name} must be a number.` }).finite().min(0).max(100_000_000);
export const acaSubsidyInputSchema = z.object({
  coverageYear: z.literal(2026),
  stateCode: z.string().refine(isStateCode, 'Choose one of the 50 states or Washington, DC.'),
  householdSize: z.number().int().min(1).max(30),
  annualHouseholdMagi: dollars('Annual household MAGI'),
  /** Actual second-lowest-cost Silver premium for the coverage family, without a tobacco surcharge. */
  monthlyBenchmarkPremium: dollars('Monthly benchmark Silver premium'),
  /** Full monthly price of the selected plan, before premium tax credits. */
  monthlyPlanPremium: dollars('Monthly selected-plan premium'),
  /** Tax-credit-eligible enrollment premium, excluding non-EHB add-ons. Defaults to the full selected premium. */
  monthlyEligiblePlanPremium: dollars('Monthly eligible enrollment premium').optional(),
  /** A planning assumption about all non-income conditions, not an eligibility determination. */
  eligibility: z.enum(['assumed-eligible', 'ineligible', 'unknown']),
  coverageMonths: z.number().int().min(1).max(12).default(12),
}).refine((input) => input.monthlyEligiblePlanPremium === undefined || input.monthlyEligiblePlanPremium <= input.monthlyPlanPremium, {
  message: 'The eligible enrollment premium cannot exceed the full selected-plan premium.',
  path: ['monthlyEligiblePlanPremium'],
});

export type AcaSubsidyInput = z.infer<typeof acaSubsidyInputSchema>;
export type AcaSubsidyStatus = 'estimated' | 'eligibility-unconfirmed' | 'below-income-range' | 'above-income-range' | 'ineligible';
export type AcaSubsidyValue = {
  coverageYear: 2026;
  povertyGuidelineYear: 2025;
  coverageMonths: number;
  povertyGuideline: number;
  incomePercentFpl: number;
  minimumAnnualIncome: number;
  maximumAnnualIncome: number;
  applicableContributionPercent: number | null;
  expectedMonthlyContribution: number | null;
  monthlyBenchmarkPremium: number;
  monthlyPlanPremium: number;
  monthlyEligiblePlanPremium: number;
  monthlyPremiumTaxCredit: number | null;
  monthlyNetPremium: number | null;
  /** Annualized at 12 months using an unchanged monthly premium and eligibility. */
  annualPremiumTaxCredit: number | null;
  annualNetPremium: number | null;
  coveragePeriodPremiumTaxCredit: number | null;
  coveragePeriodNetPremium: number | null;
  status: AcaSubsidyStatus;
  reasons: string[];
};

function contributionPercent(incomePercentFpl: number, snapshot: AcaSubsidySnapshot): number | null {
  if (incomePercentFpl < snapshot.minimumIncomePercentFpl || incomePercentFpl > snapshot.maximumIncomePercentFpl) return null;
  const band = snapshot.contributionBands.find((entry, index) => incomePercentFpl >= entry.lowerIncomePercentFpl
    && (incomePercentFpl < entry.upperIncomePercentFpl || index === snapshot.contributionBands.length - 1));
  if (!band) throw new Error('The official contribution table does not cover this income.');
  const fraction = (incomePercentFpl - band.lowerIncomePercentFpl) / (band.upperIncomePercentFpl - band.lowerIncomePercentFpl);
  return band.initialContributionPercent + fraction * (band.finalContributionPercent - band.initialContributionPercent);
}

/** Estimate a fixed coverage scenario; the Marketplace/IRS determines actual eligibility and reconciliation. */
export function calculateAcaSubsidy(rawInput: unknown, rawSnapshot: AcaSubsidySnapshot = acaSubsidySnapshot): CalculationResult<AcaSubsidyValue> {
  const input = acaSubsidyInputSchema.parse(rawInput);
  const snapshot = acaSubsidySnapshotSchema.parse(rawSnapshot);
  const region = input.stateCode === 'AK' ? 'alaska' : input.stateCode === 'HI' ? 'hawaii' : 'contiguous';
  const guideline = snapshot.povertyGuidelines[region];
  const povertyGuideline = guideline.firstPerson + (input.householdSize - 1) * guideline.additionalPerson;
  const incomePercentFpl = input.annualHouseholdMagi / povertyGuideline * 100;
  const applicable = contributionPercent(incomePercentFpl, snapshot);
  const contribution = applicable === null ? null : input.annualHouseholdMagi * applicable / 100 / 12;
  const eligiblePremium = input.monthlyEligiblePlanPremium ?? input.monthlyPlanPremium;
  let status: AcaSubsidyStatus;
  let monthlyCredit: number | null;
  const reasons: string[] = [];

  if (input.eligibility === 'ineligible') {
    status = 'ineligible';
    monthlyCredit = 0;
    reasons.push('You indicated that the non-income eligibility conditions are not met, so this scenario applies no premium tax credit.');
  } else if (input.annualHouseholdMagi > povertyGuideline * snapshot.maximumIncomePercentFpl / 100) {
    status = 'above-income-range';
    monthlyCredit = 0;
    reasons.push('Income exceeds the 400% FPL ceiling for 2026. The temporary expansion above that ceiling ended after 2025.');
  } else if (input.annualHouseholdMagi < povertyGuideline * snapshot.minimumIncomePercentFpl / 100) {
    status = 'below-income-range';
    monthlyCredit = null;
    reasons.push('Income is below the general 100% FPL minimum. Check Medicaid and Marketplace eligibility; special below-minimum circumstances require an individual review and are not calculated here.');
  } else if (input.eligibility === 'unknown') {
    status = 'eligibility-unconfirmed';
    monthlyCredit = null;
    reasons.push('Income alone does not establish eligibility. Confirm the coverage and tax-filing conditions with the Marketplace before applying a subsidy to your budget.');
  } else {
    status = 'estimated';
    monthlyCredit = Math.min(eligiblePremium, Math.max(0, input.monthlyBenchmarkPremium - contribution!));
    reasons.push('This is a conditional estimate assuming the non-income eligibility conditions are met for the people included in the supplied premiums.');
    if (monthlyCredit === 0) reasons.push('The benchmark premium does not exceed the expected contribution, or the eligible enrollment premium is zero.');
  }
  const net = monthlyCredit === null ? null : Math.max(0, input.monthlyPlanPremium - monthlyCredit);
  const nullableRound = (value: number | null, multiplier = 1) => value === null ? null : round(value * multiplier);
  const value: AcaSubsidyValue = {
    coverageYear: snapshot.coverageYear,
    povertyGuidelineYear: snapshot.povertyGuidelineYear,
    coverageMonths: input.coverageMonths,
    povertyGuideline,
    incomePercentFpl: round(incomePercentFpl, 4),
    minimumAnnualIncome: povertyGuideline,
    maximumAnnualIncome: povertyGuideline * snapshot.maximumIncomePercentFpl / 100,
    applicableContributionPercent: applicable === null ? null : round(applicable, 6),
    expectedMonthlyContribution: nullableRound(contribution),
    monthlyBenchmarkPremium: round(input.monthlyBenchmarkPremium),
    monthlyPlanPremium: round(input.monthlyPlanPremium),
    monthlyEligiblePlanPremium: round(eligiblePremium),
    monthlyPremiumTaxCredit: nullableRound(monthlyCredit),
    monthlyNetPremium: nullableRound(net),
    annualPremiumTaxCredit: nullableRound(monthlyCredit, 12),
    annualNetPremium: nullableRound(net, 12),
    coveragePeriodPremiumTaxCredit: nullableRound(monthlyCredit, input.coverageMonths),
    coveragePeriodNetPremium: nullableRound(net, input.coverageMonths),
    status,
    reasons,
  };
  return {
    value,
    calculationVersion: ACA_SUBSIDY_VERSION,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      { label: 'Poverty guideline', value: formatMoney(povertyGuideline, 0), detail: `${snapshot.povertyGuidelineYear} HHS guideline for a tax household of ${input.householdSize}; used for ${input.coverageYear} coverage.` },
      { label: 'Household income vs FPL', value: `${formatNumber(incomePercentFpl, { maximumFractionDigits: 2 })}%`, detail: `${formatMoney(input.annualHouseholdMagi, 0)} annual household MAGI.` },
      { label: 'Expected monthly contribution', value: contribution === null ? 'Outside the standard table' : formatMoney(contribution), detail: applicable === null ? 'General federal subsidy income range is 100–400% FPL.' : `${formatNumber(applicable, { maximumFractionDigits: 4 })}% of annual household MAGI, divided by 12.` },
      { label: 'Estimated monthly premium tax credit', value: monthlyCredit === null ? 'Eligibility review needed' : formatMoney(monthlyCredit), detail: reasons[0] },
      { label: 'Monthly selected-plan premium after credit', value: net === null ? 'Not estimated' : formatMoney(net), detail: 'Selected premium less the credit; non-eligible add-ons remain payable.' },
    ],
    assumptions: [
      'This estimates 2026 federal premium assistance; it does not approve coverage, establish eligibility, or prepare Form 8962.',
      'Use expected 2026 tax-household MAGI, including income of tax family members required to file. Take-home pay and last year’s earnings are not substitutes.',
      '2026 Marketplace credits use the 2025 poverty guidelines in effect when annual enrollment began. Alaska and Hawaii have separate guidelines.',
      'The eligibility assumption requires qualified non-catastrophic Marketplace coverage, the tax-filing and dependent requirements, paid required premiums, and no disqualifying government or affordable employer coverage for the people included in these premiums. Married filing separately has limited exceptions.',
      'Employer offers, Medicaid, Medicare, CHIP, TRICARE, immigration status, mixed-eligibility families, and HRA benefits require a Marketplace review. This calculator does not infer eligibility from income or state alone.',
      'Use your actual second-lowest-cost Silver plan premium for the eligible coverage family and location, excluding its tobacco surcharge. Enrollment averages and national premiums are not a benchmark quote.',
      input.monthlyEligiblePlanPremium === undefined
        ? 'The full selected-plan premium is assumed to be eligible for the credit cap. Enter a separate eligible premium if it includes non-essential-health-benefit add-ons.'
        : 'The credit is capped at the eligible enrollment premium entered; any non-eligible difference remains in your net cost.',
      'A selected plan’s eligible enrollment premium may include its actual tobacco charge; the benchmark used to calculate the credit excludes tobacco charges.',
      'Contribution percentages are interpolated within the IRS 2026 table using unrounded income. Displayed dollars are rounded to cents; final Marketplace and tax-form rounding can differ.',
      `Annual totals assume 12 identical eligible months. The coverage-period totals use ${input.coverageMonths} month(s), with unchanged premiums, household, and eligibility; annual MAGI is not prorated.`,
      'Deductibles, copays, coinsurance, state-funded assistance, cost-sharing reductions, HRA adjustments, and tax reconciliation are outside this premium estimate.',
      'For 2026, excess advance premium tax credits have no repayment cap. Report income and household changes to the Marketplace; the full excess may have to be repaid.',
    ],
  };
}
