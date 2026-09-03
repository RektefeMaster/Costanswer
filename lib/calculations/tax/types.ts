import type { StateCode } from '@/lib/location/states';

export const FILING_STATUSES = [
  'single',
  'marriedFilingJointly',
  'marriedFilingSeparately',
  'headOfHousehold',
] as const;

export type FilingStatus = (typeof FILING_STATUSES)[number];

export const PAY_FREQUENCIES = [
  'annual',
  'monthly',
  'semimonthly',
  'biweekly',
  'weekly',
  'hourly',
] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  marriedFilingJointly: 'Married filing jointly',
  marriedFilingSeparately: 'Married filing separately',
  headOfHousehold: 'Head of household',
};

export type TaxBracket = {
  /** Inclusive IRS-style “not over” bound. `null` is the top open bracket. */
  notOver: number | null;
  rate: number;
};

export type FederalIncomeTaxBreakdown = {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  tax: number;
};

export type FicaBreakdown = {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  socialSecurityWageBase: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
};

export type StateIncomeTaxStatus = 'supported' | 'unsupported';

export type StateIncomeTaxBreakdown = {
  taxYear: number;
  state: StateCode;
  filingStatus: FilingStatus;
  status: StateIncomeTaxStatus;
  kind: 'none' | 'flat' | 'progressive' | 'flatWithSurtax' | 'omitted';
  provider: string;
  sourceUrl: string;
  scheduleTaxYear: number;
  tax: number;
  reason?: string;
};

export type AnnualTaxLiability = {
  taxYear: number;
  state: StateCode;
  filingStatus: FilingStatus;
  grossIncome: number;
  federal: FederalIncomeTaxBreakdown;
  fica: FicaBreakdown;
  stateTax: StateIncomeTaxBreakdown;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
  snapshotId: string;
};
