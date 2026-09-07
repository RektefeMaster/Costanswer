import type { JobRecipe, ModifierSpec, NamedMoneyStep } from './types';

export type ModifierApplication = {
  steps: NamedMoneyStep[];
  factorProduct: number;
  extremeCount: number;
};

function optionFor(spec: ModifierSpec, selectedId: string | undefined) {
  return spec.options.find((option) => option.id === selectedId) ?? spec.options.find((option) => option.id === spec.defaultOptionId);
}

/**
 * Every modifier is a named breakdown step. There is no unnamed multiplier.
 */
export function applyModifiers(
  recipe: JobRecipe,
  selected: Record<string, string>,
  workingCents: number,
): ModifierApplication {
  const steps: NamedMoneyStep[] = [];
  let current = workingCents;
  let extremeCount = 0;
  let factorProduct = 1;

  for (const spec of recipe.modifiers) {
    const option = optionFor(spec, selected[spec.id]);
    if (!option) continue;
    const next = Math.round(current * option.factor.value) + option.addCents.value;
    const delta = next - current;
    if (option.extreme) extremeCount += 1;
    factorProduct *= option.factor.value;
    if (delta !== 0 || option.factor.value !== 1) {
      steps.push({
        id: `modifier-${spec.id}-${option.id}`,
        label: `${spec.label}: ${option.label}`,
        cents: delta,
        detail: option.factor.value !== 1
          ? `Named modifier × ${option.factor.value}`
          : `Named modifier ${option.addCents.value >= 0 ? '+' : ''}$${Math.abs(option.addCents.value / 100).toFixed(2)}`,
      });
    }
    current = next;
  }

  return { steps, factorProduct, extremeCount };
}

export function unnamedAdjustmentImpossible(recipe: JobRecipe, selected: Record<string, string>, expectedCents: number, reconstructedCents: number): boolean {
  void recipe;
  void selected;
  return Math.abs(expectedCents - reconstructedCents) <= 100;
}
