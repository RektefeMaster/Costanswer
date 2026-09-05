'use client';

import { useMemo, useState } from 'react';
import {
  EXAMPLE_MONTHLY_INSURANCE,
  EXAMPLE_MONTHLY_MAINTENANCE,
  calculateCarAffordability,
  type CarAffordabilityMode,
  type CarIncomeMode,
} from '@/lib/calculations/car-affordability';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from '@/lib/calculations/tax/types';
import {
  VEHICLE_AFFORDABILITY_BANDS,
  vehicleVerdictLabel,
  type Powertrain,
  type VehicleAffordabilityVerdict,
} from '@/lib/calculations/vehicle';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { siteConfig } from '@/lib/site-config';
import type { StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { approxMoney, roundedGuidelineMoney } from './finance-format';

export type VehicleStateEnergy = {
  stateCode: StateCode;
  stateName: string;
  dollarsPerGallon: number;
  gasolineGeographyLabel: string;
  priceCentsPerKwh: number;
};

type SnapshotMeta = { snapshotId: string; observationPeriod: string };

function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

function percent(share: number) {
  return `${(Math.round(share * 1000) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

const COMFORTABLE = VEHICLE_AFFORDABILITY_BANDS.comfortable;
const REASONABLE = VEHICLE_AFFORDABILITY_BANDS.reasonable;

function cap(share: number) {
  return `${share * 100}%`;
}

/** Reads the thresholds from the rules layer. Nothing here re-declares a band. */
function guidelineSentence(verdict: VehicleAffordabilityVerdict): string {
  switch (verdict) {
    case 'comfortable':
      return `the whole vehicle stays at or under ${cap(COMFORTABLE.maxTotalShare)} of take-home pay and the loan payment alone at or under ${cap(COMFORTABLE.maxPaymentShare)}.`;
    case 'stretch':
      return `the whole vehicle or the payment is above our comfortable caps of ${cap(COMFORTABLE.maxTotalShare)} and ${cap(COMFORTABLE.maxPaymentShare)} of take-home pay, and still inside ${cap(REASONABLE.maxTotalShare)} and ${cap(REASONABLE.maxPaymentShare)}.`;
    case 'risky':
      return `the whole vehicle or the payment is above ${cap(REASONABLE.maxTotalShare)} and ${cap(REASONABLE.maxPaymentShare)} of take-home pay, which is the top of our range. A lender may still approve it.`;
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled vehicle affordability verdict: ${exhaustive}`);
    }
  }
}

export function CarAffordabilityCalculator({
  states,
  gasoline,
  electricity,
  taxYear,
}: {
  states: VehicleStateEnergy[];
  gasoline: SnapshotMeta;
  electricity: SnapshotMeta;
  taxYear: number;
}) {
  const [mode, setMode] = useState<CarAffordabilityMode>('this-car');
  const [powertrain, setPowertrain] = useState<Powertrain>('gas');
  const [incomeMode, setIncomeMode] = useState<CarIncomeMode>('take-home');
  const [monthlyTakeHome, setMonthlyTakeHome] = useState('4000');
  const [annualGrossSalary, setAnnualGrossSalary] = useState('75000');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [vehiclePrice, setVehiclePrice] = useState('32000');
  const [downPayment, setDownPayment] = useState('5000');
  const [tradeInValue, setTradeInValue] = useState('0');
  const [salesTaxAndFees, setSalesTaxAndFees] = useState('0');
  const [annualRatePercent, setAnnualRatePercent] = useState('7');
  const [termMonths, setTermMonths] = useState('60');
  const [annualMiles, setAnnualMiles] = useState('12000');
  const [mpg, setMpg] = useState('28');
  const [kwhPer100Miles, setKwhPer100Miles] = useState('30');
  const [chargingLossPercent, setChargingLossPercent] = useState('10');
  const [customGasPrice, setCustomGasPrice] = useState('');
  const [customElectricityRate, setCustomElectricityRate] = useState('');
  const [monthlyInsurance, setMonthlyInsurance] = useState(String(EXAMPLE_MONTHLY_INSURANCE));
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(String(EXAMPLE_MONTHLY_MAINTENANCE));
  const [annualRegistration, setAnnualRegistration] = useState('0');

  const selected = states.find((row) => row.stateCode === stateCode) ?? states[0];
  const usingManualEnergyRate = powertrain === 'gas'
    ? customGasPrice.trim() !== ''
    : customElectricityRate.trim() !== '';
  const gasolineSource = datasetSourceDisplay({
    datasetId: 'eia-gasoline',
    observationPeriod: gasoline.observationPeriod,
    sourceStatus: 'preliminary',
  });
  const electricitySource = datasetSourceDisplay({
    datasetId: 'eia-electricity',
    observationPeriod: electricity.observationPeriod,
    sourceStatus: 'preliminary',
  });
  const energySource = powertrain === 'gas' ? gasolineSource : electricitySource;

  const calculation = useMemo(() => {
    try {
      const income = incomeMode === 'take-home'
        ? { incomeMode: 'take-home' as const, monthlyTakeHome: Number(monthlyTakeHome) }
        : {
            incomeMode: 'gross-salary' as const,
            annualGrossSalary: Number(annualGrossSalary),
            filingStatus,
            taxYear,
          };
      const driving = powertrain === 'gas'
        ? {
            powertrain: 'gas' as const,
            annualMiles: Number(annualMiles),
            mpg: Number(mpg),
            dollarsPerGallon: customGasPrice.trim() === '' ? selected.dollarsPerGallon : Number(customGasPrice),
          }
        : {
            powertrain: 'ev' as const,
            annualMiles: Number(annualMiles),
            kwhPer100Miles: Number(kwhPer100Miles),
            electricityCentsPerKwh: customElectricityRate.trim() === '' ? selected.priceCentsPerKwh : Number(customElectricityRate),
            chargingLossPercent: Number(chargingLossPercent),
          };
      const shared = {
        state: stateCode,
        income,
        driving,
        downPayment: Number(downPayment),
        tradeInValue: Number(tradeInValue),
        salesTaxAndFees: Number(salesTaxAndFees),
        annualRatePercent: Number(annualRatePercent),
        termMonths: Number(termMonths),
        monthlyInsurance: Number(monthlyInsurance),
        monthlyMaintenance: Number(monthlyMaintenance),
        annualRegistration: Number(annualRegistration),
      };
      const options = usingManualEnergyRate
        ? { energyRateSource: 'manual' as const }
        : {
            energyRateSource: 'official' as const,
            energySnapshotId: powertrain === 'gas' ? gasoline.snapshotId : electricity.snapshotId,
          };
      const result = mode === 'this-car'
        ? calculateCarAffordability({ mode: 'this-car', vehiclePrice: Number(vehiclePrice), ...shared }, options)
        : calculateCarAffordability({ mode: 'how-much-car', ...shared }, options);
      return { result, error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [
    mode, powertrain, incomeMode, monthlyTakeHome, annualGrossSalary, filingStatus, taxYear, stateCode,
    vehiclePrice, downPayment, tradeInValue, salesTaxAndFees, annualRatePercent, termMonths,
    annualMiles, mpg, kwhPer100Miles, chargingLossPercent, customGasPrice, customElectricityRate,
    monthlyInsurance, monthlyMaintenance, annualRegistration, usingManualEnergyRate,
    selected, gasoline.snapshotId, electricity.snapshotId,
  ]);

  const result = calculation.result?.value;
  const thisCar = result?.mode === 'this-car' ? result : null;
  const howMuch = result?.mode === 'how-much-car' ? result : null;
  const takeHomeLabel = incomeMode === 'gross-salary' ? 'estimated monthly take-home pay' : 'monthly take-home pay';
  const energySourceNote = usingManualEnergyRate
    ? powertrain === 'gas'
      ? 'Fuel: the pump price you entered. No EIA average is used in this result.'
      : 'Charging: the electricity rate you entered. No EIA state average is used in this result.'
    : powertrain === 'gas'
      ? `Fuel: EIA regular-gasoline average for ${selected.stateName} (${selected.gasolineGeographyLabel}), ${gasolineSource.periodLabel}.`
      : `Charging: EIA ${selected.stateName} residential average for ${electricitySource.periodLabel}${electricitySource.freshnessNote ? `. ${electricitySource.freshnessNote}` : '.'}`;

  // Insurance and upkeep ship with planning defaults, and both feed the
  // Comfortable / Stretch / Risky verdict. A verdict computed from numbers the
  // reader never entered should say so rather than read as their own result.
  const placeholderInputs = [
    Number(monthlyInsurance) === EXAMPLE_MONTHLY_INSURANCE ? 'insurance' : null,
    Number(monthlyMaintenance) === EXAMPLE_MONTHLY_MAINTENANCE ? 'upkeep' : null,
  ].filter((label): label is string => label !== null);

  return (
    <CalculatorPanel
      title="Car affordability"
      intro="What a car costs you out of pocket each month, and how much of your take-home pay that would be. Depreciation is not included."
      toolId="car-affordability"
      category="car"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([
        mode, powertrain, incomeMode, monthlyTakeHome, annualGrossSalary, filingStatus, stateCode,
        vehiclePrice, downPayment, tradeInValue, salesTaxAndFees, annualRatePercent, termMonths,
        annualMiles, mpg, kwhPer100Miles, chargingLossPercent, customGasPrice, customElectricityRate,
        monthlyInsurance, monthlyMaintenance, annualRegistration,
      ])}
    >
      <div className="data-callout">
        <span>{powertrain === 'gas' ? 'EIA WEEKLY GAS' : 'EIA MONTHLY ELECTRICITY'}</span>
        <p>
          <strong>
            {powertrain === 'gas'
              ? `${selected.stateName}: ${money(selected.dollarsPerGallon, 3)}/gal`
              : `${selected.stateName}: ${selected.priceCentsPerKwh.toFixed(2)}¢/kWh`}
          </strong>
          <small>
            {powertrain === 'gas' ? `${selected.gasolineGeographyLabel} · ` : ''}
            {energySource.line}
            {energySource.freshness !== 'current' ? ` · ${energySource.freshnessLabel}` : ''}
          </small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="Affordability question">
        <button type="button" aria-pressed={mode === 'this-car'} className={mode === 'this-car' ? 'active' : ''} onClick={() => setMode('this-car')}>Can I afford this car?</button>
        <button type="button" aria-pressed={mode === 'how-much-car'} className={mode === 'how-much-car' ? 'active' : ''} onClick={() => setMode('how-much-car')}>How much car?</button>
      </div>
      <div className="mode-tabs" role="group" aria-label="Powertrain">
        <button type="button" aria-pressed={powertrain === 'gas'} className={powertrain === 'gas' ? 'active' : ''} onClick={() => setPowertrain('gas')}>Gasoline</button>
        <button type="button" aria-pressed={powertrain === 'ev'} className={powertrain === 'ev' ? 'active' : ''} onClick={() => setPowertrain('ev')}>Electric</button>
      </div>
      <div className="mode-tabs" role="group" aria-label="Income">
        <button type="button" aria-pressed={incomeMode === 'take-home'} className={incomeMode === 'take-home' ? 'active' : ''} onClick={() => setIncomeMode('take-home')}>I know my take-home</button>
        <button type="button" aria-pressed={incomeMode === 'gross-salary'} className={incomeMode === 'gross-salary' ? 'active' : ''} onClick={() => setIncomeMode('gross-salary')}>Estimate from salary</button>
      </div>
      <div className="calc-form-grid">
        {incomeMode === 'take-home' ? (
          <Field label="Monthly take-home pay" htmlFor="car-take-home" hint="After taxes and deductions. Not gross salary.">
            <InputShell prefix="$">
              <input id="car-take-home" type="number" min="0" step="100" inputMode="decimal" value={monthlyTakeHome} onChange={(event) => setMonthlyTakeHome(event.target.value)} />
            </InputShell>
          </Field>
        ) : (
          <>
            <Field label="Annual gross salary" htmlFor="car-salary" hint={`Take-home is estimated for tax year ${taxYear}.`}>
              <InputShell prefix="$">
                <input id="car-salary" type="number" min="0" step="1000" inputMode="decimal" value={annualGrossSalary} onChange={(event) => setAnnualGrossSalary(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Filing status" htmlFor="car-filing-status">
              <span className="input-shell select-shell">
                <select id="car-filing-status" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as FilingStatus)}>
                  {FILING_STATUSES.map((status) => <option value={status} key={status}>{FILING_STATUS_LABELS[status]}</option>)}
                </select>
              </span>
            </Field>
          </>
        )}
        <Field label="State" htmlFor="car-state" hint={incomeMode === 'gross-salary' ? 'Sets the energy price and the state income tax' : 'Sets the energy price'}>
          <span className="input-shell select-shell">
            <select
              id="car-state"
              value={stateCode}
              onChange={(event) => {
                setStateCode(event.target.value as StateCode);
                setCustomGasPrice('');
                setCustomElectricityRate('');
              }}
            >
              {states.map((row) => <option value={row.stateCode} key={row.stateCode}>{row.stateName}</option>)}
            </select>
          </span>
        </Field>
        {mode === 'this-car' && (
          <Field label="Vehicle price" htmlFor="car-price" hint="The number you are quoted. We do not look up market prices.">
            <InputShell prefix="$">
              <input id="car-price" type="number" min="1" step="500" inputMode="decimal" value={vehiclePrice} onChange={(event) => setVehiclePrice(event.target.value)} />
            </InputShell>
          </Field>
        )}
        <Field label="Down payment" htmlFor="car-down" hint="Cash you hand over at signing">
          <InputShell prefix="$">
            <input id="car-down" type="number" min="0" step="500" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Trade-in value" htmlFor="car-trade-in" hint="Optional. Credited like a down payment, but not cash.">
          <InputShell prefix="$">
            <input id="car-trade-in" type="number" min="0" step="500" inputMode="decimal" value={tradeInValue} onChange={(event) => setTradeInValue(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Sales tax and fees" htmlFor="car-fees" hint="Optional. Added to the amount financed.">
          <InputShell prefix="$">
            <input id="car-fees" type="number" min="0" step="100" inputMode="decimal" value={salesTaxAndFees} onChange={(event) => setSalesTaxAndFees(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Interest rate" htmlFor="car-rate" hint="Your quoted rate. There is no car-loan rate feed here.">
          <InputShell suffix="%">
            <input id="car-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Loan term" htmlFor="car-term" hint="Use 0 for a cash purchase">
          <InputShell suffix="months">
            <input id="car-term" type="number" min="0" max="120" step="6" inputMode="numeric" value={termMonths} onChange={(event) => setTermMonths(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Miles driven per year" htmlFor="car-miles">
          <InputShell suffix="miles">
            <input id="car-miles" type="number" min="0" step="1000" inputMode="decimal" value={annualMiles} onChange={(event) => setAnnualMiles(event.target.value)} />
          </InputShell>
        </Field>
        {powertrain === 'gas' ? (
          <>
            <Field label="Fuel economy" htmlFor="car-mpg">
              <InputShell suffix="MPG">
                <input id="car-mpg" type="number" min="1" max="200" step="1" inputMode="decimal" value={mpg} onChange={(event) => setMpg(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Pump price (optional)" htmlFor="car-gas-price" hint="Leave blank to use the EIA average">
              <InputShell prefix="$" suffix="/ gal">
                <input id="car-gas-price" type="number" min="0" max="20" step="0.01" inputMode="decimal" placeholder={selected.dollarsPerGallon.toFixed(3)} value={customGasPrice} onChange={(event) => setCustomGasPrice(event.target.value)} />
              </InputShell>
            </Field>
          </>
        ) : (
          <>
            <Field label="EV efficiency" htmlFor="car-kwh-100" hint="Battery energy per 100 miles">
              <InputShell suffix="kWh / 100 mi">
                <input id="car-kwh-100" type="number" min="5" max="100" step="1" inputMode="decimal" value={kwhPer100Miles} onChange={(event) => setKwhPer100Miles(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Charging loss" htmlFor="car-charging-loss" hint="Added on top of battery energy">
              <InputShell suffix="%">
                <input id="car-charging-loss" type="number" min="0" max="30" step="1" inputMode="decimal" value={chargingLossPercent} onChange={(event) => setChargingLossPercent(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Your rate (optional)" htmlFor="car-electricity-rate" hint="Leave blank to use the state average">
              <InputShell suffix="¢ / kWh">
                <input id="car-electricity-rate" type="number" min="0" max="200" step="0.01" inputMode="decimal" placeholder={selected.priceCentsPerKwh.toFixed(2)} value={customElectricityRate} onChange={(event) => setCustomElectricityRate(event.target.value)} />
              </InputShell>
            </Field>
          </>
        )}
        <Field label="Insurance" htmlFor="car-insurance" hint="Your premium. The starting number is a placeholder, not a quote.">
          <InputShell prefix="$" suffix="/ month">
            <input id="car-insurance" type="number" min="0" step="10" inputMode="decimal" value={monthlyInsurance} onChange={(event) => setMonthlyInsurance(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Maintenance and repairs" htmlFor="car-maintenance" hint="A budget you choose, not a service schedule.">
          <InputShell prefix="$" suffix="/ month">
            <input id="car-maintenance" type="number" min="0" step="10" inputMode="decimal" value={monthlyMaintenance} onChange={(event) => setMonthlyMaintenance(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Registration and yearly fees" htmlFor="car-registration" hint="Optional. State fee tables are not modeled.">
          <InputShell prefix="$" suffix="/ year">
            <input id="car-registration" type="number" min="0" step="10" inputMode="decimal" value={annualRegistration} onChange={(event) => setAnnualRegistration(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && thisCar && thisCar.verdict && thisCar.vehiclePrice !== null && thisCar.monthlyTotal !== null && thisCar.totalShare !== null && (
        <div className="calculation-output">
          <PrimaryResult
            label="Total estimated monthly car cost"
            value={money(thisCar.monthlyTotal)}
            note={`${percent(thisCar.totalShare)} of ${takeHomeLabel} · loan payment alone is ${percent(thisCar.paymentShare ?? 0)}`}
            tone="blue"
          />
          <div className="decision-note">
            <p>
              On our affordability guideline this lands in the <strong>{vehicleVerdictLabel(thisCar.verdict)}</strong> range: {guidelineSentence(thisCar.verdict)}
            </p>
            <p>
              Those percentages are {siteConfig.name} planning thresholds on take-home pay, not a lender decision and not a rule that fits every household.
            </p>
            {placeholderInputs.length > 0 && (
              <p className="decision-incomplete">
                That verdict still uses our planning {placeholderInputs.length === 1 ? 'default' : 'defaults'} for {placeholderInputs.join(' and ')}. Enter your own quote to make this yours.
              </p>
            )}
            {calculation.result.value.stateTaxStatus === 'unsupported' && (
              <p className="decision-incomplete">
                {selected.stateName} state income tax is omitted because this release does not model it. Estimated take-home pay is overstated, making this vehicle appear more affordable than it really is.
              </p>
            )}
            {thisCar.priceGap !== null && thisCar.priceGap > 0 && (
              <p>Cut the price by <strong>{approxMoney(thisCar.priceGap)}</strong>, or put that much more down, to reach the comfortable range with these running costs.</p>
            )}
            {thisCar.priceGap !== null && thisCar.priceGap <= 0 && (
              <p>This price is already at or under the comfortable-range price for your take-home pay.</p>
            )}
            {thisCar.comfortablePrice === 0 && (
              <p>Running costs alone use the comfortable share of your take-home pay, so no financed price reaches that range.</p>
            )}
          </div>
          <StatGrid items={[
            { label: 'Loan payment', value: money(thisCar.monthlyLoanPayment ?? 0), note: thisCar.amountFinanced && thisCar.amountFinanced > 0 ? `${money(thisCar.amountFinanced, 0)} financed` : 'Cash purchase' },
            { label: powertrain === 'gas' ? 'Fuel' : 'Charging', value: money(thisCar.monthlyEnergyCost), note: `${Number(annualMiles || 0).toLocaleString('en-US')} miles a year ÷ 12` },
            { label: 'Insurance, upkeep, fees', value: money(thisCar.monthlyInsurance + thisCar.monthlyMaintenance + thisCar.monthlyRegistration), note: `${money(thisCar.monthlyInsurance)} + ${money(thisCar.monthlyMaintenance)} + ${money(thisCar.monthlyRegistration)}` },
          ]} />
          <StatGrid items={[
            { label: 'Yearly cost', value: money(thisCar.annualTotal ?? 0, 0), note: 'Depreciation not included' },
            { label: 'Cash at signing', value: money(thisCar.upfrontCash ?? 0, 0), note: 'Down payment' },
            { label: 'Left each month', value: money(thisCar.leftoverMonthly ?? 0), note: 'Take-home minus this car' },
          ]} />
          <StatGrid items={[
            { label: 'Cost per mile', value: money(thisCar.costPerMile ?? 0, 3), note: 'Everything except depreciation' },
            { label: 'Total interest', value: money(thisCar.totalInterest ?? 0, 0), note: thisCar.totalOfPayments && thisCar.totalOfPayments > 0 ? `${money(thisCar.totalOfPayments, 0)} paid over the term` : 'No loan' },
            { label: 'Comfortable-range price', value: thisCar.comfortablePrice > 0 ? approxMoney(thisCar.comfortablePrice) : 'None', note: `Our guideline: ≤ ${cap(COMFORTABLE.maxTotalShare)} of take-home` },
          ]} />
          <p className="data-footnote">{energySourceNote}</p>
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
          />
        </div>
      )}
      {calculation.result && howMuch && (
        <div className="calculation-output">
          <PrimaryResult
            label="Estimated maximum vehicle price"
            value={howMuch.comfortablePrice > 0 ? roundedGuidelineMoney(howMuch.comfortablePrice) : 'None'}
            note={`Rounded, from our guideline. With ${money(Number(downPayment) || 0, 0)} down, ${money(howMuch.monthlyOperatingCost)} a month in running costs, and ${money(howMuch.monthlyTakeHome)} take-home`}
            tone="blue"
          />
          <StatGrid items={[
            { label: 'Comfortable range', value: howMuch.comfortablePrice > 0 ? approxMoney(howMuch.comfortablePrice) : 'None', note: `≤ ${cap(COMFORTABLE.maxTotalShare)} of take-home on the whole vehicle` },
            { label: 'Stretch range', value: howMuch.reasonablePrice > 0 ? approxMoney(howMuch.reasonablePrice) : 'None', note: `≤ ${cap(REASONABLE.maxTotalShare)} of take-home` },
            { label: 'Top of our range', value: howMuch.aggressivePrice > 0 ? money(howMuch.aggressivePrice, 0) : 'None', note: `≤ ${cap(VEHICLE_AFFORDABILITY_BANDS.aggressive.maxTotalShare)} of take-home` },
          ]} />
          <StatGrid items={[
            { label: powertrain === 'gas' ? 'Fuel' : 'Charging', value: money(howMuch.monthlyEnergyCost), note: `${Number(annualMiles || 0).toLocaleString('en-US')} miles a year ÷ 12` },
            { label: 'Insurance and upkeep', value: money(howMuch.monthlyInsurance + howMuch.monthlyMaintenance), note: `${money(howMuch.monthlyInsurance)} + ${money(howMuch.monthlyMaintenance)}` },
            { label: 'Registration', value: money(howMuch.monthlyRegistration), note: 'Yearly amount ÷ 12' },
          ]} />
          <div className="decision-note">
            <p>
              Running costs come out of the budget first ({money(howMuch.monthlyOperatingCost)} a month here), and whatever is left is what a loan payment can use. Each price above is the largest one that keeps the whole vehicle inside that share of take-home pay.
            </p>
            <p>
              Those percentages are {siteConfig.name} planning thresholds on take-home pay, not a lender decision and not a rule that fits every household.
            </p>
            {placeholderInputs.length > 0 && (
              <p className="decision-incomplete">
                Those prices still use planning {placeholderInputs.length === 1 ? 'default' : 'defaults'} for {placeholderInputs.join(' and ')}. Enter your own quote to make this yours.
              </p>
            )}
            {calculation.result.value.stateTaxStatus === 'unsupported' && (
              <p className="decision-incomplete">
                {selected.stateName} state income tax is omitted because this release does not model it. Estimated take-home pay is overstated, making the affordable vehicle budget higher than it really is.
              </p>
            )}
            {howMuch.comfortablePrice === 0 && (
              <p>At these running costs there is nothing left for a payment inside the comfortable range.</p>
            )}
          </div>
          <p className="data-footnote">{energySourceNote}</p>
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
