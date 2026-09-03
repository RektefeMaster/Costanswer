'use client';

import { useMemo, useState } from 'react';
import {
  calculateCompoundInterest,
  COMPOUNDING_FREQUENCIES,
  type CompoundingFrequency,
} from '@/lib/calculations/compound-interest';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function frequencyOptionLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'annually':
      return 'Annually';
    case 'semiannually':
      return 'Twice a year';
    case 'quarterly':
      return 'Quarterly';
    case 'monthly':
      return 'Monthly';
    case 'weekly':
      return 'Weekly';
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled compounding frequency: ${exhaustive}`);
    }
  }
}

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [annualRatePercent, setAnnualRatePercent] = useState('5');
  const [years, setYears] = useState('10');
  const [contribution, setContribution] = useState('0');
  const [compounding, setCompounding] = useState<CompoundingFrequency>('annually');
  const [contributionFrequency, setContributionFrequency] = useState<CompoundingFrequency>('monthly');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateCompoundInterest({
          principal: Number(principal),
          annualRatePercent: Number(annualRatePercent),
          years: Number(years),
          contribution: Number(contribution),
          compounding,
          contributionFrequency,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [principal, annualRatePercent, years, contribution, compounding, contributionFrequency]);

  return (
    <CalculatorPanel
      title="Compound interest"
      intro="Starting amount, rate, and optional deposits. Deposits are added at the end of each contribution period."
      toolId="compound-interest"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([principal, annualRatePercent, years, contribution, compounding, contributionFrequency])}
    >
      <div className="calc-form-grid">
        <Field label="Starting amount" htmlFor="compound-principal">
          <InputShell prefix="$">
            <input id="compound-principal" type="number" min="0" step="100" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Annual interest rate" htmlFor="compound-rate">
          <InputShell suffix="%">
            <input id="compound-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Years" htmlFor="compound-years">
          <InputShell suffix="years">
            <input id="compound-years" type="number" min="0" max="80" step="1" inputMode="decimal" value={years} onChange={(event) => setYears(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Recurring contribution" htmlFor="compound-contribution" hint="Optional. Added at the end of each contribution period.">
          <InputShell prefix="$">
            <input id="compound-contribution" type="number" min="0" step="25" inputMode="decimal" value={contribution} onChange={(event) => setContribution(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Compounding" htmlFor="compound-frequency">
          <span className="input-shell select-shell">
            <select id="compound-frequency" value={compounding} onChange={(event) => setCompounding(event.target.value as CompoundingFrequency)}>
              {COMPOUNDING_FREQUENCIES.map((frequency) => (
                <option value={frequency} key={frequency}>{frequencyOptionLabel(frequency)}</option>
              ))}
            </select>
          </span>
        </Field>
        <Field label="Contribution frequency" htmlFor="contribution-frequency">
          <span className="input-shell select-shell">
            <select id="contribution-frequency" value={contributionFrequency} onChange={(event) => setContributionFrequency(event.target.value as CompoundingFrequency)}>
              {COMPOUNDING_FREQUENCIES.map((frequency) => (
                <option value={frequency} key={`contrib-${frequency}`}>{frequencyOptionLabel(frequency)}</option>
              ))}
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated ending balance"
            value={money(calculation.result.value.endingBalance)}
            note={`${money(calculation.result.value.totalGrowth)} of growth`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Starting amount', value: money(calculation.result.value.startingPrincipal), note: 'What you start with' },
            { label: 'Total contributions', value: money(calculation.result.value.totalContributions), note: 'Deposits added along the way' },
            { label: 'Growth', value: money(calculation.result.value.totalGrowth), note: 'Ending minus starting minus deposits' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
