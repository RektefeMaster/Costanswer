'use client';

import { useMemo, useState } from 'react';
import { calculateEffectiveTaxRate } from '@/lib/calculations/tax/effective-rate';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { dependentsNote } from '@/lib/calculations/tax/dependents';
import { DEFAULT_TAX_YEAR, FILING_STATUSES, FILING_STATUS_LABELS } from '@/lib/calculations/tax';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { STATE_CODES, getStateName, type StateCode } from '@/lib/location/states';
import {
  AdvancedSection,
  CalculationReceipt,
  CalculatorPanel,
  ConfidenceChip,
  Field,
  InlineError,
  InputShell,
  PrimaryResult,
  StatGrid,
} from '../CalculatorUI';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const percent = (value: number) => `${value.toFixed(2)}%`;

export function EffectiveTaxRateCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [annualGrossSalary, setAnnualGrossSalary] = useState('100000');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [taxYear, setTaxYear] = useState(String(DEFAULT_TAX_YEAR));
  const [dependents, setDependents] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateEffectiveTaxRate({
          annualGrossSalary,
          state: stateCode,
          filingStatus,
          taxYear,
          dependents,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [annualGrossSalary, stateCode, filingStatus, taxYear, dependents]);

  const policy = snapshot.states.find((row) => row.stateCode === stateCode);
  const value = calculation.result?.value;

  /*
   * The confidence reasons are built from what this particular run actually
   * omitted, not from a fixed sentence. A reader in Texas and a reader in
   * Maryland are looking at answers with different amounts missing from them.
   */
  const reasons = value
    ? [
      value.stateTaxStatus === 'unsupported'
        ? `${getStateName(stateCode)} state income tax is not in this snapshot, so the total is federal and FICA only`
        : null,
      policy?.status === 'supported' && 'localAddOn' in policy && policy.localAddOn
        ? `${policy.localAddOn.label} is not included`
        : null,
      policy?.status === 'supported' && policy.kind !== 'none' && policy.scheduleTaxYear !== Number(taxYear)
        ? `${getStateName(stateCode)} is on its ${policy.scheduleTaxYear} schedule, the latest the state has published`
        : null,
      'Credits, itemised deductions and other income are not modelled',
    ].filter((reason): reason is string => Boolean(reason))
    : [];

  return (
    <CalculatorPanel
      title="Your effective tax rate"
      intro="The share of your pay that actually goes to tax — and why it is lower than the bracket you are in."
      toolId="effective-tax-rate"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([annualGrossSalary, stateCode, filingStatus, taxYear, dependents])}
    >
      <div className="data-callout">
        <span>TAX YEAR {taxYear}</span>
        <p>
          <strong>Federal: IRS · State: {policy?.provider}</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Annual gross salary" htmlFor="etr-gross">
          <InputShell prefix="$">
            <input id="etr-gross" type="number" min="0" step="1000" inputMode="decimal" value={annualGrossSalary} onChange={(event) => setAnnualGrossSalary(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="State" htmlFor="etr-state">
          <span className="input-shell select-shell">
            <select id="etr-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option value={code} key={code}>{getStateName(code)}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Filing status" htmlFor="etr-filing">
          <span className="input-shell select-shell">
            <select id="etr-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection
        id="filing-detail"
        title="Dependents and tax year"
        hint="Defaults cover the common case: no dependents, the current tax year."
      >
        <div className="calc-form-grid">
          <Field label="Dependents" htmlFor="etr-dependents" hint={dependentsNote(policy) ?? undefined}>
            <InputShell>
              <input id="etr-dependents" type="number" min="0" max="20" step="1" inputMode="numeric" value={dependents} onChange={(event) => setDependents(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Tax year" htmlFor="etr-year">
            <span className="input-shell select-shell">
              <select id="etr-year" value={taxYear} onChange={(event) => setTaxYear(event.target.value)}>
                <option value={snapshot.taxYear}>{snapshot.taxYear}</option>
              </select>
            </span>
          </Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Effective tax rate"
            value={percent(value.effectiveTotalRate)}
            note={`${money(value.totalTax)} of ${money(value.grossAnnual)} — federal, FICA${value.stateTaxStatus === 'unsupported' ? '' : ' and state'}`}
            tone={value.stateTaxStatus === 'unsupported' ? 'amber' : 'mint'}
          />
          <StatGrid items={[
            {
              label: 'Your federal bracket',
              value: value.statutoryFederalBracket === null ? 'None' : percent(value.statutoryFederalBracket),
              note: value.statutoryFederalBracket === null
                ? 'No taxable income, so no federal bracket is in play'
                : `${percent(value.bracketMinusEffectiveFederal)} above your federal effective rate`,
            },
            {
              label: 'Federal effective',
              value: percent(value.effectiveFederalRate),
              note: `${money(value.federalIncomeTax)} of income tax`,
            },
            {
              label: 'Tax on your next $1,000',
              value: percent(value.nextThousandRate),
              note: 'What a raise is actually taxed at',
            },
          ]} />
          <ConfidenceChip
            level={value.stateTaxStatus === 'unsupported' ? 'low' : 'medium'}
            reasons={reasons as [string, ...string[]]}
          />
          <CalculationReceipt
            title={`Effective tax rate — ${money(value.grossAnnual)} in ${getStateName(stateCode)}, ${taxYear}`}
            headline={{ label: 'Effective tax rate', value: percent(value.effectiveTotalRate) }}
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
          />
        </div>
      )}
    </CalculatorPanel>
  );
}
