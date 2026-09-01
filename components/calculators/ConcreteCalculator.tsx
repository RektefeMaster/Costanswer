'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateConcrete } from '@/lib/calculations/concrete';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

export function ConcreteCalculator() {
  const [length, setLength] = useState('10');
  const [width, setWidth] = useState('10');
  const [thickness, setThickness] = useState('4');
  const [waste, setWaste] = useState('10');
  const [bagWeight, setBagWeight] = useState<60 | 80>(80);
  const [pricePerBag, setPricePerBag] = useState('');

  useEffect(() => emitAnalyticsEvent('tool_opened', { toolId: 'concrete', category: 'home' }), []);

  const calculation = useMemo(() => {
    try {
      return { result: calculateConcrete({
        lengthFeet: Number(length), widthFeet: Number(width), thicknessInches: Number(thickness),
        wastePercent: Number(waste), bagWeight,
        ...(pricePerBag.trim() === '' ? {} : { pricePerBag: Number(pricePerBag) }),
      }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [length, width, thickness, waste, bagWeight, pricePerBag]);

  return (
    <CalculatorPanel title="Measure a rectangular slab" intro="The result separates measured volume from a practical purchase range.">
      <div className="calc-form-grid three-up">
        <Field label="Length" htmlFor="concrete-length"><InputShell suffix="ft"><input id="concrete-length" type="number" min="0.1" step="0.5" value={length} onChange={(event) => setLength(event.target.value)} /></InputShell></Field>
        <Field label="Width" htmlFor="concrete-width"><InputShell suffix="ft"><input id="concrete-width" type="number" min="0.1" step="0.5" value={width} onChange={(event) => setWidth(event.target.value)} /></InputShell></Field>
        <Field label="Thickness" htmlFor="concrete-thickness"><InputShell suffix="in"><input id="concrete-thickness" type="number" min="0.5" step="0.5" value={thickness} onChange={(event) => setThickness(event.target.value)} /></InputShell></Field>
        <Field label="Waste allowance" htmlFor="concrete-waste" hint="10% is an editable planning assumption"><InputShell suffix="%"><input id="concrete-waste" type="number" min="0" max="30" step="1" value={waste} onChange={(event) => setWaste(event.target.value)} /></InputShell></Field>
        <Field label="Bag size" htmlFor="concrete-bag"><span className="input-shell select-shell"><select id="concrete-bag" value={bagWeight} onChange={(event) => setBagWeight(Number(event.target.value) as 60 | 80)}><option value="80">80 lb bag</option><option value="60">60 lb bag</option></select></span></Field>
        <Field label="Price per bag (optional)" htmlFor="concrete-price"><InputShell prefix="$"><input id="concrete-price" type="number" min="0" step="0.01" placeholder="Enter store price" value={pricePerBag} onChange={(event) => setPricePerBag(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Plan to buy" value={`${calculation.result.value.typicalBags} × ${bagWeight} lb bags`} note={`Range: ${calculation.result.value.lowBags}–${calculation.result.value.highBags} bags`} tone="amber" />
          <StatGrid items={[
            { label: 'Measured volume', value: `${calculation.result.value.exactCubicYards} yd³`, note: 'Before waste' },
            { label: 'Planning volume', value: `${calculation.result.value.typicalCubicYards} yd³`, note: `Includes ${waste}%` },
            { label: 'Material subtotal', value: calculation.result.value.typicalMaterialCost === undefined ? 'Add a price' : calculation.result.value.typicalMaterialCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), note: 'Materials only' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
