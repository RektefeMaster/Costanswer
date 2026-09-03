'use client';

import { useMemo, useState } from 'react';
import type { StateCode } from '@/lib/location/states';
import { calculateApplianceElectricity } from '@/lib/calculations/appliance-electricity';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type StateRate = { stateCode: StateCode; stateName: string; priceCentsPerKwh: number };

type ApplianceExample = {
  id: string;
  label: string;
  watts: string;
  hoursPerDay: string;
  daysPerWeek: string;
};

const APPLIANCE_EXAMPLES: ApplianceExample[] = [
  { id: 'air-conditioner', label: 'Air conditioner', watts: '1500', hoursPerDay: '8', daysPerWeek: '7' },
  { id: 'space-heater', label: 'Space heater', watts: '1500', hoursPerDay: '4', daysPerWeek: '7' },
  { id: 'gaming-pc', label: 'Gaming PC', watts: '400', hoursPerDay: '5', daysPerWeek: '7' },
  { id: 'refrigerator', label: 'Refrigerator', watts: '150', hoursPerDay: '24', daysPerWeek: '7' },
  { id: 'clothes-dryer', label: 'Clothes dryer', watts: '3000', hoursPerDay: '1', daysPerWeek: '3' },
  { id: 'pool-pump', label: 'Pool pump', watts: '1500', hoursPerDay: '8', daysPerWeek: '7' },
];

export function ApplianceElectricityCalculator({
  rates,
  snapshotId,
  observationPeriod,
}: {
  rates: StateRate[];
  snapshotId: string;
  observationPeriod: string;
}) {
  const [exampleId, setExampleId] = useState('air-conditioner');
  const [watts, setWatts] = useState('1500');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [daysPerWeek, setDaysPerWeek] = useState('7');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [customRate, setCustomRate] = useState('');
  const selected = rates.find((rate) => rate.stateCode === stateCode) ?? rates[0];
  const usingManualRate = customRate.trim() !== '';
  const effectiveRate = usingManualRate ? Number(customRate) : selected.priceCentsPerKwh;
  const source = datasetSourceDisplay({
    datasetId: 'eia-electricity',
    observationPeriod,
    sourceStatus: 'preliminary',
  });
  const selectedExample = APPLIANCE_EXAMPLES.find((example) => example.id === exampleId);

  const applyExample = (example: ApplianceExample) => {
    setExampleId(example.id);
    setWatts(example.watts);
    setHoursPerDay(example.hoursPerDay);
    setDaysPerWeek(example.daysPerWeek);
  };

  const editWatts = (value: string) => {
    setExampleId('');
    setWatts(value);
  };

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateApplianceElectricity(
          {
            watts: Number(watts),
            hoursPerDay: Number(hoursPerDay),
            daysPerWeek: Number(daysPerWeek),
            rateCentsPerKwh: effectiveRate,
          },
          usingManualRate
            ? { rateSource: 'manual' }
            : { rateSource: 'eia', datasetSnapshotId: snapshotId },
        ),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [watts, hoursPerDay, daysPerWeek, effectiveRate, usingManualRate, snapshotId]);

  const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const kwh = (value: number) => `${value.toLocaleString('en-US')} kWh`;

  return (
    <CalculatorPanel
      title="Appliance electricity cost"
      intro="Wattage, how often you run it, and a state electricity average. Example wattages are starting points you can change."
      toolId="appliance-electricity"
      category="home"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([watts, hoursPerDay, daysPerWeek, stateCode, customRate])}
    >
      <div className="data-callout">
        <span>EIA MONTHLY DATA</span>
        <p>
          <strong>{selected.stateName}: {selected.priceCentsPerKwh.toFixed(2)}¢/kWh</strong>
          <small>
            {source.line}
            {source.freshnessNote ? ` · ${source.freshnessNote}` : ''}
          </small>
        </p>
      </div>
      <div className="mode-tabs preset-tabs" role="group" aria-label="Example devices">
        {APPLIANCE_EXAMPLES.map((example) => (
          <button
            type="button"
            key={example.id}
            aria-pressed={exampleId === example.id}
            className={exampleId === example.id ? 'active' : ''}
            onClick={() => applyExample(example)}
          >
            {example.label}
          </button>
        ))}
      </div>
      <p className="decision-note">
        {selectedExample
          ? `Example wattage: ${Number(selectedExample.watts).toLocaleString('en-US')} W. You can change this value.`
          : 'Wattage is the number you entered. It is not a measured rating for a specific model.'}
      </p>
      <div className="calc-form-grid">
        <Field label="Wattage" htmlFor="appliance-watts" hint="From a label, spec sheet, or the example above">
          <InputShell suffix="W">
            <input id="appliance-watts" type="number" min="0" step="10" inputMode="decimal" value={watts} onChange={(event) => editWatts(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Hours used per day" htmlFor="appliance-hours">
          <InputShell suffix="hours">
            <input id="appliance-hours" type="number" min="0" max="24" step="0.1" inputMode="decimal" value={hoursPerDay} onChange={(event) => { setExampleId(''); setHoursPerDay(event.target.value); }} />
          </InputShell>
        </Field>
        <Field label="Days used per week" htmlFor="appliance-days">
          <InputShell suffix="days">
            <input id="appliance-days" type="number" min="0" max="7" step="1" inputMode="decimal" value={daysPerWeek} onChange={(event) => { setExampleId(''); setDaysPerWeek(event.target.value); }} />
          </InputShell>
        </Field>
        <Field label="State" htmlFor="appliance-state">
          <span className="input-shell select-shell">
            <select id="appliance-state" value={stateCode} onChange={(event) => { setStateCode(event.target.value as StateCode); setCustomRate(''); }}>
              {rates.map((rate) => <option value={rate.stateCode} key={rate.stateCode}>{rate.stateName}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Your rate (optional)" htmlFor="appliance-custom-rate" hint="Leave blank to use the state average">
          <InputShell suffix="¢ / kWh">
            <input id="appliance-custom-rate" type="number" min="0" step="0.01" inputMode="decimal" placeholder={selected.priceCentsPerKwh.toFixed(2)} value={customRate} onChange={(event) => setCustomRate(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated monthly electricity cost"
            value={money(calculation.result.value.monthlyCost)}
            note={`${kwh(calculation.result.value.kwhPerMonth)} at ${effectiveRate.toFixed(2)}¢/kWh`}
            tone="amber"
          />
          <StatGrid items={[
            { label: 'kWh per day', value: kwh(calculation.result.value.kwhPerDay), note: 'Annual use ÷ 365' },
            { label: 'kWh per month', value: kwh(calculation.result.value.kwhPerMonth), note: 'Annual use ÷ 12' },
            { label: 'kWh per year', value: kwh(calculation.result.value.kwhPerYear), note: '52 weeks of this pattern' },
            { label: 'Daily cost', value: money(calculation.result.value.dailyCost), note: 'Annual cost ÷ 365' },
            { label: 'Yearly cost', value: money(calculation.result.value.annualCost), note: 'Same usage × 52 weeks' },
            { label: 'Rate source', value: usingManualRate ? 'Manual electricity rate' : 'EIA average', note: usingManualRate ? 'Your entered rate' : source.line },
          ]} />
          <p className="data-footnote">
            {usingManualRate
              ? 'Electricity: your entered rate. The EIA state average is not used in this result.'
              : `Electricity: EIA ${selected.stateName} residential average for ${source.periodLabel}${source.freshnessNote ? `. ${source.freshnessNote}.` : '.'}`}
          </p>
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
