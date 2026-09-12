'use client';

import { useMemo, useState } from 'react';
import { calculateMortgagePayoff } from '@/lib/calculations/mortgage-payoff';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { pluralize } from '@/lib/plural';
import { money } from '../finance-format';

export function MortgagePayoffCalculator() {
  const [currentPrincipal, setCurrentPrincipal] = useState('250000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [remainingMonths, setRemainingMonths] = useState('300');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('200');
  const [startDate, setStartDate] = useState('2026-09-01');
  const calculation = useMemo(() => {
    if (annualRatePercent.trim() === '') return { result: null, error: 'Interest rate must be a number. Use 0 for an interest-free loan.' };
    try {
      return {
        result: calculateMortgagePayoff({
          currentPrincipal,
          annualRatePercent,
          remainingMonths,
          extraMonthlyPayment,
          startDate,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentPrincipal, annualRatePercent, remainingMonths, extraMonthlyPayment, startDate]);

  return (
    <CalculatorPanel title="Mortgage payoff" intro="How extra principal changes remaining interest and the payoff date." toolId="mortgage-payoff" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentPrincipal, annualRatePercent, remainingMonths, extraMonthlyPayment, startDate])}>
      <div className="calc-form-grid">
        <Field label="Current principal" htmlFor="mp-bal"><InputShell prefix="$"><input id="mp-bal" type="number" min="1" step="1000" inputMode="decimal" value={currentPrincipal} onChange={(event) => setCurrentPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Interest rate" htmlFor="mp-rate"><InputShell suffix="%"><input id="mp-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Remaining term" htmlFor="mp-term"><InputShell suffix="months"><input id="mp-term" type="number" min="1" max="480" step="1" inputMode="numeric" value={remainingMonths} onChange={(event) => setRemainingMonths(event.target.value)} /></InputShell></Field>
        <Field label="Extra monthly principal" htmlFor="mp-extra"><InputShell prefix="$"><input id="mp-extra" type="number" min="0" step="25" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} /></InputShell></Field>
        <Field label="Next payment date" htmlFor="mp-start"><span className="input-shell"><input id="mp-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Pay off sooner by"
            value={`${pluralize(Math.floor(calculation.result.value.monthsSaved / 12), 'year', 'years')} ${pluralize(calculation.result.value.monthsSaved % 12, 'month', 'months')}`}
            note={calculation.result.value.acceleratedPayoffDate ? `Estimated payoff ${calculation.result.value.acceleratedPayoffDate}` : `${calculation.result.value.acceleratedMonths} remaining payments`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Scheduled P&I', value: money(calculation.result.value.scheduledPayment) },
            { label: 'Interest saved', value: money(calculation.result.value.interestSaved, 0) },
            { label: 'Baseline remaining interest', value: money(calculation.result.value.baselineInterest, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
