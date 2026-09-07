'use client';

import { useMemo, useState } from 'react';
import { calculateQuarterlyEstimatedTax } from '@/lib/calculations/tax/quarterly-estimated';
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

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function QuarterlyEstimatedTaxCalculator() {
  const snapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);
  const [expectedCurrentYearTax, setExpectedCurrentYearTax] = useState('12000');
  const [priorYearTax, setPriorYearTax] = useState('10000');
  const [priorYearAgi, setPriorYearAgi] = useState('80000');
  const [expectedWithholdingAndRefundableCredits, setExpectedWithholdingAndRefundableCredits] = useState('2000');
  const [filingStatus, setFilingStatus] = useState<(typeof FILING_STATUSES)[number]>('single');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateQuarterlyEstimatedTax({
          expectedCurrentYearTax: Number(expectedCurrentYearTax),
          priorYearTax: Number(priorYearTax),
          priorYearAgi: Number(priorYearAgi),
          expectedWithholdingAndRefundableCredits: Number(expectedWithholdingAndRefundableCredits),
          filingStatus,
          taxYear: DEFAULT_TAX_YEAR,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [expectedCurrentYearTax, priorYearTax, priorYearAgi, expectedWithholdingAndRefundableCredits, filingStatus]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Quarterly estimated tax"
      intro="The Form 1040-ES required annual payment split into four equal installments, using the 90% / 100% / 110% safe harbors."
      toolId="quarterly-estimated-tax"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([expectedCurrentYearTax, priorYearTax, priorYearAgi, expectedWithholdingAndRefundableCredits, filingStatus])}
    >
      <div className="data-callout">
        <span>TAX YEAR {snapshot.taxYear}</span>
        <p>
          <strong>{snapshot.estimatedTax.sourceName}</strong>
          <small>{snapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label={`Expected ${snapshot.taxYear} tax`} htmlFor="es-current" hint="Income tax, self-employment tax and other taxes, minus refundable credits">
          <InputShell prefix="$">
            <input id="es-current" type="number" min="0" step="500" inputMode="decimal" value={expectedCurrentYearTax} onChange={(event) => setExpectedCurrentYearTax(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={`${snapshot.taxYear - 1} tax`} htmlFor="es-prior" hint="Total tax from last year's return">
          <InputShell prefix="$">
            <input id="es-prior" type="number" min="0" step="500" inputMode="decimal" value={priorYearTax} onChange={(event) => setPriorYearTax(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={`${snapshot.taxYear - 1} AGI`} htmlFor="es-agi" hint={`Over ${snapshot.estimatedTax.highIncomePriorYearAgi.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} switches the prior-year safe harbor to 110%`}>
          <InputShell prefix="$">
            <input id="es-agi" type="number" min="0" step="1000" inputMode="decimal" value={priorYearAgi} onChange={(event) => setPriorYearAgi(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Expected withholding and refundable credits" htmlFor="es-withholding">
          <InputShell prefix="$">
            <input id="es-withholding" type="number" min="0" step="500" inputMode="decimal" value={expectedWithholdingAndRefundableCredits} onChange={(event) => setExpectedWithholdingAndRefundableCredits(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Filing status" htmlFor="es-filing">
          <span className="input-shell select-shell">
            <select id="es-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as (typeof FILING_STATUSES)[number])}>
              {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label={value.paymentsRequired ? 'Each quarterly payment' : 'Estimated payments required'}
            value={value.paymentsRequired ? money(value.quarterlyPayment) : 'None'}
            note={value.paymentsRequired
              ? `Four equal installments totalling ${money(value.amountStillToPay)}`
              : 'Withholding already covers the safe harbor, or you expect to owe under $1,000'}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Required annual payment', value: money(value.requiredAnnualPayment), note: value.usedHighIncomeSafeHarbor ? '110% of last year, because prior AGI is over the threshold' : 'Smaller of 90% of this year and 100% of last year' },
            { label: 'Still to pay', value: money(value.amountStillToPay), note: 'After expected withholding and refundable credits' },
          ]} />
          {value.paymentsRequired && (
            <div className="scenario-compare">
              <table>
                <caption>Form 1040-ES due dates</caption>
                <thead>
                  <tr>
                    <th scope="col">Installment</th>
                    <th scope="col">Due</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {value.installments.map((row) => (
                    <tr key={row.installment}>
                      <th scope="row">{row.installment}</th>
                      <td>{formatDueDate(row.dueOn)}</td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ConfidenceChip
            level="high"
            reasons={[
              'Safe harbors and due dates transcribed from 2026 Form 1040-ES',
              'Equal installments only — the annualized income method is not modelled',
              'This is not a Form 2210 penalty calculation',
            ]}
          />
          <CalculationReceipt
            title={`Quarterly estimated tax — ${money(Number(expectedCurrentYearTax))} expected tax, ${snapshot.taxYear}`}
            headline={{ label: value.paymentsRequired ? 'Each quarterly payment' : 'Estimated payments', value: value.paymentsRequired ? money(value.quarterlyPayment) : 'None' }}
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
