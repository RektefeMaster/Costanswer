import { materialDisplayName } from './material-labels';
import type { JobRecipe, MaterialBasketSnapshot, NamedMoneyStep, PpiSnapshot } from './types';

export type MaterialResult = {
  steps: NamedMoneyStep[];
  totalCents: number;
  unpricedCritical: string[];
  unpricedNonCritical: string[];
  frozenPpiSeries: string[];
  oldestBaselineDate: string | null;
};

function ppiRatio(ppi: PpiSnapshot | null, seriesId: string, baselineDate: string): { ratio: number; frozen: boolean } {
  const series = ppi?.series[seriesId];
  if (!series || series.observations.length === 0) return { ratio: 1, frozen: true };
  const baselinePeriod = baselineDate.slice(0, 7);
  const baseline = [...series.observations].reverse().find((row) => row.period <= baselinePeriod) ?? series.observations[0];
  const current = series.observations[series.observations.length - 1];
  if (!baseline || baseline.index <= 0 || current.index <= 0) return { ratio: 1, frozen: true };
  return { ratio: current.index / baseline.index, frozen: false };
}

/**
 * National baseline × PPI. RPP is never applied to materials.
 */
export function priceMaterials(
  recipe: JobRecipe,
  units: number,
  basket: MaterialBasketSnapshot | null,
  ppi: PpiSnapshot | null,
  materialFactors: Record<string, number> = {},
): MaterialResult {
  const byId = new Map((basket?.components ?? []).map((component) => [component.componentId, component]));
  const steps: NamedMoneyStep[] = [];
  const unpricedCritical: string[] = [];
  const unpricedNonCritical: string[] = [];
  const frozenPpiSeries: string[] = [];
  let totalCents = 0;
  let oldestBaselineDate: string | null = null;

  for (const line of recipe.materials) {
    const scale = materialFactors[line.componentId] ?? 1;
    if (scale === 0) continue;
    const component = byId.get(line.componentId);
    if (!component || component.baselinePriceCents <= 0) {
      if (line.critical) unpricedCritical.push(line.componentId);
      else unpricedNonCritical.push(line.componentId);
      continue;
    }
    if (component.regionalAdjustment !== 'none') {
      throw new Error(`Material ${component.componentId} must not apply a regional adjustment in V1.`);
    }
    const { ratio, frozen } = ppiRatio(ppi, component.ppiSeriesId, component.baselineDate);
    if (frozen) frozenPpiSeries.push(component.ppiSeriesId);
    const quantity = line.quantityPerUnit.value * units * (1 + line.wastePercent.value) * scale;
    const cents = Math.round(quantity * component.baselinePriceCents * ratio);
    totalCents += cents;
    steps.push({
      id: `material-${line.componentId}`,
      label: `Materials · ${materialDisplayName(line.componentId)}`,
      cents,
      detail: frozen
        ? `Baseline held; PPI series ${component.ppiSeriesId} is frozen at 1.0`
        : `Baseline ${component.baselineDate} × PPI ${component.ppiSeriesId} (${ratio.toFixed(3)})`,
    });
    if (oldestBaselineDate == null || component.baselineDate < oldestBaselineDate) oldestBaselineDate = component.baselineDate;
  }

  return { steps, totalCents, unpricedCritical, unpricedNonCritical, frozenPpiSeries, oldestBaselineDate };
}
