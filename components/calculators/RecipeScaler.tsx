'use client';

import { useMemo, useState } from 'react';
import { scaleRecipe } from '@/lib/calculations/recipe-scaler';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from './CalculatorUI';

type Ingredient = { id: string; name: string; quantity: string; unit: string };

export function RecipeScaler() {
  const [originalServings, setOriginalServings] = useState('4');
  const [desiredServings, setDesiredServings] = useState('6');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 'ingredient-1', name: 'Flour', quantity: '2', unit: 'cups' },
    { id: 'ingredient-2', name: 'Sugar', quantity: '3/4', unit: 'cup' },
    { id: 'ingredient-3', name: 'Eggs', quantity: '2', unit: '' },
  ]);

  const updateIngredient = (id: string, patch: Partial<Ingredient>) => {
    setIngredients((current) => current.map((ingredient) => ingredient.id === id ? { ...ingredient, ...patch } : ingredient));
  };

  const calculation = useMemo(() => {
    try {
      return { result: scaleRecipe({ originalServings: Number(originalServings), desiredServings: Number(desiredServings), ingredients }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [originalServings, desiredServings, ingredients]);

  const addIngredient = () => {
    const id = `ingredient-${crypto.randomUUID()}`;
    setIngredients((current) => [...current, { id, name: '', quantity: '1', unit: '' }].slice(0, 8));
  };

  return (
    <CalculatorPanel
      title="Scale the recipe"
      intro="Original servings and the servings you want. Fractions are fine. We round to the nearest 1/16."
      toolId="recipe-scaler"
      category="food"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([originalServings, desiredServings, ingredients])}
    >
      <div className="calc-form-grid compact-grid">
        <Field label="Original servings" htmlFor="original-servings"><InputShell suffix="servings"><input id="original-servings" type="number" min="0.1" step="1" value={originalServings} onChange={(event) => setOriginalServings(event.target.value)} /></InputShell></Field>
        <Field label="Desired servings" htmlFor="desired-servings"><InputShell suffix="servings"><input id="desired-servings" type="number" min="0.1" step="1" value={desiredServings} onChange={(event) => setDesiredServings(event.target.value)} /></InputShell></Field>
      </div>
      <div className="ingredient-editor" role="group" aria-label="Recipe ingredients">
        <div className="ingredient-head" aria-hidden="true"><span>Ingredient</span><span>Quantity</span><span>Unit</span><span /></div>
        {ingredients.map((ingredient, index) => (
          <div className="ingredient-row" key={ingredient.id}>
            <label><span className="sr-only">Ingredient {index + 1} name</span><span className="ingredient-mobile-label" aria-hidden="true">Ingredient</span><input value={ingredient.name} placeholder="Ingredient name" onChange={(event) => updateIngredient(ingredient.id, { name: event.target.value })} /></label>
            <label><span className="sr-only">Ingredient {index + 1} quantity</span><span className="ingredient-mobile-label" aria-hidden="true">Quantity</span><input value={ingredient.quantity} placeholder="1 1/2" onChange={(event) => updateIngredient(ingredient.id, { quantity: event.target.value })} /></label>
            <label><span className="sr-only">Ingredient {index + 1} unit</span><span className="ingredient-mobile-label" aria-hidden="true">Unit</span><input value={ingredient.unit} placeholder="cups" onChange={(event) => updateIngredient(ingredient.id, { unit: event.target.value })} /></label>
            <button type="button" aria-label={`Remove ${ingredient.name || `ingredient ${index + 1}`}`} disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((item) => item.id !== ingredient.id))}>×</button>
          </div>
        ))}
        {ingredients.length < 8 && <button className="add-row-button" type="button" onClick={addIngredient}>+ Add an ingredient</button>}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Scale factor" value={`${calculation.result.value.scaleFactor}×`} note={`${originalServings} servings → ${desiredServings} servings`} tone="coral" />
          <div className="scaled-ingredients">
            {calculation.result.value.ingredients.map((ingredient) => (
              <div key={ingredient.id}><strong>{ingredient.displayQuantity}{ingredient.unit ? ` ${ingredient.unit}` : ''}</strong><span>{ingredient.name}</span></div>
            ))}
          </div>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
