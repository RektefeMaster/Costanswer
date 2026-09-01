'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StateCode } from '@/lib/location/states';
import { calculateElectricityCost } from '@/lib/calculations/electricity-cost';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type StateRate = { stateCode: StateCode; stateName: string; priceCentsPerKwh: number };

export function ElectricityCostCalculator({ rates, snapshotId, observationPeriod }: { rates: StateRate[]; snapshotId: string; observationPeriod: string }) {
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [monthlyKwh, setMonthlyKwh] = useState('900');
  const [customRate, setCustomRate] = useState('');
  const selected = rates.find((rate) => rate.stateCode === stateCode) ?? rates[0];
  const effectiveRate = customRate.trim() === '' ? selected.priceCentsPerKwh : Number(customRate);

  useEffect(() => emitAnalyticsEvent('tool_opened', { toolId: 'electricity-cost', category: 'home' }), []);

  const calculation = useMemo(() => {
    try {
      return { result: calculateElectricityCost(
        { monthlyKwh: Number(monthlyKwh), rateCentsPerKwh: effectiveRate },
        customRate.trim() === '' ? snapshotId : undefined,
      ), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [monthlyKwh, effectiveRate, customRate, snapshotId]);

  const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <CalculatorPanel title="Estimate your energy charge" intro="Start with the EIA state average, then replace it with the rate on your bill.">
      <div className="data-callout">
        <span>EIA MONTHLY DATA</span>
        <p><strong>{selected.stateName}: {selected.priceCentsPerKwh.toFixed(2)}¢/kWh</strong><small>Residential state average · {observationPeriod}</small></p>
      </div>
      <div className="calc-form-grid">
        <Field label="State benchmark" htmlFor="electricity-state">
          <span className="input-shell select-shell">
            <select id="electricity-state" value={stateCode} onChange={(event) => { setStateCode(event.target.value as StateCode); setCustomRate(''); }}>
              {rates.map((rate) => <option value={rate.stateCode} key={rate.stateCode}>{rate.stateName}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Monthly use" htmlFor="monthly-kwh" hint="Find kWh on a recent bill">
          <InputShell suffix="kWh">
            <input id="monthly-kwh" type="number" min="0" step="10" inputMode="decimal" value={monthlyKwh} onChange={(event) => setMonthlyKwh(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Your rate (optional)" htmlFor="custom-electricity-rate" hint="Leave blank to use the state average">
          <InputShell suffix="¢ / kWh">
            <input id="custom-electricity-rate" type="number" min="0" step="0.01" inputMode="decimal" placeholder={selected.priceCentsPerKwh.toFixed(2)} value={customRate} onChange={(event) => setCustomRate(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated monthly energy charge" value={money(calculation.result.value.monthlyEnergyCost)} note={`${monthlyKwh || 0} kWh at ${effectiveRate.toFixed(2)}¢/kWh`} tone="amber" />
          <StatGrid items={[
            { label: 'Annualized', value: money(calculation.result.value.annualEnergyCost), note: 'Same usage × 12' },
            { label: 'Daily average', value: money(calculation.result.value.dailyEnergyCost), note: 'Annualized ÷ 365' },
            { label: 'Rate source', value: customRate ? 'Your rate' : 'EIA average', note: customRate ? 'Manual override' : observationPeriod },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
