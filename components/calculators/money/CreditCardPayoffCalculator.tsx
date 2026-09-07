'use client';

import { useMemo, useState } from 'react';
import { calculateCreditCardPayoff } from '@/lib/calculations/credit-card-payoff';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

export function CreditCardPayoffCalculator() {
  const [mode, setMode] = useState<'payment' | 'target-months'>('payment');
  const [balance, setBalance] = useState('4500');
  const [aprPercent, setAprPercent] = useState('21.99');
  const [monthlyPayment, setMonthlyPayment] = useState('150');
  const [targetMonths, setTargetMonths] = useState('18');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateCreditCardPayoff({
          mode,
          balance: Number(balance),
          aprPercent: Number(aprPercent),
          monthlyPayment: Number(monthlyPayment),
          targetMonths: Number(targetMonths),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, balance, aprPercent, monthlyPayment, targetMonths]);

  return (
    <CalculatorPanel title="Credit card payoff" intro="One revolving balance. For several debts, use Debt Payoff." toolId="credit-card-payoff" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([mode, balance, aprPercent, monthlyPayment, targetMonths])}>
      <div className="mode-tabs" role="group" aria-label="Payoff mode">
        <button type="button" aria-pressed={mode === 'payment'} className={mode === 'payment' ? 'active' : ''} onClick={() => setMode('payment')}>I know my payment</button>
        <button type="button" aria-pressed={mode === 'target-months'} className={mode === 'target-months' ? 'active' : ''} onClick={() => setMode('target-months')}>I have a target payoff time</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Balance" htmlFor="cc-bal"><InputShell prefix="$"><input id="cc-bal" type="number" min="0.01" step="50" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></InputShell></Field>
        <Field label="APR" htmlFor="cc-apr"><InputShell suffix="%"><input id="cc-apr" type="number" min="0" max="80" step="0.01" inputMode="decimal" value={aprPercent} onChange={(event) => setAprPercent(event.target.value)} /></InputShell></Field>
        {mode === 'payment' ? (
          <Field label="Monthly payment" htmlFor="cc-pay"><InputShell prefix="$"><input id="cc-pay" type="number" min="0" step="10" inputMode="decimal" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></InputShell></Field>
        ) : (
          <Field label="Target months" htmlFor="cc-months"><InputShell suffix="months"><input id="cc-months" type="number" min="1" max="600" step="1" inputMode="numeric" value={targetMonths} onChange={(event) => setTargetMonths(event.target.value)} /></InputShell></Field>
        )}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.status === 'paid-off' ? 'Months to payoff' : 'Payoff'}
            value={calculation.result.value.status === 'paid-off' ? `${calculation.result.value.months}` : 'Does not pay off'}
            note={calculation.result.value.status === 'paid-off' ? `${money(calculation.result.value.totalInterest)} interest` : calculation.result.value.stopReason?.replaceAll('-', ' ')}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Monthly payment', value: money(calculation.result.value.monthlyPayment) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest) },
            { label: 'Total paid', value: money(calculation.result.value.totalPaid) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
