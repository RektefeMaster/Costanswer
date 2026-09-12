'use client';

import { useMemo, useState } from 'react';
import { calculateSimpleInterest } from '@/lib/calculations/simple-interest';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from '../CalculatorUI';
import { money } from '../finance-format';

export function SimpleInterestCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [annualRatePercent, setAnnualRatePercent] = useState('5');
  const [years, setYears] = useState('3');
  const calculation = useMemo(() => {
    try {
      return { result: calculateSimpleInterest({ principal, annualRatePercent, years }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, annualRatePercent, years]);

  return (
    <CalculatorPanel title="Simple interest" intro="Interest = principal × annual rate × time. No compounding." toolId="interest" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${principal}|${annualRatePercent}|${years}`}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="si-principal"><InputShell prefix="$"><input id="si-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Annual interest rate" htmlFor="si-rate"><InputShell suffix="%"><input id="si-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Time" htmlFor="si-years"><InputShell suffix="years"><input id="si-years" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Interest" value={money(calculation.result.value.interest)} note={`Ending ${money(calculation.result.value.endingAmount)}`} tone="mint" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
