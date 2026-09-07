'use client';

import { useMemo, useState } from 'react';
import { calculateFederalBracket } from '@/lib/calculations/tax/federal-bracket';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { DEFAULT_TAX_YEAR, FILING_STATUSES, FILING_STATUS_LABELS } from '@/lib/calculations/tax';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import {
  CalculationReceipt,
  CalculatorPanel,
  ConfidenceChip,
  Field,
  InlineError,
  InputShell,
  PrimaryResult,
  StatGrid,
} from '../CalculatorUI';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const percent = (value: number) => `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;

export function FederalTaxBracketCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [income, setIncome] = useState('100000');
  const [incomeBasis, setIncomeBasis] = useState<'gross' | 'taxable'>('gross');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateFederalBracket({
          income: Number(income),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
          incomeBasis,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [income, incomeBasis, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Your federal tax bracket"
      intro="Which band your last dollar lands in, how your income splits across all of them, and how much room is left before the next one."
      toolId="federal-tax-bracket"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([income, incomeBasis, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.federal.sourceName}</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="What the amount you enter is">
        <button type="button" aria-pressed={incomeBasis === 'gross'} className={incomeBasis === 'gross' ? 'active' : ''} onClick={() => setIncomeBasis('gross')}>Pay before deductions</button>
        <button type="button" aria-pressed={incomeBasis === 'taxable'} className={incomeBasis === 'taxable' ? 'active' : ''} onClick={() => setIncomeBasis('taxable')}>Taxable income</button>
      </div>
      <div className="calc-form-grid">
        <Field
          label={incomeBasis === 'gross' ? 'Income before deductions' : 'Taxable income'}
          htmlFor="bracket-income"
          hint={incomeBasis === 'gross'
            ? 'The standard deduction comes off before the brackets apply'
            : 'Line 15 of Form 1040 — after the deduction has already come out'}
        >
          <InputShell prefix="$">
            <input id="bracket-income" type="number" min="0" step="1000" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="bracket-filing">
          <span className="input-shell select-shell">
            <select id="bracket-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Your federal bracket"
            value={percent(value.currentBracketRate)}
            note={value.taxableIncome === 0
              ? 'The standard deduction covers all of it, so no federal income tax is due'
              : `On ${money(value.taxableIncome)} of taxable income · ${money(value.federalIncomeTax)} of federal income tax`}
            tone="mint"
          />
          <StatGrid items={[
            {
              label: 'Room in this bracket',
              value: value.roomInCurrentBracket === null ? 'Top bracket' : money(value.roomInCurrentBracket),
              note: value.nextBracketRate === null
                ? 'Nothing above this band'
                : `Before any of it is taxed at ${percent(value.nextBracketRate)}`,
            },
            {
              label: 'Federal income tax',
              value: money(value.federalIncomeTax),
              note: `${percent(value.effectiveFederalRate)} of taxable income`,
            },
            {
              label: 'Standard deduction',
              value: value.incomeBasis === 'gross' ? money(value.standardDeduction) : 'Already applied',
              note: value.incomeBasis === 'gross' ? 'Taxed at nothing' : 'You entered taxable income',
            },
          ]} />

          <div className="scenario-compare">
            <table>
              <caption>How your income is taxed, band by band</caption>
              <thead>
                <tr>
                  <th scope="col">Rate</th>
                  <th scope="col">Band of taxable income</th>
                  <th scope="col">Your income in it</th>
                  <th scope="col">Tax</th>
                </tr>
              </thead>
              <tbody>
                {value.bands.map((band) => (
                  <tr key={band.rate} className={band.isCurrent ? 'is-current' : undefined}>
                    <th scope="row">{percent(band.rate)}{band.isCurrent && <span className="band-flag"> your bracket</span>}</th>
                    <td>{band.to === null ? `Over ${money(band.from)}` : `${money(band.from)} – ${money(band.to)}`}</td>
                    <td>{band.incomeInBand === 0 ? '—' : money(band.incomeInBand)}</td>
                    <td>{band.incomeInBand === 0 ? '—' : money(band.taxInBand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ConfidenceChip
            level="high"
            reasons={[
              `Brackets and the standard deduction are transcribed from ${snapshot.federal.sourceName}`,
              'Federal income tax only — Social Security, Medicare and state tax are not included',
              'Credits, capital gains and itemised deductions are not modelled',
            ]}
          />
          <CalculationReceipt
            title={`Federal tax bracket — ${money(Number(income))} ${incomeBasis === 'gross' ? 'before deductions' : 'taxable'}, ${snapshot.taxYear}`}
            headline={{ label: 'Federal bracket', value: percent(value.currentBracketRate) }}
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
