import { dollarsToCents } from './money';
import type { EcecSnapshot, JobRecipe, NamedMoneyStep, OewsWageInput } from './types';

export const ECEC_DEFAULT_LOADING_FACTOR = 1.4;

export type LaborResult = {
  steps: NamedMoneyStep[];
  totalCents: number;
  loadingFactor: number;
  usedDefaultLoading: boolean;
  usedNationalFallback: boolean;
  missingWages: string[];
};

export function ececLoadingFactor(ecec: EcecSnapshot | null): { factor: number; usedDefault: boolean } {
  if (ecec && ecec.loadingFactor >= 1.25 && ecec.loadingFactor <= 1.65) {
    return { factor: ecec.loadingFactor, usedDefault: false };
  }
  return { factor: ECEC_DEFAULT_LOADING_FACTOR, usedDefault: true };
}

export function wageForSoc(wages: OewsWageInput[], socCode: string): OewsWageInput | undefined {
  return wages.find((row) => row.socCode === socCode);
}

/**
 * Direct labor burden is OEWS hourly × ECEC loading. Benefits are not also
 * added to overheadRate.
 */
export function priceLabor(
  recipe: JobRecipe,
  units: number,
  wages: OewsWageInput[],
  ecec: EcecSnapshot | null,
): LaborResult {
  const { factor, usedDefault } = ececLoadingFactor(ecec);
  const steps: NamedMoneyStep[] = [];
  const missingWages: string[] = [];
  let usedNationalFallback = false;
  let totalCents = 0;

  for (const member of recipe.crew) {
    const wage = wageForSoc(wages, member.socCode);
    if (!wage || wage.hourlyMedian == null || wage.hourlyMedian <= 0) {
      missingWages.push(member.role);
      continue;
    }
    if (wage.usedNationalFallback) usedNationalFallback = true;
    const hours = member.count.value * recipe.laborHoursPerUnit.value * units;
    const cents = dollarsToCents(hours * wage.hourlyMedian * factor);
    totalCents += cents;
    steps.push({
      id: `labor-${member.socCode}`,
      label: `Direct labor · ${member.role}`,
      cents,
      detail: `${hours.toFixed(1)} hours × $${wage.hourlyMedian.toFixed(2)}/hr × ${factor.toFixed(3)} ECEC loading (${wage.area} OEWS ${member.socCode})`,
    });
  }

  return { steps, totalCents, loadingFactor: factor, usedDefaultLoading: usedDefault, usedNationalFallback, missingWages };
}
