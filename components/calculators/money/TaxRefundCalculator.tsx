'use client';

import { useMemo, useState } from 'react';
import { calculateTaxRefund } from '@/lib/calculations/tax/tax-refund';
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

export function TaxRefundCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [grossIncome, setGrossIncome] = useState('100000');
  const [federalWithholding, setFederalWithholding] = useState('15000');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');
  const [netSelfEmploymentProfit, setNetSelfEmploymentProfit] = useState('0');
  const [qualifyingChildren, setQualifyingChildren] = useState('0');
  const [otherDependents, setOtherDependents] = useState('0');
  const [estimatedTaxPayments, setEstimatedTaxPayments] = useState('0');
  const [investmentIncome, setInvestmentIncome] = useState('0');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateTaxRefund({
          grossIncome: Number(grossIncome),
          netSelfEmploymentProfit: Number(netSelfEmploymentProfit),
          qualifyingChildren: Number(qualifyingChildren),
          otherDependents: Number(otherDependents),
          federalWithholding: Number(federalWithholding),
          estimatedTaxPayments: Number(estimatedTaxPayments),
          investmentIncome: Number(investmentIncome),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [grossIncome, netSelfEmploymentProfit, qualifyingChildren, otherDependents, federalWithholding, estimatedTaxPayments, investmentIncome, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Estimated federal refund"
      intro="Published 2026 income tax, child credits and EITC, minus the withholding you actually had taken out. This is not a W-4 estimate."
      toolId="tax-refund"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([grossIncome, federalWithholding, filingStatus, netSelfEmploymentProfit, qualifyingChildren, otherDependents, estimatedTaxPayments, investmentIncome])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.federal.sourceName}</strong>
          <small>{snapshot.snapshotId} · withholding is the amount you enter, not Pub. 15-T</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Gross income" htmlFor="refund-gross" hint="Wages and other non-SE income. Do not include Schedule C profit here">
          <InputShell prefix="$">
            <input id="refund-gross" type="number" min="0" step="1000" inputMode="decimal" value={grossIncome} onChange={(event) => setGrossIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Federal income tax withheld" htmlFor="refund-withholding" hint="Form W-2 box 2">
          <InputShell prefix="$">
            <input id="refund-withholding" type="number" min="0" step="100" inputMode="decimal" value={federalWithholding} onChange={(event) => setFederalWithholding(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="refund-filing">
          <span className="input-shell select-shell">
            <select id="refund-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="se-dependents-payments" title="Self-employment, dependents, estimated payments">
        <Field label="Net self-employment profit" htmlFor="refund-se" hint="Added to wages, then the deductible half of SE tax comes off AGI">
          <InputShell prefix="$">
            <input id="refund-se" type="number" step="1000" inputMode="decimal" value={netSelfEmploymentProfit} onChange={(event) => setNetSelfEmploymentProfit(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Qualifying children" htmlFor="refund-children">
          <InputShell>
            <input id="refund-children" type="number" min="0" max="20" step="1" inputMode="numeric" value={qualifyingChildren} onChange={(event) => setQualifyingChildren(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Other dependents" htmlFor="refund-other">
          <InputShell>
            <input id="refund-other" type="number" min="0" max="20" step="1" inputMode="numeric" value={otherDependents} onChange={(event) => setOtherDependents(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Estimated tax payments already made" htmlFor="refund-es">
          <InputShell prefix="$">
            <input id="refund-es" type="number" min="0" step="100" inputMode="decimal" value={estimatedTaxPayments} onChange={(event) => setEstimatedTaxPayments(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Investment income" htmlFor="refund-investment" hint="Can disallow the earned income credit">
          <InputShell prefix="$">
            <input id="refund-investment" type="number" min="0" step="100" inputMode="decimal" value={investmentIncome} onChange={(event) => setInvestmentIncome(event.target.value)} />
          </InputShell>
        </Field>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label={value.refund > 0 || value.amountOwed === 0 ? 'Estimated refund' : 'Estimated amount owed'}
            value={money(value.refund > 0 ? value.refund : value.amountOwed)}
            note={value.refund > 0 || value.amountOwed === 0
              ? 'Payments and refundable credits minus total tax'
              : 'Total tax minus payments and refundable credits'}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Federal income tax', value: money(value.federalIncomeTax), note: 'Ordinary brackets and the standard deduction' },
            { label: 'Self-employment tax', value: money(value.selfEmploymentTax), note: 'Schedule SE, if you entered a profit' },
            { label: 'Refundable credits', value: money(value.refundableCredits), note: 'EITC and additional child tax credit' },
          ]} />
          <ConfidenceChip
            level="medium"
            reasons={[
              'Income tax, EITC and child credits use the 2026 official amounts',
              'Withholding is what you type — Publication 15-T W-4 tables are not in the snapshot',
              'Adjustments, itemised deductions and other credits are not modelled, so tax can be too high',
            ]}
          />
          <CalculationReceipt
            title={`Estimated refund — ${money(Number(grossIncome))} gross, ${snapshot.taxYear}`}
            headline={{ label: value.amountOwed > 0 ? 'Amount owed' : 'Refund', value: money(value.refund > 0 ? value.refund : value.amountOwed) }}
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
