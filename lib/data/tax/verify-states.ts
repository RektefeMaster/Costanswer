/**
 * What a state row has to prove before it may be called `supported`.
 *
 * This is the gate the 2026 transcription work runs through, and it exists
 * because the failure it prevents is invisible: a plausible bracket table with
 * a wrong threshold produces a take-home figure that looks entirely normal and
 * is wrong by hundreds of dollars a year, on tens of thousands of pages.
 *
 * So a state is `supported` only when someone can point at where each number
 * came from, and a golden vector reproduces the state's own published figure.
 * Everything else stays `unsupported`, which the site already renders honestly.
 */
import type { StateTaxPolicy } from './schema';
import type { FilingStatus } from '@/lib/calculations/tax/types';
import type { StateCode } from '@/lib/location/states';

export type StateVerificationIssue = {
  readonly stateCode: StateCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
};

/** A figure the state itself publishes, that the engine must reproduce. */
export type StateGoldenVector = {
  readonly stateCode: StateCode;
  readonly filingStatus: FilingStatus;
  readonly taxableIncome: number;
  /** Tax the state's own table or calculator gives for this income. */
  readonly expectedTax: number;
  /** Where that figure was read from. A vector without one proves nothing. */
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly verifiedAt: string;
  /**
   * Dollars of disagreement tolerated.
   *
   * States round differently — some to the dollar, some by bracket table — so a
   * cent of drift is not an error. More than a dollar is.
   */
  readonly toleranceDollars?: number;
};

const DEFAULT_TOLERANCE = 1;

/**
 * A source URL that actually points at the state, not at a summary site.
 *
 * Transcribing from an aggregator is how a stale bracket enters a dataset that
 * claims to be official, so the host has to look like a government one.
 */
function looksOfficial(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.gov') || host.endsWith('.us') || host.endsWith('.state.pa.us');
  } catch {
    return false;
  }
}

export function verifyStatePolicy(policy: StateTaxPolicy, taxYear: number): StateVerificationIssue[] {
  const issues: StateVerificationIssue[] = [];
  const stateCode = policy.stateCode as StateCode;
  const error = (message: string) => issues.push({ stateCode, severity: 'error', message });
  const warn = (message: string) => issues.push({ stateCode, severity: 'warning', message });

  if (!looksOfficial(policy.sourceUrl)) {
    error(`sourceUrl ${policy.sourceUrl} is not a government host. Transcribe from the state's own publication.`);
  }

  if (policy.status === 'unsupported') {
    if (!policy.reason.trim()) error('An unsupported state must say why, because the page prints it.');
    return issues;
  }

  if (policy.kind === 'none') {
    if (policy.notes.length === 0) error('A no-income-tax state still needs a note saying so.');
    return issues;
  }

  // A schedule from an earlier year is legitimate — states publish late — but
  // it has to be declared, because the page tells the reader which year's rules
  // produced their number.
  if (policy.scheduleTaxYear > taxYear) {
    error(`scheduleTaxYear ${policy.scheduleTaxYear} is later than the snapshot year ${taxYear}.`);
  }
  if (policy.scheduleTaxYear < taxYear - 1) {
    warn(`Schedule is from ${policy.scheduleTaxYear}, two or more years behind ${taxYear}. Check for a newer release.`);
  }

  if (policy.kind === 'progressive') {
    for (const status of Object.keys(policy.bracketsByFilingStatus) as FilingStatus[]) {
      const brackets = policy.bracketsByFilingStatus[status];
      if (brackets.length === 0) error(`${status} has no brackets.`);
      // A single open bracket is a flat tax wearing a progressive shape, which
      // is usually a transcription that lost its thresholds.
      if (brackets.length === 1 && brackets[0].notOver === null) {
        warn(`${status} has one open bracket. If this state is genuinely flat, use kind "flat".`);
      }
      for (const bracket of brackets) {
        if (bracket.rate > 0.15) {
          warn(`${status} carries a ${(bracket.rate * 100).toFixed(2)}% rate. No US state exceeds about 13.3%; check the decimal place.`);
        }
      }
    }
  }

  if (policy.kind === 'flat' && policy.rate > 0.09) {
    warn(`A flat rate of ${(policy.rate * 100).toFixed(2)}% is higher than any state levies. Check the decimal place.`);
  }

  if ('localAddOn' in policy && policy.localAddOn) {
    const { low, high } = policy.localAddOn.typicalRateRange;
    if (low > high) error('localAddOn typical range is inverted.');
  }

  if ('federalDeduction' in policy && policy.federalDeduction) {
    warn('This state deducts federal income tax; every caller must supply federalIncomeTax or the engine throws.');
  }

  return issues;
}

export type GoldenVectorResult = {
  readonly vector: StateGoldenVector;
  readonly actualTax: number;
  readonly passed: boolean;
  readonly differenceDollars: number;
};

export function checkGoldenVector(
  vector: StateGoldenVector,
  computeTax: (input: { state: StateCode; filingStatus: FilingStatus; taxableIncome: number }) => number,
): GoldenVectorResult {
  const actualTax = computeTax({
    state: vector.stateCode,
    filingStatus: vector.filingStatus,
    taxableIncome: vector.taxableIncome,
  });
  const differenceDollars = Math.abs(actualTax - vector.expectedTax);
  return {
    vector,
    actualTax,
    differenceDollars,
    passed: differenceDollars <= (vector.toleranceDollars ?? DEFAULT_TOLERANCE),
  };
}

/**
 * A state may not be `supported` without at least this many golden vectors.
 *
 * Three incomes catch the mistakes that one does not: a wrong standard
 * deduction hides at high income, a wrong top bracket hides at low income, and
 * a wrong credit hides everywhere except where it is exhausted.
 */
export const REQUIRED_VECTORS_PER_STATE = 3;

export function assertVectorCoverage(
  supportedStates: readonly StateCode[],
  vectors: readonly StateGoldenVector[],
): StateVerificationIssue[] {
  const byState = new Map<StateCode, number>();
  for (const vector of vectors) byState.set(vector.stateCode, (byState.get(vector.stateCode) ?? 0) + 1);

  return supportedStates
    .filter((stateCode) => (byState.get(stateCode) ?? 0) < REQUIRED_VECTORS_PER_STATE)
    .map((stateCode) => ({
      stateCode,
      severity: 'error' as const,
      message: `${stateCode} is marked supported with ${byState.get(stateCode) ?? 0} golden vectors; ${REQUIRED_VECTORS_PER_STATE} are required.`,
    }));
}
