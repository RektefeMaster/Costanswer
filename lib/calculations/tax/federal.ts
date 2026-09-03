import type { FederalTaxYear } from '@/lib/data/tax/schema';
import { calculateProgressiveTax } from './brackets';
import type { FederalIncomeTaxBreakdown, FilingStatus } from './types';

export function calculateFederalIncomeTax(input: {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  federal: FederalTaxYear;
}): FederalIncomeTaxBreakdown {
  if (input.federal.taxYear !== input.taxYear) {
    throw new Error(`Federal dataset tax year ${input.federal.taxYear} does not match requested ${input.taxYear}.`);
  }
  if (!Number.isFinite(input.grossIncome) || input.grossIncome < 0) {
    throw new Error('Gross income must be a finite amount of at least $0.');
  }
  const standardDeduction = input.federal.standardDeductionByFilingStatus[input.filingStatus];
  const taxableIncome = Math.max(0, input.grossIncome - standardDeduction);
  return {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.grossIncome,
    standardDeduction,
    taxableIncome,
    tax: calculateProgressiveTax(taxableIncome, input.federal.bracketsByFilingStatus[input.filingStatus]),
  };
}
