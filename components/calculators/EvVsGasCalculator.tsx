'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StateCode } from '@/lib/location/states';
import { calculateEvVsGas } from '@/lib/calculations/ev-vs-gas';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type StateRate = { stateCode: StateCode; stateName: string; priceCentsPerKwh: number };

export function EvVsGasCalculator({ rates, snapshotId, observationPeriod }: { rates: StateRate[]; snapshotId: string; observationPeriod: string }) {
  const [annualMiles, setAnnualMiles] = useState('12000');
  const [gasMpg, setGasMpg] = useState('28');
  const [gasPrice, setGasPrice] = useState('');
  const [evEfficiency, setEvEfficiency] = useState('28');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [customElectricityRate, setCustomElectricityRate] = useState('');
  const [chargingLoss, setChargingLoss] = useState('12');
  const selected = rates.find((rate) => rate.stateCode === stateCode) ?? rates[0];
  const electricityRate = customElectricityRate.trim() ? Number(customElectricityRate) : selected.priceCentsPerKwh;

  useEffect(() => emitAnalyticsEvent('tool_opened', { toolId: 'ev-vs-gas', category: 'auto' }), []);

  const calculation = useMemo(() => {
    if (gasPrice.trim() === '') return { result: null, error: '' };
    try {
      return { result: calculateEvVsGas({
        annualMiles: Number(annualMiles), gasMpg: Number(gasMpg), gasPricePerGallon: Number(gasPrice),
        evKwhPer100Miles: Number(evEfficiency), electricityCentsPerKwh: electricityRate,
        chargingLossPercent: Number(chargingLoss),
      }, customElectricityRate.trim() === '' ? snapshotId : undefined), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [annualMiles, gasMpg, gasPrice, evEfficiency, electricityRate, customElectricityRate, chargingLoss, snapshotId]);

  const money = (value: number, digits = 0) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });

  return (
    <CalculatorPanel title="Compare the energy, not the sticker" intro="Use a local gas price and the electricity rate you actually expect to pay.">
      <div className="comparison-inputs">
        <section>
          <p className="comparison-label gas-label">GAS VEHICLE</p>
          <Field label="Fuel economy" htmlFor="gas-mpg"><InputShell suffix="MPG"><input id="gas-mpg" type="number" min="1" step="0.1" value={gasMpg} onChange={(event) => setGasMpg(event.target.value)} /></InputShell></Field>
          <Field label="Local gas price" htmlFor="gas-price" hint="Required—use a current station price"><InputShell prefix="$" suffix="/ gal"><input id="gas-price" type="number" min="0" step="0.01" placeholder="Enter current price" value={gasPrice} onChange={(event) => setGasPrice(event.target.value)} /></InputShell></Field>
        </section>
        <section>
          <p className="comparison-label ev-label">ELECTRIC VEHICLE</p>
          <Field label="Vehicle efficiency" htmlFor="ev-efficiency"><InputShell suffix="kWh / 100 mi"><input id="ev-efficiency" type="number" min="5" step="0.1" value={evEfficiency} onChange={(event) => setEvEfficiency(event.target.value)} /></InputShell></Field>
          <Field label="Electricity benchmark" htmlFor="ev-state"><span className="input-shell select-shell"><select id="ev-state" value={stateCode} onChange={(event) => { setStateCode(event.target.value as StateCode); setCustomElectricityRate(''); }}>{rates.map((rate) => <option key={rate.stateCode} value={rate.stateCode}>{rate.stateName} · {rate.priceCentsPerKwh.toFixed(2)}¢</option>)}</select></span></Field>
          <Field label="Your electricity rate (optional)" htmlFor="ev-rate"><InputShell suffix="¢ / kWh"><input id="ev-rate" type="number" min="0" step="0.01" placeholder={selected.priceCentsPerKwh.toFixed(2)} value={customElectricityRate} onChange={(event) => setCustomElectricityRate(event.target.value)} /></InputShell></Field>
        </section>
      </div>
      <div className="calc-form-grid compact-grid">
        <Field label="Miles driven per year" htmlFor="annual-miles"><InputShell suffix="miles"><input id="annual-miles" type="number" min="0" step="100" value={annualMiles} onChange={(event) => setAnnualMiles(event.target.value)} /></InputShell></Field>
        <Field label="Charging loss" htmlFor="charging-loss" hint="Editable wall-to-battery assumption"><InputShell suffix="%"><input id="charging-loss" type="number" min="0" max="30" step="1" value={chargingLoss} onChange={(event) => setChargingLoss(event.target.value)} /></InputShell></Field>
      </div>
      {!gasPrice && <p className="calc-prompt">Enter a current local gas price to calculate the comparison. No default price is invented.</p>}
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={calculation.result.value.annualDifference >= 0 ? 'Estimated annual EV energy savings' : 'Estimated additional annual EV energy cost'}
            value={money(Math.abs(calculation.result.value.annualDifference))}
            note="Driving energy only—not total ownership cost"
            tone="blue"
          />
          <StatGrid items={[
            { label: 'Gas energy / year', value: money(calculation.result.value.gasAnnualCost), note: `${calculation.result.value.gasGallons} gallons` },
            { label: 'EV energy / year', value: money(calculation.result.value.evAnnualCost), note: `${calculation.result.value.wallKwh} wall kWh` },
            { label: 'Break-even gas price', value: money(calculation.result.value.breakEvenGasPrice, 2), note: 'At the entered EV assumptions' },
          ]} />
          <p className="data-footnote">
            {customElectricityRate.trim() === ''
              ? `Electricity benchmark: EIA ${selected.stateName} residential average for ${observationPeriod}. Use your tariff for a personal result.`
              : 'Electricity rate: your manual entry. The selected EIA state average is not used in this result.'}
          </p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
