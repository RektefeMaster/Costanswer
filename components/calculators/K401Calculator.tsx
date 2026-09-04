'use client';

import { useMemo, useState } from 'react';
import { calculate401k, PAY_FREQUENCIES, PAY_FREQUENCY_LABELS, type PayFrequency } from '@/lib/calculations/k401';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { money } from './finance-format';

export function K401Calculator() {
  const [currentBalance, setCurrentBalance] = useState('10000');
  const [salary, setSalary] = useState('80000');
  const [employeePercent, setEmployeePercent] = useState('6');
  const [matchRatePercent, setMatchRatePercent] = useState('50');
  const [matchSalaryCapPercent, setMatchSalaryCapPercent] = useState('6');
  const [years, setYears] = useState('30');
  const [assumedReturnPercent, setAssumedReturnPercent] = useState('7');
  const [salaryGrowthPercent, setSalaryGrowthPercent] = useState('2');
  const [currentAge, setCurrentAge] = useState('35');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
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
          currentAge: Number(currentAge),
          payFrequency,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentBalance, salary, employeePercent, matchRatePercent, matchSalaryCapPercent, years, assumedReturnPercent, salaryGrowthPercent, currentAge, payFrequency]);

  return (
    <CalculatorPanel title="401(k) projection" intro="Employee deferrals plus a simple employer match, grown at an assumed return." toolId="401k" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentBalance, salary, employeePercent, matchRatePercent, matchSalaryCapPercent, years, assumedReturnPercent, salaryGrowthPercent, currentAge, payFrequency])}>
      <div className="calc-form-grid">
        <Field label="Current balance" htmlFor="k401-bal"><InputShell prefix="$"><input id="k401-bal" type="number" min="0" step="500" inputMode="decimal" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} /></InputShell></Field>
        <Field label="Your age" htmlFor="k401-age" hint="Sets the catch-up limit that applies each year"><InputShell suffix="years old"><input id="k401-age" type="number" min="16" max="99" step="1" inputMode="numeric" value={currentAge} onChange={(event) => setCurrentAge(event.target.value)} /></InputShell></Field>
        <Field label="Pay frequency" htmlFor="k401-frequency" hint="How often deferrals go in">
          <span className="input-shell select-shell">
            <select id="k401-frequency" value={payFrequency} onChange={(event) => setPayFrequency(event.target.value as PayFrequency)}>
              {PAY_FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{PAY_FREQUENCY_LABELS[frequency]}</option>)}
            </select>
          </span>
        </Field>
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
            { label: 'Each paycheck', value: money(calculation.result.value.perPeriodEmployee + calculation.result.value.perPeriodEmployer), note: `${money(calculation.result.value.perPeriodEmployee)} you + ${money(calculation.result.value.perPeriodEmployer)} employer` },
          ]} />
          {calculation.result.value.yearsDeferralLimited > 0 && (
            <div className="data-callout">
              <span>IRS LIMIT</span>
              <p>
                <strong>Contributions capped in {calculation.result.value.yearsDeferralLimited} of {years} years</strong>
                <small>That percent of salary is above the elective-deferral limit for your age. Those years use the limit instead.</small>
              </p>
            </div>
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
