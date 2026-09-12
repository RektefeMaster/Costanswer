'use client';

import { useMemo, useState } from 'react';
import { calculateTip } from '@/lib/calculations/everyday';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { pluralize } from '@/lib/plural';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function TipCalculator() {
  const [billSubtotal, setBillSubtotal] = useState('100');
  const [tipPercent, setTipPercent] = useState('20');
  const [people, setPeople] = useState('1');
  const [taxAmount, setTaxAmount] = useState('0');

  const calculation = useMemo(() => {
    try {
      return { result: calculateTip({ billSubtotal, tipPercent, people, taxAmount }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [billSubtotal, tipPercent, people, taxAmount]);

  return (
    <CalculatorPanel title="Tip and split" intro="Tip on the subtotal, then split the total." toolId="tip" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([billSubtotal, tipPercent, people, taxAmount])}>
      <div className="calc-form-grid">
        <Field label="Bill subtotal" htmlFor="tip-bill"><InputShell prefix="$"><input id="tip-bill" type="number" min="0" step="1" inputMode="decimal" value={billSubtotal} onChange={(event) => setBillSubtotal(event.target.value)} /></InputShell></Field>
        <Field label="Tip" htmlFor="tip-percent"><InputShell suffix="%"><input id="tip-percent" type="number" min="0" max="100" step="1" inputMode="decimal" value={tipPercent} onChange={(event) => setTipPercent(event.target.value)} /></InputShell></Field>
        <Field label="People" htmlFor="tip-people"><InputShell><input id="tip-people" type="number" min="1" max="100" step="1" inputMode="numeric" value={people} onChange={(event) => setPeople(event.target.value)} /></InputShell></Field>
        <Field label="Tax" htmlFor="tip-tax" hint="Optional, added after tip"><InputShell prefix="$"><input id="tip-tax" type="number" min="0" step="0.01" inputMode="decimal" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Total" value={money(calculation.result.value.total)} note={`${money(calculation.result.value.tipAmount)} tip`} tone="rose" />
          <StatGrid items={[
            { label: 'Tip', value: money(calculation.result.value.tipAmount) },
            { label: 'Each person', value: money(calculation.result.value.perPerson), note: pluralize(calculation.result.value.people, 'person', 'people') },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
