'use client';

import { useMemo, useState } from 'react';
import {
  calculateFraction,
  calculatePercentChange,
  calculatePercentage,
} from '@/lib/calculations/math-tools';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

export function PercentageCalculator() {
  const [mode, setMode] = useState<'percent-of' | 'is-what-percent' | 'percent-of-what' | 'percent-off'>('percent-of');
  const [first, setFirst] = useState('15');
  const [second, setSecond] = useState('200');
  const calculation = useMemo(() => {
    try {
      return { result: calculatePercentage({ mode, first, second }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, first, second]);
  const labels = mode === 'percent-of'
    ? { first: 'Percent', second: 'Of this number', firstSuffix: '%', secondSuffix: '' }
    : mode === 'is-what-percent'
      ? { first: 'This amount', second: 'Is what percent of', firstSuffix: '', secondSuffix: '' }
      : mode === 'percent-of-what'
        ? { first: 'This amount', second: 'Is this percent of what', firstSuffix: '', secondSuffix: '%' }
        : { first: 'Discount percent', second: 'Original price', firstSuffix: '%', secondSuffix: '$' };

  return (
    <CalculatorPanel title="Percentage" intro="Common percent operations and discounts. Each stays a separate calculation." toolId="percentage" category="math" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${mode}|${first}|${second}`}>
      <div className="mode-tabs" role="group" aria-label="Percentage operation">
        <button type="button" aria-pressed={mode === 'percent-of'} className={mode === 'percent-of' ? 'active' : ''} onClick={() => setMode('percent-of')}>X% of Y</button>
        <button type="button" aria-pressed={mode === 'is-what-percent'} className={mode === 'is-what-percent' ? 'active' : ''} onClick={() => setMode('is-what-percent')}>X is what % of Y</button>
        <button type="button" aria-pressed={mode === 'percent-of-what'} className={mode === 'percent-of-what' ? 'active' : ''} onClick={() => setMode('percent-of-what')}>X is Y% of what</button>
        <button type="button" aria-pressed={mode === 'percent-off'} className={mode === 'percent-off' ? 'active' : ''} onClick={() => { setMode('percent-off'); setFirst('20'); setSecond('80'); }}>Percent off</button>
      </div>
      <div className="calc-form-grid">
        <Field label={labels.first} htmlFor="pct-first"><InputShell suffix={labels.firstSuffix || undefined}><input id="pct-first" type="number" step="0.01" inputMode="decimal" value={first} onChange={(event) => setFirst(event.target.value)} /></InputShell></Field>
        <Field label={labels.second} htmlFor="pct-second"><InputShell suffix={labels.secondSuffix || undefined}><input id="pct-second" type="number" step="0.01" inputMode="decimal" value={second} onChange={(event) => setSecond(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={mode === 'percent-off' ? 'Final sale price' : 'Result'}
            value={mode === 'percent-off' ? `$${calculation.result.value.result.toFixed(2)}` : String(calculation.result.value.result)}
            note={mode === 'percent-off' && calculation.result.value.amountSaved !== undefined ? `You save $${calculation.result.value.amountSaved.toFixed(2)}` : undefined}
            tone="violet"
          />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function PercentChangeCalculator() {
  const [oldValue, setOldValue] = useState('80');
  const [newValue, setNewValue] = useState('100');
  const calculation = useMemo(() => {
    try {
      return { result: calculatePercentChange({ oldValue, newValue }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [oldValue, newValue]);

  return (
    <CalculatorPanel title="Percent change" intro="How much a value rose or fell from an original baseline." toolId="percent-change" category="math" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${oldValue}|${newValue}`}>
      <div className="calc-form-grid">
        <Field label="Original value" htmlFor="pc-old"><InputShell><input id="pc-old" type="number" step="0.01" inputMode="decimal" value={oldValue} onChange={(event) => setOldValue(event.target.value)} /></InputShell></Field>
        <Field label="New value" htmlFor="pc-new"><InputShell><input id="pc-new" type="number" step="0.01" inputMode="decimal" value={newValue} onChange={(event) => setNewValue(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Percent change"
            value={`${calculation.result.value.percent}%`}
            note={calculation.result.value.direction === 'unchanged' ? 'No change' : calculation.result.value.direction}
            tone="violet"
          />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function FractionCalculator() {
  const [operation, setOperation] = useState<'add' | 'subtract' | 'multiply' | 'divide' | 'simplify'>('add');
  const [ln, setLn] = useState('1');
  const [ld, setLd] = useState('2');
  const [rn, setRn] = useState('1');
  const [rd, setRd] = useState('3');
  const calculation = useMemo(() => {
    try {
      return { result: calculateFraction({ operation, left: { numerator: ln, denominator: ld }, right: { numerator: rn, denominator: rd } }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [operation, ln, ld, rn, rd]);

  return (
    <CalculatorPanel title="Exact fractions" intro="Integer numerator and denominator arithmetic, then GCD simplification." toolId="fraction" category="math" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${operation}|${ln}|${ld}|${rn}|${rd}`}>
      <div className="mode-tabs" role="group" aria-label="Operation">
        {(['add', 'subtract', 'multiply', 'divide', 'simplify'] as const).map((item) => (
          <button type="button" key={item} aria-pressed={operation === item} className={operation === item ? 'active' : ''} onClick={() => setOperation(item)}>{item}</button>
        ))}
      </div>
      <div className="calc-form-grid">
        <Field label="Left numerator" htmlFor="frac-ln"><InputShell><input id="frac-ln" type="number" step="1" inputMode="numeric" value={ln} onChange={(event) => setLn(event.target.value)} /></InputShell></Field>
        <Field label="Left denominator" htmlFor="frac-ld"><InputShell><input id="frac-ld" type="number" step="1" inputMode="numeric" value={ld} onChange={(event) => setLd(event.target.value)} /></InputShell></Field>
        {operation !== 'simplify' && (
          <>
            <Field label="Right numerator" htmlFor="frac-rn"><InputShell><input id="frac-rn" type="number" step="1" inputMode="numeric" value={rn} onChange={(event) => setRn(event.target.value)} /></InputShell></Field>
            <Field label="Right denominator" htmlFor="frac-rd"><InputShell><input id="frac-rd" type="number" step="1" inputMode="numeric" value={rd} onChange={(event) => setRd(event.target.value)} /></InputShell></Field>
          </>
        )}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Exact result" value={`${calculation.result.value.numerator}/${calculation.result.value.denominator}`} note={calculation.result.value.mixed} tone="violet" />
          <StatGrid items={[{ label: 'Decimal', value: String(calculation.result.value.decimal) }]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
