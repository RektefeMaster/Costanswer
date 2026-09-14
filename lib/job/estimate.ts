import { formatMoney, type BreakdownStep, type CalculationResult } from '@/lib/calculations/contracts';
import { JOB_CATALOG } from './catalog';
import { priceBusinessCost } from './business-rates';
import { calibrate } from './calibration';
import { confidenceBand, deriveConfidence } from './confidence';
import { FEMA_PROXY_NOTE, priceEquipment } from './equipment';
import { priceLabor } from './labor';
import { ZIP_ZCTA_PROVENANCE_LABEL, locateJobZip } from './location';
import { materialLabel } from './material-labels';
import { priceMaterials } from './materials';
import { applyModifiers } from './modifiers';
import { roundCentsToIncrement, sumCents } from './money';
import { priceDisposal, pricePermit } from './permits';
import { getRecipe } from './recipes';
import { resolveJobScope } from './scope';
import type { JobDatasets, JobEstimate, JobEstimateInput, NamedMoneyStep } from './types';
import { JOB_ENGINE_ID, RANGE_DISPLAY_INCREMENT_CENTS } from './version';

function moneyStep(step: NamedMoneyStep): BreakdownStep {
  return { label: step.label, value: formatMoney(step.cents / 100), detail: step.detail };
}

export function calculateJobEstimate(input: JobEstimateInput, datasets: JobDatasets): CalculationResult<JobEstimate> {
  const recipe = getRecipe(input.jobId);
  const location = locateJobZip(input.zip);
  if (!location) {
    throw new Error('Enter a five-digit ZIP that matches a ZCTA. PO-box-only ZIPs are not in this file.');
  }
  if (!Number.isFinite(input.units) || input.units <= 0) {
    throw new Error('Enter a quantity greater than zero.');
  }

  // Fuel, thickness, fence height, door/siding material, and equipment tons
  // live on modifiers. An empty overlay must not skip those scales.
  const scopedFactors = resolveJobScope(input.jobId, { units: input.units }, input.modifiers).materialFactors;
  const materialFactors = { ...scopedFactors, ...(input.materialFactors ?? {}) };
  const labor = priceLabor(recipe, input.units, datasets.wages, datasets.ecec);
  const materials = priceMaterials(recipe, input.units, datasets.basket, datasets.ppi, materialFactors);
  const equipment = priceEquipment(recipe, input.units, datasets.fema);
  const laborMaterialEquipment = labor.totalCents + materials.totalCents + equipment.totalCents;
  const disposal = priceDisposal(recipe.disposal);
  const permit = pricePermit(recipe.permit, laborMaterialEquipment);
  /*
   * Business cost applies to the work, not to the pass-throughs. A permit fee
   * and a dump ticket are the same number whoever files them; the census puts
   * licences and disposal in the overhead it already measures, so marking them
   * up here would charge for them twice.
   */
  const business = priceBusinessCost({
    recipe,
    jobId: input.jobId,
    directCents: laborMaterialEquipment,
    census: datasets.census,
  });
  const afterProfit = laborMaterialEquipment + business.overhead.cents + business.profit.cents;
  const contingencyCents = business.contingencyRate === null ? 0 : Math.round(afterProfit * business.contingencyRate);
  const contingency: NamedMoneyStep | null = business.contingencyRate === null
    ? null
    : { id: 'contingency', label: 'Contingency', cents: contingencyCents, detail: `${(business.contingencyRate * 100).toFixed(0)}% of the marked-up subtotal for unmodeled site variation.` };
  const passThroughCents = (disposal?.cents ?? 0) + (permit?.cents ?? 0);
  const beforeModifiers = afterProfit + contingencyCents + passThroughCents;
  const modifiers = applyModifiers(recipe, input.modifiers, beforeModifiers);
  const expectedCents = beforeModifiers + sumCents(modifiers.steps.map((step) => step.cents));

  const incomplete = materials.unpricedCritical.length > 0 || labor.missingWages.length > 0;
  const asOf = datasets.ecec?.fetchedAt.slice(0, 10) ?? datasets.ppi?.observationPeriod ?? '2026-09-07';
  const confidence = deriveConfidence({
    recipe,
    unpricedCritical: materials.unpricedCritical,
    unpricedNonCritical: materials.unpricedNonCritical,
    usedNationalFallback: labor.usedNationalFallback,
    missingWages: labor.missingWages,
    oldestBaselineDate: materials.oldestBaselineDate,
    extremeModifierCount: modifiers.extremeCount,
    businessCostObserved: business.source === 'census-observed',
    asOf,
  });
  confidence.reasons = [...new Set([...confidence.reasons, ...business.notes])];

  let range: JobEstimate['range'] = null;
  if (!incomplete && confidence.level) {
    const band = confidenceBand(confidence.level, modifiers.extremeCount);
    range = {
      lowCents: roundCentsToIncrement(Math.round(expectedCents * band.low), RANGE_DISPLAY_INCREMENT_CENTS),
      expectedCents,
      highCents: roundCentsToIncrement(Math.round(expectedCents * band.high), RANGE_DISPLAY_INCREMENT_CENTS),
    };
    if (range.lowCents > range.expectedCents) range.lowCents = roundCentsToIncrement(expectedCents, RANGE_DISPLAY_INCREMENT_CENTS);
    if (range.highCents < range.expectedCents) range.highCents = roundCentsToIncrement(expectedCents, RANGE_DISPLAY_INCREMENT_CENTS);
  }

  const completenessReasons = [
    ...materials.unpricedCritical.map((id) => `Critical material ${materialLabel(id)} has no sourced baseline price.`),
    ...labor.missingWages.map((role) => `No OEWS wage for ${role}.`),
    ...(equipment.missingRates.length > 0 ? [`FEMA cost-proxy rates missing for ${equipment.missingRates.join(', ')}.`] : []),
  ];
  if (recipe.permit.kind === 'excluded') completenessReasons.push(recipe.permit.note);
  if (recipe.disposal.kind === 'excluded') completenessReasons.push(recipe.disposal.note);
  if (datasets.rppAllItems != null && (datasets.rppAllItems < 90 || datasets.rppAllItems > 110)) {
    completenessReasons.push(`BEA RPP for this state is ${datasets.rppAllItems.toFixed(1)} (national = 100). It is context only and is not multiplied into materials.`);
  }

  const snapshotIds = [
    ...datasets.wages.map((row) => row.snapshotId),
    datasets.ecec?.snapshotId,
    datasets.ppi?.snapshotId,
    datasets.fema?.snapshotId,
    datasets.basket?.snapshotId,
    business.snapshotId,
  ].filter((id): id is string => Boolean(id));

  const estimate: JobEstimate = calibrate({
    jobId: recipe.jobId,
    jobTitle: JOB_CATALOG[recipe.jobId].title,
    status: incomplete ? 'incomplete' : 'complete',
    completenessReasons,
    unit: recipe.unit,
    units: input.units,
    location,
    range,
    rangeLabel: 'CostAnswer estimated range',
    confidence: incomplete ? null : confidence.level,
    confidenceReasons: confidence.reasons,
    labor: labor.steps,
    materials: materials.steps,
    equipment: equipment.steps,
    permit,
    disposal,
    overhead: business.overhead,
    profitMarkup: business.profit,
    contingency,
    businessCostSource: business.source,
    modifiers: modifiers.steps,
    unpricedCritical: materials.unpricedCritical,
    unpricedNonCritical: materials.unpricedNonCritical,
    femaProxyNote: FEMA_PROXY_NOTE,
    geographyNote: ZIP_ZCTA_PROVENANCE_LABEL,
    snapshotIds,
  }, []);

  const breakdown: BreakdownStep[] = [
    ...estimate.labor.map(moneyStep),
    ...estimate.materials.map(moneyStep),
    ...estimate.equipment.map(moneyStep),
    ...(estimate.permit ? [moneyStep(estimate.permit)] : []),
    ...(estimate.disposal ? [moneyStep(estimate.disposal)] : []),
    moneyStep(estimate.overhead),
    moneyStep(estimate.profitMarkup),
    ...(estimate.contingency ? [moneyStep(estimate.contingency)] : []),
    ...estimate.modifiers.map(moneyStep),
  ];

  const reconstruction = sumCents([
    ...estimate.labor.map((step) => step.cents),
    ...estimate.materials.map((step) => step.cents),
    ...estimate.equipment.map((step) => step.cents),
    estimate.permit?.cents ?? 0,
    estimate.disposal?.cents ?? 0,
    estimate.overhead.cents,
    estimate.profitMarkup.cents,
    estimate.contingency?.cents ?? 0,
    ...estimate.modifiers.map((step) => step.cents),
  ]);
  if (estimate.status === 'complete' && estimate.range && Math.abs(reconstruction - estimate.range.expectedCents) > 100) {
    throw new Error('Job breakdown does not sum to expected within $1.');
  }

  return {
    value: estimate,
    calculationVersion: JOB_ENGINE_ID,
    datasetSnapshotIds: snapshotIds,
    breakdown,
    assumptions: [
      estimate.geographyNote,
      estimate.femaProxyNote,
      business.source === 'census-observed'
        ? `Overhead and profit are the shares this trade reported across the ${datasets.census?.observationPeriod} Economic Census, applied to price rather than marked up on cost. ${datasets.census?.disclaimer ?? ''}`.trim()
        : 'Profit is a markup on cost, not a margin on the selling price.',
      ...estimate.completenessReasons,
    ],
  };
}
