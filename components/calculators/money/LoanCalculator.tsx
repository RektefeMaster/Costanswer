'use client';

import { useMemo, useState } from 'react';
import { calculateLoan } from '@/lib/calculations/loan';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { pluralize } from '@/lib/plural';

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function formatTermDisplay(termMonths: number, termUnit: 'years' | 'months'): string {
  if (termUnit === 'months') return String(termMonths);
  const years = termMonths / 12;
  return Number.isInteger(years) ? String(years) : String(Math.round(years * 100) / 100);
}

export function LoanCalculator() {
  // Canonical term is always months so Years↔Months is a presentation toggle only.
  const [termMonths, setTermMonths] = useState(60);
  const [termUnit, setTermUnit] = useState<'years' | 'months'>('years');
  const [termDraft, setTermDraft] = useState(() => formatTermDisplay(60, 'years'));
  const [loanAmount, setLoanAmount] = useState('20000');
  const [annualRatePercent, setAnnualRatePercent] = useState('8');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('0');

  const setUnit = (next: 'years' | 'months') => {
    if (next === termUnit) return;
    setTermUnit(next);
    setTermDraft(formatTermDisplay(termMonths, next));
  };

  const onTermChange = (raw: string) => {
    setTermDraft(raw);
    const trimmed = raw.trim();
    if (trimmed === '' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return;
    if (termUnit === 'months') {
      setTermMonths(Math.max(1, Math.min(480, Math.round(value))));
      return;
    }
    setTermMonths(Math.max(1, Math.min(480, Math.round(value * 12))));
  };

  const termDraftMatchesCanonical = (() => {
    const trimmed = termDraft.trim();
    if (trimmed === '' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return false;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return false;
    const months = termUnit === 'months'
      ? Math.max(1, Math.min(480, Math.round(value)))
      : Math.max(1, Math.min(480, Math.round(value * 12)));
    return months === termMonths;
  })();

  const calculation = useMemo(() => {
    if (!termDraftMatchesCanonical) {
      return { result: null, error: 'Loan term must be a number.' };
    }
    try {
      return {
        result: calculateLoan({
          loanAmount,
          annualRatePercent,
          termLength: termMonths,
          termUnit: 'months',
          extraMonthlyPayment,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [loanAmount, annualRatePercent, termMonths, extraMonthlyPayment, termDraftMatchesCanonical]);

  return (
    <CalculatorPanel
      title="Monthly loan payment"
      intro="A fixed-rate amortizing loan. Extra principal is optional."
      toolId="loan"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([loanAmount, annualRatePercent, termMonths, termUnit, extraMonthlyPayment])}
    >
      <div className="mode-tabs" role="group" aria-label="Loan term unit">
        <button type="button" aria-pressed={termUnit === 'years'} className={termUnit === 'years' ? 'active' : ''} onClick={() => setUnit('years')}>Years</button>
        <button type="button" aria-pressed={termUnit === 'months'} className={termUnit === 'months' ? 'active' : ''} onClick={() => setUnit('months')}>Months</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Loan amount" htmlFor="loan-amount">
          <InputShell prefix="$">
            <input id="loan-amount" type="number" min="1" step="100" inputMode="decimal" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Interest rate" htmlFor="loan-rate" hint="Nominal annual rate, not APR">
          <InputShell suffix="%">
            <input id="loan-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={termUnit === 'years' ? 'Term in years' : 'Term in months'} htmlFor="loan-term">
          <InputShell suffix={termUnit}>
            <input
              id="loan-term"
              type="number"
              min={termUnit === 'years' ? 1 / 12 : 1}
              max={termUnit === 'years' ? 40 : 480}
              step={termUnit === 'years' ? 0.01 : 1}
              inputMode="decimal"
              value={termDraft}
              onChange={(event) => onTermChange(event.target.value)}
            />
          </InputShell>
        </Field>
        <Field label="Extra monthly principal" htmlFor="loan-extra" hint="Optional">
          <InputShell prefix="$">
            <input id="loan-extra" type="number" min="0" step="25" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated monthly payment"
            value={money(calculation.result.value.monthlyPayment)}
            note={calculation.result.value.extraMonthlyPayment > 0
              ? `Scheduled P&I. Extra ${money(calculation.result.value.extraMonthlyPayment)} is on top.`
              : 'Principal and interest'}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0), note: calculation.result.value.interestSaved > 0 ? `${money(calculation.result.value.interestSaved, 0)} saved with extra payments` : pluralize(calculation.result.value.actualPeriods, 'payment', 'payments') },
            { label: 'Total repayment', value: money(calculation.result.value.totalRepayment, 0), note: `${money(calculation.result.value.totalPrincipal, 0)} principal` },
            { label: 'First payment interest', value: money(calculation.result.value.firstPayment.interest), note: `${money(calculation.result.value.firstPayment.principal)} to principal` },
          ]} />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
            headline={{ label: 'Estimated monthly payment', value: money(calculation.result.value.monthlyPayment) }}
          />
        </div>
      )}
    </CalculatorPanel>
  );
}
