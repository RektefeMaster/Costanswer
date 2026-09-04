'use client';

import { useMemo, useState } from 'react';
import { calculateBonusTax } from '@/lib/calculations/tax/bonus';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from '@/lib/calculations/tax/types';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { money } from './finance-format';

/** Effective rates need a decimal; the IRS flat rates are whole numbers and should read that way. */
function percent(share: number) {
  return `${(share * 100).toFixed(1)}%`;
}

function flatRate(share: number) {
  return `${Number((share * 100).toFixed(2))}%`;
}

export function BonusTaxCalculator({ taxYear }: { taxYear: number }) {
  const [bonusAmount, setBonusAmount] = useState('10000');
  const [regularWagesToDate, setRegularWagesToDate] = useState('60000');
  const [priorSupplementalWagesThisYear, setPriorSupplementalWagesThisYear] = useState('0');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateBonusTax({
          bonusAmount: Number(bonusAmount),
          regularWagesToDate: Number(regularWagesToDate),
          priorSupplementalWagesThisYear: Number(priorSupplementalWagesThisYear),
          state: stateCode,
          filingStatus,
          taxYear,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [bonusAmount, regularWagesToDate, priorSupplementalWagesThisYear, stateCode, filingStatus, taxYear]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="What actually lands from a bonus"
      intro="Employers withhold a flat IRS rate on a bonus paid separately, not the rate your salary implies. That is why it looks over-taxed."
      toolId="bonus-tax"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([bonusAmount, regularWagesToDate, priorSupplementalWagesThisYear, stateCode, filingStatus, taxYear])}
    >
      <div className="data-callout">
        <span>WITHHOLDING, NOT TAX</span>
        <p>
          <strong>A flat rate comes out now. What you owe is settled on your return.</strong>
          <small>Tax year {taxYear} · IRS Publication 15 (Circular E), section 7 · State source shown in the result</small>
        </p>
      </div>

      <div className="calc-form-grid">
        <Field label="Bonus amount" htmlFor="bonus-amount" hint="Before anything is taken out">
          <InputShell prefix="$"><input id="bonus-amount" type="number" min="0" step="500" inputMode="decimal" value={bonusAmount} onChange={(event) => setBonusAmount(event.target.value)} /></InputShell>
        </Field>
        <Field label="Regular wages paid so far this year" htmlFor="bonus-wages" hint="Decides how much Social Security is left to pay">
          <InputShell prefix="$"><input id="bonus-wages" type="number" min="0" step="1000" inputMode="decimal" value={regularWagesToDate} onChange={(event) => setRegularWagesToDate(event.target.value)} /></InputShell>
        </Field>
        <Field label="Bonuses already paid this year" htmlFor="bonus-prior" hint="Only matters near the $1 million mark">
          <InputShell prefix="$"><input id="bonus-prior" type="number" min="0" step="1000" inputMode="decimal" value={priorSupplementalWagesThisYear} onChange={(event) => setPriorSupplementalWagesThisYear(event.target.value)} /></InputShell>
        </Field>
        <Field label="State" htmlFor="bonus-state">
          <span className="input-shell select-shell">
            <select id="bonus-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option key={code} value={code}>{US_STATES[code]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Filing status" htmlFor="bonus-filing">
          <span className="input-shell select-shell">
            <select id="bonus-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as FilingStatus)}>
              {FILING_STATUSES.map((status) => <option key={status} value={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>

      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="What lands in your account"
            value={money(value.takeHome)}
            note={`${percent(value.effectiveWithholdingRate)} of the bonus withheld, on a ${money(value.bonusAmount, 0)} bonus`}
            tone="mint"
          />
          {value.crossesMandatoryThreshold && (
            <div className="data-callout">
              <span>OVER THE THRESHOLD</span>
              <p>
                <strong>Part of this bonus is withheld at {flatRate(value.mandatoryFlatRate)}</strong>
                <small>
                  Once your bonuses pass {money(value.mandatoryRateThreshold, 0)} in a calendar year, the excess must be
                  withheld at {flatRate(value.mandatoryFlatRate)} regardless of your Form W-4.
                  {' '}{money(value.amountAtOptionalRate, 0)} of this one is at {flatRate(value.optionalFlatRate)} and{' '}
                  {money(value.amountAtMandatoryRate, 0)} is at {flatRate(value.mandatoryFlatRate)}.
                </small>
              </p>
            </div>
          )}
          {value.stateTaxStatus === 'unsupported' && (
            <div className="data-callout">
              <span>INCOMPLETE</span>
              <p>
                <strong>State withholding is not included</strong>
                <small>{value.stateNote}</small>
              </p>
            </div>
          )}
          <StatGrid items={[
            { label: 'Federal withholding', value: money(value.federalWithholding), note: value.crossesMandatoryThreshold ? `${flatRate(value.optionalFlatRate)} and ${flatRate(value.mandatoryFlatRate)}` : `Flat ${flatRate(value.optionalFlatRate)} supplemental rate` },
            { label: 'Social Security', value: money(value.socialSecurity), note: value.socialSecurityCapped ? 'Already at the yearly wage base' : 'Continues from wages so far' },
            { label: 'Medicare', value: money(value.medicare + value.additionalMedicare), note: value.additionalMedicare > 0 ? 'Includes the additional Medicare tax' : 'No wage cap' },
            { label: 'State', value: value.stateTaxStatus === 'supported' ? money(value.stateWithholding) : 'Not modeled', note: US_STATES[value.state] },
            { label: 'Total withheld', value: money(value.totalWithheld), note: percent(value.effectiveWithholdingRate) },
          ]} />
          <p className="data-footnote">{value.stateNote}</p>
          <ResultDetails
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
