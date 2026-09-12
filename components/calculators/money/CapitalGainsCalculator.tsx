'use client';

import { useMemo, useState } from 'react';
import { calculateCapitalGains } from '@/lib/calculations/tax/capital-gains';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { DEFAULT_TAX_YEAR, FILING_STATUSES, FILING_STATUS_LABELS } from '@/lib/calculations/tax';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
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

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function CapitalGainsCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [otherTaxableIncome, setOtherTaxableIncome] = useState('80000');
  const [longTermGains, setLongTermGains] = useState('20000');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [modifiedAgi, setModifiedAgi] = useState('');
  const [netInvestmentIncome, setNetInvestmentIncome] = useState('');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateCapitalGains({
          otherTaxableIncome,
          longTermGains,
          modifiedAgi: modifiedAgi === '' ? undefined : Number(modifiedAgi),
          netInvestmentIncome: netInvestmentIncome === '' ? undefined : Number(netInvestmentIncome),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [otherTaxableIncome, longTermGains, modifiedAgi, netInvestmentIncome, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Long-term capital gains tax"
      intro="0%, 15% and 20% rates stacked on your other taxable income, plus the 3.8% Net Investment Income Tax."
      toolId="capital-gains"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([otherTaxableIncome, longTermGains, modifiedAgi, netInvestmentIncome, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.federalCredits.sourceName} §4.03</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Other taxable income" htmlFor="cg-ordinary" hint="Taxable income that is not long-term gain or qualified dividends">
          <InputShell prefix="$">
            <input id="cg-ordinary" type="number" min="0" step="1000" inputMode="decimal" value={otherTaxableIncome} onChange={(event) => setOtherTaxableIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Long-term capital gains" htmlFor="cg-gains" hint="Held more than one year">
          <InputShell prefix="$">
            <input id="cg-gains" type="number" min="0" step="1000" inputMode="decimal" value={longTermGains} onChange={(event) => setLongTermGains(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="cg-filing">
          <span className="input-shell select-shell">
            <select id="cg-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="niit-inputs" title="MAGI and net investment income for NIIT">
        <Field label="Modified AGI" htmlFor="cg-magi" hint="Leave blank to use other taxable income plus the gains">
          <InputShell prefix="$">
            <input id="cg-magi" type="number" min="0" step="1000" inputMode="decimal" value={modifiedAgi} onChange={(event) => setModifiedAgi(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Net investment income" htmlFor="cg-nii" hint="Leave blank to use the long-term gains">
          <InputShell prefix="$">
            <input id="cg-nii" type="number" min="0" step="1000" inputMode="decimal" value={netInvestmentIncome} onChange={(event) => setNetInvestmentIncome(event.target.value)} />
          </InputShell>
        </Field>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Tax on long-term gains"
            value={money(value.capitalGainsTax)}
            note={`${money(value.amountAtZero)} at 0% · ${money(value.amountAtFifteen)} at 15% · ${money(value.amountAtTwenty)} at 20%`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Ordinary income tax', value: money(value.ordinaryTax), note: 'On other taxable income only' },
            { label: 'Net Investment Income Tax', value: money(value.netInvestmentIncomeTax), note: '3.8% of the lesser of NII or MAGI over the threshold' },
            { label: 'Combined federal tax', value: money(value.totalTax), note: 'Ordinary + gains + NIIT' },
          ]} />
          <ConfidenceChip
            level="high"
            reasons={[
              '0% and 15% ceilings transcribed from Revenue Procedure 2025-32 §4.03',
              'NIIT thresholds from the IRS Q&A on IRC 1411',
              'Collectibles, unrecaptured 1250 gain and the home-sale exclusion are not modelled',
            ]}
          />
          <CalculationReceipt
            title={`Capital gains — ${money(Number(longTermGains))} long-term, ${snapshot.taxYear}`}
            headline={{ label: 'Tax on long-term gains', value: money(value.capitalGainsTax) }}
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
