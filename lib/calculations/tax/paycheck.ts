import { z } from 'zod';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';
import { finiteNumber, formatMoney, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getStateName, isStateCode } from '@/lib/location/states';
import { estimateAnnualTaxLiability, sharedAssumptions } from './annual';
import { FILING_STATUSES, PAY_FREQUENCIES, type PayFrequency } from './types';
import { PAYCHECK_ENGINE_ID } from './version';

const paycheckBaseSchema = z.object({
  payFrequency: z.enum(PAY_FREQUENCIES),
  amount: finiteNumber('Pay amount', 0, 100_000_000).optional(),
  hourlyRate: finiteNumber('Hourly rate', 0.01, 10_000).optional(),
  hoursPerWeek: finiteNumber('Hours per week', 0, 168).optional(),
  weeksPerYear: finiteNumber('Weeks per year', 1, 53).optional(),
  state: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export const paycheckInputSchema = paycheckBaseSchema.superRefine((input, context) => {
  if (input.payFrequency === 'hourly') {
    if (input.hourlyRate == null) context.addIssue({ code: 'custom', path: ['hourlyRate'], message: 'Hourly rate is required.' });
    if (input.hoursPerWeek == null) context.addIssue({ code: 'custom', path: ['hoursPerWeek'], message: 'Hours per week are required.' });
    if (input.weeksPerYear == null) context.addIssue({ code: 'custom', path: ['weeksPerYear'], message: 'Weeks per year are required.' });
    return;
  }
  if (input.amount == null) {
    context.addIssue({ code: 'custom', path: ['amount'], message: 'Pay amount is required.' });
  }
});

export type PaycheckInput = z.infer<typeof paycheckInputSchema>;

export type PaycheckValue = {
  taxYear: number;
  payFrequency: PayFrequency;
  periodsPerYear: number;
  grossPaycheck: number;
  federal: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  totalTax: number;
  netPaycheck: number;
  annualGross: number;
  annualTakeHome: number;
  stateTaxStatus: 'supported' | 'unsupported';
};

function periodsPerYear(frequency: PayFrequency, weeksPerYear: number): number {
  switch (frequency) {
    case 'annual':
      return 1;
    case 'monthly':
      return 12;
    case 'semimonthly':
      return 24;
    case 'biweekly':
      return 26;
    case 'weekly':
      return 52;
    case 'hourly':
      return weeksPerYear;
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled pay frequency: ${exhaustive}`);
    }
  }
}

export function annualizePaycheckGross(input: PaycheckInput): { annualGross: number; periods: number; grossPaycheck: number } {
  if (input.payFrequency === 'hourly') {
    if (input.hourlyRate == null || input.hoursPerWeek == null || input.weeksPerYear == null) {
      throw new Error('Hourly paycheck inputs are incomplete.');
    }
    const hourly = calculateHourlySalary({
      hourlyRate: input.hourlyRate,
      regularHoursPerWeek: input.hoursPerWeek,
      overtimeHoursPerWeek: 0,
      overtimeMultiplier: 1.5,
      weeksPerYear: input.weeksPerYear,
    });
    return {
      annualGross: hourly.value.annual,
      periods: input.weeksPerYear,
      grossPaycheck: hourly.value.weekly,
    };
  }
  const amount = input.amount ?? 0;
  const periods = periodsPerYear(input.payFrequency, 52);
  return {
    annualGross: amount * periods,
    periods,
    grossPaycheck: amount,
  };
}

export function calculatePaycheck(rawInput: unknown): CalculationResult<PaycheckValue> {
  const input = paycheckInputSchema.parse(rawInput);
  const annualized = annualizePaycheckGross(input);
  const periods = input.payFrequency === 'hourly' ? Number(input.weeksPerYear) : annualized.periods;
  const liability = estimateAnnualTaxLiability({
    annualGrossSalary: annualized.annualGross,
    state: input.state,
    filingStatus: input.filingStatus,
    taxYear: input.taxYear,
  });
  const medicare = liability.fica.medicare + liability.fica.additionalMedicare;
  const stateName = getStateName(liability.state);
  const stateLine = liability.stateTax.status === 'unsupported'
    ? 'Omitted (unsupported state)'
    : formatMoney(liability.stateTax.tax / periods);

  return {
    value: {
      taxYear: liability.taxYear,
      payFrequency: input.payFrequency,
      periodsPerYear: periods,
      grossPaycheck: round(annualized.grossPaycheck),
      federal: round(liability.federal.tax / periods),
      socialSecurity: round(liability.fica.socialSecurity / periods),
      medicare: round(medicare / periods),
      stateTax: round(liability.stateTax.tax / periods),
      totalTax: round(liability.totalTax / periods),
      netPaycheck: round(liability.takeHome / periods),
      annualGross: round(liability.grossIncome),
      annualTakeHome: round(liability.takeHome),
      stateTaxStatus: liability.stateTax.status,
    },
    calculationVersion: PAYCHECK_ENGINE_ID,
    datasetSnapshotIds: [liability.snapshotId],
    breakdown: [
      { label: 'Gross paycheck', value: formatMoney(annualized.grossPaycheck) },
      { label: 'Federal', value: formatMoney(liability.federal.tax / periods) },
      { label: 'Social Security', value: formatMoney(liability.fica.socialSecurity / periods) },
      { label: 'Medicare', value: formatMoney(medicare / periods) },
      { label: `${stateName} tax`, value: stateLine },
      { label: 'Estimated net paycheck', value: formatMoney(liability.takeHome / periods) },
    ],
    assumptions: [
      'Estimated paycheck based on annualized tax liability, not employer payroll withholding.',
      `Annual tax is divided across ${periods} pay periods.`,
      ...sharedAssumptions(liability),
    ],
  };
}
