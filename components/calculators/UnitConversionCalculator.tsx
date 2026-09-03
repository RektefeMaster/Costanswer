'use client';

import { useMemo, useState } from 'react';
import {
  calculateUnitConversion,
  CONVERSION_CATEGORIES,
  unitsForCategory,
  type ConversionCategory,
} from '@/lib/calculations/unit-conversion';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from './CalculatorUI';

export function UnitConversionCalculator() {
  const [category, setCategory] = useState<ConversionCategory>('length');
  const units = unitsForCategory(category);
  const [fromUnit, setFromUnit] = useState(units[0].id);
  const [toUnit, setToUnit] = useState(units[1]?.id ?? units[0].id);
  const [value, setValue] = useState('1');

  const setCategoryAndUnits = (next: ConversionCategory) => {
    const nextUnits = unitsForCategory(next);
    setCategory(next);
    setFromUnit(nextUnits[0].id);
    setToUnit(nextUnits[1]?.id ?? nextUnits[0].id);
  };

  const calculation = useMemo(() => {
    try {
      return { result: calculateUnitConversion({ category, fromUnit, toUnit, value: Number(value) }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [category, fromUnit, toUnit, value]);

  return (
    <CalculatorPanel title="Unit conversion" intro="Convert through a canonical base unit. Temperature uses Kelvin, not a scale factor." toolId="unit-conversion" category="math" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${category}|${fromUnit}|${toUnit}|${value}`}>
      <div className="calc-form-grid">
        <Field label="Category" htmlFor="conv-cat">
          <span className="input-shell select-shell">
            <select id="conv-cat" value={category} onChange={(event) => setCategoryAndUnits(event.target.value as ConversionCategory)}>
              {CONVERSION_CATEGORIES.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Value" htmlFor="conv-value"><InputShell><input id="conv-value" type="number" step="any" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} /></InputShell></Field>
      </div>
      <div className="conversion-pair">
        <Field label="From" htmlFor="conv-from">
          <span className="input-shell select-shell">
            <select id="conv-from" value={fromUnit} onChange={(event) => setFromUnit(event.target.value)}>
              {units.map((unit) => <option value={unit.id} key={unit.id}>{unit.label} ({unit.symbol})</option>)}
            </select>
          </span>
        </Field>
        <button type="button" className="conversion-swap" aria-label="Swap units" onClick={() => { setFromUnit(toUnit); setToUnit(fromUnit); }}>⇄</button>
        <Field label="To" htmlFor="conv-to">
          <span className="input-shell select-shell">
            <select id="conv-to" value={toUnit} onChange={(event) => setToUnit(event.target.value)}>
              {units.map((unit) => <option value={unit.id} key={`to-${unit.id}`}>{unit.label} ({unit.symbol})</option>)}
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Converted value"
            value={`${calculation.result.value.output} ${calculation.result.value.toSymbol}`}
            note={`${value} ${calculation.result.value.fromSymbol}`}
            tone="violet"
          />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
