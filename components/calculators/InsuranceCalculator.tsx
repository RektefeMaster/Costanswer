'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { calculateInsuranceBudget } from '@/lib/calculations/insurance';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney } from '@/lib/calculations/contracts';
import { insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { InsuranceDeductibleComparison } from './InsuranceDeductibleComparison';

type Frequency = 'monthly' | 'six-month' | 'annual';
type Basis = 'benchmark' | 'custom';
type Housing = 'homeowners' | 'renters' | 'none';

function PremiumInput({ id, label, amount, setAmount, frequency, setFrequency, hint }: {
  id: string; label: string; amount: string; setAmount: (value: string) => void;
  frequency: Frequency; setFrequency: (value: Frequency) => void; hint: string;
}) {
  return <>
    <Field label={label} htmlFor={id} hint={hint}>
      <InputShell prefix="$"><input id={id} type="number" min="0.01" max="1000000" step="10" value={amount} onChange={(event) => setAmount(event.target.value)} /></InputShell>
    </Field>
    <Field label="Premium covers" htmlFor={`${id}-frequency`}>
      <span className="input-shell select-shell"><select id={`${id}-frequency`} value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>
        <option value="monthly">One month</option><option value="six-month">Six months</option><option value="annual">One year</option>
      </select></span>
    </Field>
  </>;
}

export function InsuranceCalculator() {
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [housingType, setHousingType] = useState<Housing>('homeowners');
  const [includeAuto, setIncludeAuto] = useState(true);
  const [vehicleCount, setVehicleCount] = useState('1');
  const [housingBasis, setHousingBasis] = useState<Basis>('benchmark');
  const [autoBasis, setAutoBasis] = useState<Basis>('benchmark');
  const [housingPremium, setHousingPremium] = useState('');
  const [autoPremium, setAutoPremium] = useState('');
  const [housingFrequency, setHousingFrequency] = useState<Frequency>('annual');
  const [autoFrequency, setAutoFrequency] = useState<Frequency>('six-month');
  const [planningBufferPercent, setPlanningBufferPercent] = useState('0');
  const input = useMemo(() => ({ stateCode, housingType, includeAuto, vehicleCount, housingBasis, autoBasis, housingPremium, autoPremium, housingFrequency, autoFrequency, planningBufferPercent }), [stateCode, housingType, includeAuto, vehicleCount, housingBasis, autoBasis, housingPremium, autoPremium, housingFrequency, autoFrequency, planningBufferPercent]);
  const calculation = useMemo(() => {
    try { return { result: calculateInsuranceBudget(input), error: '' }; }
    catch (error) { return { result: null, error: calculationErrorMessage(error) }; }
  }, [input]);
  const result = calculation.result;
  const usesBenchmark = result ? result.datasetSnapshotIds.length > 0 : (housingType !== 'none' && housingBasis === 'benchmark') || (includeAuto && autoBasis === 'benchmark');
  const housingLabel = housingType === 'renters' ? 'Renters' : 'Homeowners';

  return <CalculatorPanel title="Your insurance budget" intro="Choose what you cover. Start with official state benchmarks, or use premiums from your own policies." toolId="insurance-cost" category="money" calculationState={result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify(input)}>
    <div className="mode-tabs insurance-modes" role="group" aria-label="Housing coverage">
      {([['homeowners', 'I own my home'], ['renters', 'I rent my home'], ['none', 'Auto only']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={housingType === value} className={housingType === value ? 'active' : ''} onClick={() => { setHousingType(value); if (value === 'none') setIncludeAuto(true); }}>{label}</button>)}
    </div>
    <div className="calc-form-grid insurance-core-inputs">
      <Field label="State" htmlFor="insurance-state" hint="State averages; your address is not collected.">
        <span className="input-shell select-shell"><select id="insurance-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>{STATE_CODES.map((code) => <option key={code} value={code}>{US_STATES[code]}</option>)}</select></span>
      </Field>
      <div className="calc-field">
        <label className="insurance-auto-toggle"><input type="checkbox" checked={includeAuto} disabled={housingType === 'none'} onChange={(event) => setIncludeAuto(event.target.checked)} /> Include auto insurance</label>
        {includeAuto && <Field label="Insured vehicles" htmlFor="insurance-vehicles">
          <span className="input-shell select-shell"><select id="insurance-vehicles" value={vehicleCount} onChange={(event) => setVehicleCount(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'vehicle' : 'vehicles'}</option>)}</select></span>
        </Field>}
      </div>
    </div>
    <details className="insurance-customize">
      <summary>Use your own premiums <span>Have a quote or renewal?</span></summary>
      <div className="calc-form-grid">
        {housingType !== 'none' && <>
          <Field label={`${housingLabel} premium source`} htmlFor="insurance-housing-basis">
            <span className="input-shell select-shell"><select id="insurance-housing-basis" value={housingBasis} onChange={(event) => setHousingBasis(event.target.value as Basis)}><option value="benchmark">Published state benchmark</option><option value="custom">My own premium</option></select></span>
          </Field>
          <div className="insurance-field-note">{housingBasis === 'benchmark' ? `NAIC ${insuranceSnapshot.observationPeriod} ${housingType === 'renters' ? 'HO-4 renters' : 'HO-3 homeowners'} average. A historical reference for one policy.` : 'Enter the full premium for one policy, including any installment fees you want counted.'}</div>
          {housingBasis === 'custom' && <PremiumInput id="insurance-housing-premium" label={`${housingLabel} premium`} amount={housingPremium} setAmount={setHousingPremium} frequency={housingFrequency} setFrequency={setHousingFrequency} hint="Your quoted or renewal amount." />}
        </>}
        {includeAuto && <>
          <Field label="Auto premium source" htmlFor="insurance-auto-basis"><span className="input-shell select-shell"><select id="insurance-auto-basis" value={autoBasis} onChange={(event) => setAutoBasis(event.target.value as Basis)}><option value="benchmark">Published state benchmark</option><option value="custom">My own premium</option></select></span></Field>
          <div className="insurance-field-note">{autoBasis === 'benchmark' ? 'Average expenditure per insured vehicle, multiplied by the vehicle count. Coverage levels vary.' : 'Enter the total for all your selected vehicles. We count this amount once.'}</div>
          {autoBasis === 'custom' && <PremiumInput id="insurance-auto-premium" label="Auto premium for all vehicles" amount={autoPremium} setAmount={setAutoPremium} frequency={autoFrequency} setFrequency={setAutoFrequency} hint="Total for all selected vehicles, not per vehicle." />}
        </>}
      </div>
    </details>
    <div className="insurance-source-note"><span className="insurance-source-dot" aria-hidden="true" /><p>{usesBenchmark ? <><strong>NAIC · {insuranceSnapshot.observationPeriod} observations</strong><span>Historical state averages. Current quotes can differ substantially.</span></> : <><strong>Your entered premiums</strong><span>The budget uses your amounts and billing periods.</span></>}</p><a href="#sources-title">View sources ↗</a></div>
    {calculation.error && <InlineError message={calculation.error} />}
    {result && <div className="calculation-output">
      <PrimaryResult label={usesBenchmark ? 'Monthly insurance budget · estimate' : 'Monthly insurance budget'} value={formatMoney(result.value.monthlyTotal)} note={`${formatMoney(result.value.annualTotal)} per year · ${US_STATES[stateCode]}`} />
      <StatGrid items={[
        { label: housingType === 'none' ? 'Housing coverage' : `${housingLabel} / year`, value: housingType === 'none' ? 'Not included' : formatMoney(result.value.housingAnnual), note: housingType === 'none' ? 'Auto only' : housingBasis === 'custom' ? 'Your premium' : `${insuranceSnapshot.observationPeriod} state average` },
        { label: 'Auto / year', value: includeAuto ? formatMoney(result.value.autoAnnual) : 'Not included', note: includeAuto ? autoBasis === 'custom' ? 'Your total premium' : `${vehicleCount} ${vehicleCount === '1' ? 'vehicle' : 'vehicles'} · historical benchmark` : 'Housing only' },
        { label: 'Combined / year', value: formatMoney(result.value.annualTotal), note: 'Premiums only; deductibles separate' },
      ]} />

      <ResultDetails breakdown={result.breakdown} assumptions={result.assumptions} calculationVersion={result.calculationVersion} datasetSnapshotIds={result.datasetSnapshotIds} />
      {housingType === 'homeowners' && <p className="insurance-next-step">Planning a purchase? Enter <strong>{formatMoney(result.value.housingAnnual)} per year</strong> as homeowners insurance in the <Link href="/money/mortgage-payment">mortgage calculator →</Link></p>}
    </div>}
      <div className="insurance-cushion"><Field label="Optional budget cushion" htmlFor="insurance-buffer" hint="Your planning scenario; not a predicted price range."><InputShell suffix="%"><input id="insurance-buffer" type="number" min="0" max="100" step="5" value={planningBufferPercent} onChange={(event) => setPlanningBufferPercent(event.target.value)} /></InputShell></Field><p><span>With your cushion</span><strong>{formatMoney(result?.value.monthlyWithBuffer ?? 0)}<small> / month</small></strong><span>{formatMoney(result?.value.annualWithBuffer ?? 0)} per year</span></p></div>
    <InsuranceDeductibleComparison />
  </CalculatorPanel>;
}
