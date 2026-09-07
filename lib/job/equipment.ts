import type { FemaEquipmentSnapshot, JobRecipe, NamedMoneyStep } from './types';

export const FEMA_PROXY_NOTE =
  'FEMA Schedule of Equipment Rates is a public cost proxy for ownership and operating cost, not a contractor market rental price.';

export type EquipmentResult = {
  steps: NamedMoneyStep[];
  totalCents: number;
  missingRates: string[];
};

export function priceEquipment(
  recipe: JobRecipe,
  units: number,
  fema: FemaEquipmentSnapshot | null,
): EquipmentResult {
  const byId = new Map((fema?.rates ?? []).map((rate) => [rate.rateId, rate]));
  const steps: NamedMoneyStep[] = [];
  const missingRates: string[] = [];
  let totalCents = 0;

  for (const line of recipe.equipment) {
    const rate = byId.get(line.rateId);
    if (!rate || rate.rateCents <= 0) {
      missingRates.push(line.rateId);
      continue;
    }
    const hours = line.hoursPerUnit.value * units;
    const cents = Math.round(hours * rate.rateCents);
    totalCents += cents;
    steps.push({
      id: `equipment-${line.rateId}`,
      label: `Equipment cost proxy · ${line.label}`,
      cents,
      detail: `${hours.toFixed(1)} ${rate.unit} × FEMA ${line.rateId} at $${(rate.rateCents / 100).toFixed(2)}/${rate.unit}. ${FEMA_PROXY_NOTE}`,
    });
  }

  return { steps, totalCents, missingRates };
}
