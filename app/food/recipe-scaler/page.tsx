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
      caution="The amounts scale with the math. Pan size, mixing, cook time, and seasoning might not. Use a thermometer when food safety depends on it."
      methodology={[
        { title: 'One scale factor', body: 'Desired servings divided by original servings. Every ingredient is multiplied by that same factor.' },
        { title: 'Kitchen amounts', body: 'Whole numbers, decimals, typed fractions, and common fraction symbols all work.' },
        { title: 'Fractions', body: 'The scaled amount rounds to the nearest 1/16. Cups are not turned into ounces.' },
      ]}
    >
      <RecipeScaler />
    </ToolPage>
  );
}

