import { usdaHouseholdSizeAdjustment, type UsdaFoodPlan, type UsdaFoodSnapshot } from '@/lib/data/usda-food';
import type { StateCode } from '@/lib/location/states';

export type FoodMember = { group: keyof UsdaFoodSnapshot['plans']['moderate-cost'] };

export function defaultFoodMembers(adults: number, children: number): FoodMember[] {
  if (!Number.isInteger(adults) || adults < 0 || !Number.isInteger(children) || children < 0) {
    throw new Error('Adults and children must be whole numbers of at least 0.');
  }
  if (adults + children < 1) throw new Error('Household must include at least one person.');
  if (adults + children > 12) throw new Error('This food plan model supports up to 12 people.');
  const members: FoodMember[] = [];
  for (let index = 0; index < adults; index += 1) {
    members.push({ group: index % 2 === 0 ? 'male_20_50' : 'female_20_50' });
  }
  for (let index = 0; index < children; index += 1) {
    members.push({ group: 'child_6_8' });
  }
  return members;
}

export function usdaFoodPlanMonthlyCost(input: {
  snapshot: UsdaFoodSnapshot;
  plan: UsdaFoodPlan;
  members: FoodMember[];
  state: StateCode | null;
}): { monthly: number; geographyLabel: string; adjustmentApplied: string | null } {
  if (input.members.length === 0) throw new Error('Food plan requires at least one person.');
  const table = input.snapshot.plans[input.plan];
  const unadjusted = input.members.reduce((sum, member) => sum + table[member.group], 0);
  const sized = unadjusted * usdaHouseholdSizeAdjustment(input.members.length, input.snapshot);
  let monthly = sized;
  let adjustmentApplied: string | null = null;
  let geographyLabel = 'USDA national food-at-home benchmark';
  if (input.plan === 'thrifty' && (input.state === 'AK' || input.state === 'HI')) {
    const refs = input.snapshot.alaskaHawaii.thriftyReferenceFamily;
    const ratio = input.state === 'AK' ? refs.anchorage / refs.contiguous : refs.hawaii / refs.contiguous;
    monthly = sized * ratio;
    adjustmentApplied = input.state === 'AK' ? 'thrifty-anchorage' : 'thrifty-hawaii';
    geographyLabel = input.state === 'AK'
      ? 'USDA Thrifty Food Plan with official Anchorage reference-family adjustment'
      : 'USDA Thrifty Food Plan with official Hawaii reference-family adjustment';
  }
  return { monthly, geographyLabel, adjustmentApplied };
}
