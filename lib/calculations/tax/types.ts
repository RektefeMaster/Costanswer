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
  /**
   * Tax already owed at the bottom of this bracket, where the state publishes
   * it instead of leaving it to be summed.
   *
   * Most schedules are continuous, so the running total and the published
   * "$X plus Y% of the excess" agree and this is left out. Ohio's does not:
   * its 2025 table charges $342 the moment taxable income passes $26,050, and
   * $2,394.32 past $100,000 where summing the bands below gives $2,375.63. The
   * department prints those constants on its rate page and again in the IT 1040
   * booklet, so they are what Ohio actually charges, and a model that smooths
   * them out would undercharge by nineteen dollars for everyone over $100,000.
   *
   * Where present, this replaces the sum of the brackets below rather than
   * adding to it.
   */
  baseTax?: number;
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

/**
 * A local income tax this figure does not include.
 *
 * Ohio municipalities, Maryland counties, Pennsylvania's local EIT, New York
 * City, several Michigan cities and Indiana and Kentucky counties all levy one,
 * and for many people it is a bigger line than the state tax. The site knows a
 * state and does not know a municipality, so the honest options are to name the
 * omission or to invent a rate. This names it.
 */
export type OmittedLocalTax = {
  label: string;
  basis: 'municipality' | 'county' | 'school-district';
  /** Absent where no official source states a statewide band. */
  typicalRateRange?: { low: number; high: number };
  appliesTo: 'taxable-income' | 'state-tax-liability';
  /** Extra sentence the take-home page prints, where a range alone would mislead. */
  omissionNote?: string;
};

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
  /** Tax before credits, so a page can show what the credit was worth. */
  taxBeforeCredits?: number;
  /** Exemption credits applied. Never larger than the tax itself. */
  exemptionCredit?: number;
  /** Federal income tax deducted from state taxable income, where allowed. */
  federalTaxDeducted?: number;
  /** Present when this state levies a local tax the figure leaves out. */
  omittedLocalTax?: OmittedLocalTax;
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
