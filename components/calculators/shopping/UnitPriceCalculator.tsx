'use client';

import { useMemo, useState } from 'react';
import { calculateUnitPrices, UNIT_DEFINITIONS, type UnitId } from '@/lib/calculations/unit-price';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

type PackageOption = { id: string; label: string; price: string; quantity: string; unit: UnitId };

const unitGroups: Array<{ label: string; units: UnitId[] }> = [
  { label: 'Weight', units: ['oz', 'lb', 'g', 'kg'] },
  { label: 'Volume', units: ['fl-oz', 'tbsp', 'cup', 'pint', 'quart', 'gallon', 'ml', 'l'] },
  { label: 'Count', units: ['count'] },
];

export function UnitPriceCalculator() {
  const [packages, setPackages] = useState<PackageOption[]>([
    { id: 'a', label: 'Option A', price: '8.99', quantity: '24', unit: 'oz' },
    { id: 'b', label: 'Option B', price: '12.49', quantity: '2', unit: 'lb' },
  ]);

  const updatePackage = (id: string, patch: Partial<PackageOption>) => {
    setPackages((current) => current.map((option) => option.id === id ? { ...option, ...patch } : option));
  };

  const addPackage = () => {
    if (packages.length >= 6) return;
    const nextLetter = String.fromCharCode(65 + packages.length);
    const nextId = nextLetter.toLowerCase();
    const prevUnit = packages[packages.length - 1]?.unit ?? 'oz';
    setPackages((current) => [
      ...current,
      { id: nextId, label: `Option ${nextLetter}`, price: '10.99', quantity: '16', unit: prevUnit },
    ]);
  };

  const removePackage = (id: string) => {
    if (packages.length <= 2) return;
    setPackages((current) => current.filter((option) => option.id !== id));
  };

  const calculation = useMemo(() => {
    try {
      return { result: calculateUnitPrices({ options: packages.map((option) => ({ ...option, price: Number(option.price), quantity: Number(option.quantity) })) }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [packages]);

  const winner = calculation.result?.value.ranked[0];
  const unitPriceLabel = (price: number, unit: string) => `$${price.toFixed(price < 0.1 ? 4 : 2)} / ${unit}`;
  const savingsLabel = (value: number) => value > 0 && value < 0.1 ? '<0.1%' : `${value}%`;
  const winningOptions = calculation.result?.value.ranked.filter((option) => calculation.result?.value.winnerIds.includes(option.id)) ?? [];

  return (
    <CalculatorPanel
      title="Which pack is cheaper?"
      intro="Works even if one label says ounces and the other says pounds."
      toolId="unit-price"
      category="shopping"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify(packages)}
    >
      <div className="package-grid">
        {packages.map((option, index) => (
          <section className="package-card" role="group" key={option.id} aria-labelledby={`package-${option.id}-heading`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p id={`package-${option.id}-heading`}>OPTION {String.fromCharCode(65 + index)}</p>
              {packages.length > 2 && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}
                  aria-label={`Remove Option ${String.fromCharCode(65 + index)}`}
                  onClick={() => removePackage(option.id)}
                >
                  ×
                </button>
              )}
            </div>
            <Field label="Label" htmlFor={`package-${option.id}-label`}><span className="input-shell"><input aria-label={`Option ${String.fromCharCode(65 + index)} label`} id={`package-${option.id}-label`} value={option.label} maxLength={60} onChange={(event) => updatePackage(option.id, { label: event.target.value })} /></span></Field>
            <Field label="Package price" htmlFor={`package-${option.id}-price`}><InputShell prefix="$"><input aria-label={`Option ${String.fromCharCode(65 + index)} package price`} id={`package-${option.id}-price`} type="number" min="0.01" step="0.01" value={option.price} onChange={(event) => updatePackage(option.id, { price: event.target.value })} /></InputShell></Field>
            <div className="quantity-unit-row">
              <Field label="Quantity" htmlFor={`package-${option.id}-quantity`}><InputShell><input aria-label={`Option ${String.fromCharCode(65 + index)} quantity`} id={`package-${option.id}-quantity`} type="number" min="0.0001" step="0.01" value={option.quantity} onChange={(event) => updatePackage(option.id, { quantity: event.target.value })} /></InputShell></Field>
              <Field label="Unit" htmlFor={`package-${option.id}-unit`}><span className="input-shell select-shell"><select aria-label={`Option ${String.fromCharCode(65 + index)} unit`} id={`package-${option.id}-unit`} value={option.unit} onChange={(event) => updatePackage(option.id, { unit: event.target.value as UnitId })}>{unitGroups.map((group) => <optgroup label={group.label} key={group.label}>{group.units.map((unit) => <option value={unit} key={unit}>{UNIT_DEFINITIONS[unit].label}</option>)}</optgroup>)}</select></span></Field>
            </div>
          </section>
        ))}
      </div>
      {packages.length < 6 && (
        <div style={{ marginTop: '0.75rem' }}>
          <button className="add-row-button" type="button" onClick={addPackage}>+ Add another package option</button>
        </div>
      )}
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && winner && (
        <div className="calculation-output">
          <PrimaryResult
            label={winningOptions.length > 1 ? 'Same lowest unit price' : 'Best unit price'}
            value={winningOptions.length > 1 ? winningOptions.map((option) => option.label).join(' & ') : winner.label}
            note={winningOptions.length > 1
              ? `${unitPriceLabel(winner.unitPrice, calculation.result.value.baseUnit)} for each tied option`
              : `${unitPriceLabel(winner.unitPrice, calculation.result.value.baseUnit)} · ${savingsLabel(winner.savingsVsHighestPercent)} less than highest price`}
            tone="violet"
          />
          <StatGrid items={calculation.result.value.ranked.map((option) => ({
            label: option.label,
            value: unitPriceLabel(option.unitPrice, calculation.result.value.baseUnit),
            note: calculation.result?.value.winnerIds.includes(option.id) ? 'Lowest price per unit' : `${option.baseQuantity} ${calculation.result?.value.baseUnit} total`,
          }))} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
