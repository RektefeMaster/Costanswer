'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AFFORDABILITY_BANDS,
  calculateHomeAffordability,
  DEFAULT_CLOSING_COST_PERCENT,
  DEFAULT_MAINTENANCE_ANNUAL_PERCENT,
  STRESS_REPAIR_DOLLARS,
  verdictLabel,
  type HomeAffordabilityMode,
} from '@/lib/calculations/home-affordability';
import { defaultRateForTerm, type MortgageTermYears } from '@/lib/calculations/mortgage';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { approxMoney, roundedGuidelineMoney } from '../finance-format';

type RateSnapshot = {
  snapshotId: string;
  observationPeriod: string;
  thirtyYearFixedPercent: number;
  fifteenYearFixedPercent: number;
};

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function percent(share: number) {
  return `${(Math.round(share * 1000) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

function verdictTone(verdict: 'comfortable' | 'stretch' | 'risky') {
  switch (verdict) {
    case 'comfortable':
      return 'mint';
    case 'stretch':
      return 'amber';
    case 'risky':
      return 'coral';
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled affordability verdict: ${exhaustive}`);
    }
  }
}

export function HomeAffordabilityCalculator({ rates }: { rates: RateSnapshot }) {
  const [mode, setMode] = useState<HomeAffordabilityMode>('this-house');
  const [monthlyNetIncome, setMonthlyNetIncome] = useState('7000');
  const [monthlyExistingDebt, setMonthlyExistingDebt] = useState('400');
  const [monthlyOtherExpenses, setMonthlyOtherExpenses] = useState('2000');
  const [homePrice, setHomePrice] = useState('400000');
  const [downPayment, setDownPayment] = useState('80000');
  const [termYears, setTermYears] = useState<MortgageTermYears>(30);
  const [rateTouched, setRateTouched] = useState(false);
  const [annualRatePercent, setAnnualRatePercent] = useState(String(rates.thirtyYearFixedPercent));
  const [annualPropertyTax, setAnnualPropertyTax] = useState('0');
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState('0');
  const [monthlyHoa, setMonthlyHoa] = useState('0');
  const [maintenanceAnnualPercent, setMaintenanceAnnualPercent] = useState(String(DEFAULT_MAINTENANCE_ANNUAL_PERCENT));
  const [closingCostPercent, setClosingCostPercent] = useState(String(DEFAULT_CLOSING_COST_PERCENT));
  const [includePmiEstimate, setIncludePmiEstimate] = useState(true);

  const setTerm = (next: MortgageTermYears) => {
    setTermYears(next);
    if (!rateTouched) setAnnualRatePercent(String(defaultRateForTerm(next, rates)));
  };

  const calculation = useMemo(() => {
    if (monthlyNetIncome.trim() === '') return { result: null, error: 'Monthly take-home pay must be a number.' };
    if (annualRatePercent.trim() === '') return { result: null, error: 'Interest rate must be a number.' };
    if (mode === 'this-house' && homePrice.trim() === '') return { result: null, error: 'Home price must be a number.' };
    try {
      const shared = {
        monthlyNetIncome,
        monthlyExistingDebt,
        monthlyOtherExpenses,
        downPayment,
        termYears,
        annualRatePercent,
        annualPropertyTax,
        annualHomeInsurance,
        monthlyHoa,
        includePmiEstimate,
        maintenanceAnnualPercent,
        closingCostPercent,
      };
      const result = mode === 'this-house'
        ? calculateHomeAffordability({ mode: 'this-house', homePrice, ...shared }, rateTouched ? undefined : rates.snapshotId)
        : calculateHomeAffordability({ mode: 'how-much-house', ...shared }, rateTouched ? undefined : rates.snapshotId);
      return { result, error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, monthlyNetIncome, monthlyExistingDebt, monthlyOtherExpenses, homePrice, downPayment, termYears, annualRatePercent, annualPropertyTax, annualHomeInsurance, monthlyHoa, includePmiEstimate, maintenanceAnnualPercent, closingCostPercent, rateTouched, rates.snapshotId]);

  const result = calculation.result?.value;
  const thisHouse = result?.mode === 'this-house' ? result : null;
  const howMuch = result?.mode === 'how-much-house' ? result : null;
  const source = datasetSourceDisplay({
    datasetId: 'freddie-mac-pmms',
    observationPeriod: rates.observationPeriod,
    sourceStatus: 'preliminary',
  });

  // Property tax, insurance and HOA are optional inputs that go straight into
  // the monthly housing total. Leaving them blank does not make them zero, so
  // the result names what is missing instead of presenting a partial total as
  // the whole cost.
  const missingHousingCosts = [
    annualPropertyTax.trim() === '' || Number(annualPropertyTax) === 0 ? 'property tax' : null,
    annualHomeInsurance.trim() === '' || Number(annualHomeInsurance) === 0 ? 'home insurance' : null,
  ].filter((label): label is string => label !== null);

  return (
    <CalculatorPanel
      title="Home affordability"
      intro="A planning screen for whether a house fits take-home pay. Not a lender yes or no."
      toolId="home-affordability"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([mode, monthlyNetIncome, monthlyExistingDebt, monthlyOtherExpenses, homePrice, downPayment, termYears, annualRatePercent, annualPropertyTax, annualHomeInsurance, monthlyHoa, includePmiEstimate, maintenanceAnnualPercent, closingCostPercent])}
    >
      <div className="data-callout">
        <span>FREDDIE MAC PMMS</span>
        <p>
          <strong>30-year {rates.thirtyYearFixedPercent.toFixed(2)}% · 15-year {rates.fifteenYearFixedPercent.toFixed(2)}%</strong>
          <small>National weekly average · survey week of {source.periodLabel}
            {source.freshness !== 'current' && ` · ${source.freshnessLabel}. Check Freddie Mac for the latest week before relying on it.`}
          </small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="Affordability question">
        <button type="button" aria-pressed={mode === 'this-house'} className={mode === 'this-house' ? 'active' : ''} onClick={() => setMode('this-house')}>Can I buy this house?</button>
        <button type="button" aria-pressed={mode === 'how-much-house'} className={mode === 'how-much-house' ? 'active' : ''} onClick={() => setMode('how-much-house')}>How much house?</button>
      </div>
      <div className="mode-tabs" role="group" aria-label="Loan term">
        <button type="button" aria-pressed={termYears === 30} className={termYears === 30 ? 'active' : ''} onClick={() => setTerm(30)}>30-year fixed</button>
        <button type="button" aria-pressed={termYears === 15} className={termYears === 15 ? 'active' : ''} onClick={() => setTerm(15)}>15-year fixed</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Monthly take-home pay" htmlFor="afford-income" hint="After taxes. Not gross salary.">
          <InputShell prefix="$">
            <input id="afford-income" type="number" min="1" step="100" inputMode="decimal" value={monthlyNetIncome} onChange={(event) => setMonthlyNetIncome(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Monthly debts" htmlFor="afford-debt" hint="Car loans, student loans, cards">
          <InputShell prefix="$">
            <input id="afford-debt" type="number" min="0" step="50" inputMode="decimal" value={monthlyExistingDebt} onChange={(event) => setMonthlyExistingDebt(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Other monthly expenses" htmlFor="afford-other" hint="Food, transport, childcare, and the rest">
          <InputShell prefix="$">
            <input id="afford-other" type="number" min="0" step="50" inputMode="decimal" value={monthlyOtherExpenses} onChange={(event) => setMonthlyOtherExpenses(event.target.value)} />
          </InputShell>
        </Field>
        {mode === 'this-house' && (
          <Field label="Home price" htmlFor="afford-price">
            <InputShell prefix="$">
              <input id="afford-price" type="number" min="1" step="1000" inputMode="decimal" value={homePrice} onChange={(event) => setHomePrice(event.target.value)} />
            </InputShell>
          </Field>
        )}
        <Field label="Down payment" htmlFor="afford-down">
          <InputShell prefix="$">
            <input id="afford-down" type="number" min="0" step="1000" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Interest rate" htmlFor="afford-rate" hint={rateTouched ? 'Your rate' : 'National weekly average. Type a quote to replace it.'}>
          <InputShell suffix="%">
            <input
              id="afford-rate"
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
        title="Taxes, insurance, HOA and upkeep"
        hint="Every one has a working default. Filling them in gives the payment a lender would quote."
      >
        <div className="calc-form-grid">
          <Field label="Yearly property tax" htmlFor="afford-tax" hint="Optional">
            <InputShell prefix="$">
              <input id="afford-tax" type="number" min="0" step="100" inputMode="decimal" value={annualPropertyTax} onChange={(event) => setAnnualPropertyTax(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Yearly home insurance" htmlFor="afford-insurance" hint="Enter an annual quote or planning estimate">
            <InputShell prefix="$">
              <input id="afford-insurance" type="number" min="0" step="50" inputMode="decimal" value={annualHomeInsurance} onChange={(event) => setAnnualHomeInsurance(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Monthly HOA" htmlFor="afford-hoa" hint="Optional">
            <InputShell prefix="$">
              <input id="afford-hoa" type="number" min="0" step="10" inputMode="decimal" value={monthlyHoa} onChange={(event) => setMonthlyHoa(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Yearly repairs" htmlFor="afford-maint" hint="Share of the home price. 1% is a planning default.">
            <InputShell suffix="% / year">
              <input id="afford-maint" type="number" min="0" max="5" step="0.1" inputMode="decimal" value={maintenanceAnnualPercent} onChange={(event) => setMaintenanceAnnualPercent(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Closing costs" htmlFor="afford-closing" hint="Share of the price, on top of the down payment">
            <InputShell suffix="%">
              <input id="afford-closing" type="number" min="0" max="10" step="0.1" inputMode="decimal" value={closingCostPercent} onChange={(event) => setClosingCostPercent(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </AdvancedSection>
      <p className="decision-note">Use the <Link href="/money/insurance-cost">Insurance Cost Calculator</Link> to prepare an annual homeowners budget, then enter that amount above. Replace it with a carrier quote when available.</p>
      <div className="check-row">
        <label>
          <input type="checkbox" checked={includePmiEstimate} onChange={(event) => setIncludePmiEstimate(event.target.checked)} />
          Add a rough PMI estimate if the down payment is under 20%
        </label>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && thisHouse && thisHouse.verdict && thisHouse.housing && thisHouse.stress && thisHouse.pathToComfortable && thisHouse.homePrice !== null && thisHouse.priceGap !== null && (
        <div className="calculation-output">
          <PrimaryResult
            label="This house looks"
            value={verdictLabel(thisHouse.verdict)}
            note={`${percent(thisHouse.housingShare)} of take-home would go to housing`}
            tone={verdictTone(thisHouse.verdict)}
          />
          {missingHousingCosts.length > 0 && (
            <div className="data-callout">
              <span>INCOMPLETE</span>
              <p>
                <strong>No {missingHousingCosts.join(' or ')} entered</strong>
                <small>The monthly housing figure below leaves {missingHousingCosts.length === 1 ? 'that cost' : 'those costs'} out. A real payment will be higher.</small>
              </p>
            </div>
          )}
          <StatGrid items={[
            { label: 'Modeled monthly housing cost', value: money(thisHouse.monthlyHousingTotal), note: 'P&I plus the tax, insurance, HOA, PMI, and repair figures used' },
            { label: '6-month emergency fund', value: money(thisHouse.emergencyFundSixMonths, 0), note: 'Housing, debts, and other expenses' },
            { label: 'Cash to close', value: money(thisHouse.cashToClose ?? 0, 0), note: 'Down payment plus closing-cost rate' },
          ]} />
          <StatGrid items={[
            { label: 'Comfortable home price', value: thisHouse.comfortableHomePrice > 0 ? approxMoney(thisHouse.comfortableHomePrice) : 'None', note: `Our guideline: ≤ ${AFFORDABILITY_BANDS.comfortable.maxHousingShare * 100}% of take-home` },
            { label: 'This house', value: money(thisHouse.homePrice, 0), note: `${thisHouse.housing.loanToValuePercent}% loan-to-value` },
            { label: thisHouse.priceGap > 0 ? 'Above comfortable' : thisHouse.priceGap < 0 ? 'Below comfortable' : 'Gap', value: approxMoney(Math.abs(thisHouse.priceGap)), note: 'Versus the comfortable price' },
          ]} />
          <div className="decision-note">
            <p>
              {thisHouse.verdict === 'comfortable' && 'Housing, listed debts, and leftover cash all stay inside the comfortable caps.'}
              {thisHouse.verdict === 'stretch' && 'It can clear, but housing or leftover cash is past the comfortable caps and still inside the stretch caps.'}
              {thisHouse.verdict === 'risky' && 'Housing, debts, or leftover cash is outside the stretch caps. A lender might still say yes. This screen would not call it safe.'}
            </p>
            {thisHouse.pathToComfortable.priceCut === 0 && thisHouse.pathToComfortable.extraDownPayment === 0 && (
              <p>Nothing has to change for the comfortable band.</p>
            )}
            {thisHouse.pathToComfortable.priceCut !== null && thisHouse.pathToComfortable.priceCut > 0 && (
              <p>Cut the price by <strong>{money(thisHouse.pathToComfortable.priceCut, 0)}</strong> to reach the comfortable band with this down payment.</p>
            )}
            {thisHouse.pathToComfortable.extraDownPayment !== null && thisHouse.pathToComfortable.extraDownPayment > 0 && (
              <p>Or raise the down payment by <strong>{money(thisHouse.pathToComfortable.extraDownPayment, 0)}</strong> and keep this price.</p>
            )}
            {thisHouse.verdict !== 'comfortable' && thisHouse.pathToComfortable.extraDownPayment === null && (
              <p>Raising the down payment alone does not reach the comfortable band at this price.</p>
            )}
          </div>
          <details className="decision-stress">
            <summary>What if things go wrong?</summary>
            <ul>
              <li>
                <span><strong>Rate +1 point</strong><small>A higher quote before closing; an existing fixed rate stays fixed</small></span>
                <b>+{money(thisHouse.stress.rateBumpMonthly)}</b>
              </li>
              <li>
                <span><strong>Property tax +15%</strong><small>{annualPropertyTax.trim() === '' || Number(annualPropertyTax) === 0 ? 'No tax was entered, so this line stays $0' : 'The yearly tax you typed'}</small></span>
                <b>+{money(thisHouse.stress.taxBumpMonthly)}</b>
              </li>
              <li>
                <span><strong>{money(STRESS_REPAIR_DOLLARS, 0)} repair</strong><small>If a 6-month essential-cost reserve was already funded</small></span>
                <b>{thisHouse.stress.repairMonthsRemaining.toLocaleString('en-US', { maximumFractionDigits: 1 })} months left</b>
              </li>
              <li>
                <span><strong>Take-home pay −20%</strong><small>Housing cost held constant</small></span>
                <b>{percent(thisHouse.stress.incomeDropHousingShare)} of pay</b>
              </li>
            </ul>
          </details>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
      {calculation.result && howMuch && (
        <div className="calculation-output">
          {missingHousingCosts.length > 0 && (
            <div className="data-callout">
              <span>INCOMPLETE</span>
              <p><strong>No {missingHousingCosts.join(' or ')} entered</strong><small>These price limits leave those costs out. Enter them to get a more complete affordability estimate.</small></p>
            </div>
          )}
          <PrimaryResult
            label="Comfortable home price"
            value={howMuch.comfortableHomePrice > 0 ? roundedGuidelineMoney(howMuch.comfortableHomePrice) : 'None'}
            note="Rounded. The price that stays inside our comfortable caps"
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Comfortable', value: howMuch.comfortableHomePrice > 0 ? approxMoney(howMuch.comfortableHomePrice) : 'None', note: `≤ ${AFFORDABILITY_BANDS.comfortable.maxHousingShare * 100}% of take-home` },
            { label: 'Reasonable', value: howMuch.reasonableHomePrice > 0 ? approxMoney(howMuch.reasonableHomePrice) : 'None', note: `≤ ${AFFORDABILITY_BANDS.reasonable.maxHousingShare * 100}% of take-home` },
            { label: 'Aggressive', value: howMuch.aggressiveHomePrice > 0 ? approxMoney(howMuch.aggressiveHomePrice) : 'None', note: `≤ ${AFFORDABILITY_BANDS.aggressive.maxHousingShare * 100}% of take-home` },
          ]} />
          {howMuch.cashToClose !== null && howMuch.comfortableHomePrice > 0 && (
            <p className="decision-note">Cash to close at the comfortable price is {approxMoney(howMuch.cashToClose)} (down payment plus the closing-cost rate).</p>
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
