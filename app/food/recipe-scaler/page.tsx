import { RecipeScaler } from '@/components/calculators/RecipeScaler';
import { ToolPage } from '@/components/tool/ToolPage';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('recipe-scaler');
export const metadata = toolMetadata(tool);

export default function RecipeScalerPage() {
  return (
    <ToolPage
      tool={tool}
      caution="Ingredient amounts scale mathematically, but pan size, mixing technique, cooking time and seasoning may not. For food safety, verify doneness with appropriate temperature guidance."
      methodology={[
        { title: 'Find one scale factor', body: 'Desired servings are divided by original servings. Every ingredient is multiplied by that same factor.' },
        { title: 'Accept kitchen-friendly input', body: 'Whole numbers, decimals, typed fractions and common fraction symbols are parsed into a numeric quantity.' },
        { title: 'Return useful fractions', body: 'The exact scaled amount is rounded to the nearest 1/16 for display. No ingredient-density conversion is invented.' },
      ]}
    >
      <RecipeScaler />
    </ToolPage>
  );
}

