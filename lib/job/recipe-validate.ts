import type { JobRecipe, RecipeSource, SourcedValue } from './types';

function sourcedValueIds(value: SourcedValue<unknown>, path: string, missing: string[]): string[] {
  if (!value.sourceId) missing.push(`${path} has no sourceId`);
  return [value.sourceId];
}

function sourceKind(_source: RecipeSource): void {
  switch (_source.kind) {
    case 'official_data':
    case 'published_specification':
    case 'observed_market':
    case 'model_transformation':
    case 'model_assumption':
      return;
    default: {
      const exhaustive: never = _source;
      throw new Error(`Unhandled recipe source kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function validateRecipe(recipe: JobRecipe): void {
  const missing: string[] = [];
  const ids = new Set<string>();
  const add = (value: SourcedValue<unknown>, path: string) => {
    for (const id of sourcedValueIds(value, path, missing)) ids.add(id);
  };

  add(recipe.laborHoursPerUnit, 'laborHoursPerUnit');
  add(recipe.overheadRate, 'overheadRate');
  add(recipe.profitMarkupRate, 'profitMarkupRate');
  add(recipe.contingencyRate, 'contingencyRate');
  for (const [index, member] of recipe.crew.entries()) add(member.count, `crew[${index}].count`);
  for (const [index, line] of recipe.materials.entries()) {
    add(line.quantityPerUnit, `materials[${index}].quantityPerUnit`);
    add(line.wastePercent, `materials[${index}].wastePercent`);
  }
  for (const [index, line] of recipe.equipment.entries()) add(line.hoursPerUnit, `equipment[${index}].hoursPerUnit`);
  switch (recipe.permit.kind) {
    case 'excluded':
      break;
    case 'flat':
      add(recipe.permit.amountCents, 'permit.amountCents');
      break;
    case 'percent_of_direct':
      add(recipe.permit.rate, 'permit.rate');
      break;
    default: {
      const exhaustive: never = recipe.permit;
      throw new Error(`Unhandled permit rule: ${JSON.stringify(exhaustive)}`);
    }
  }
  switch (recipe.disposal.kind) {
    case 'excluded':
      break;
    case 'flat':
      add(recipe.disposal.amountCents, 'disposal.amountCents');
      break;
    default: {
      const exhaustive: never = recipe.disposal;
      throw new Error(`Unhandled disposal rule: ${JSON.stringify(exhaustive)}`);
    }
  }
  if (recipe.modifiers.length > 4) missing.push('A recipe may name at most 4 modifiers.');
  for (const modifier of recipe.modifiers) {
    if (!modifier.options.some((option) => option.id === modifier.defaultOptionId)) {
      missing.push(`Modifier ${modifier.id} is missing its default option.`);
    }
    for (const option of modifier.options) {
      add(option.factor, `modifier.${modifier.id}.${option.id}.factor`);
      add(option.addCents, `modifier.${modifier.id}.${option.id}.addCents`);
    }
  }

  for (const source of Object.values(recipe.sources)) sourceKind(source);
  for (const id of ids) {
    if (id && !recipe.sources[id]) missing.push(`sourceId "${id}" is not in sources`);
  }
  if (recipe.profitMarkupRate.value < 0 || recipe.profitMarkupRate.value > 1) {
    missing.push('profitMarkupRate must be a markup fraction, not a margin.');
  }
  if (missing.length > 0) throw new Error(`Recipe ${recipe.jobId} failed validation: ${missing.join('; ')}`);
}
