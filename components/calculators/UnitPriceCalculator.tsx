'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateUnitPrices, UNIT_DEFINITIONS, type UnitId } from '@/lib/calculations/unit-price';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type PackageOption = { id: string; label: string; price: string; quantity: string; unit: UnitId };

const unitGroups: Array<{ label: string; units: UnitId[] }> = [
  { label: 'Weight', units: ['oz', 'lb', 'g', 'kg'] },
  { label: 'Volume', units: ['fl-oz', 'cup', 'pint', 'quart', 'gallon', 'ml', 'l'] },
  { label: 'Count', units: ['count'] },
];

export function UnitPriceCalculator() {
  const [packages, setPackages] = useState<PackageOption[]>([
    { id: 'a', label: 'Option A', price: '8.99', quantity: '24', unit: 'oz' },
    { id: 'b', label: 'Option B', price: '12.49', quantity: '2', unit: 'lb' },
  ]);

  useEffect(() => emitAnalyticsEvent('tool_opened', { toolId: 'unit-price', category: 'shopping' }), []);

  const updatePackage = (id: string, patch: Partial<PackageOption>) => {
    setPackages((current) => current.map((option) => option.id === id ? { ...option, ...patch } : option));
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

  return (
    <CalculatorPanel title="Put every package on equal terms" intro="Weight, volume and count stay separate so the comparison remains valid.">
      <div className="package-grid">
        {packages.map((option, index) => (
          <section className="package-card" key={option.id}>
            <p>OPTION {String.fromCharCode(65 + index)}</p>
            <Field label="Label" htmlFor={`package-${option.id}-label`}><span className="input-shell"><input id={`package-${option.id}-label`} value={option.label} maxLength={60} onChange={(event) => updatePackage(option.id, { label: event.target.value })} /></span></Field>
            <Field label="Package price" htmlFor={`package-${option.id}-price`}><InputShell prefix="$"><input id={`package-${option.id}-price`} type="number" min="0.01" step="0.01" value={option.price} onChange={(event) => updatePackage(option.id, { price: event.target.value })} /></InputShell></Field>
            <div className="quantity-unit-row">
              <Field label="Quantity" htmlFor={`package-${option.id}-quantity`}><span className="input-shell"><input id={`package-${option.id}-quantity`} type="number" min="0.0001" step="0.01" value={option.quantity} onChange={(event) => updatePackage(option.id, { quantity: event.target.value })} /></span></Field>
              <Field label="Unit" htmlFor={`package-${option.id}-unit`}><span className="input-shell select-shell"><select id={`package-${option.id}-unit`} value={option.unit} onChange={(event) => updatePackage(option.id, { unit: event.target.value as UnitId })}>{unitGroups.map((group) => <optgroup label={group.label} key={group.label}>{group.units.map((unit) => <option value={unit} key={unit}>{UNIT_DEFINITIONS[unit].label}</option>)}</optgroup>)}</select></span></Field>
            </div>
          </section>
        ))}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && winner && (
        <div className="calculation-output">
          <PrimaryResult label="Best unit price" value={winner.label} note={`${unitPriceLabel(winner.unitPrice, calculation.result.value.baseUnit)} · ${winner.savingsVsHighestPercent}% less than the higher unit price`} tone="violet" />
          <StatGrid items={calculation.result.value.ranked.map((option) => ({
            label: option.label,
            value: unitPriceLabel(option.unitPrice, calculation.result.value.baseUnit),
            note: option.id === calculation.result?.value.winnerId ? 'Lowest price per unit' : `${option.baseQuantity} ${calculation.result?.value.baseUnit} total`,
          }))} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
