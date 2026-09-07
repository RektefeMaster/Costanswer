'use client';

import { useMemo, useState } from 'react';
import { calculateRefinance } from '@/lib/calculations/refinance';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { money } from './finance-format';
import { pluralize } from '@/lib/plural';

export function RefinanceCalculator({
  rates,
}: {
  rates: { snapshotId: string; observationPeriod: string; thirtyYearFixedPercent: number; fifteenYearFixedPercent: number };
}) {
  const [currentBalance, setCurrentBalance] = useState('290000');
  const [currentRatePercent, setCurrentRatePercent] = useState('7.5');
  const [currentTermYears, setCurrentTermYears] = useState('30');
  const [monthsAlreadyPaid, setMonthsAlreadyPaid] = useState('36');
  const [newRatePercent, setNewRatePercent] = useState(String(rates.thirtyYearFixedPercent));
  const [newTermYears, setNewTermYears] = useState('30');
  const [closingCosts, setClosingCosts] = useState('5000');
  const [financeClosingCosts, setFinanceClosingCosts] = useState(false);

  const source = datasetSourceDisplay({
    datasetId: 'freddie-mac-pmms',
    observationPeriod: rates.observationPeriod,
    sourceStatus: 'preliminary',
  });

  const calculation = useMemo(() => {
    if (currentRatePercent.trim() === '' || newRatePercent.trim() === '') {
      return { result: null, error: 'Enter both interest rates. Use 0 for an interest-free loan.' };
    }
    try {
      return {
        result: calculateRefinance({
          currentBalance: Number(currentBalance),
          currentRatePercent: Number(currentRatePercent),
          currentTermYears: Number(currentTermYears),
          monthsAlreadyPaid: Number(monthsAlreadyPaid),
          newRatePercent: Number(newRatePercent),
          newTermYears: Number(newTermYears),
          closingCosts: Number(closingCosts),
          financeClosingCosts,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentBalance, currentRatePercent, currentTermYears, monthsAlreadyPaid, newRatePercent, newTermYears, closingCosts, financeClosingCosts]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Refinancing this mortgage"
      intro="What the new payment would be, how long it takes to earn back the closing costs, and what the whole thing costs in interest."
      toolId="refinance"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([currentBalance, currentRatePercent, currentTermYears, monthsAlreadyPaid, newRatePercent, newTermYears, closingCosts, financeClosingCosts])}
    >
      <div className="data-callout">
        <span>FREDDIE MAC PMMS</span>
        <p>
          <strong>30-year {rates.thirtyYearFixedPercent.toFixed(2)}% · 15-year {rates.fifteenYearFixedPercent.toFixed(2)}%</strong>
          <small>
            National weekly average · survey week of {source.periodLabel}
            {source.freshness !== 'current' && ` · ${source.freshnessLabel}. Check Freddie Mac for the latest week before relying on it.`}
          </small>
        </p>
      </div>

      <div className="comparison-inputs">
        <section>
          <h3 className="comparison-label gas-label">Loan you have</h3>
          <Field label="Balance left" htmlFor="refi-balance" hint="What you owe now, not what you borrowed">
            <InputShell prefix="$"><input id="refi-balance" type="number" min="1" step="1000" inputMode="decimal" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} /></InputShell>
          </Field>
          <Field label="Interest rate" htmlFor="refi-current-rate">
            <InputShell suffix="%"><input id="refi-current-rate" type="number" min="0" max="25" step="0.05" inputMode="decimal" value={currentRatePercent} onChange={(event) => setCurrentRatePercent(event.target.value)} /></InputShell>
          </Field>
          <Field label="Original term" htmlFor="refi-current-term">
            <InputShell suffix="years"><input id="refi-current-term" type="number" min="1" max="50" step="1" inputMode="numeric" value={currentTermYears} onChange={(event) => setCurrentTermYears(event.target.value)} /></InputShell>
          </Field>
          <Field label="Payments already made" htmlFor="refi-paid" hint="Used to work out the payment you are on now">
            <InputShell suffix="months"><input id="refi-paid" type="number" min="0" max="600" step="1" inputMode="numeric" value={monthsAlreadyPaid} onChange={(event) => setMonthsAlreadyPaid(event.target.value)} /></InputShell>
          </Field>
        </section>
        <section>
          <h3 className="comparison-label ev-label">Loan you would take</h3>
          <Field label="New interest rate" htmlFor="refi-new-rate" hint="Starts at the dated national average above. Use your quote if you have one.">
            <InputShell suffix="%"><input id="refi-new-rate" type="number" min="0" max="25" step="0.05" inputMode="decimal" value={newRatePercent} onChange={(event) => setNewRatePercent(event.target.value)} /></InputShell>
          </Field>
          <Field label="New term" htmlFor="refi-new-term" hint="Going back to 30 years lowers the payment and usually raises total interest">
            <InputShell suffix="years"><input id="refi-new-term" type="number" min="1" max="50" step="1" inputMode="numeric" value={newTermYears} onChange={(event) => setNewTermYears(event.target.value)} /></InputShell>
          </Field>
          <AdvancedSection
            id="closing-costs"
            title="Closing costs"
            hint="What the refinance itself costs up front. This is the figure the break-even point is measured against."
          >
            <Field label="Closing costs" htmlFor="refi-costs" hint="Lender fees, title, appraisal, recording">
              <InputShell prefix="$"><input id="refi-costs" type="number" min="0" step="100" inputMode="decimal" value={closingCosts} onChange={(event) => setClosingCosts(event.target.value)} /></InputShell>
            </Field>
            <div className="mode-tabs" role="group" aria-label="How closing costs are paid">
              <button type="button" aria-pressed={!financeClosingCosts} className={!financeClosingCosts ? 'active' : ''} onClick={() => setFinanceClosingCosts(false)}>Pay at closing</button>
              <button type="button" aria-pressed={financeClosingCosts} className={financeClosingCosts ? 'active' : ''} onClick={() => setFinanceClosingCosts(true)}>Add to the loan</button>
            </div>
          </AdvancedSection>
        </section>
      </div>

      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label={value.breakEvenMonths === null ? 'This refinance does not lower the payment' : 'Months to earn back the closing costs'}
            value={value.breakEvenMonths === null ? 'n/a' : pluralize(value.breakEvenMonths, 'month', 'months')}
            note={value.breakEvenMonths === null
              ? `The new payment is ${money(Math.abs(value.monthlyChange))} higher, so there is nothing to earn back`
              : `Saving ${money(value.monthlyChange)} a month against ${money(Number(closingCosts) || 0, 0)} of closing costs`}
            tone="mint"
          />
          {value.lowerPaymentHigherInterest && (
            <div className="data-callout">
              <span>WORTH KNOWING</span>
              <p>
                <strong>Lower payment, more interest overall</strong>
                <small>
                  The payment drops by {money(value.monthlyChange)}, but restarting the term means paying{' '}
                  {money(value.lifetimeInterestChange, 0)} more interest across the life of the loan. Both can be true at once.
                </small>
              </p>
            </div>
          )}
          <StatGrid items={[
            { label: 'Payment now', value: money(value.currentMonthlyPayment), note: `${pluralize(value.monthsLeftOnCurrentLoan, 'payment', 'payments')} left` },
            { label: 'Payment after', value: money(value.newMonthlyPayment), note: `${pluralize(value.newPaymentCount, 'payment', 'payments')} on the new loan` },
            { label: value.monthlyChange >= 0 ? 'Monthly saving' : 'Monthly increase', value: money(Math.abs(value.monthlyChange)) },
            { label: 'Cash at closing', value: money(value.cashOutlay, 0), note: financeClosingCosts ? 'Costs rolled into the balance instead' : 'Paid up front' },
            { label: 'New loan amount', value: money(value.newLoanAmount, 0), note: financeClosingCosts ? 'Balance plus closing costs' : 'Balance only' },
            {
              label: value.lifetimeInterestChange <= 0 ? 'Interest saved over the life' : 'Extra interest over the life',
              value: money(Math.abs(value.lifetimeInterestChange), 0),
              note: 'Including closing costs',
            },
          ]} />
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
