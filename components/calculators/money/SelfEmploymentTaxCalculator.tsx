'use client';

import { useMemo, useState } from 'react';
import { calculateSelfEmploymentTax } from '@/lib/calculations/tax/self-employment';
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

export function SelfEmploymentTaxCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [netProfit, setNetProfit] = useState('50000');
  const [socialSecurityWages, setSocialSecurityWages] = useState('0');
  const [medicareWages, setMedicareWages] = useState('');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateSelfEmploymentTax({
          netProfit: Number(netProfit),
          socialSecurityWages: Number(socialSecurityWages),
          medicareWages: medicareWages === '' ? undefined : Number(medicareWages),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [netProfit, socialSecurityWages, medicareWages, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Self-employment tax"
      intro="Schedule SE tax on net profit, after the 92.35% factor, sharing the Social Security wage base with any W-2 wages."
      toolId="self-employment-tax"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([netProfit, socialSecurityWages, medicareWages, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.fica.selfEmploymentSourceName}</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Net profit from self-employment" htmlFor="se-profit" hint="Schedule C line 31, combined with farm profit if you have it">
          <InputShell prefix="$">
            <input id="se-profit" type="number" step="1000" inputMode="decimal" value={netProfit} onChange={(event) => setNetProfit(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="W-2 Social Security wages" htmlFor="se-ss-wages" hint="Box 3. Reduces the remaining Social Security wage base">
          <InputShell prefix="$">
            <input id="se-ss-wages" type="number" min="0" step="1000" inputMode="decimal" value={socialSecurityWages} onChange={(event) => setSocialSecurityWages(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="se-filing">
          <span className="input-shell select-shell">
            <select id="se-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="medicare-wages" title="Medicare wages for Additional Medicare Tax">
        <Field label="W-2 Medicare wages" htmlFor="se-medicare-wages" hint="Box 5. Leave blank to use Social Security wages">
          <InputShell prefix="$">
            <input id="se-medicare-wages" type="number" min="0" step="1000" inputMode="decimal" value={medicareWages} onChange={(event) => setMedicareWages(event.target.value)} />
          </InputShell>
        </Field>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Schedule SE tax"
            value={money(value.scheduleSeTax)}
            note={value.belowFilingThreshold
              ? 'Net earnings are under $400, so Schedule SE is not filed'
              : `${money(value.netEarnings)} of net earnings from self-employment`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Deductible one-half', value: money(value.deductibleHalf), note: 'Schedule SE line 13, not Additional Medicare Tax' },
            { label: 'Additional Medicare Tax', value: money(value.additionalMedicare), note: 'Form 8959, not deductible' },
            { label: 'Social Security remaining', value: money(value.remainingSocialSecurityBase), note: `Of the ${money(snapshot.fica.socialSecurityWageBase)} wage base` },
          ]} />
          <ConfidenceChip
            level="high"
            reasons={[
              'Arithmetic follows the 2026 Schedule SE draft and SSA wage base',
              'Church employee income and optional methods are not modelled',
              'A filed return rounds each line to whole dollars',
            ]}
          />
          <CalculationReceipt
            title={`Self-employment tax — ${money(Number(netProfit))} net profit, ${snapshot.taxYear}`}
            headline={{ label: 'Schedule SE tax', value: money(value.scheduleSeTax) }}
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
