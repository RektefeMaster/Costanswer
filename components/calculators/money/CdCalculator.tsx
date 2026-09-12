'use client';

import { useMemo, useState } from 'react';
import { calculateCd } from '@/lib/calculations/cd';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from '../CalculatorUI';
import { money } from '../finance-format';

export function CdCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [apyPercent, setApyPercent] = useState('5');
  const [years, setYears] = useState('1');
  const calculation = useMemo(() => {
    try {
      return { result: calculateCd({ principal, apyPercent, years }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, apyPercent, years]);

  return (
    <CalculatorPanel title="Certificate of deposit" intro="Growth from the APY you type. Not a live bank rate." toolId="cd" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${principal}|${apyPercent}|${years}`}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="cd-principal"><InputShell prefix="$"><input id="cd-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="APY" htmlFor="cd-apy" hint="Annual percentage yield"><InputShell suffix="%"><input id="cd-apy" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={apyPercent} onChange={(event) => setApyPercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="cd-years"><InputShell suffix="years"><input id="cd-years" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Ending balance" value={money(calculation.result.value.endingBalance)} note={`${money(calculation.result.value.interestEarned)} interest`} tone="mint" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
