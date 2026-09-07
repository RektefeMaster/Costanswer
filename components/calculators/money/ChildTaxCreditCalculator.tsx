'use client';

import { useMemo, useState } from 'react';
import { calculateChildTaxCredit } from '@/lib/calculations/tax/child-tax-credit';
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

export function ChildTaxCreditCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [modifiedAgi, setModifiedAgi] = useState('50000');
  const [qualifyingChildren, setQualifyingChildren] = useState('1');
  const [earnedIncome, setEarnedIncome] = useState('50000');
  const [taxBeforeThisCredit, setTaxBeforeThisCredit] = useState('5000');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [otherDependents, setOtherDependents] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateChildTaxCredit({
          modifiedAgi: Number(modifiedAgi),
          qualifyingChildren: Number(qualifyingChildren),
          otherDependents: Number(otherDependents),
          earnedIncome: Number(earnedIncome),
          taxBeforeThisCredit: Number(taxBeforeThisCredit),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [modifiedAgi, qualifyingChildren, otherDependents, earnedIncome, taxBeforeThisCredit, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Child tax credit"
      intro="The 2026 child tax credit, credit for other dependents, and additional child tax credit from Schedule 8812."
      toolId="child-tax-credit"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([modifiedAgi, qualifyingChildren, otherDependents, earnedIncome, taxBeforeThisCredit, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.federalCredits.sourceName} §4.05 and 2026 Schedule 8812</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Modified AGI" htmlFor="ctc-magi">
          <InputShell prefix="$">
            <input id="ctc-magi" type="number" min="0" step="1000" inputMode="decimal" value={modifiedAgi} onChange={(event) => setModifiedAgi(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Qualifying children under 17" htmlFor="ctc-children">
          <InputShell>
            <input id="ctc-children" type="number" min="0" max="20" step="1" inputMode="numeric" value={qualifyingChildren} onChange={(event) => setQualifyingChildren(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Earned income" htmlFor="ctc-earned" hint="Used only for the additional child tax credit">
          <InputShell prefix="$">
            <input id="ctc-earned" type="number" min="0" step="1000" inputMode="decimal" value={earnedIncome} onChange={(event) => setEarnedIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Tax before this credit" htmlFor="ctc-tax" hint="Form 1040 tax after other nonrefundable credits">
          <InputShell prefix="$">
            <input id="ctc-tax" type="number" min="0" step="100" inputMode="decimal" value={taxBeforeThisCredit} onChange={(event) => setTaxBeforeThisCredit(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="ctc-filing">
          <span className="input-shell select-shell">
            <select id="ctc-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="other-dependents" title="Other dependents">
        <Field label="Other dependents" htmlFor="ctc-other" hint="$500 each, not refundable">
          <InputShell>
            <input id="ctc-other" type="number" min="0" max="20" step="1" inputMode="numeric" value={otherDependents} onChange={(event) => setOtherDependents(event.target.value)} />
          </InputShell>
        </Field>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Total child-related credit"
            value={money(value.totalCredit)}
            note={`${money(value.nonrefundableCredit)} against tax · ${money(value.additionalChildTaxCredit)} additional child tax credit`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Nonrefundable', value: money(value.nonrefundableCredit), note: 'Limited by the tax you entered' },
            { label: 'Additional child tax credit', value: money(value.additionalChildTaxCredit), note: `Refundable, capped at ${money(snapshot.federalCredits.childTaxCredit.refundablePerQualifyingChild)} per child` },
            { label: 'Phase-out', value: money(value.phaseOutReduction), note: value.phaseOutReduction === 0 ? 'MAGI is under the threshold' : '5% of MAGI rounded up to the next $1,000 over the threshold' },
          ]} />
          <ConfidenceChip
            level="high"
            reasons={[
              'Maximum and refundable cap from Revenue Procedure 2025-32',
              'Phase-out and earned-income worksheet from the 2026 Schedule 8812 draft',
              'Part II-B for three or more children is not modelled',
            ]}
          />
          <CalculationReceipt
            title={`Child tax credit — ${value.qualifyingChildren} children, ${snapshot.taxYear}`}
            headline={{ label: 'Total credit', value: money(value.totalCredit) }}
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
