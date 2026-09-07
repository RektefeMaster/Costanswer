'use client';

import { useMemo, useState } from 'react';
import { calculateScientific } from '@/lib/calculations/math-tools';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, PrimaryResult, ResultDetails } from '../CalculatorUI';

const KEYS: Array<{ label: string; insert?: string; action?: 'clear' | 'delete' | 'equals'; className?: string; name: string }> = [
  { label: 'C', action: 'clear', name: 'Clear' },
  { label: '⌫', action: 'delete', name: 'Delete' },
  { label: '(', insert: '(', name: 'Open parenthesis' },
  { label: ')', insert: ')', name: 'Close parenthesis' },
  { label: 'sin', insert: 'sin(', name: 'Sine' },
  { label: 'cos', insert: 'cos(', name: 'Cosine' },
  { label: 'tan', insert: 'tan(', name: 'Tangent' },
  { label: '÷', insert: '÷', className: 'key-op', name: 'Divide' },
  { label: '7', insert: '7', name: '7' },
  { label: '8', insert: '8', name: '8' },
  { label: '9', insert: '9', name: '9' },
  { label: '×', insert: '×', className: 'key-op', name: 'Multiply' },
  { label: '4', insert: '4', name: '4' },
  { label: '5', insert: '5', name: '5' },
  { label: '6', insert: '6', name: '6' },
  { label: '−', insert: '-', className: 'key-op', name: 'Subtract' },
  { label: '1', insert: '1', name: '1' },
  { label: '2', insert: '2', name: '2' },
  { label: '3', insert: '3', name: '3' },
  { label: '+', insert: '+', className: 'key-op', name: 'Add' },
  { label: '0', insert: '0', name: '0' },
  { label: '.', insert: '.', name: 'Decimal point' },
  { label: '^', insert: '^', className: 'key-op', name: 'Power' },
  { label: '=', action: 'equals', className: 'key-eq', name: 'Equals' },
  { label: 'sqrt', insert: 'sqrt(', name: 'Square root' },
  { label: 'ln', insert: 'ln(', name: 'Natural log' },
  { label: 'log', insert: 'log(', name: 'Log base 10' },
  { label: 'abs', insert: 'abs(', name: 'Absolute value' },
  { label: 'π', insert: 'π', name: 'Pi' },
  { label: 'e', insert: 'e', name: 'Euler constant' },
  { label: '!', insert: '!', className: 'key-op', name: 'Factorial' },
  { label: 'Ans', insert: '', action: 'equals', name: 'Result' },
];

export function ScientificCalculator() {
  const [expression, setExpression] = useState('2 + 3 × 4');
  const [angleMode, setAngleMode] = useState<'radians' | 'degrees'>('degrees');
  const calculation = useMemo(() => {
    try {
      return { result: calculateScientific({ expression, angleMode }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [expression, angleMode]);

  const applyKey = (key: (typeof KEYS)[number]) => {
    if (key.action === 'clear') {
      setExpression('');
      return;
    }
    if (key.action === 'delete') {
      setExpression((current) => current.slice(0, -1));
      return;
    }
    if (key.action === 'equals') {
      if (calculation.result) {
        setExpression(String(calculation.result.value.result));
      }
      return;
    }
    setExpression((current) => `${current}${key.insert ?? ''}`);
  };

  return (
    <CalculatorPanel title="Scientific calculator" intro="A bounded parser. It does not run JavaScript." toolId="scientific" category="math" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${expression}|${angleMode}`}>
      <div className="mode-tabs" role="group" aria-label="Angle mode">
        <button type="button" aria-pressed={angleMode === 'degrees'} className={angleMode === 'degrees' ? 'active' : ''} onClick={() => setAngleMode('degrees')}>Degrees (DEG)</button>
        <button type="button" aria-pressed={angleMode === 'radians'} className={angleMode === 'radians' ? 'active' : ''} onClick={() => setAngleMode('radians')}>Radians (RAD)</button>
      </div>
      <div className="expression-input">
        <Field label="Expression" htmlFor="sci-expression">
          <span className="input-shell">
            <input id="sci-expression" value={expression} onChange={(event) => setExpression(event.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="text" />
          </span>
        </Field>
      </div>
      <div className="scientific-keypad" role="group" aria-label="Calculator keypad">
        {KEYS.map((key) => (
          <button type="button" className={key.className} key={key.name} aria-label={key.name} onClick={() => applyKey(key)}>{key.label}</button>
        ))}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Result" value={String(calculation.result.value.result)} tone="violet" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
