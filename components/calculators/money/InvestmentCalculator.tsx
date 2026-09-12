'use client';

import { useMemo, useState } from 'react';
import { calculateInvestment, COMPOUNDING_FREQUENCIES, type CompoundingFrequency, type ContributionTiming } from '@/lib/calculations/investment';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { frequencyLabel, money } from '../finance-format';

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
          principal,
          contribution,
          contributionFrequency,
          contributionTiming,
          annualReturnPercent,
          years,
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
      </div>
      <AdvancedSection
        id="frequency"
        title="Compounding and contribution timing"
        hint="Both default to monthly, which is what most accounts do."
      >
        <div className="calc-form-grid">
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
      </AdvancedSection>
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
