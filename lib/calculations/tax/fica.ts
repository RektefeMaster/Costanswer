import type { FicaTaxYear } from '@/lib/data/tax/schema';
import type { FicaBreakdown, FilingStatus } from './types';

export function calculateFica(input: {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  fica: FicaTaxYear;
}): FicaBreakdown {
  if (input.fica.taxYear !== input.taxYear) {
    throw new Error(`FICA dataset tax year ${input.fica.taxYear} does not match requested ${input.taxYear}.`);
  }
  if (!Number.isFinite(input.grossIncome) || input.grossIncome < 0) {
    throw new Error('Gross income must be a finite amount of at least $0.');
  }
  const socialSecurity = Math.min(input.grossIncome, input.fica.socialSecurityWageBase) * input.fica.socialSecurityRate;
  const medicare = input.grossIncome * input.fica.medicareRate;
  const additionalThreshold = input.fica.additionalMedicareThresholdByFilingStatus[input.filingStatus];
  const additionalMedicare = Math.max(0, input.grossIncome - additionalThreshold) * input.fica.additionalMedicareRate;
  return {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.grossIncome,
    socialSecurityWageBase: input.fica.socialSecurityWageBase,
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  };
}
