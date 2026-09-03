import type { StateTaxPolicy } from '@/lib/data/tax/schema';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateProgressiveTax } from './brackets';
import type { FilingStatus, StateIncomeTaxBreakdown } from './types';
import type { StateCode } from '@/lib/location/states';

function policyFor(taxYear: number, state: StateCode): StateTaxPolicy {
  const snapshot = getTaxYearSnapshot(taxYear);
  const policy = snapshot.states.find((row) => row.stateCode === state);
  if (!policy) throw new Error(`No tax policy row for ${state} in tax year ${taxYear}.`);
  return policy;
}

function calculateSupportedStateTax(policy: Extract<StateTaxPolicy, { status: 'supported' }>, filingStatus: FilingStatus, income: number): number {
  switch (policy.kind) {
    case 'none':
      return 0;
    case 'flat':
      return Math.max(0, income - policy.exemptionByFilingStatus[filingStatus]) * policy.rate;
    case 'flatWithSurtax':
      return income * policy.rate + Math.max(0, income - policy.surtaxThreshold) * policy.surtaxRate;
    case 'progressive': {
      const taxableIncome = Math.max(0, income - policy.standardDeductionByFilingStatus[filingStatus]);
      const base = calculateProgressiveTax(taxableIncome, policy.bracketsByFilingStatus[filingStatus]);
      const additional = policy.additionalTax
        ? Math.max(0, taxableIncome - policy.additionalTax.threshold) * policy.additionalTax.rate
        : 0;
      return base + additional;
    }
    default: {
      const exhaustive: never = policy;
      throw new Error(`Unhandled state tax kind: ${exhaustive}`);
    }
  }
}

export function calculateStateIncomeTax(input: {
  taxYear: number;
  state: StateCode;
  filingStatus: FilingStatus;
  taxableIncome: number;
}): StateIncomeTaxBreakdown {
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

  const scheduleTaxYear = policy.kind === 'progressive' ? policy.scheduleTaxYear : input.taxYear;
  return {
    taxYear: input.taxYear,
    state: input.state,
    filingStatus: input.filingStatus,
    status: 'supported',
    kind: policy.kind,
    provider: policy.provider,
    sourceUrl: policy.sourceUrl,
    scheduleTaxYear,
    tax: calculateSupportedStateTax(policy, input.filingStatus, input.taxableIncome),
  };
}
