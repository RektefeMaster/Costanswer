import { tools } from '@/lib/tool-registry';
import { EDUCATION_SHOPPING_FOOD_EDITORIAL } from './education-shopping-food';
import { EVERYDAY_EDITORIAL } from './everyday';
import { HEALTH_INSURANCE_EDITORIAL } from './health-insurance';
import { HEALTH_MATH_EDITORIAL } from './health-math';
import { HOME_CAR_EDITORIAL } from './home-car';
import { HOUSING_EDITORIAL } from './housing';
import { MARKETPLACE_PLANS_EDITORIAL } from './marketplace-plans';
import { INSURANCE_EDITORIAL } from './insurance';
import { PAY_EDITORIAL } from './pay';
import type { ToolEditorial } from './types';
import { WEALTH_EDITORIAL } from './wealth';

export type { EditorialFaq, EditorialGlossaryTerm, EditorialSection, ToolEditorial } from './types';

const ALL_EDITORIAL: ToolEditorial[] = [
  ...PAY_EDITORIAL,
  ...HOUSING_EDITORIAL,
  ...INSURANCE_EDITORIAL,
  ...HEALTH_INSURANCE_EDITORIAL,
  ...MARKETPLACE_PLANS_EDITORIAL,
  ...WEALTH_EDITORIAL,
  ...HOME_CAR_EDITORIAL,
  ...EVERYDAY_EDITORIAL,
  ...HEALTH_MATH_EDITORIAL,
  ...EDUCATION_SHOPPING_FOOD_EDITORIAL,
];

const editorialById = new Map(ALL_EDITORIAL.map((entry) => [entry.toolId, entry]));

function assertEditorialCoverage(): void {
  if (editorialById.size !== ALL_EDITORIAL.length) {
    throw new Error('Tool editorial registry contains duplicate tool IDs.');
  }
  for (const tool of tools) {
    if (!editorialById.has(tool.id)) {
      throw new Error(`Missing editorial content for tool ${tool.id}. Add a ToolEditorial in lib/tool-content/.`);
    }
  }
  for (const toolId of editorialById.keys()) {
    if (!tools.some((tool) => tool.id === toolId)) {
      throw new Error(`Editorial content references unknown tool ${toolId}.`);
    }
  }
}

assertEditorialCoverage();

export function getToolEditorial(toolId: string): ToolEditorial {
  const editorial = editorialById.get(toolId);
  if (!editorial) throw new Error(`Unknown tool editorial: ${toolId}`);
  return editorial;
}

export function listToolEditorial(): ToolEditorial[] {
  return tools.map((tool) => getToolEditorial(tool.id));
}
