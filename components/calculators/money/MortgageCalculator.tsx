'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateMortgage, defaultRateForTerm, type MortgageTermYears } from '@/lib/calculations/mortgage';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { pluralize } from '@/lib/plural';

type RateSnapshot = {
  snapshotId: string;
  observationPeriod: string;
  thirtyYearFixedPercent: number;
  fifteenYearFixedPercent: number;
};

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

export function MortgageCalculator({ rates }: { rates: RateSnapshot }) {
  const [homePrice, setHomePrice] = useState('400000');
  const [downPayment, setDownPayment] = useState('80000');
  const [termYears, setTermYears] = useState<MortgageTermYears>(30);
  const [rateTouched, setRateTouched] = useState(false);
  const [annualRatePercent, setAnnualRatePercent] = useState(String(rates.thirtyYearFixedPercent));
  const [annualPropertyTax, setAnnualPropertyTax] = useState('0');
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState('0');
  const [monthlyHoa, setMonthlyHoa] = useState('0');
  const [includePmiEstimate, setIncludePmiEstimate] = useState(true);

  const setTerm = (next: MortgageTermYears) => {
    setTermYears(next);
    if (!rateTouched) setAnnualRatePercent(String(defaultRateForTerm(next, rates)));
  };

  const calculation = useMemo(() => {
    if (annualRatePercent.trim() === '') {
      return { result: null, error: 'Interest rate must be a number.' };
    }
    try {
      return {
        result: calculateMortgage({
          homePrice: Number(homePrice),
          downPayment: Number(downPayment),
          termYears,
          annualRatePercent: Number(annualRatePercent),
          annualPropertyTax: Number(annualPropertyTax),
          annualHomeInsurance: Number(annualHomeInsurance),
          monthlyHoa: Number(monthlyHoa),
          includePmiEstimate,
        }, rateTouched ? undefined : rates.snapshotId),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [homePrice, downPayment, termYears, annualRatePercent, annualPropertyTax, annualHomeInsurance, monthlyHoa, includePmiEstimate, rateTouched, rates.snapshotId]);

  const source = datasetSourceDisplay({
    datasetId: 'freddie-mac-pmms',
    observationPeriod: rates.observationPeriod,
    sourceStatus: 'preliminary',
  });

  return (
    <CalculatorPanel
      title="Monthly mortgage payment"
      intro="Starts from the dated Freddie Mac national average below. Type your own quote if you have one."
      toolId="mortgage-payment"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([homePrice, downPayment, termYears, annualRatePercent, annualPropertyTax, annualHomeInsurance, monthlyHoa, includePmiEstimate])}
    >
      <div className="data-callout">
        <span>FREDDIE MAC PMMS</span>
        <p>
          <strong>30-year {rates.thirtyYearFixedPercent.toFixed(2)}% · 15-year {rates.fifteenYearFixedPercent.toFixed(2)}%</strong>
          {/*
            PMMS publishes weekly. Once the next Thursday release is due, saying
            "this week's rate" would be a claim we cannot stand behind, so the
            callout reports which survey week this actually is.
          */}
          <small>
            National weekly average · survey week of {source.periodLabel}
            {source.freshness !== 'current' && ` · ${source.freshnessLabel}. Check Freddie Mac for the latest week before relying on it.`}
          </small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="Loan term">
        <button type="button" aria-pressed={termYears === 30} className={termYears === 30 ? 'active' : ''} onClick={() => setTerm(30)}>30-year fixed</button>
        <button type="button" aria-pressed={termYears === 15} className={termYears === 15 ? 'active' : ''} onClick={() => setTerm(15)}>15-year fixed</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Home price" htmlFor="mortgage-price">
          <InputShell prefix="$">
            <input id="mortgage-price" type="number" min="1" step="1000" inputMode="decimal" value={homePrice} onChange={(event) => setHomePrice(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Down payment" htmlFor="mortgage-down">
          <InputShell prefix="$">
            <input id="mortgage-down" type="number" min="0" step="1000" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Interest rate" htmlFor="mortgage-rate" hint={rateTouched ? 'Your rate' : 'National weekly average. Type a quote to replace it.'}>
          <InputShell suffix="%">
            <input
              id="mortgage-rate"
              type="number"
              min="0"
              max="25"
              step="0.01"
              inputMode="decimal"
              value={annualRatePercent}
              onChange={(event) => {
                setRateTouched(true);
                setAnnualRatePercent(event.target.value);
              }}
            />
          </InputShell>
        </Field>
      </div>
      <AdvancedSection
        id="carrying-costs"
        title="Taxes, insurance and HOA"
        hint="Leave these at zero for principal and interest only. Filling them in gives the payment a lender will actually quote."
      >
        <div className="calc-form-grid">
          <Field label="Yearly property tax" htmlFor="mortgage-tax" hint="Optional">
            <InputShell prefix="$">
              <input id="mortgage-tax" type="number" min="0" step="100" inputMode="decimal" value={annualPropertyTax} onChange={(event) => setAnnualPropertyTax(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Yearly home insurance" htmlFor="mortgage-insurance" hint="Enter an annual quote or planning estimate">
            <InputShell prefix="$">
              <input id="mortgage-insurance" type="number" min="0" step="50" inputMode="decimal" value={annualHomeInsurance} onChange={(event) => setAnnualHomeInsurance(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Monthly HOA" htmlFor="mortgage-hoa" hint="Optional">
            <InputShell prefix="$">
              <input id="mortgage-hoa" type="number" min="0" step="10" inputMode="decimal" value={monthlyHoa} onChange={(event) => setMonthlyHoa(event.target.value)} />
            </InputShell>
          </Field>
        </div>
        <p className="decision-note">Need an insurance budget? Use the <Link href="/money/insurance-cost">Insurance Cost Calculator</Link>, then enter its annual homeowners estimate above. A carrier quote is more specific to your home.</p>
        <div className="check-row">
          <label>
            <input type="checkbox" checked={includePmiEstimate} onChange={(event) => setIncludePmiEstimate(event.target.checked)} />
            Add a rough PMI estimate if the down payment is under 20%
          </label>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated monthly payment"
            value={money(calculation.result.value.monthlyTotal)}
            note={calculation.result.value.monthlyTotal === calculation.result.value.monthlyPrincipalAndInterest
              ? 'Principal and interest'
              : 'Principal, interest, and the extras you entered'}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Principal and interest', value: money(calculation.result.value.monthlyPrincipalAndInterest), note: `${termYears}-year fixed` },
            { label: 'Loan amount', value: money(calculation.result.value.loanAmount, 0), note: `${calculation.result.value.downPaymentPercent}% down` },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0), note: `Over ${pluralize(calculation.result.value.paymentCount, 'payment', 'payments')}` },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
