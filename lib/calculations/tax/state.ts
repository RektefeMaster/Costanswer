import type { StateTaxPolicy } from '@/lib/data/tax/schema';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateProgressiveTax } from './brackets';
import type { FilingStatus, StateIncomeTaxBreakdown, OmittedLocalTax } from './types';
import type { StateCode } from '@/lib/location/states';

function policyFor(taxYear: number, state: StateCode): StateTaxPolicy {
  const snapshot = getTaxYearSnapshot(taxYear);
  const policy = snapshot.states.find((row) => row.stateCode === state);
  if (!policy) throw new Error(`No tax policy row for ${state} in tax year ${taxYear}.`);
  return policy;
}

export type StateTaxInput = {
  taxYear: number;
  state: StateCode;
  filingStatus: FilingStatus;
  taxableIncome: number;
  /**
   * Federal income tax for the same year.
   *
   * Required only by the states that let it be deducted from state taxable
   * income. Those states are the reason this is an input at all: their state
   * tax genuinely depends on the federal figure, so the engine cannot compute
   * them from income alone and must not pretend to.
   */
  federalIncomeTax?: number;
  /** Dependents claimed, for states whose exemption is a per-dependent credit. */
  dependents?: number;
};

type SupportedPolicy = Extract<StateTaxPolicy, { status: 'supported' }>;

/**
 * What a state charges on wage income.
 *
 * The shapes below are not stylistic variations on one formula; they are
 * genuinely different arithmetic, and collapsing them loses real money:
 *
 *  - a deduction is worth the marginal rate, a credit is worth its face value
 *  - a percentage-of-income deduction with a floor and a cap is not its cap
 *  - a state that deducts federal tax depends on a number computed elsewhere
 *
 * Anything the model cannot compute is reported rather than approximated. A
 * local tax it cannot know is named as an omission; a state with no verified
 * schedule returns `unsupported` and the page says federal and FICA only.
 */
function computeSupportedStateTax(
  policy: SupportedPolicy,
  input: StateTaxInput,
): { tax: number; taxBeforeCredits: number; exemptionCredit: number; federalTaxDeducted: number } {
  const { filingStatus } = input;
  const none = { tax: 0, taxBeforeCredits: 0, exemptionCredit: 0, federalTaxDeducted: 0 };
  if (policy.kind === 'none') return none;

  const federalTaxDeducted = federalDeductionFor(policy, input);
  const income = Math.max(0, input.taxableIncome - federalTaxDeducted);

  let taxBeforeCredits: number;
  switch (policy.kind) {
    case 'flat': {
      const deduction = policy.standardDeductionByFilingStatus?.[filingStatus] ?? 0;
      const exemption = policy.exemptionByFilingStatus[filingStatus];
      taxBeforeCredits = Math.max(0, income - deduction - exemption) * policy.rate;
      break;
    }
    case 'flatWithSurtax': {
      taxBeforeCredits = income * policy.rate
        + Math.max(0, income - policy.surtaxThreshold) * policy.surtaxRate;
      break;
    }
    case 'progressive': {
      const deduction = policy.percentageStandardDeduction
        ? boundedPercentageDeduction(policy.percentageStandardDeduction, income, filingStatus)
        : policy.standardDeductionByFilingStatus[filingStatus];
      const exemptions = (policy.personalExemptionByFilingStatus?.[filingStatus] ?? 0)
        + (policy.perDependentExemption ?? 0) * (input.dependents ?? 0);
      const taxableIncome = Math.max(0, income - deduction - exemptions);
      taxBeforeCredits = calculateProgressiveTax(taxableIncome, policy.bracketsByFilingStatus[filingStatus])
        + (policy.additionalTax
          ? Math.max(0, taxableIncome - policy.additionalTax.threshold) * policy.additionalTax.rate
          : 0);
      break;
    }
    default: {
      const exhaustive: never = policy;
      throw new Error(`Unhandled state tax kind: ${JSON.stringify(exhaustive)}`);
    }
  }

  const exemptionCredit = exemptionCreditFor(policy, input, taxBeforeCredits);
  return {
    // A non-refundable credit cannot take the liability below zero. Letting it
    // would turn an exemption into a payment the state does not make.
    tax: Math.max(0, taxBeforeCredits - exemptionCredit),
    taxBeforeCredits,
    exemptionCredit,
    federalTaxDeducted,
  };
}

function boundedPercentageDeduction(
  spec: NonNullable<Extract<SupportedPolicy, { kind: 'progressive' }>['percentageStandardDeduction']>,
  income: number,
  filingStatus: FilingStatus,
): number {
  const raw = income * spec.rate;
  return Math.min(
    Math.max(raw, spec.minimumByFilingStatus[filingStatus]),
    spec.maximumByFilingStatus[filingStatus],
  );
}

function federalDeductionFor(policy: SupportedPolicy, input: StateTaxInput): number {
  const spec = 'federalDeduction' in policy ? policy.federalDeduction : undefined;
  if (!spec) return 0;
  if (input.federalIncomeTax === undefined) {
    // Silently skipping it would understate tax in exactly the states that
    // allow it, and by a lot. Better to refuse than to be quietly wrong.
    throw new Error(
      `${input.state} deducts federal income tax from state taxable income, so federalIncomeTax is required.`,
    );
  }
  const cap = spec.capByFilingStatus?.[input.filingStatus];
  return cap === undefined || cap === null
    ? Math.max(0, input.federalIncomeTax)
    : Math.min(Math.max(0, input.federalIncomeTax), cap);
}

function exemptionCreditFor(policy: SupportedPolicy, input: StateTaxInput, taxBeforeCredits: number): number {
  const spec = 'exemptionCredit' in policy ? policy.exemptionCredit : undefined;
  if (!spec) return 0;

  const full = spec.perFilerByFilingStatus[input.filingStatus]
    + spec.perDependent * (input.dependents ?? 0);

  if (!spec.phaseOut) return Math.min(full, taxBeforeCredits);

  const over = Math.max(0, input.taxableIncome - spec.phaseOut.startIncomeByFilingStatus[input.filingStatus]);
  const reduced = Math.max(0, full - over * spec.phaseOut.ratePerDollar);
  return Math.min(reduced, taxBeforeCredits);
}

function omittedLocalTaxFor(policy: SupportedPolicy): OmittedLocalTax | undefined {
  const spec = 'localAddOn' in policy ? policy.localAddOn : undefined;
  if (!spec) return undefined;
  return {
    label: spec.label,
    basis: spec.basis,
    typicalRateRange: spec.typicalRateRange,
    appliesTo: spec.appliesTo,
  };
}

export function calculateStateIncomeTax(input: StateTaxInput): StateIncomeTaxBreakdown {
  if (!Number.isFinite(input.taxableIncome) || input.taxableIncome < 0) {
    throw new Error('Income must be a finite amount of at least $0.');
  }
  const policy = policyFor(input.taxYear, input.state);
  if (policy.status === 'unsupported') {
    return {
      taxYear: input.taxYear,
      state: input.state,
      filingStatus: input.filingStatus,
      status: 'unsupported',
      kind: 'omitted',
      provider: policy.provider,
      sourceUrl: policy.sourceUrl,
      scheduleTaxYear: input.taxYear,
      tax: 0,
      reason: policy.reason,
    };
  }

  const computed = computeSupportedStateTax(policy, input);
  const scheduleTaxYear = policy.kind === 'none' ? input.taxYear : policy.scheduleTaxYear;

  return {
    taxYear: input.taxYear,
    state: input.state,
    filingStatus: input.filingStatus,
    status: 'supported',
    kind: policy.kind,
    provider: policy.provider,
    sourceUrl: policy.sourceUrl,
    scheduleTaxYear,
    tax: computed.tax,
    // Only reported where they did something, so a page does not print a line
    // saying a credit of zero was applied.
    taxBeforeCredits: computed.exemptionCredit > 0 ? computed.taxBeforeCredits : undefined,
    exemptionCredit: computed.exemptionCredit > 0 ? computed.exemptionCredit : undefined,
    federalTaxDeducted: computed.federalTaxDeducted > 0 ? computed.federalTaxDeducted : undefined,
    omittedLocalTax: omittedLocalTaxFor(policy),
  };
}
