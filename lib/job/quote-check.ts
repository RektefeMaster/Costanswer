import type { CalculationResult } from '@/lib/calculations/contracts';
import { calculateJobEstimate } from './estimate';
import type { QuoteCheckInput, QuoteCheckResult, QuoteVerdict } from './types';
import type { JobDatasets } from './types';

export const ABOVE_RANGE_REASONS = [
  'Emergency, after-hours, or occupied-home work that the model does not schedule.',
  'Premium or specified materials above the builder-grade baseline in the recipe.',
  'Difficult access, protection of finishes, or a site the modifiers did not capture.',
  'Permit, disposal, or code upgrades included in the quote but excluded from this estimate.',
  'Warranty, licensed specialty work, or scope the recipe does not model.',
] as const;

function verdictFor(quoteCents: number, lowCents: number, highCents: number): QuoteVerdict {
  if (quoteCents < lowCents) return 'below our estimated range';
  if (quoteCents > highCents) return 'above our estimated range';
  const span = highCents - lowCents;
  if (span <= 0) return 'within our estimated range';
  const position = (quoteCents - lowCents) / span;
  if (position <= 0.25) return 'at the low end';
  if (position >= 0.75) return 'at the high end';
  return 'within our estimated range';
}

export function checkJobQuote(input: QuoteCheckInput, datasets: JobDatasets): CalculationResult<QuoteCheckResult> {
  if (!Number.isFinite(input.contractorQuoteCents) || input.contractorQuoteCents < 0) {
    throw new Error('Enter the contractor quote as a dollar amount.');
  }
  const calculated = calculateJobEstimate(input, datasets);
  const estimate = calculated.value;
  const incomplete = estimate.status === 'incomplete' || estimate.range == null;
  const verdict: QuoteVerdict = incomplete
    ? 'outside what we can assess'
    : verdictFor(input.contractorQuoteCents, estimate.range!.lowCents, estimate.range!.highCents);

  const reasonsAHigherQuoteCanBeCorrect = verdict === 'above our estimated range' || verdict === 'at the high end'
    ? [...ABOVE_RANGE_REASONS]
    : [];

  return {
    value: {
      estimate,
      contractorQuoteCents: input.contractorQuoteCents,
      verdict,
      reasonsAHigherQuoteCanBeCorrect,
    },
    calculationVersion: calculated.calculationVersion,
    datasetSnapshotIds: calculated.datasetSnapshotIds,
    breakdown: calculated.breakdown,
    assumptions: calculated.assumptions,
  };
}
