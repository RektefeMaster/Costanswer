import type { CalculationResult } from '@/lib/calculations/contracts';
import type { JobEstimate, QuoteCheckResult } from '@/lib/job/types';

export async function fetchJobEstimate(params: URLSearchParams, signal?: AbortSignal): Promise<CalculationResult<JobEstimate>> {
  const response = await fetch(`/api/cost/estimate?${params.toString()}`, { signal, cache: 'no-store' });
  const payload = await response.json() as CalculationResult<JobEstimate> & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'The estimate could not be calculated.');
  return payload;
}

export async function fetchQuoteCheck(body: unknown, signal?: AbortSignal): Promise<CalculationResult<QuoteCheckResult>> {
  const response = await fetch('/api/cost/check-quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json() as CalculationResult<QuoteCheckResult> & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'The quote could not be checked.');
  return payload;
}
