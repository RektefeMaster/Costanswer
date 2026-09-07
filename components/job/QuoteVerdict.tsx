'use client';

import { formatMoney } from '@/lib/calculations/contracts';
import type { QuoteCheckResult, QuoteVerdict } from '@/lib/job/types';

function verdictCopy(verdict: QuoteVerdict): string {
  switch (verdict) {
    case 'below our estimated range':
    case 'at the low end':
    case 'within our estimated range':
    case 'at the high end':
    case 'above our estimated range':
    case 'outside what we can assess':
      return verdict.charAt(0).toUpperCase() + verdict.slice(1);
    default: {
      const exhaustive: never = verdict;
      return exhaustive;
    }
  }
}

export function QuoteVerdict({ result }: { result: QuoteCheckResult }) {
  const range = result.estimate.range;
  return (
    <div className="quote-verdict">
      <p className="quote-verdict-label">Verdict</p>
      <strong>{verdictCopy(result.verdict)}</strong>
      <dl>
        <div>
          <dt>Contractor quote</dt>
          <dd>{formatMoney(result.contractorQuoteCents / 100, 0)}</dd>
        </div>
        <div>
          <dt>CostAnswer expected</dt>
          <dd>{range ? formatMoney(range.expectedCents / 100, 0) : '—'}</dd>
        </div>
        <div>
          <dt>CostAnswer estimated range</dt>
          <dd>{range ? `${formatMoney(range.lowCents / 100, 0)} – ${formatMoney(range.highCents / 100, 0)}` : 'Incomplete'}</dd>
        </div>
      </dl>
      {result.reasonsAHigherQuoteCanBeCorrect.length > 0 && (
        <div>
          <p>Reasons a higher quote can be correct</p>
          <ul>
            {result.reasonsAHigherQuoteCanBeCorrect.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
