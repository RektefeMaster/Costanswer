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

/**
 * How strong the evidence behind a vector is.
 *
 * The first three come from the state; the last comes from this project's own
 * reading of the state's schedule. Both are useful and they prove different
 * things, so a vector says which it is rather than letting the distinction
 * quietly disappear into a passing test.
 */
export type GoldenVectorBasis =
  | 'published-table'
  | 'published-example'
  | 'published-threshold'
  | 'worked-from-schedule'
  | 'secondary-source';

/** A figure the state itself publishes, that the engine must reproduce. */
export type StateGoldenVector = {
  readonly stateCode: StateCode;
  readonly filingStatus: FilingStatus;
  /** What the engine is given. Gross wages, except where the state says otherwise. */
  readonly taxableIncome: number;
  /** Tax the state's own table or calculator gives for this income. */
  readonly expectedTax: number;
  readonly basis: GoldenVectorBasis;
  /** Needed by states that tax federal taxable income or credit a share of the federal deduction. */
  readonly federalStandardDeduction?: number;
  /** Needed by states that let federal income tax be deducted. */
  readonly federalIncomeTax?: number;
  /** Needed by states that deduct Social Security and Medicare. */
  readonly employeeFica?: number;
  readonly dependents?: number;
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

/** Bases that are the state's own printed figure, rather than our arithmetic or someone else's dataset. */
const PUBLISHED_BASES: readonly GoldenVectorBasis[] = ['published-table', 'published-example', 'published-threshold'];

const DEFAULT_TOLERANCE = 1;

/**
 * State revenue agencies that publish on a domain the .gov test would reject.
 *
 * Not a convenience escape hatch: each entry is a department's own site, named
 * one at a time so that adding one is a decision somebody makes rather than a
 * rule quietly going slack. An aggregator never belongs here.
 */
const OFFICIAL_NON_GOV_HOSTS: ReadonlySet<string> = new Set([
  // The Florida Department of Revenue's own site. Florida has no .gov equivalent.
  'floridarevenue.com',
]);

/**
 * A source URL that actually points at the state, not at a summary site.
 *
 * Transcribing from an aggregator is how a stale bracket enters a dataset that
 * claims to be official, so the host has to look like a government one.
 */
function looksOfficial(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.gov') || host.endsWith('.us') || OFFICIAL_NON_GOV_HOSTS.has(host);
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
    const range = policy.localAddOn.typicalRateRange;
    if (range && range.low > range.high) error('localAddOn typical range is inverted.');
  }

  if ('federalDeduction' in policy && policy.federalDeduction) {
    warn('This state deducts federal income tax; every caller must supply federalIncomeTax or the engine throws.');
  }
  if ('ficaDeductionCap' in policy && policy.ficaDeductionCap !== undefined) {
    warn('This state deducts Social Security and Medicare; every caller must supply employeeFica or the engine throws.');
  }

  return issues;
}

export type GoldenVectorResult = {
  readonly vector: StateGoldenVector;
  readonly actualTax: number;
  readonly passed: boolean;
  readonly differenceDollars: number;
};

export type GoldenVectorInput = {
  readonly state: StateCode;
  readonly filingStatus: FilingStatus;
  readonly taxableIncome: number;
  readonly federalStandardDeduction?: number;
  readonly federalIncomeTax?: number;
  readonly employeeFica?: number;
  readonly dependents?: number;
};

export function checkGoldenVector(
  vector: StateGoldenVector,
  computeTax: (input: GoldenVectorInput) => number,
): GoldenVectorResult {
  const actualTax = computeTax({
    state: vector.stateCode,
    filingStatus: vector.filingStatus,
    taxableIncome: vector.taxableIncome,
    federalStandardDeduction: vector.federalStandardDeduction,
    federalIncomeTax: vector.federalIncomeTax,
    employeeFica: vector.employeeFica,
    dependents: vector.dependents,
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
  /** Which supported states carry a bracket table, and so can hide a bad threshold. */
  progressiveStates: readonly StateCode[] = [],
): StateVerificationIssue[] {
  const byState = new Map<StateCode, StateGoldenVector[]>();
  for (const vector of vectors) {
    const existing = byState.get(vector.stateCode);
    if (existing) existing.push(vector);
    else byState.set(vector.stateCode, [vector]);
  }

  const issues: StateVerificationIssue[] = [];
  for (const stateCode of supportedStates) {
    const own = byState.get(stateCode) ?? [];
    if (own.length < REQUIRED_VECTORS_PER_STATE) {
      issues.push({
        stateCode,
        severity: 'error',
        message: `${stateCode} is marked supported with ${own.length} golden vectors; ${REQUIRED_VECTORS_PER_STATE} are required.`,
      });
      continue;
    }
    /*
     * A flat rate has nothing to misread but the rate itself, so arithmetic
     * against it is proof enough. A bracket table is where a threshold off by
     * a digit hides, and arithmetic against the same table cannot see it — the
     * state's own published figure can. That is a warning rather than an error
     * because several states publish no table at all.
     */
    if (progressiveStates.includes(stateCode) && !own.some((v) => PUBLISHED_BASES.includes(v.basis))) {
      issues.push({
        stateCode,
        severity: 'warning',
        message: `${stateCode} has brackets but no vector carries a figure the state itself published. Add one.`,
      });
    }
    /*
     * Weaker still, and worth saying whatever the rate structure is: a state
     * resting entirely on somebody else's dataset. Flat states are exempt from
     * the rule above because a rate is hard to misread, but that reasoning
     * assumes we read the rate off the state. If nobody has, the exemption does
     * not apply.
     */
    if (own.length > 0 && own.every((v) => v.basis === 'secondary-source')) {
      issues.push({
        stateCode,
        severity: 'warning',
        message: `${stateCode} rests entirely on secondary sources. No figure here has been read off the state's own material.`,
      });
    }
  }
  return issues;
}
