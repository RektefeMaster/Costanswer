import type { ConfidenceLevel } from '@/lib/calculators/depth';
import { materialList } from './material-labels';
import type { JobRecipe, RecipeSource } from './types';

function impactOf(source: RecipeSource): ConfidenceLevel | null {
  switch (source.kind) {
    case 'official_data':
    case 'published_specification':
    case 'observed_market':
      return null;
    case 'model_transformation':
    case 'model_assumption':
      if (source.confidenceImpact === 'none') return null;
      if (source.confidenceImpact === 'lowers_to_medium') return 'medium';
      return 'low';
    default: {
      const exhaustive: never = source;
      throw new Error(`Unhandled source kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function worse(left: ConfidenceLevel, right: ConfidenceLevel): ConfidenceLevel {
  const rank: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 };
  return rank[right] > rank[left] ? right : left;
}

export function deriveConfidence(input: {
  recipe: JobRecipe;
  unpricedCritical: string[];
  unpricedNonCritical: string[];
  usedNationalFallback: boolean;
  missingWages: string[];
  oldestBaselineDate: string | null;
  extremeModifierCount: number;
  asOf: string;
}): { level: ConfidenceLevel | null; reasons: string[] } {
  if (input.unpricedCritical.length > 0 || input.missingWages.length > 0) {
    return {
      level: null,
      reasons: [
        ...(input.unpricedCritical.length > 0
          ? [`Critical materials without a sourced price: ${materialList(input.unpricedCritical)}.`]
          : []),
        ...(input.missingWages.length > 0
          ? [`No published OEWS wage for ${input.missingWages.join(', ')}.`]
          : []),
      ],
    };
  }

  let level: ConfidenceLevel = 'high';
  const reasons: string[] = [];

  for (const source of Object.values(input.recipe.sources)) {
    const drop = impactOf(source);
    if (!drop) continue;
    level = worse(level, drop);
    if (source.kind === 'model_transformation' || source.kind === 'model_assumption') {
      reasons.push(source.rationale);
    }
  }

  if (input.usedNationalFallback) {
    level = worse(level, 'medium');
    reasons.push('The state wage was not published, so the national OEWS wage is used.');
  }
  if (input.unpricedNonCritical.length > 0) {
    level = worse(level, 'medium');
      reasons.push(`Non-critical materials dropped for missing prices: ${materialList(input.unpricedNonCritical)}.`);
  }
  if (input.extremeModifierCount > 0) {
    level = worse(level, 'medium');
    reasons.push('An extreme site modifier is selected, which widens the range.');
  }
  if (input.recipe.trade === 'multi') {
    level = worse(level, 'low');
    reasons.push('This is a composite recipe covering more than one trade.');
  }
  if (input.oldestBaselineDate) {
    const ageMonths = monthsBetween(input.oldestBaselineDate, input.asOf);
    if (ageMonths > 24) {
      level = worse(level, 'low');
      reasons.push('A critical material baseline is more than 24 months old.');
    } else if (ageMonths >= 12) {
      level = worse(level, 'medium');
      reasons.push('A material baseline is 12–24 months old.');
    }
  }

  const unique = [...new Set(reasons)];
  return { level, reasons: unique.length > 0 ? unique : ['The estimate uses published wages and the named recipe.'] };
}

function monthsBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate.slice(0, 10)}T00:00:00.000Z`);
  const to = Date.parse(`${toIsoDate.slice(0, 10)}T00:00:00.000Z`);
  return Math.round((to - from) / (30.44 * 24 * 60 * 60 * 1000));
}

export function confidenceBand(level: ConfidenceLevel, extremeModifierCount: number): { low: number; high: number } {
  const spread = {
    high: { low: 0.88, high: 1.12 },
    medium: { low: 0.8, high: 1.22 },
    low: { low: 0.7, high: 1.35 },
  }[level];
  const extra = extremeModifierCount * 0.03;
  return { low: spread.low - extra, high: spread.high + extra };
}
