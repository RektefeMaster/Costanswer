'use client';

import { useMemo, useState } from 'react';
import { calculateDebtPayoff, formatPayoffDuration, MAX_DEBT_ACCOUNTS } from '@/lib/calculations/debt-payoff';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type DebtRow = {
  id: string;
  label: string;
  balance: string;
  annualRatePercent: string;
  minimumPayment: string;
};

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function newDebtId(): string {
  return `debt-${crypto.randomUUID()}`;
}

export function DebtPayoffCalculator() {
  const [additionalMonthlyPayment, setAdditionalMonthlyPayment] = useState('100');
  const [debts, setDebts] = useState<DebtRow[]>([
    { id: 'debt-loan', label: 'Personal loan', balance: '3500', annualRatePercent: '7.5', minimumPayment: '110' },
    { id: 'debt-card', label: 'Credit card', balance: '6500', annualRatePercent: '21.99', minimumPayment: '160' },
  ]);

  const updateDebt = (id: string, patch: Partial<DebtRow>) => {
    setDebts((current) => current.map((debt) => debt.id === id ? { ...debt, ...patch } : debt));
  };

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateDebtPayoff({
          additionalMonthlyPayment: Number(additionalMonthlyPayment),
          debts: debts.map((debt) => ({
            id: debt.id,
            label: debt.label,
            balance: Number(debt.balance),
            annualRatePercent: Number(debt.annualRatePercent),
            minimumPayment: Number(debt.minimumPayment),
          })),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [additionalMonthlyPayment, debts]);

  const comparisonNote = calculation.result
    ? !calculation.result.value.bothPaidOff
      ? 'One or both methods do not pay these debts off inside the safety limit.'
      : calculation.result.value.interestDifference > 0
        ? `Avalanche saves ${money(calculation.result.value.interestDifference)} of interest versus snowball.`
        : calculation.result.value.interestDifference < 0
          ? `Snowball saves ${money(Math.abs(calculation.result.value.interestDifference))} of interest versus avalanche.`
          : 'Both orders cost the same interest on these numbers.'
    : '';

  return (
    <CalculatorPanel
      title="Snowball vs avalanche"
      intro="Same debts, two payoff orders. Extra money stays in the monthly budget after a debt is gone."
      toolId="debt-payoff"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([additionalMonthlyPayment, debts])}
    >
      <div className="calc-form-grid compact-grid">
        <Field label="Additional monthly payment" htmlFor="debt-extra" hint="On top of the minimums. This amount keeps going after a debt is paid off.">
          <InputShell prefix="$">
            <input id="debt-extra" type="number" min="0" step="25" inputMode="decimal" value={additionalMonthlyPayment} onChange={(event) => setAdditionalMonthlyPayment(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      <div className="ingredient-editor debt-editor" role="group" aria-label="Debts">
        <div className="ingredient-head" aria-hidden="true">
          <span>Name</span>
          <span>Balance</span>
          <span>Rate</span>
          <span>Minimum</span>
          <span />
        </div>
        {debts.map((debt, index) => (
          <div className="ingredient-row" key={debt.id}>
            <label>
              <span className="sr-only">Debt {index + 1} name</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Name</span>
              <input value={debt.label} placeholder="Debt name" onChange={(event) => updateDebt(debt.id, { label: event.target.value })} />
            </label>
            <label>
              <span className="sr-only">Debt {index + 1} balance</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Balance</span>
              <input id={index === 0 ? 'debt-balance-0' : undefined} type="number" min="0.01" step="50" inputMode="decimal" value={debt.balance} onChange={(event) => updateDebt(debt.id, { balance: event.target.value })} />
            </label>
            <label>
              <span className="sr-only">Debt {index + 1} interest rate</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Rate %</span>
              <input type="number" min="0" max="80" step="0.01" inputMode="decimal" value={debt.annualRatePercent} onChange={(event) => updateDebt(debt.id, { annualRatePercent: event.target.value })} />
            </label>
            <label>
              <span className="sr-only">Debt {index + 1} minimum payment</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Minimum</span>
              <input type="number" min="0" step="10" inputMode="decimal" value={debt.minimumPayment} onChange={(event) => updateDebt(debt.id, { minimumPayment: event.target.value })} />
            </label>
            <button type="button" aria-label={`Remove ${debt.label || `debt ${index + 1}`}`} disabled={debts.length === 1} onClick={() => setDebts((current) => current.filter((item) => item.id !== debt.id))}>×</button>
          </div>
        ))}
        {debts.length < MAX_DEBT_ACCOUNTS && (
          <button className="add-row-button" type="button" onClick={() => setDebts((current) => [...current, { id: newDebtId(), label: '', balance: '1000', annualRatePercent: '12', minimumPayment: '40' }])}>
            + Add a debt
          </button>
        )}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.bothPaidOff ? 'Interest comparison' : 'Payoff comparison'}
            value={calculation.result.value.bothPaidOff
              ? (calculation.result.value.interestDifference === 0 ? 'Same interest' : money(Math.abs(calculation.result.value.interestDifference)))
              : 'Does not pay off'}
            note={comparisonNote}
            tone="mint"
          />
          <StatGrid items={[
            {
              label: 'Snowball',
              value: calculation.result.value.snowball.status === 'paid-off' ? formatPayoffDuration(calculation.result.value.snowball.months) : 'Does not pay off',
              note: calculation.result.value.snowball.status === 'paid-off' ? `${money(calculation.result.value.snowball.totalInterest, 0)} interest` : 'Smallest balance first',
            },
            {
              label: 'Avalanche',
              value: calculation.result.value.avalanche.status === 'paid-off' ? formatPayoffDuration(calculation.result.value.avalanche.months) : 'Does not pay off',
              note: calculation.result.value.avalanche.status === 'paid-off' ? `${money(calculation.result.value.avalanche.totalInterest, 0)} interest` : 'Highest rate first',
            },
            {
              label: 'Time difference',
              value: calculation.result.value.bothPaidOff
                ? (calculation.result.value.monthsDifference === 0 ? 'Same payoff time' : formatPayoffDuration(Math.abs(calculation.result.value.monthsDifference)))
                : 'n/a',
              note: calculation.result.value.monthsDifference > 0 ? 'Avalanche finishes sooner' : calculation.result.value.monthsDifference < 0 ? 'Snowball finishes sooner' : 'On these numbers',
            },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
