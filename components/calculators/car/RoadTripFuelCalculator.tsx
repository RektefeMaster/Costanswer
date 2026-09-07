'use client';

import { useMemo, useState } from 'react';
import type { StateCode } from '@/lib/location/states';
import { calculateRoadTripFuel } from '@/lib/calculations/road-trip-fuel';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

type GasolinePrice = {
  stateCode: StateCode;
  stateName: string;
  dollarsPerGallon: number;
  geographyLabel: string;
};

export function RoadTripFuelCalculator({
  prices,
  snapshotId,
  observationPeriod,
}: {
  prices: GasolinePrice[];
  snapshotId: string;
  observationPeriod: string;
}) {
  const [miles, setMiles] = useState('300');
  const [mpg, setMpg] = useState('28');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [customPrice, setCustomPrice] = useState('');
  const selected = prices.find((price) => price.stateCode === stateCode) ?? prices[0];
  const dollarsPerGallon = customPrice.trim() === '' ? selected.dollarsPerGallon : Number(customPrice);

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateRoadTripFuel(
          { miles: Number(miles), mpg: Number(mpg), dollarsPerGallon },
          customPrice.trim() === '' ? snapshotId : undefined,
        ),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [miles, mpg, dollarsPerGallon, customPrice, snapshotId]);

  const money = (value: number, digits = 2) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });

  return (
    <CalculatorPanel
      title="Road-trip fuel cost"
      intro="Miles, MPG, and a gas price. The default price is the most recent EIA weekly average for your state or region."
      toolId="road-trip-fuel"
      category="car"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([miles, mpg, stateCode, customPrice])}
    >
      <div className="data-callout">
        <span>EIA WEEKLY GAS</span>
        <p>
          <strong>{selected.stateName}: {money(selected.dollarsPerGallon, 3)}/gal</strong>
          <small>{selected.geographyLabel} · {datasetSourceDisplay({
            datasetId: 'eia-gasoline',
            observationPeriod,
            sourceStatus: 'preliminary',
          }).periodLabel}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Trip distance" htmlFor="trip-miles">
          <InputShell suffix="miles">
            <input id="trip-miles" type="number" min="0.1" step="10" inputMode="decimal" value={miles} onChange={(event) => setMiles(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Fuel economy" htmlFor="trip-mpg">
          <InputShell suffix="MPG">
            <input id="trip-mpg" type="number" min="1" step="0.1" inputMode="decimal" value={mpg} onChange={(event) => setMpg(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="State" htmlFor="trip-state">
          <span className="input-shell select-shell">
            <select id="trip-state" value={stateCode} onChange={(event) => { setStateCode(event.target.value as StateCode); setCustomPrice(''); }}>
              {prices.map((price) => <option value={price.stateCode} key={price.stateCode}>{price.stateName}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Pump price (optional)" htmlFor="trip-gas-price" hint="Leave blank to use the EIA average">
          <InputShell prefix="$" suffix="/ gal">
            <input id="trip-gas-price" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder={selected.dollarsPerGallon.toFixed(3)} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated fuel cost"
            value={money(calculation.result.value.tripCost)}
            note={`${calculation.result.value.gallons} gallons at ${money(dollarsPerGallon, 3)}`}
            tone="blue"
          />
          <StatGrid items={[
            { label: 'Gallons', value: `${calculation.result.value.gallons}`, note: `${miles || 0} miles ÷ ${mpg || 0} MPG` },
            { label: 'Cost per mile', value: money(calculation.result.value.costPerMile, 3), note: 'Fuel only' },
            { label: 'Price source', value: customPrice ? 'Your price' : 'EIA average', note: customPrice ? 'From a pump' : datasetSourceDisplay({
              datasetId: 'eia-gasoline',
              observationPeriod,
              sourceStatus: 'preliminary',
            }).periodLabel },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
