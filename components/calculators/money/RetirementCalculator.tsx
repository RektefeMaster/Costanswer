'use client';

import { useMemo, useState } from 'react';
import { calculateRetirement } from '@/lib/calculations/retirement';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

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
          currentAge,
          retirementAge,
          currentSavings,
          monthlyContribution,
          assumedReturnPercent,
          goalAmount,
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
      </div>
      <AdvancedSection
        id="assumptions"
        title="Return and goal"
        hint="Defaults are planning figures, not a forecast. Change them to match your own plan."
      >
        <div className="calc-form-grid">
          <Field label="Assumed annual return" htmlFor="ret-return"><InputShell suffix="%"><input id="ret-return" type="number" min="0" max="20" step="0.1" inputMode="decimal" value={assumedReturnPercent} onChange={(event) => setAssumedReturnPercent(event.target.value)} /></InputShell></Field>
          <Field label="Modeled goal" htmlFor="ret-goal"><InputShell prefix="$"><input id="ret-goal" type="number" min="0" step="10000" inputMode="decimal" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} /></InputShell></Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Projected balance" value={money(calculation.result.value.projectedBalance, 0)} note={`After ${calculation.result.value.years} years under these assumptions`} tone="mint" />
          <StatGrid items={[
            {
              label: 'Total invested',
              value: money(calculation.result.value.totalContributions, 0),
              note: `${money(calculation.result.value.startingSavings ?? 0, 0)} starting + ${money(calculation.result.value.futureContributions ?? 0, 0)} future contributions`,
            },
            { label: 'Modeled growth', value: money(calculation.result.value.modeledGrowth, 0) },
            { label: 'Gap vs goal', value: money(calculation.result.value.gap, 0), note: calculation.result.value.gap >= 0 ? 'At or above the modeled goal' : 'Below the modeled goal' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
