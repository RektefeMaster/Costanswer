import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getStateName, isStateCode } from '@/lib/location/states';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateFederalIncomeTax } from './federal';
import { calculateFica } from './fica';
import { calculateStateIncomeTax } from './state';
import { FILING_STATUSES, FILING_STATUS_LABELS, type AnnualTaxLiability, type FilingStatus } from './types';
import { SALARY_AFTER_TAX_ENGINE_ID } from './version';

export const salaryAfterTaxInputSchema = z.object({
  annualGrossSalary: finiteNumber('Annual gross salary', 0, 100_000_000),
  state: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type SalaryAfterTaxInput = z.infer<typeof salaryAfterTaxInputSchema>;

export type SalaryAfterTaxValue = {
  taxYear: number;
  state: SalaryAfterTaxInput['state'];
  filingStatus: FilingStatus;
  grossAnnual: number;
  federalIncomeTax: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  stateIncomeTax: number;
  totalTax: number;
  annualTakeHome: number;
  monthlyTakeHome: number;
  biweeklyTakeHome: number;
  weeklyTakeHome: number;
  effectiveTaxRate: number;
  stateTaxStatus: 'supported' | 'unsupported';
  federalSource: string;
  stateSource: string;
};

export function estimateAnnualTaxLiability(rawInput: unknown): AnnualTaxLiability {
  const input = salaryAfterTaxInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const federal = calculateFederalIncomeTax({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.annualGrossSalary,
    federal: snapshot.federal,
  });
  const fica = calculateFica({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.annualGrossSalary,
    fica: snapshot.fica,
  });
  const stateTax = calculateStateIncomeTax({
    taxYear: input.taxYear,
    state: input.state,
    filingStatus: input.filingStatus,
    taxableIncome: input.annualGrossSalary,
    // A few states let federal income tax be deducted from state taxable
    // income, so their answer genuinely depends on this figure. Federal is
    // computed first for exactly that reason.
    federalIncomeTax: federal.tax,
    // Some states tax federal taxable income rather than gross wages, so they
    // need the deduction that has already come out of that base.
    federalStandardDeduction: federal.standardDeduction,
  });
  const totalTax = federal.tax + fica.total + stateTax.tax;
  const takeHome = input.annualGrossSalary - totalTax;
  return {
    taxYear: input.taxYear,
    state: input.state,
    filingStatus: input.filingStatus,
    grossIncome: input.annualGrossSalary,
    federal,
    fica,
    stateTax,
    totalTax,
    takeHome,
    effectiveRate: input.annualGrossSalary === 0 ? 0 : totalTax / input.annualGrossSalary,
    snapshotId: snapshot.snapshotId,
  };
}

function sharedAssumptions(liability: AnnualTaxLiability): string[] {
  const stateName = getStateName(liability.state);
  const assumptions = [
    `This estimate uses tax year ${liability.taxYear}.`,
    `Federal filing status: ${FILING_STATUS_LABELS[liability.filingStatus]}.`,
    `Federal income tax uses the IRS standard deduction of ${formatMoney(liability.federal.standardDeduction)}. Itemized deductions are not used.`,
    'Tax credits, dependents, capital gains, self-employment tax, and AMT are not included.',
    'Employer benefits and pre-tax payroll deductions are not included.',
    'This is an estimate, not a tax return or employer withholding notice.',
    `Federal source: IRS Revenue Procedure for tax year ${liability.taxYear}.`,
  ];
  if (liability.stateTax.status === 'unsupported') {
    assumptions.push(
      `${stateName} wage income tax is omitted because this release does not include a verified ${liability.taxYear} schedule. Federal income tax and FICA are still shown.`,
    );
    if (liability.stateTax.reason) assumptions.push(liability.stateTax.reason);
  } else if (liability.stateTax.kind === 'none') {
    assumptions.push(`${stateName} does not levy a wage income tax in this snapshot. The state tax line is $0.`);
  } else {
    assumptions.push(
      `${stateName} tax uses ${liability.stateTax.provider} rules. Schedule year ${liability.stateTax.scheduleTaxYear}. State-specific credits and most subtractions are not modeled.`,
    );
  }

  /*
   * Name the local tax where one exists rather than a blanket "local taxes are
   * not included" on every state. Most states have none, so the blanket line
   * was noise on forty pages and an understatement on the ten where it mattered
   * — and it never said by how much.
   */
  const local = liability.stateTax.omittedLocalTax;
  if (local) {
    const asPercent = (rate: number) => formatNumber(rate * 100, { maximumFractionDigits: 2 });
    const base = local.appliesTo === 'taxable-income' ? 'taxable income' : 'state tax';
    const where = local.basis.replace('-', ' ');
    /*
     * Where no official source sizes the local tax, the sentence says the
     * direction and stops. Quoting a made-up band would read as knowledge and
     * be wrong for most readers; saying nothing at all would let the page imply
     * the state figure is the whole bill.
     */
    assumptions.push(local.typicalRateRange
      ? `${local.label} is not included. It is set by your ${where} and typically runs `
        + `${asPercent(local.typicalRateRange.low)}% to ${asPercent(local.typicalRateRange.high)}% of ${base}, `
        + 'so your real take-home is lower than this.'
      : `${local.label} is not included. It is set by your ${where} and applies to ${base}. `
        + 'No state agency publishes a single rate for it, so its size is not estimated here — but your real take-home is lower than this.');
  } else if (liability.stateTax.status === 'supported') {
    assumptions.push('This state levies no local income tax on wages, so nothing is omitted on that account.');
  }

  if (liability.stateTax.federalTaxDeducted !== undefined) {
    assumptions.push(
      `${stateName} allows federal income tax to be deducted from state taxable income; `
      + `${formatMoney(liability.stateTax.federalTaxDeducted)} was deducted here.`,
    );
  }
  if (liability.stateTax.exemptionCredit !== undefined) {
    assumptions.push(
      `${stateName} gives an exemption as a credit against tax rather than a deduction from income; `
      + `${formatMoney(liability.stateTax.exemptionCredit)} was applied.`,
    );
  }
  return assumptions;
}

export function calculateSalaryAfterTax(rawInput: unknown): CalculationResult<SalaryAfterTaxValue> {
  const liability = estimateAnnualTaxLiability(rawInput);
  const medicareDisplay = liability.fica.medicare + liability.fica.additionalMedicare;
  const stateName = getStateName(liability.state);
  const stateLine = liability.stateTax.status === 'unsupported'
    ? 'Omitted (unsupported state)'
    : formatMoney(liability.stateTax.tax);

  return {
    value: {
      taxYear: liability.taxYear,
      state: liability.state,
      filingStatus: liability.filingStatus,
      grossAnnual: round(liability.grossIncome),
      federalIncomeTax: round(liability.federal.tax),
      socialSecurity: round(liability.fica.socialSecurity),
      medicare: round(medicareDisplay),
      additionalMedicare: round(liability.fica.additionalMedicare),
      stateIncomeTax: round(liability.stateTax.tax),
      totalTax: round(liability.totalTax),
      annualTakeHome: round(liability.takeHome),
      monthlyTakeHome: round(liability.takeHome / 12),
      biweeklyTakeHome: round(liability.takeHome / 26),
      weeklyTakeHome: round(liability.takeHome / 52),
      effectiveTaxRate: round(liability.effectiveRate * 100, 2),
      stateTaxStatus: liability.stateTax.status,
      federalSource: 'IRS',
      stateSource: `${liability.stateTax.provider}`,
    },
    calculationVersion: SALARY_AFTER_TAX_ENGINE_ID,
    datasetSnapshotIds: [liability.snapshotId],
    breakdown: [
      { label: 'Gross annual', value: formatMoney(liability.grossIncome) },
      { label: 'Federal income tax', value: formatMoney(liability.federal.tax), detail: `Taxable income ${formatMoney(liability.federal.taxableIncome)} after the standard deduction` },
      { label: 'Social Security', value: formatMoney(liability.fica.socialSecurity), detail: `Employee OASDI up to the ${formatMoney(liability.fica.socialSecurityWageBase, 0)} wage base` },
      { label: 'Medicare', value: formatMoney(medicareDisplay), detail: liability.fica.additionalMedicare > 0 ? 'Includes Additional Medicare Tax' : 'Employee HI tax' },
      { label: `${stateName} income tax`, value: stateLine, detail: liability.stateTax.status === 'unsupported' ? 'Federal-only result' : `Source: ${liability.stateTax.provider}` },
      { label: 'Total estimated tax', value: formatMoney(liability.totalTax) },
      { label: 'Annual take-home', value: formatMoney(liability.takeHome), detail: `Effective tax rate ${formatNumber(liability.effectiveRate * 100, { maximumFractionDigits: 2 })}%` },
    ],
    assumptions: sharedAssumptions(liability),
  };
}

export { sharedAssumptions };
