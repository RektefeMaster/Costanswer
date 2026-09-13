'use client';

import { useMemo, useState } from 'react';
import {
  calculateVaFundingFee,
  VA_LOAN_TYPE_LABELS,
  VA_LOAN_TYPES,
  type VaLoanType,
} from '@/lib/calculations/va-funding-fee';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { vaFundingFeeSnapshot } from '@/lib/data/va-funding-fee';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

const usesDownPayment = (loanType: VaLoanType) => loanType === 'purchase';
const usesFirstUse = (loanType: VaLoanType) => loanType === 'purchase' || loanType === 'cash-out';

export function VaFundingFeeCalculator() {
  const [loanType, setLoanType] = useState<VaLoanType>('purchase');
  const [loanAmount, setLoanAmount] = useState('350000');
  const [firstUse, setFirstUse] = useState(true);
  const [downPaymentPercent, setDownPaymentPercent] = useState('0');
  const [exempt, setExempt] = useState(false);
  const [financeFee, setFinanceFee] = useState(true);

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateVaFundingFee({
          loanType,
          loanAmount,
          firstUse,
          downPaymentPercent,
          exempt,
          financeFee,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [loanType, loanAmount, firstUse, downPaymentPercent, exempt, financeFee]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="VA funding fee on this loan"
      intro="A one-time percentage of the loan amount from the charts VA last revised on 7 April 2023. Not monthly mortgage insurance, and not an entitlement decision."
      toolId="va-funding-fee"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([loanType, loanAmount, firstUse, downPaymentPercent, exempt, financeFee])}
    >
      <div className="data-callout">
        <span>EFFECTIVE {vaFundingFeeSnapshot.effectiveFrom}</span>
        <p>
          <strong>VA funding fee rate charts</strong>
          <small>{vaFundingFeeSnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Loan type" htmlFor="va-fee-type">
          <span className="input-shell select-shell">
            <select id="va-fee-type" value={loanType} onChange={(event) => setLoanType(event.target.value as VaLoanType)}>
              {VA_LOAN_TYPES.map((type) => (
                <option key={type} value={type}>{VA_LOAN_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </span>
        </Field>
        <Field label="Loan amount" htmlFor="va-fee-amount" hint="The financed amount before adding this fee">
          <InputShell prefix="$">
            <input id="va-fee-amount" type="number" min="0" step="1000" inputMode="decimal" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
          </InputShell>
        </Field>
        {usesDownPayment(loanType) && (
          <Field label="Down payment" htmlFor="va-fee-down" hint="Percent of the purchase price. The 5% and 10% steps are the ones VA prints.">
            <InputShell suffix="%">
              <input id="va-fee-down" type="number" min="0" max="100" step="0.5" inputMode="decimal" value={downPaymentPercent} onChange={(event) => setDownPaymentPercent(event.target.value)} />
            </InputShell>
          </Field>
        )}
        <Field label="Pay the fee" htmlFor="va-fee-finance">
          <span className="input-shell select-shell">
            <select id="va-fee-finance" value={financeFee ? 'finance' : 'cash'} onChange={(event) => setFinanceFee(event.target.value === 'finance')}>
              <option value="finance">Finance it into the loan</option>
              <option value="cash">Pay it in cash at closing</option>
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="va-fee-extra" title="Exemption and a prior VA loan" hint="Disability compensation, DIC, or a Purple Heart can zero the fee. VA still has to agree.">
        <div className="calc-form-grid">
          {usesFirstUse(loanType) && (
            <Field label="Have you used a VA home loan before?" htmlFor="va-fee-use">
              <span className="input-shell select-shell">
                <select id="va-fee-use" value={firstUse ? 'first' : 'subsequent'} onChange={(event) => setFirstUse(event.target.value === 'first')}>
                  <option value="first">No — first use</option>
                  <option value="subsequent">Yes — after first use</option>
                </select>
              </span>
            </Field>
          )}
          <Field label="Exemption" htmlFor="va-fee-exempt" hint="Disability compensation, DIC surviving spouse, or Purple Heart, among others. VA decides.">
            <span className="input-shell select-shell">
              <select id="va-fee-exempt" value={exempt ? 'yes' : 'no'} onChange={(event) => setExempt(event.target.value === 'yes')}>
                <option value="no">No exemption claimed here</option>
                <option value="yes">I believe I am exempt</option>
              </select>
            </span>
          </Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {value && calculation.result && (
        <>
          <PrimaryResult
            label={value.exempt ? 'Funding fee' : 'VA funding fee'}
            value={money(value.fee)}
            note={value.exempt ? 'You marked an exemption. Confirm it with the lender and VA before closing.' : `${value.ratePercent}% of the base loan amount${value.financed ? ', added to the note' : ''}.`}
          />
          <StatGrid items={[
            { label: 'Published rate', value: value.exempt ? 'Exempt' : `${value.ratePercent}%` },
            { label: 'Base loan', value: money(value.loanAmountBeforeFee, 0) },
            { label: value.financed ? 'Loan with fee' : 'Loan unchanged', value: money(value.loanAmountAfterFee, 0) },
          ]} />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
            headline={{ label: 'VA funding fee', value: money(value.fee) }}
          />
        </>
      )}
    </CalculatorPanel>
  );
}
