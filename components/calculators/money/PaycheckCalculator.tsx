'use client';

import { useMemo, useState } from 'react';
import { calculatePaycheck } from '@/lib/calculations/paycheck';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { DEFAULT_TAX_YEAR, FILING_STATUSES, FILING_STATUS_LABELS, PAY_FREQUENCIES, type PayFrequency } from '@/lib/calculations/tax';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { STATE_CODES, getStateName, type StateCode } from '@/lib/location/states';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
  semimonthly: 'Twice a month',
  biweekly: 'Every two weeks',
  weekly: 'Weekly',
  hourly: 'Hourly',
};

export function PaycheckCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [amount, setAmount] = useState('3846.15');
  const [hourlyRate, setHourlyRate] = useState('28');
  const [hoursPerWeek, setHoursPerWeek] = useState('40');
  const [weeksPerYear, setWeeksPerYear] = useState('52');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [taxYear, setTaxYear] = useState(String(DEFAULT_TAX_YEAR));
  const [dependents, setDependents] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculatePaycheck({
          payFrequency,
          amount: payFrequency === 'hourly' ? undefined : Number(amount),
          hourlyRate: payFrequency === 'hourly' ? Number(hourlyRate) : undefined,
          hoursPerWeek: payFrequency === 'hourly' ? Number(hoursPerWeek) : undefined,
          weeksPerYear: payFrequency === 'hourly' ? Number(weeksPerYear) : undefined,
          state: stateCode,
          filingStatus,
          taxYear: Number(taxYear),
          dependents: Number(dependents),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [payFrequency, amount, hourlyRate, hoursPerWeek, weeksPerYear, stateCode, filingStatus, taxYear, dependents]);

  return (
    <CalculatorPanel
      title="Estimated net paycheck"
      intro="Annual estimated tax is split across pay periods. This is not employer payroll withholding."
      toolId="paycheck"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([payFrequency, amount, hourlyRate, hoursPerWeek, weeksPerYear, stateCode, filingStatus, taxYear, dependents])}
    >
      <div className="data-callout">
        <span>ASSUMPTION</span>
        <p>
          <strong>Annualized tax liability, not IRS withholding tables</strong>
          <small>Tax year {taxYear} · Federal source IRS · State source shown in the result</small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="Pay frequency">
        {PAY_FREQUENCIES.map((frequency) => (
          <button
            key={frequency}
            type="button"
            aria-pressed={payFrequency === frequency}
            className={payFrequency === frequency ? 'active' : ''}
            onClick={() => setPayFrequency(frequency)}
          >
            {FREQUENCY_LABELS[frequency]}
          </button>
        ))}
      </div>
      <div className="calc-form-grid">
        {payFrequency === 'hourly' ? (
          <>
            <Field label="Hourly rate" htmlFor="paycheck-hourly-rate">
              <InputShell prefix="$" suffix="/ hour">
                <input id="paycheck-hourly-rate" type="number" min="0.01" step="0.25" inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Hours per week" htmlFor="paycheck-hours">
              <InputShell suffix="hours">
                <input id="paycheck-hours" type="number" min="0" max="168" step="0.5" inputMode="decimal" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Paid weeks" htmlFor="paycheck-weeks">
              <InputShell suffix="/ year">
                <input id="paycheck-weeks" type="number" min="1" max="53" step="1" inputMode="numeric" value={weeksPerYear} onChange={(event) => setWeeksPerYear(event.target.value)} />
              </InputShell>
            </Field>
          </>
        ) : (
          <Field label={payFrequency === 'annual' ? 'Annual gross salary' : 'Gross pay this period'} htmlFor="paycheck-amount">
            <InputShell prefix="$">
              <input id="paycheck-amount" type="number" min="0" step="50" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </InputShell>
          </Field>
        )}
        <Field label="State" htmlFor="paycheck-state">
          <span className="input-shell select-shell">
            <select id="paycheck-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option value={code} key={code}>{getStateName(code)}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection
        id="tax-detail"
        title="Filing status, dependents and tax year"
        hint="Defaults cover the common case: single, no dependents, the current year."
      >
        <div className="calc-form-grid">
          <Field label="Filing status" htmlFor="paycheck-filing">
            <span className="input-shell select-shell">
              <select id="paycheck-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
                {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
              </select>
            </span>
          </Field>
          <Field label="Dependents" htmlFor="paycheck-dependents">
            <InputShell>
              <input id="paycheck-dependents" type="number" min="0" max="20" step="1" inputMode="numeric" value={dependents} onChange={(event) => setDependents(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Tax year" htmlFor="paycheck-year">
            <span className="input-shell select-shell">
              <select id="paycheck-year" value={taxYear} onChange={(event) => setTaxYear(event.target.value)}>
                <option value={snapshot.taxYear}>{snapshot.taxYear}</option>
              </select>
            </span>
          </Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.stateTaxStatus === 'unsupported'
              ? `Estimated federal & FICA paycheck (${getStateName(stateCode)} state tax omitted)`
              : 'Estimated net paycheck'}
            value={money(calculation.result.value.netPaycheck)}
            note={calculation.result.value.stateTaxStatus === 'unsupported'
              ? `${money(calculation.result.value.grossPaycheck)} gross · Federal & FICA only · State tax not modeled`
              : `${money(calculation.result.value.grossPaycheck)} gross · ${money(calculation.result.value.totalTax)} estimated tax`}
            tone={calculation.result.value.stateTaxStatus === 'unsupported' ? 'amber' : 'mint'}
          />
          <StatGrid items={[
            { label: 'Federal', value: money(calculation.result.value.federal), note: 'Annual liability ÷ periods' },
            { label: 'FICA', value: money(calculation.result.value.socialSecurity + calculation.result.value.medicare), note: 'Social Security + Medicare' },
            { label: 'State', value: calculation.result.value.stateTaxStatus === 'unsupported' ? 'Omitted' : money(calculation.result.value.stateTax), note: getStateName(stateCode) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
