'use client';

import { useMemo, useState } from 'react';
import { calculateAmortization } from '@/lib/calculations/amortization';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { pluralize } from '@/lib/plural';
import { money } from '../finance-format';

export function AmortizationCalculator() {
  const [principal, setPrincipal] = useState('200000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [termMonths, setTermMonths] = useState('360');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('0');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [showAll, setShowAll] = useState(false);
  const calculation = useMemo(() => {
    try {
      return { result: calculateAmortization({ principal, annualRatePercent, termMonths, extraMonthlyPayment, startDate }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, annualRatePercent, termMonths, extraMonthlyPayment, startDate]);
  const rows = calculation.result ? (showAll ? calculation.result.value.schedule : calculation.result.value.schedule.slice(0, 12)) : [];

  return (
    <CalculatorPanel title="Amortization schedule" intro="Principal versus interest over time, using the same engine as the Loan Calculator." toolId="amortization" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([principal, annualRatePercent, termMonths, extraMonthlyPayment, startDate])}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="am-principal"><InputShell prefix="$"><input id="am-principal" type="number" min="1" step="1000" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Interest rate" htmlFor="am-rate"><InputShell suffix="%"><input id="am-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="am-term"><InputShell suffix="months"><input id="am-term" type="number" min="1" max="480" step="1" inputMode="numeric" value={termMonths} onChange={(event) => setTermMonths(event.target.value)} /></InputShell></Field>
        <Field label="Extra monthly principal" htmlFor="am-extra"><InputShell prefix="$"><input id="am-extra" type="number" min="0" step="25" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} /></InputShell></Field>
        <Field label="First payment date" htmlFor="am-start"><span className="input-shell"><input id="am-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Monthly payment" value={money(calculation.result.value.monthlyPayment)} note={pluralize(calculation.result.value.actualPeriods, 'payment', 'payments')} tone="mint" />
          <StatGrid items={[
            { label: 'Total principal', value: money(calculation.result.value.totalPrincipal, 0) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0) },
          ]} />
          <div className="schedule-scroll">
            <table>
              <caption className="sr-only">Amortization schedule</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Date</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Principal</th>
                  <th scope="col">Interest</th>
                  <th scope="col">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.date ?? 'n/a'}</td>
                    <td>{money(row.payment)}</td>
                    <td>{money(row.principal)}</td>
                    <td>{money(row.interest)}</td>
                    <td>{money(row.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {calculation.result.value.schedule.length > 12 && (
            <div className="schedule-toggle">
              <button type="button" className="add-row-button" onClick={() => setShowAll((current) => !current)}>
                {showAll ? 'Show first 12 payments' : `Show all ${pluralize(calculation.result.value.schedule.length, 'payment', 'payments')}`}
              </button>
            </div>
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
