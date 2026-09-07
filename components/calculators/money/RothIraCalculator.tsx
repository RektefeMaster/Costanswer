'use client';

import { useMemo, useState } from 'react';
import { calculateRothIra } from '@/lib/calculations/roth-ira';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

export function RothIraCalculator() {
  const [currentBalance, setCurrentBalance] = useState('5000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [years, setYears] = useState('25');
  const [assumedReturnPercent, setAssumedReturnPercent] = useState('7');
  const [currentAge, setCurrentAge] = useState('35');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateRothIra({
          currentBalance: Number(currentBalance),
          monthlyContribution: Number(monthlyContribution),
          years: Number(years),
          assumedReturnPercent: Number(assumedReturnPercent),
          currentAge: Number(currentAge),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [currentBalance, monthlyContribution, years, assumedReturnPercent, currentAge]);

  return (
    <CalculatorPanel title="Roth IRA growth" intro="Contribution growth under an assumed return. Eligibility is not determined here." toolId="roth-ira" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([currentBalance, monthlyContribution, years, assumedReturnPercent, currentAge])}>
      <div className="calc-form-grid">
        <Field label="Current balance" htmlFor="roth-bal"><InputShell prefix="$"><input id="roth-bal" type="number" min="0" step="100" inputMode="decimal" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} /></InputShell></Field>
        <Field label="Monthly contribution" htmlFor="roth-contrib"><InputShell prefix="$"><input id="roth-contrib" type="number" min="0" step="25" inputMode="decimal" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} /></InputShell></Field>
        <Field label="Your age" htmlFor="roth-age" hint="Sets the annual IRA limit, including catch-up from 50"><InputShell suffix="years old"><input id="roth-age" type="number" min="16" max="99" step="1" inputMode="numeric" value={currentAge} onChange={(event) => setCurrentAge(event.target.value)} /></InputShell></Field>
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
            { label: 'This year’s IRA limit', value: money(calculation.result.value.firstYearLimit, 0), note: `Age ${currentAge}` },
          ]} />
          {calculation.result.value.yearsLimited > 0 && (
            <div className="data-callout">
              <span>IRS LIMIT</span>
              <p>
                <strong>Contribution reduced to the IRA limit</strong>
                <small>
                  {money(calculation.result.value.requestedAnnualContribution, 0)} a year is above what the IRS allows in an IRA.
                  This projection uses the limit for your age in each of {calculation.result.value.yearsLimited} projected years.
                </small>
              </p>
            </div>
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
