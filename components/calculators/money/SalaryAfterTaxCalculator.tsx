'use client';

import { useMemo, useState } from 'react';
import { calculateSalaryAfterTax } from '@/lib/calculations/salary-after-tax';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { dependentsNote } from '@/lib/calculations/tax/dependents';
import { DEFAULT_TAX_YEAR, FILING_STATUSES, FILING_STATUS_LABELS } from '@/lib/calculations/tax';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { STATE_CODES, getStateName, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function SalaryAfterTaxCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [annualGrossSalary, setAnnualGrossSalary] = useState('100000');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [taxYear, setTaxYear] = useState(String(DEFAULT_TAX_YEAR));
  const [dependents, setDependents] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateSalaryAfterTax({
          annualGrossSalary: Number(annualGrossSalary),
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
  }, [annualGrossSalary, stateCode, filingStatus, taxYear, dependents]);

  const selectedPolicy = snapshot.states.find((row) => row.stateCode === stateCode);

  return (
    <CalculatorPanel
      title="Estimated take-home pay"
      intro="Federal income tax, FICA, and state income tax where this snapshot has a verified schedule. This is not a tax return."
      toolId="salary-after-tax"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([annualGrossSalary, stateCode, filingStatus, taxYear, dependents])}
    >
      {selectedPolicy?.status === 'unsupported' && (
        <div className="data-callout">
          <span>STATE TAX</span>
          <p>
            <strong>{getStateName(stateCode)}: federal and FICA only</strong>
            <small>No verified {taxYear} wage income tax schedule is in this snapshot, so state income tax is omitted.</small>
          </p>
        </div>
      )}
      {selectedPolicy?.status === 'supported' && (
        <div className="data-callout">
          <span>TAX YEAR {taxYear}</span>
          <p>
            <strong>Federal: IRS · State: {selectedPolicy.provider}</strong>
            <small>{snapshot.snapshotId}</small>
          </p>
        </div>
      )}
      <div className="calc-form-grid">
        <Field label="Annual gross salary" htmlFor="salary-gross">
          <InputShell prefix="$">
            <input id="salary-gross" type="number" min="0" step="1000" inputMode="decimal" value={annualGrossSalary} onChange={(event) => setAnnualGrossSalary(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="State" htmlFor="salary-state">
          <span className="input-shell select-shell">
            <select id="salary-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option value={code} key={code}>{getStateName(code)}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Filing status" htmlFor="salary-filing">
          <span className="input-shell select-shell">
            <select id="salary-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Dependents" htmlFor="salary-dependents" hint={dependentsNote(selectedPolicy) ?? undefined}>
          <InputShell>
            <input id="salary-dependents" type="number" min="0" max="20" step="1" inputMode="numeric" value={dependents} onChange={(event) => setDependents(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Tax year" htmlFor="salary-year">
          <span className="input-shell select-shell">
            <select id="salary-year" value={taxYear} onChange={(event) => setTaxYear(event.target.value)}>
              <option value={snapshot.taxYear}>{snapshot.taxYear}</option>
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.stateTaxStatus === 'unsupported'
              ? `Estimated federal & FICA take-home (${getStateName(stateCode)} state tax omitted)`
              : 'Estimated annual take-home'}
            value={money(calculation.result.value.annualTakeHome)}
            note={calculation.result.value.stateTaxStatus === 'unsupported'
              ? `${money(calculation.result.value.totalTax)} federal & FICA tax · State income tax is not modeled`
              : `${money(calculation.result.value.totalTax)} estimated tax · ${calculation.result.value.effectiveTaxRate.toFixed(2)}% effective rate`}
            tone={calculation.result.value.stateTaxStatus === 'unsupported' ? 'amber' : 'mint'}
          />
          <StatGrid items={[
            { label: 'Monthly', value: money(calculation.result.value.monthlyTakeHome), note: calculation.result.value.stateTaxStatus === 'unsupported' ? 'Federal & FICA net ÷ 12' : 'Annual take-home ÷ 12' },
            { label: 'Biweekly', value: money(calculation.result.value.biweeklyTakeHome), note: calculation.result.value.stateTaxStatus === 'unsupported' ? '26 pay periods (federal & FICA)' : '26 pay periods' },
            { label: 'Weekly', value: money(calculation.result.value.weeklyTakeHome), note: calculation.result.value.stateTaxStatus === 'unsupported' ? '52 weeks (federal & FICA)' : '52 weeks' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
