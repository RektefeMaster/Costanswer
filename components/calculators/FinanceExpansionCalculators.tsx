'use client';

import { useMemo, useState } from 'react';
import { calculateAutoLoan } from '@/lib/calculations/auto-loan';
import { calculateAmortization } from '@/lib/calculations/amortization';
import { calculateSimpleInterest } from '@/lib/calculations/simple-interest';
import { calculateInvestment } from '@/lib/calculations/investment';
import { calculateCd } from '@/lib/calculations/cd';
import { calculateCreditCardPayoff } from '@/lib/calculations/credit-card-payoff';
import { calculateMortgagePayoff } from '@/lib/calculations/mortgage-payoff';
import { calculate401k } from '@/lib/calculations/k401';
import { calculateRothIra } from '@/lib/calculations/roth-ira';
import { calculateRetirement } from '@/lib/calculations/retirement';
import { COMPOUNDING_FREQUENCIES, type CompoundingFrequency, type ContributionTiming } from '@/lib/calculations/investment';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function frequencyLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'annually': return 'Annually';
    case 'semiannually': return 'Twice a year';
    case 'quarterly': return 'Quarterly';
    case 'monthly': return 'Monthly';
    case 'weekly': return 'Weekly';
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled frequency: ${exhaustive}`);
    }
  }
}

export function AutoLoanCalculator() {
  const [mode, setMode] = useState<'purchase' | 'financed'>('financed');
  const [vehiclePrice, setVehiclePrice] = useState('28000');
  const [downPayment, setDownPayment] = useState('4000');
  const [tradeInValue, setTradeInValue] = useState('0');
  const [taxesAndFees, setTaxesAndFees] = useState('0');
  const [financedAmount, setFinancedAmount] = useState('24000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [termMonths, setTermMonths] = useState('60');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateAutoLoan({
          mode,
          vehiclePrice: Number(vehiclePrice),
          downPayment: Number(downPayment),
          tradeInValue: Number(tradeInValue),
          taxesAndFees: Number(taxesAndFees),
          financedAmount: Number(financedAmount),
          annualRatePercent: Number(annualRatePercent),
          termMonths: Number(termMonths),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, vehiclePrice, downPayment, tradeInValue, taxesAndFees, financedAmount, annualRatePercent, termMonths]);

  return (
    <CalculatorPanel title="Auto loan payment" intro="Monthly principal and interest for a vehicle loan. Not ownership cost." toolId="auto-loan" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([mode, vehiclePrice, downPayment, tradeInValue, taxesAndFees, financedAmount, annualRatePercent, termMonths])}>
      <div className="mode-tabs" role="group" aria-label="Loan input mode">
        <button type="button" aria-pressed={mode === 'financed'} className={mode === 'financed' ? 'active' : ''} onClick={() => setMode('financed')}>Amount financed</button>
        <button type="button" aria-pressed={mode === 'purchase'} className={mode === 'purchase' ? 'active' : ''} onClick={() => setMode('purchase')}>Price and down payment</button>
      </div>
      <div className="calc-form-grid">
        {mode === 'financed' ? (
          <Field label="Amount financed" htmlFor="auto-financed"><InputShell prefix="$"><input id="auto-financed" type="number" min="1" step="100" inputMode="decimal" value={financedAmount} onChange={(event) => setFinancedAmount(event.target.value)} /></InputShell></Field>
        ) : (
          <>
            <Field label="Vehicle price" htmlFor="auto-price"><InputShell prefix="$"><input id="auto-price" type="number" min="0" step="100" inputMode="decimal" value={vehiclePrice} onChange={(event) => setVehiclePrice(event.target.value)} /></InputShell></Field>
            <Field label="Down payment" htmlFor="auto-down"><InputShell prefix="$"><input id="auto-down" type="number" min="0" step="100" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} /></InputShell></Field>
            <Field label="Trade-in" htmlFor="auto-trade"><InputShell prefix="$"><input id="auto-trade" type="number" min="0" step="100" inputMode="decimal" value={tradeInValue} onChange={(event) => setTradeInValue(event.target.value)} /></InputShell></Field>
            <Field label="Taxes and fees" htmlFor="auto-fees"><InputShell prefix="$"><input id="auto-fees" type="number" min="0" step="50" inputMode="decimal" value={taxesAndFees} onChange={(event) => setTaxesAndFees(event.target.value)} /></InputShell></Field>
          </>
        )}
        <Field label="Interest rate" htmlFor="auto-rate" hint="Nominal annual rate"><InputShell suffix="%"><input id="auto-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="auto-term"><InputShell suffix="months"><input id="auto-term" type="number" min="1" max="96" step="1" inputMode="numeric" value={termMonths} onChange={(event) => setTermMonths(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated monthly loan payment" value={money(calculation.result.value.monthlyPayment)} note={`${calculation.result.value.termMonths} months`} tone="mint" />
          <StatGrid items={[
            { label: 'Amount financed', value: money(calculation.result.value.amountFinanced) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0) },
            { label: 'Total repayment', value: money(calculation.result.value.totalRepayment, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function AmortizationCalculator() {
  const [principal, setPrincipal] = useState('200000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [termMonths, setTermMonths] = useState('360');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('0');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [showAll, setShowAll] = useState(false);
  const calculation = useMemo(() => {
    try {
      return { result: calculateAmortization({ principal: Number(principal), annualRatePercent: Number(annualRatePercent), termMonths: Number(termMonths), extraMonthlyPayment: Number(extraMonthlyPayment), startDate }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, annualRatePercent, termMonths, extraMonthlyPayment, startDate]);
  const rows = calculation.result ? (showAll ? calculation.result.value.schedule : calculation.result.value.schedule.slice(0, 12)) : [];

  return (
    <CalculatorPanel title="Amortization schedule" intro="Principal versus interest over time, using the same engine as the Loan Calculator." toolId="amortization" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([principal, annualRatePercent, termMonths, extraMonthlyPayment, startDate])}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="am-principal"><InputShell prefix="$"><input id="am-principal" type="number" min="1" step="1000" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Interest rate" htmlFor="am-rate"><InputShell suffix="%"><input id="am-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="am-term"><InputShell suffix="months"><input id="am-term" type="number" min="1" max="480" step="1" inputMode="numeric" value={termMonths} onChange={(event) => setTermMonths(event.target.value)} /></InputShell></Field>
        <Field label="Extra monthly principal" htmlFor="am-extra"><InputShell prefix="$"><input id="am-extra" type="number" min="0" step="25" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} /></InputShell></Field>
        <Field label="First payment date" htmlFor="am-start"><span className="input-shell"><input id="am-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Monthly payment" value={money(calculation.result.value.monthlyPayment)} note={`${calculation.result.value.actualPeriods} payments`} tone="mint" />
          <StatGrid items={[
            { label: 'Total principal', value: money(calculation.result.value.totalPrincipal, 0) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0) },
          ]} />
          <div className="schedule-scroll">
            <table>
              <caption className="sr-only">Amortization schedule</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Date</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Principal</th>
                  <th scope="col">Interest</th>
                  <th scope="col">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.date ?? '—'}</td>
                    <td>{money(row.payment)}</td>
                    <td>{money(row.principal)}</td>
                    <td>{money(row.interest)}</td>
                    <td>{money(row.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {calculation.result.value.schedule.length > 12 && (
            <div className="schedule-toggle">
              <button type="button" className="add-row-button" onClick={() => setShowAll((current) => !current)}>
                {showAll ? 'Show first 12 payments' : `Show all ${calculation.result.value.schedule.length} payments`}
              </button>
            </div>
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function InvestmentCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [contribution, setContribution] = useState('200');
  const [annualReturnPercent, setAnnualReturnPercent] = useState('7');
  const [years, setYears] = useState('10');
  const [compounding, setCompounding] = useState<CompoundingFrequency>('monthly');
  const [contributionFrequency, setContributionFrequency] = useState<CompoundingFrequency>('monthly');
  const [contributionTiming, setContributionTiming] = useState<ContributionTiming>('end');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateInvestment({
          principal: Number(principal),
          contribution: Number(contribution),
          contributionFrequency,
          contributionTiming,
          annualReturnPercent: Number(annualReturnPercent),
          years: Number(years),
          compounding,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, contribution, contributionFrequency, contributionTiming, annualReturnPercent, years, compounding]);

  return (
    <CalculatorPanel title="Investment projection" intro="Starting amount, recurring contributions, and an assumed return. Not a guarantee." toolId="investment" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([principal, contribution, contributionFrequency, contributionTiming, annualReturnPercent, years, compounding])}>
      <div className="calc-form-grid">
        <Field label="Starting amount" htmlFor="inv-principal"><InputShell prefix="$"><input id="inv-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Recurring contribution" htmlFor="inv-contrib"><InputShell prefix="$"><input id="inv-contrib" type="number" min="0" step="25" inputMode="decimal" value={contribution} onChange={(event) => setContribution(event.target.value)} /></InputShell></Field>
        <Field label="Assumed annual return" htmlFor="inv-return" hint="An assumption, not a forecast"><InputShell suffix="%"><input id="inv-return" type="number" min="0" max="40" step="0.1" inputMode="decimal" value={annualReturnPercent} onChange={(event) => setAnnualReturnPercent(event.target.value)} /></InputShell></Field>
        <Field label="Years" htmlFor="inv-years"><InputShell suffix="years"><input id="inv-years" type="number" min="0" max="80" step="1" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
        <Field label="Compounding" htmlFor="inv-comp">
          <span className="input-shell select-shell">
            <select id="inv-comp" value={compounding} onChange={(event) => setCompounding(event.target.value as CompoundingFrequency)}>
              {COMPOUNDING_FREQUENCIES.map((item) => <option value={item} key={item}>{frequencyLabel(item)}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Contribution frequency" htmlFor="inv-freq">
          <span className="input-shell select-shell">
            <select id="inv-freq" value={contributionFrequency} onChange={(event) => setContributionFrequency(event.target.value as CompoundingFrequency)}>
              {COMPOUNDING_FREQUENCIES.map((item) => <option value={item} key={`c-${item}`}>{frequencyLabel(item)}</option>)}
            </select>
          </span>
        </Field>
      </div>
      <div className="mode-tabs" role="group" aria-label="Contribution timing">
        <button type="button" aria-pressed={contributionTiming === 'end'} className={contributionTiming === 'end' ? 'active' : ''} onClick={() => setContributionTiming('end')}>End of period</button>
        <button type="button" aria-pressed={contributionTiming === 'beginning'} className={contributionTiming === 'beginning' ? 'active' : ''} onClick={() => setContributionTiming('beginning')}>Beginning of period</button>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated ending value" value={money(calculation.result.value.endingValue)} note="Under the return assumption you entered" tone="mint" />
          <StatGrid items={[
            { label: 'Starting principal', value: money(calculation.result.value.startingPrincipal) },
            { label: 'Total contributions', value: money(calculation.result.value.totalContributions) },
            { label: 'Modeled growth', value: money(calculation.result.value.modeledGrowth) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function SimpleInterestCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [annualRatePercent, setAnnualRatePercent] = useState('5');
  const [years, setYears] = useState('3');
  const calculation = useMemo(() => {
    try {
      return { result: calculateSimpleInterest({ principal: Number(principal), annualRatePercent: Number(annualRatePercent), years: Number(years) }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, annualRatePercent, years]);

  return (
    <CalculatorPanel title="Simple interest" intro="Interest = principal × annual rate × time. No compounding." toolId="interest" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${principal}|${annualRatePercent}|${years}`}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="si-principal"><InputShell prefix="$"><input id="si-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Annual interest rate" htmlFor="si-rate"><InputShell suffix="%"><input id="si-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Time" htmlFor="si-years"><InputShell suffix="years"><input id="si-years" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Interest" value={money(calculation.result.value.interest)} note={`Ending ${money(calculation.result.value.endingAmount)}`} tone="mint" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function CdCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [apyPercent, setApyPercent] = useState('5');
  const [years, setYears] = useState('1');
  const calculation = useMemo(() => {
    try {
      return { result: calculateCd({ principal: Number(principal), apyPercent: Number(apyPercent), years: Number(years) }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, apyPercent, years]);

  return (
    <CalculatorPanel title="Certificate of deposit" intro="Growth from the APY you type. Not a live bank rate." toolId="cd" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${principal}|${apyPercent}|${years}`}>
      <div className="calc-form-grid">
        <Field label="Principal" htmlFor="cd-principal"><InputShell prefix="$"><input id="cd-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="APY" htmlFor="cd-apy" hint="Annual percentage yield"><InputShell suffix="%"><input id="cd-apy" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={apyPercent} onChange={(event) => setApyPercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="cd-years"><InputShell suffix="years"><input id="cd-years" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Ending balance" value={money(calculation.result.value.endingBalance)} note={`${money(calculation.result.value.interestEarned)} interest`} tone="mint" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState('35');
  const [retirementAge, setRetirementAge] = useState('65');
  const [currentSavings, setCurrentSavings] = useState('50000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [assumedReturnPercent, setAssumedReturnPercent] = useState('7');
  const [goalAmount, setGoalAmount] = useState('1000000');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateRetirement({
          currentAge: Number(currentAge),
          retirementAge: Number(retirementAge),
          currentSavings: Number(currentSavings),
          monthlyContribution: Number(monthlyContribution),
          assumedReturnPercent: Number(assumedReturnPercent),
          goalAmount: Number(goalAmount),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentAge, retirementAge, currentSavings, monthlyContribution, assumedReturnPercent, goalAmount]);

  return (
    <CalculatorPanel title="Retirement projection" intro="A modeled balance at retirement under explicit assumptions. Not a readiness verdict." toolId="retirement" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentAge, retirementAge, currentSavings, monthlyContribution, assumedReturnPercent, goalAmount])}>
      <div className="calc-form-grid">
        <Field label="Current age" htmlFor="ret-age"><InputShell suffix="years"><input id="ret-age" type="number" min="18" max="100" step="1" inputMode="numeric" value={currentAge} onChange={(event) => setCurrentAge(event.target.value)} /></InputShell></Field>
        <Field label="Retirement age" htmlFor="ret-retire"><InputShell suffix="years"><input id="ret-retire" type="number" min="18" max="100" step="1" inputMode="numeric" value={retirementAge} onChange={(event) => setRetirementAge(event.target.value)} /></InputShell></Field>
        <Field label="Current savings" htmlFor="ret-now"><InputShell prefix="$"><input id="ret-now" type="number" min="0" step="1000" inputMode="decimal" value={currentSavings} onChange={(event) => setCurrentSavings(event.target.value)} /></InputShell></Field>
        <Field label="Monthly contribution" htmlFor="ret-contrib"><InputShell prefix="$"><input id="ret-contrib" type="number" min="0" step="25" inputMode="decimal" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} /></InputShell></Field>
        <Field label="Assumed annual return" htmlFor="ret-return"><InputShell suffix="%"><input id="ret-return" type="number" min="0" max="20" step="0.1" inputMode="decimal" value={assumedReturnPercent} onChange={(event) => setAssumedReturnPercent(event.target.value)} /></InputShell></Field>
        <Field label="Modeled goal" htmlFor="ret-goal"><InputShell prefix="$"><input id="ret-goal" type="number" min="0" step="10000" inputMode="decimal" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Projected balance" value={money(calculation.result.value.projectedBalance, 0)} note={`After ${calculation.result.value.years} years under these assumptions`} tone="mint" />
          <StatGrid items={[
            { label: 'Contributions included', value: money(calculation.result.value.totalContributions, 0) },
            { label: 'Modeled growth', value: money(calculation.result.value.modeledGrowth, 0) },
            { label: 'Gap vs goal', value: money(calculation.result.value.gap, 0), note: calculation.result.value.gap >= 0 ? 'At or above the modeled goal' : 'Below the modeled goal' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function K401Calculator() {
  const [currentBalance, setCurrentBalance] = useState('10000');
  const [salary, setSalary] = useState('80000');
  const [employeePercent, setEmployeePercent] = useState('6');
  const [matchRatePercent, setMatchRatePercent] = useState('50');
  const [matchSalaryCapPercent, setMatchSalaryCapPercent] = useState('6');
  const [years, setYears] = useState('30');
  const [assumedReturnPercent, setAssumedReturnPercent] = useState('7');
  const [salaryGrowthPercent, setSalaryGrowthPercent] = useState('2');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculate401k({
          currentBalance: Number(currentBalance),
          salary: Number(salary),
          employeePercent: Number(employeePercent),
          matchRatePercent: Number(matchRatePercent),
          matchSalaryCapPercent: Number(matchSalaryCapPercent),
          years: Number(years),
          assumedReturnPercent: Number(assumedReturnPercent),
          salaryGrowthPercent: Number(salaryGrowthPercent),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentBalance, salary, employeePercent, matchRatePercent, matchSalaryCapPercent, years, assumedReturnPercent, salaryGrowthPercent]);

  return (
    <CalculatorPanel title="401(k) projection" intro="Employee deferrals plus a simple employer match, grown at an assumed return." toolId="401k" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentBalance, salary, employeePercent, matchRatePercent, matchSalaryCapPercent, years, assumedReturnPercent, salaryGrowthPercent])}>
      <div className="calc-form-grid">
        <Field label="Current balance" htmlFor="k401-bal"><InputShell prefix="$"><input id="k401-bal" type="number" min="0" step="500" inputMode="decimal" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} /></InputShell></Field>
        <Field label="Salary" htmlFor="k401-salary"><InputShell prefix="$"><input id="k401-salary" type="number" min="1" step="1000" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} /></InputShell></Field>
        <Field label="Employee contribution" htmlFor="k401-emp"><InputShell suffix="% of salary"><input id="k401-emp" type="number" min="0" max="100" step="0.5" inputMode="decimal" value={employeePercent} onChange={(event) => setEmployeePercent(event.target.value)} /></InputShell></Field>
        <Field label="Employer match rate" htmlFor="k401-match"><InputShell suffix="%"><input id="k401-match" type="number" min="0" max="100" step="1" inputMode="decimal" value={matchRatePercent} onChange={(event) => setMatchRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Match applies up to" htmlFor="k401-cap" hint="Percent of salary"><InputShell suffix="% of salary"><input id="k401-cap" type="number" min="0" max="100" step="0.5" inputMode="decimal" value={matchSalaryCapPercent} onChange={(event) => setMatchSalaryCapPercent(event.target.value)} /></InputShell></Field>
        <Field label="Years" htmlFor="k401-years"><InputShell suffix="years"><input id="k401-years" type="number" min="1" max="50" step="1" inputMode="numeric" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
        <Field label="Assumed annual return" htmlFor="k401-return"><InputShell suffix="%"><input id="k401-return" type="number" min="0" max="20" step="0.1" inputMode="decimal" value={assumedReturnPercent} onChange={(event) => setAssumedReturnPercent(event.target.value)} /></InputShell></Field>
        <Field label="Salary growth" htmlFor="k401-growth"><InputShell suffix="% / year"><input id="k401-growth" type="number" min="0" max="20" step="0.1" inputMode="decimal" value={salaryGrowthPercent} onChange={(event) => setSalaryGrowthPercent(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Projected balance" value={money(calculation.result.value.endingBalance, 0)} note="Under these contribution and return assumptions" tone="mint" />
          <StatGrid items={[
            { label: 'Employee contributions', value: money(calculation.result.value.totalEmployee, 0) },
            { label: 'Employer match', value: money(calculation.result.value.totalEmployer, 0) },
            { label: 'Modeled growth', value: money(calculation.result.value.modeledGrowth, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function RothIraCalculator() {
  const [currentBalance, setCurrentBalance] = useState('5000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [years, setYears] = useState('25');
  const [assumedReturnPercent, setAssumedReturnPercent] = useState('7');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateRothIra({
          currentBalance: Number(currentBalance),
          monthlyContribution: Number(monthlyContribution),
          years: Number(years),
          assumedReturnPercent: Number(assumedReturnPercent),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentBalance, monthlyContribution, years, assumedReturnPercent]);

  return (
    <CalculatorPanel title="Roth IRA growth" intro="Contribution growth under an assumed return. Eligibility is not determined here." toolId="roth-ira" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentBalance, monthlyContribution, years, assumedReturnPercent])}>
      <div className="calc-form-grid">
        <Field label="Current balance" htmlFor="roth-bal"><InputShell prefix="$"><input id="roth-bal" type="number" min="0" step="100" inputMode="decimal" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} /></InputShell></Field>
        <Field label="Monthly contribution" htmlFor="roth-contrib"><InputShell prefix="$"><input id="roth-contrib" type="number" min="0" step="25" inputMode="decimal" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} /></InputShell></Field>
        <Field label="Years" htmlFor="roth-years"><InputShell suffix="years"><input id="roth-years" type="number" min="1" max="80" step="1" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} /></InputShell></Field>
        <Field label="Assumed annual return" htmlFor="roth-return"><InputShell suffix="%"><input id="roth-return" type="number" min="0" max="20" step="0.1" inputMode="decimal" value={assumedReturnPercent} onChange={(event) => setAssumedReturnPercent(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Projected Roth IRA growth" value={money(calculation.result.value.endingBalance, 0)} note="Not an eligibility determination" tone="mint" />
          <StatGrid items={[
            { label: 'Contributions', value: money(calculation.result.value.totalContributions, 0) },
            { label: 'Modeled growth', value: money(calculation.result.value.modeledGrowth, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function MortgagePayoffCalculator() {
  const [currentPrincipal, setCurrentPrincipal] = useState('250000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [remainingMonths, setRemainingMonths] = useState('300');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('200');
  const [startDate, setStartDate] = useState('2026-09-01');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateMortgagePayoff({
          currentPrincipal: Number(currentPrincipal),
          annualRatePercent: Number(annualRatePercent),
          remainingMonths: Number(remainingMonths),
          extraMonthlyPayment: Number(extraMonthlyPayment),
          startDate,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentPrincipal, annualRatePercent, remainingMonths, extraMonthlyPayment, startDate]);

  return (
    <CalculatorPanel title="Mortgage payoff" intro="How extra principal changes remaining interest and the payoff date." toolId="mortgage-payoff" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentPrincipal, annualRatePercent, remainingMonths, extraMonthlyPayment, startDate])}>
      <div className="calc-form-grid">
        <Field label="Current principal" htmlFor="mp-bal"><InputShell prefix="$"><input id="mp-bal" type="number" min="1" step="1000" inputMode="decimal" value={currentPrincipal} onChange={(event) => setCurrentPrincipal(event.target.value)} /></InputShell></Field>
        <Field label="Interest rate" htmlFor="mp-rate"><InputShell suffix="%"><input id="mp-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Remaining term" htmlFor="mp-term"><InputShell suffix="months"><input id="mp-term" type="number" min="1" max="480" step="1" inputMode="numeric" value={remainingMonths} onChange={(event) => setRemainingMonths(event.target.value)} /></InputShell></Field>
        <Field label="Extra monthly principal" htmlFor="mp-extra"><InputShell prefix="$"><input id="mp-extra" type="number" min="0" step="25" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} /></InputShell></Field>
        <Field label="Next payment date" htmlFor="mp-start"><span className="input-shell"><input id="mp-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Pay off sooner by"
            value={`${Math.floor(calculation.result.value.monthsSaved / 12)} years ${calculation.result.value.monthsSaved % 12} months`}
            note={calculation.result.value.acceleratedPayoffDate ? `Estimated payoff ${calculation.result.value.acceleratedPayoffDate}` : `${calculation.result.value.acceleratedMonths} remaining payments`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Scheduled P&I', value: money(calculation.result.value.scheduledPayment) },
            { label: 'Interest saved', value: money(calculation.result.value.interestSaved, 0) },
            { label: 'Baseline remaining interest', value: money(calculation.result.value.baselineInterest, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function CreditCardPayoffCalculator() {
  const [mode, setMode] = useState<'payment' | 'target-months'>('payment');
  const [balance, setBalance] = useState('4500');
  const [aprPercent, setAprPercent] = useState('21.99');
  const [monthlyPayment, setMonthlyPayment] = useState('150');
  const [targetMonths, setTargetMonths] = useState('18');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateCreditCardPayoff({
          mode,
          balance: Number(balance),
          aprPercent: Number(aprPercent),
          monthlyPayment: Number(monthlyPayment),
          targetMonths: Number(targetMonths),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, balance, aprPercent, monthlyPayment, targetMonths]);

  return (
    <CalculatorPanel title="Credit card payoff" intro="One revolving balance. For several debts, use Debt Payoff." toolId="credit-card-payoff" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([mode, balance, aprPercent, monthlyPayment, targetMonths])}>
      <div className="mode-tabs" role="group" aria-label="Payoff mode">
        <button type="button" aria-pressed={mode === 'payment'} className={mode === 'payment' ? 'active' : ''} onClick={() => setMode('payment')}>I know my payment</button>
        <button type="button" aria-pressed={mode === 'target-months'} className={mode === 'target-months' ? 'active' : ''} onClick={() => setMode('target-months')}>I have a target payoff time</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Balance" htmlFor="cc-bal"><InputShell prefix="$"><input id="cc-bal" type="number" min="0.01" step="50" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></InputShell></Field>
        <Field label="APR" htmlFor="cc-apr"><InputShell suffix="%"><input id="cc-apr" type="number" min="0" max="80" step="0.01" inputMode="decimal" value={aprPercent} onChange={(event) => setAprPercent(event.target.value)} /></InputShell></Field>
        {mode === 'payment' ? (
          <Field label="Monthly payment" htmlFor="cc-pay"><InputShell prefix="$"><input id="cc-pay" type="number" min="0" step="10" inputMode="decimal" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></InputShell></Field>
        ) : (
          <Field label="Target months" htmlFor="cc-months"><InputShell suffix="months"><input id="cc-months" type="number" min="1" max="600" step="1" inputMode="numeric" value={targetMonths} onChange={(event) => setTargetMonths(event.target.value)} /></InputShell></Field>
        )}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.status === 'paid-off' ? 'Months to payoff' : 'Payoff'}
            value={calculation.result.value.status === 'paid-off' ? `${calculation.result.value.months}` : 'Does not pay off'}
            note={calculation.result.value.status === 'paid-off' ? `${money(calculation.result.value.totalInterest)} interest` : calculation.result.value.stopReason?.replaceAll('-', ' ')}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Monthly payment', value: money(calculation.result.value.monthlyPayment) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest) },
            { label: 'Total paid', value: money(calculation.result.value.totalPaid) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
