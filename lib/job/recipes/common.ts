import type { ModifierOption, RecipeSource, SourcedValue } from '../types';

export const REVIEWED_BY = 'CostAnswer editorial';
export const REVIEWED_AT = '2026-09-07';

export function sv<T>(value: T, sourceId: string): SourcedValue<T> {
  return { value, sourceId };
}

export const SHARED_SOURCES: Record<string, RecipeSource> = {
  oews: {
    kind: 'official_data',
    provider: 'U.S. Bureau of Labor Statistics',
    url: 'https://www.bls.gov/oes/',
    retrievedAt: REVIEWED_AT,
  },
  'ecec-table': {
    kind: 'official_data',
    provider: 'U.S. Bureau of Labor Statistics',
    url: 'https://www.bls.gov/news.release/ecec.t04.htm',
    retrievedAt: REVIEWED_AT,
  },
  ecec: {
    kind: 'model_transformation',
    inputs: ['oews', 'ecec-table'],
    method: 'Multiply the OEWS hourly wage by ECEC construction total compensation divided by wages and salaries.',
    rationale: 'ECEC is a national construction compensation loading, not this city\'s contractor loaded wage for the SOC.',
    confidenceImpact: 'lowers_to_medium',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
  overhead: {
    kind: 'model_assumption',
    rationale: '12% business overhead on direct cost. Benefits and payroll tax are in the ECEC loading, not here.',
    confidenceImpact: 'lowers_to_medium',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
  markup: {
    kind: 'model_assumption',
    rationale: '20% profit markup on (direct + overhead). This is markup, not a margin on the selling price.',
    confidenceImpact: 'lowers_to_medium',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
  contingency: {
    kind: 'model_assumption',
    rationale: '8% contingency on the marked-up subtotal for unmodeled site variation.',
    confidenceImpact: 'lowers_to_medium',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
  fema: {
    kind: 'official_data',
    provider: 'Federal Emergency Management Agency',
    url: 'https://www.fema.gov/assistance/public/tools-resources/schedule-equipment-rates',
    retrievedAt: REVIEWED_AT,
  },
  identity: {
    kind: 'model_assumption',
    rationale: 'The default modifier leaves the modeled total unchanged.',
    confidenceImpact: 'none',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
  crew: {
    kind: 'model_assumption',
    rationale: 'Crew size is a documented V1 assumption for a typical residential crew, not a measured local staffing pattern.',
    confidenceImpact: 'lowers_to_medium',
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  },
};

export function opt(id: string, label: string, factor: number, sourceId: string, extreme = false, addCents = 0): ModifierOption {
  return {
    id,
    label,
    factor: sv(factor, sourceId),
    addCents: sv(addCents, 'identity'),
    extreme,
  };
}

export const BUSINESS_RATES = {
  overheadRate: sv(0.12, 'overhead'),
  profitMarkupRate: sv(0.2, 'markup'),
  contingencyRate: sv(0.08, 'contingency'),
} as const;
