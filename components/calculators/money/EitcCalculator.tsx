'use client';

import { useMemo, useState } from 'react';
import { calculateEitc, type EitcValue } from '@/lib/calculations/tax/eitc';
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

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function phaseLabel(phase: EitcValue['phase']): string {
  switch (phase) {
    case 'phase-in':
      return 'Phasing in';
    case 'phase-out':
      return 'Phasing out';
    case 'plateau':
      return 'Maximum';
    case 'none':
      return 'None';
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

export function EitcCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [earnedIncome, setEarnedIncome] = useState('20000');
  const [adjustedGrossIncome, setAdjustedGrossIncome] = useState('20000');
  const [qualifyingChildren, setQualifyingChildren] = useState('1');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [investmentIncome, setInvestmentIncome] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateEitc({
          earnedIncome: Number(earnedIncome),
          adjustedGrossIncome: Number(adjustedGrossIncome),
          qualifyingChildren: Number(qualifyingChildren),
          investmentIncome: Number(investmentIncome),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [earnedIncome, adjustedGrossIncome, qualifyingChildren, investmentIncome, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Earned income credit"
      intro="The federal EITC from the 2026 Revenue Procedure amounts, including the investment-income disallowance."
      toolId="eitc"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([earnedIncome, adjustedGrossIncome, qualifyingChildren, investmentIncome, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.federalCredits.sourceName} §4.06</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Earned income" htmlFor="eitc-earned" hint="Wages plus net self-employment earnings">
          <InputShell prefix="$">
            <input id="eitc-earned" type="number" min="0" step="500" inputMode="decimal" value={earnedIncome} onChange={(event) => setEarnedIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Adjusted gross income" htmlFor="eitc-agi">
          <InputShell prefix="$">
            <input id="eitc-agi" type="number" min="0" step="500" inputMode="decimal" value={adjustedGrossIncome} onChange={(event) => setAdjustedGrossIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Qualifying children" htmlFor="eitc-children" hint="The credit stops rising after three">
          <span className="input-shell select-shell">
            <select id="eitc-children" value={qualifyingChildren} onChange={(event) => setQualifyingChildren(event.target.value)}>
              <option value="0">None</option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three or more</option>
            </select>
          </span>
        </Field>
        <Field label="Filing status" htmlFor="eitc-filing">
          <span className="input-shell select-shell">
            <select id="eitc-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="investment-income" title="Investment income">
        <Field label="Investment income" htmlFor="eitc-investment" hint={`The credit is $0 above ${money(snapshot.federalCredits.earnedIncomeCredit.investmentIncomeLimit)}`}>
          <InputShell prefix="$">
            <input id="eitc-investment" type="number" min="0" step="100" inputMode="decimal" value={investmentIncome} onChange={(event) => setInvestmentIncome(event.target.value)} />
          </InputShell>
        </Field>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Earned income credit"
            value={money(value.credit)}
            note={value.disallowedForInvestmentIncome
              ? 'Investment income is over the limit, so no credit is allowed'
              : `Maximum for this child count is ${money(value.maximumCredit)}`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Maximum credit', value: money(value.maximumCredit), note: 'At or above the earned-income amount, before phase-out' },
            { label: 'Phase', value: phaseLabel(value.phase), note: 'From the Revenue Procedure amounts, not the $50 IRS table bands' },
          ]} />
          <ConfidenceChip
            level="high"
            reasons={[
              'Amounts transcribed from Revenue Procedure 2025-32 §4.06',
              'The IRS lookup tables round in $50 bands, so a table cell can differ by a few dollars',
              'Age, residency and separated-spouse tests are not applied',
            ]}
          />
          <CalculationReceipt
            title={`Earned income credit — ${money(Number(earnedIncome))} earned, ${snapshot.taxYear}`}
            headline={{ label: 'Earned income credit', value: money(value.credit) }}
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
