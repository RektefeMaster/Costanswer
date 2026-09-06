'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateCostOfLivingFromCoverage,
  COL_BEDROOMS,
  type ColBedroom,
} from '@/lib/calculations/cost-of-living';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from '@/lib/calculations/tax/types';
import { USDA_FOOD_PLANS, type UsdaFoodPlan } from '@/lib/data/usda-food';
import type { LocationCoverage } from '@/lib/location/resolve';
import type { LocationSearchHit } from '@/lib/location/search';
import { getStateName, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const BEDROOM_LABELS: Record<ColBedroom, string> = {
  studio: 'Studio',
  br1: '1 bedroom',
  br2: '2 bedrooms',
  br3: '3 bedrooms',
  br4: '4 bedrooms',
};

const PLAN_LABELS: Record<UsdaFoodPlan, string> = {
  thrifty: 'Thrifty',
  'low-cost': 'Low-Cost',
  'moderate-cost': 'Moderate-Cost',
  liberal: 'Liberal',
};

const AUSTIN: LocationSearchHit = {
  id: 'place:4805000',
  kind: 'place',
  name: 'Austin',
  displayName: 'Austin, TX',
  state: 'TX',
  stateName: 'Texas',
  subtitle: 'Texas',
};

/** Coverage for the location currently selected, and how it got there. */
type CoverageState =
  | { status: 'ready'; value: LocationCoverage }
  | { status: 'loading'; value: LocationCoverage | null }
  | { status: 'error'; value: null; message: string };

/** One empty array, so the derived list keeps a stable identity between renders. */
const NO_MATCHES: LocationSearchHit[] = [];

export function CostOfLivingCalculator({ initialCoverage }: { initialCoverage: LocationCoverage }) {
  const [query, setQuery] = useState('Austin, TX');
  const [selected, setSelected] = useState<LocationSearchHit | null>(AUSTIN);
  const [coverage, setCoverage] = useState<CoverageState>({ status: 'ready', value: initialCoverage });
  const [matches, setMatches] = useState<LocationSearchHit[]>(NO_MATCHES);
  const [residentialState, setResidentialState] = useState<StateCode | ''>('');
  const [countyGeoid, setCountyGeoid] = useState('');
  const [bedrooms, setBedrooms] = useState<ColBedroom>('br2');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [foodPlan, setFoodPlan] = useState<UsdaFoodPlan>('moderate-cost');
  const [housingMode, setHousingMode] = useState<'hud' | 'manual'>('hud');
  const [manualHousing, setManualHousing] = useState('');
  const [transportMode, setTransportMode] = useState<'none' | 'manual' | 'gas' | 'ev'>('none');
  const [manualTransport, setManualTransport] = useState('');
  const [annualMiles, setAnnualMiles] = useState('12000');
  const [mpg, setMpg] = useState('28');
  const [kwhPer100Miles, setKwhPer100Miles] = useState('30');
  const [chargingLossPercent, setChargingLossPercent] = useState('10');
  const [monthlyInsurance, setMonthlyInsurance] = useState('0');
  const [monthlyMaintenance, setMonthlyMaintenance] = useState('0');
  const [annualRegistration, setAnnualRegistration] = useState('0');
  const [otherEssentials, setOtherEssentials] = useState('');
  const [incomeMode, setIncomeMode] = useState<'none' | 'take-home' | 'gross-salary'>('take-home');
  const [monthlyTakeHome, setMonthlyTakeHome] = useState('5000');
  const [annualGrossSalary, setAnnualGrossSalary] = useState('75000');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');

  const showingSelection = Boolean(selected) && query === selected?.displayName;

  /*
   * The list is derived, not synced.
   *
   * Clearing it from inside the effect meant the rendered list lagged the query
   * by a render: for one frame after picking a place, the suggestions that led
   * there were still on screen under the thing they had produced. Deriving it
   * makes "showing a selection" and "showing suggestions" mutually exclusive by
   * construction rather than by timing.
   */
  const suggestions = showingSelection || query.trim() === '' ? NO_MATCHES : matches;

  // Typeahead runs on the server, so the national geography tables never ship here.
  useEffect(() => {
    if (showingSelection || query.trim() === '') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/location/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => (response.ok ? await response.json() as { hits?: LocationSearchHit[] } : { hits: [] }))
        .then((body) => setMatches(body.hits ?? []))
        .catch(() => { /* aborted or offline: keep the last list rather than flashing empty */ });
    }, 140);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, showingSelection]);

  // Coverage changes only when the place, state, or county does — not when a number does.
  const coverageKey = selected?.id ? `${selected.id}|${residentialState}|${countyGeoid}` : '';
  // Which selection the coverage in state actually describes, so returning to an
  // earlier location refetches rather than reusing whichever one loaded last.
  const loadedCoverageKey = useRef(`${AUSTIN.id}||`);
  useEffect(() => {
    if (!coverageKey || coverageKey === loadedCoverageKey.current) return;
    const controller = new AbortController();
    setCoverage((current) => ({ status: 'loading', value: current.value }));
    const params = new URLSearchParams({ id: selected!.id });
    if (residentialState) params.set('state', residentialState);
    if (countyGeoid) params.set('county', countyGeoid);
    fetch(`/api/location/coverage?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { coverage?: LocationCoverage; error?: string };
        if (!response.ok || !body.coverage) throw new Error(body.error ?? 'This location could not be resolved.');
        loadedCoverageKey.current = coverageKey;
        setCoverage({ status: 'ready', value: body.coverage });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCoverage({ status: 'error', value: null, message: calculationErrorMessage(error) });
      });
    return () => controller.abort();
  }, [coverageKey, selected, residentialState, countyGeoid]);

  const calculation = useMemo(() => {
    if (!selected?.id) return { result: null, error: 'Choose a location from the list. Duplicate names stay listed until you pick one.' };
    if (coverage.status === 'error') return { result: null, error: coverage.message };
    if (!coverage.value) return { result: null, error: '' };
    try {
      const payload: Record<string, unknown> = {
        locationId: selected.id,
        residentialState: residentialState || undefined,
        countyGeoid: countyGeoid || undefined,
        bedrooms,
        adults: Number(adults),
        children: Number(children),
        foodPlan,
        housingMode,
        incomeMode,
        transportMode,
      };
      if (housingMode === 'manual') payload.manualHousing = Number(manualHousing);
      if (otherEssentials.trim() !== '') payload.otherEssentials = Number(otherEssentials);
      if (incomeMode === 'take-home') payload.monthlyTakeHome = Number(monthlyTakeHome);
      if (incomeMode === 'gross-salary') {
        payload.annualGrossSalary = Number(annualGrossSalary);
        payload.filingStatus = filingStatus;
      }
      if (transportMode === 'none' && manualTransport.trim() !== '') payload.manualTransport = Number(manualTransport);
      if (transportMode === 'manual') payload.manualTransport = Number(manualTransport);
      if (transportMode === 'gas' || transportMode === 'ev') {
        payload.annualMiles = Number(annualMiles);
        payload.monthlyInsurance = Number(monthlyInsurance);
        payload.monthlyMaintenance = Number(monthlyMaintenance);
        payload.annualRegistration = Number(annualRegistration);
      }
      if (transportMode === 'gas') payload.mpg = Number(mpg);
      if (transportMode === 'ev') {
        payload.kwhPer100Miles = Number(kwhPer100Miles);
        payload.chargingLossPercent = Number(chargingLossPercent);
      }
      return { result: calculateCostOfLivingFromCoverage(payload, coverage.value), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [
    coverage, selected, residentialState, countyGeoid, bedrooms, adults, children, foodPlan, housingMode, manualHousing,
    transportMode, manualTransport, annualMiles, mpg, kwhPer100Miles, chargingLossPercent,
    monthlyInsurance, monthlyMaintenance, annualRegistration, otherEssentials, incomeMode,
    monthlyTakeHome, annualGrossSalary, filingStatus,
  ]);

  const value = calculation.result?.value;
  const primaryNote = value?.incomplete
    ? value.incompleteReasons[0]
    : value?.income.incomeShare != null
      ? `${Math.round(value.income.incomeShare * 100)}% of monthly take-home`
      : 'Estimated modeled monthly living costs, not everything it costs to live here';

  return (
    <CalculatorPanel
      title="Estimated modeled monthly living cost"
      intro="Housing uses HUD Fair Market Rent as a gross-rent benchmark. Food uses a USDA Food Plan. This is not a proprietary cost-of-living index."
      toolId="cost-of-living"
      category="money"
      calculationState={coverage.status === 'loading' ? 'waiting' : !calculation.result ? 'invalid' : value && !value.housing.included ? 'waiting' : 'complete'}
      calculationSignature={JSON.stringify([selected?.id, residentialState, countyGeoid, bedrooms, adults, children, foodPlan, housingMode, transportMode, incomeMode, monthlyTakeHome, annualGrossSalary])}
    >
      {value && (
        <div className="data-callout">
          <span>SOURCES</span>
          <p>
            <strong>{value.coverage.displayName}</strong>
            <small>
              Housing: {value.housing.sourceGeography}. Food: {value.food.sourceGeography}. Price level: {value.regionalPriceContext.geographyLabel}.
            </small>
          </p>
        </div>
      )}
      {value?.incomplete && (
        <div className="data-callout">
          <span>INCOMPLETE</span>
          <p>
            <strong>{value.income.completeness === 'provisional' && value.income.stateTaxStatus === 'unsupported' ? 'State income tax omitted' : 'This result is incomplete'}</strong>
            <small>{value.incompleteReasons.join(' ')}</small>
          </p>
        </div>
      )}
      <div className="calc-form-grid">
        <Field label="Location" htmlFor="col-location" hint="Search a U.S. city, metro, or state. Duplicate names stay listed until you pick one.">
          <InputShell>
            <input
              id="col-location"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
            />
          </InputShell>
          {selected?.id && <p className="location-selected">Selected: {selected.displayName}</p>}
          {suggestions.length > 0 && (
            <ul className="location-results" role="listbox" aria-label="Matching locations">
              {suggestions.map((hit) => (
                <li key={hit.id} role="option" aria-selected={selected?.id === hit.id}>
                  <button
                    type="button"
                    aria-label={hit.kind === 'place' ? `${hit.displayName} city` : hit.kind === 'cbsa' ? `${hit.displayName}` : hit.displayName}
                    onClick={() => {
                      setSelected(hit);
                      setQuery(hit.displayName);
                      setResidentialState('');
                      setCountyGeoid('');
                    }}
                  >
                    <strong>{hit.displayName}</strong>
                    <span>{hit.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        {value?.coverage.stateAmbiguous && (
          <Field label="Residential state" htmlFor="col-state" hint="This metro crosses state lines. Tax, electricity, and fuel need the state you live in.">
            <span className="input-shell select-shell">
              <select id="col-state" value={residentialState} onChange={(event) => { setResidentialState(event.target.value as StateCode | ''); setCountyGeoid(''); }}>
                <option value="">Choose a state</option>
                {value.coverage.eligibleStates.map((code) => <option key={code} value={code}>{getStateName(code)}</option>)}
              </select>
            </span>
          </Field>
        )}
        {value?.coverage.countyChoices.length ? (
          <Field
            label="County"
            htmlFor="col-county"
            hint={value.coverage.hud.status === 'ambiguous' ? value.coverage.hud.message : 'Pick the county you live in, or enter housing cost manually.'}
          >
            <span className="input-shell select-shell">
              <select id="col-county" value={countyGeoid} onChange={(event) => setCountyGeoid(event.target.value)}>
                <option value="">Choose a county</option>
                {value.coverage.countyChoices.map((county) => (
                  <option key={county.geoid} value={county.geoid}>{county.name}, {county.state}</option>
                ))}
              </select>
            </span>
          </Field>
        ) : null}
        <Field label="Bedrooms" htmlFor="col-bedrooms">
          <span className="input-shell select-shell">
            <select id="col-bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value as ColBedroom)}>
              {COL_BEDROOMS.map((size) => <option key={size} value={size}>{BEDROOM_LABELS[size]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Adults" htmlFor="col-adults">
          <InputShell>
            <input id="col-adults" type="number" min="0" max="12" step="1" inputMode="numeric" value={adults} onChange={(event) => setAdults(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Children" htmlFor="col-children" hint="Food plan uses USDA ages 6–8 for children.">
          <InputShell>
            <input id="col-children" type="number" min="0" max="12" step="1" inputMode="numeric" value={children} onChange={(event) => setChildren(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="USDA Food Plan" htmlFor="col-food-plan">
          <span className="input-shell select-shell">
            <select id="col-food-plan" value={foodPlan} onChange={(event) => setFoodPlan(event.target.value as UsdaFoodPlan)}>
              {USDA_FOOD_PLANS.map((plan) => <option key={plan} value={plan}>{PLAN_LABELS[plan]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Housing" htmlFor="col-housing-mode" hint="HUD FMR is a gross-rent benchmark, including most tenant-paid utilities.">
          <span className="input-shell select-shell">
            <select id="col-housing-mode" value={housingMode} onChange={(event) => setHousingMode(event.target.value as 'hud' | 'manual')}>
              <option value="hud">HUD Fair Market Rent benchmark</option>
              <option value="manual">Manual housing (utilities included)</option>
            </select>
          </span>
        </Field>
        {housingMode === 'manual' && (
          <Field label="Monthly housing cost" htmlFor="col-manual-housing">
            <InputShell prefix="$">
              <input id="col-manual-housing" type="number" min="0" step="50" inputMode="decimal" value={manualHousing} onChange={(event) => setManualHousing(event.target.value)} />
            </InputShell>
          </Field>
        )}
        <Field label="Transportation" htmlFor="col-transport">
          <span className="input-shell select-shell">
            <select id="col-transport" value={transportMode} onChange={(event) => setTransportMode(event.target.value as typeof transportMode)}>
              <option value="none">No personal vehicle</option>
              <option value="gas">Gasoline vehicle</option>
              <option value="ev">EV</option>
              <option value="manual">Manual monthly amount</option>
            </select>
          </span>
        </Field>
        {(transportMode === 'none' || transportMode === 'manual') && (
          <Field label="Monthly transportation" htmlFor="col-manual-transport" hint={transportMode === 'none' ? 'Optional. Transit is not assumed to be free.' : 'Replaces vehicle energy cost.'}>
            <InputShell prefix="$">
              <input id="col-manual-transport" type="number" min="0" step="25" inputMode="decimal" value={manualTransport} onChange={(event) => setManualTransport(event.target.value)} />
            </InputShell>
          </Field>
        )}
        {(transportMode === 'gas' || transportMode === 'ev') && (
          <>
            <Field label="Annual miles" htmlFor="col-miles">
              <InputShell>
                <input id="col-miles" type="number" min="0" step="500" inputMode="numeric" value={annualMiles} onChange={(event) => setAnnualMiles(event.target.value)} />
              </InputShell>
            </Field>
            {transportMode === 'gas' && (
              <Field label="Miles per gallon" htmlFor="col-mpg">
                <InputShell>
                  <input id="col-mpg" type="number" min="1" step="1" inputMode="decimal" value={mpg} onChange={(event) => setMpg(event.target.value)} />
                </InputShell>
              </Field>
            )}
            {transportMode === 'ev' && (
              <Field label="kWh per 100 miles" htmlFor="col-kwh">
                <InputShell>
                  <input id="col-kwh" type="number" min="5" step="1" inputMode="decimal" value={kwhPer100Miles} onChange={(event) => setKwhPer100Miles(event.target.value)} />
                </InputShell>
              </Field>
            )}
          </>
        )}
        <Field label="Income" htmlFor="col-income-mode">
          <span className="input-shell select-shell">
            <select id="col-income-mode" value={incomeMode} onChange={(event) => setIncomeMode(event.target.value as typeof incomeMode)}>
              <option value="none">Skip income</option>
              <option value="take-home">Monthly take-home</option>
              <option value="gross-salary">Annual gross salary</option>
            </select>
          </span>
        </Field>
        {incomeMode === 'take-home' && (
          <Field label="Monthly take-home" htmlFor="col-takehome">
            <InputShell prefix="$">
              <input id="col-takehome" type="number" min="0" step="100" inputMode="decimal" value={monthlyTakeHome} onChange={(event) => setMonthlyTakeHome(event.target.value)} />
            </InputShell>
          </Field>
        )}
        {incomeMode === 'gross-salary' && (
          <>
            <Field label="Annual gross salary" htmlFor="col-salary">
              <InputShell prefix="$">
                <input id="col-salary" type="number" min="0" step="1000" inputMode="decimal" value={annualGrossSalary} onChange={(event) => setAnnualGrossSalary(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Filing status" htmlFor="col-filing">
              <span className="input-shell select-shell">
                <select id="col-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as FilingStatus)}>
                  {FILING_STATUSES.map((status) => <option key={status} value={status}>{FILING_STATUS_LABELS[status]}</option>)}
                </select>
              </span>
            </Field>
          </>
        )}
        <Field label="Other essentials (optional)" htmlFor="col-other" hint="Phone, internet, or similar. HUD gross rent does not include these.">
          <InputShell prefix="$">
            <input id="col-other" type="number" min="0" step="10" inputMode="decimal" value={otherEssentials} onChange={(event) => setOtherEssentials(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <>
          {/*
            What a cost-of-living number leaves out matters as much as what it
            contains. These lines used to sit in the methodology below the fold,
            where a reader comparing this with a full cost-of-living index would
            not meet them until after trusting the total.
          */}
          <div className="model-coverage">
            <div>
              <p className="model-coverage-head">Counted here</p>
              <ul>
                {value.housing.included && <li>Housing ({value.housing.calculationSource === 'manual' ? 'your figure' : 'HUD Fair Market Rent'})</li>}
                {value.food.included && <li>Food at home (USDA Food Plan)</li>}
                {value.transportation.included && <li>Transportation</li>}
                {value.otherEssentials.included && <li>Other essentials you entered</li>}
              </ul>
            </div>
            <div>
              <p className="model-coverage-head">Not counted</p>
              <ul>
                {!value.housing.included && <li>Housing</li>}
                {!value.transportation.included && <li>Transportation</li>}
                <li>Healthcare and insurance</li>
                <li>Childcare</li>
                <li>Debt payments</li>
                <li>Restaurants and discretionary spending</li>
              </ul>
            </div>
          </div>
          <PrimaryResult
            label={value.comparison.comparable ? 'Estimated modeled monthly living cost' : 'Modeled monthly living cost is not comparable'}
            value={value.comparison.comparable ? money(value.totalModeledMonthlyCost) : 'n/a'}
            note={primaryNote}
          />
          <StatGrid items={[
            ...(value.income.incomeShare != null && value.income.remainingAfterModeledCosts != null ? [
              { label: 'Share of take-home', value: `${Math.round((value.income.incomeShare ?? 0) * 100)}%`, note: value.income.completeness === 'provisional' ? 'Provisional' : undefined },
              { label: 'Remaining after modeled costs', value: money(value.income.remainingAfterModeledCosts ?? 0), note: value.income.completeness === 'provisional' ? 'Incomplete' : undefined },
            ] : []),
            { label: 'Housing', value: value.housing.amount == null ? 'Unavailable' : money(Math.round(value.housing.amount)), note: value.housing.calculationSource === 'manual' ? 'Manual' : value.housing.calculationSource === 'official' ? 'HUD FMR' : 'Not mapped' },
            { label: 'Food at home', value: money(Math.round(value.food.amount ?? 0)), note: PLAN_LABELS[foodPlan] },
            { label: 'Transportation', value: value.transportation.amount == null ? 'Not modeled' : money(Math.round(value.transportation.amount)) },
            ...(value.regionalPriceContext.allItems != null ? [{ label: 'Regional price level', value: value.regionalPriceContext.allItems.toFixed(1), note: 'U.S. = 100' }] : []),
            ...(value.incomeContext.medianHouseholdIncome != null ? [{ label: 'Median household income', value: money(value.incomeContext.medianHouseholdIncome), note: 'Census ACS context' }] : []),
          ]}
          />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
          />
        </>
      )}
    </CalculatorPanel>
  );
}
