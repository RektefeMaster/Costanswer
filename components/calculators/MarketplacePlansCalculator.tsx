'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { calculateMarketplacePlanCost } from '@/lib/calculations/marketplace-plans';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney } from '@/lib/calculations/contracts';
import { CMS_METALS, type CmsMetal } from '@/lib/data/cms-marketplace';
import {
  benchmarkForHousehold, cmsCountiesForZip, cmsMarketplaceIndex, lowestMetalForHousehold, metalSummary,
} from '@/lib/data/cms-marketplace-snapshot';
import { US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

const parseAges = (text: string): number[] => text.split(',').map((part) => Number(part.trim()))
  .filter((age) => Number.isInteger(age) && age >= 0 && age <= 120);

const METAL_LABEL: Record<CmsMetal, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
/** Read the table the way the levels are named, poorest cost sharing first. */
const METAL_DISPLAY_ORDER: CmsMetal[] = ['bronze', 'silver', 'gold'];
const byDisplayOrder = <T extends { metal: CmsMetal }>(rows: T[]): T[] =>
  [...rows].sort((left, right) => METAL_DISPLAY_ORDER.indexOf(left.metal) - METAL_DISPLAY_ORDER.indexOf(right.metal));

export function MarketplacePlansCalculator() {
  const [zip, setZip] = useState('77002');
  const [chosenFips, setChosenFips] = useState('');
  const [enrollingAges, setEnrollingAges] = useState('40');
  const [monthlyCredit, setMonthlyCredit] = useState('0');
  const [expectedCare, setExpectedCare] = useState('2000');

  const lookup = useMemo(() => cmsCountiesForZip(zip.trim()), [zip]);
  const matches = lookup.status === 'covered' ? lookup.counties : [];
  const county = matches.find((entry) => entry.countyFips === chosenFips) ?? matches[0];
  const ages = useMemo(() => parseAges(enrollingAges), [enrollingAges]);

  const priced = useMemo(() => {
    if (!county || ages.length === 0) return null;
    try {
      const metals = CMS_METALS.flatMap((metal) => {
        const quote = lowestMetalForHousehold(county.countyFips, metal, ages);
        const summary = metalSummary(county.countyFips, metal);
        if (!quote || !summary) return [];
        return [{
          metal,
          monthlyPremium: quote.premium,
          individualDeductible: summary.individualDeductible,
          individualMaximumOutOfPocket: summary.individualMaximumOutOfPocket,
        }];
      });
      if (metals.length === 0) return null;
      return { metals, benchmark: benchmarkForHousehold(county.countyFips, ages) };
    } catch {
      return null;
    }
  }, [county, ages]);

  const calculation = useMemo(() => {
    if (!priced) return { result: null, error: '' };
    try {
      return {
        result: calculateMarketplacePlanCost({
          metals: priced.metals,
          monthlyPremiumTaxCredit: Number(monthlyCredit),
          expectedAnnualCareSpend: Number(expectedCare),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [priced, monthlyCredit, expectedCare]);

  const result = calculation.result;
  const value = result?.value;
  const cheapestNow = value?.plans.find((plan) => plan.metal === value.cheapestHealthyYear);

  return (
    <CalculatorPanel
      title="What a year of coverage costs"
      intro="Enter a ZIP code and who is enrolling. Every figure is the one filed for your county, and the comparison runs to the ceiling: what each plan costs if you never use it, and the most it can cost if you do."
      toolId="marketplace-plans"
      category="money"
      calculationState={result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([zip, chosenFips, enrollingAges, monthlyCredit, expectedCare])}
    >
      <div className="data-callout">
        <span>{cmsMarketplaceIndex.observationPeriod} PLAN YEAR</span>
        <p>
          <strong>CMS county plan filings</strong>
          <small>{cmsMarketplaceIndex.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="ZIP code" htmlFor="plans-zip" hint={`${cmsMarketplaceIndex.counties.length.toLocaleString('en-US')} counties across ${cmsMarketplaceIndex.coveredStateCodes.length} HealthCare.gov states are priced here.`}>
          <InputShell>
            <input id="plans-zip" type="text" inputMode="numeric" maxLength={5} value={zip} onChange={(event) => { setZip(event.target.value); setChosenFips(''); }} />
          </InputShell>
        </Field>
        <Field label="Ages of everyone enrolling" htmlFor="plans-ages" hint="Separate with commas. At most the three oldest children under 21 are charged a premium.">
          <InputShell>
            <input id="plans-ages" type="text" inputMode="numeric" value={enrollingAges} onChange={(event) => setEnrollingAges(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Monthly premium tax credit" htmlFor="plans-credit" hint="Leave at zero for sticker prices. A credit comes off every level alike, because it is a fixed dollar amount.">
          <InputShell prefix="$">
            <input id="plans-credit" type="number" min="0" step="50" value={monthlyCredit} onChange={(event) => setMonthlyCredit(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Care you expect to pay for in a year" htmlFor="plans-care" hint="Your own estimate, capped at each plan's out-of-pocket maximum. Not a prediction, and not a modelled coinsurance schedule.">
          <InputShell prefix="$">
            <input id="plans-care" type="number" min="0" step="500" value={expectedCare} onChange={(event) => setExpectedCare(event.target.value)} />
          </InputShell>
        </Field>
      </div>

      {lookup.status === 'covered' && matches.length > 1 && (
        <div className="health-county-choice">
          <p>ZIP {zip} spans {matches.length} counties, which file separately.</p>
          <div className="mode-tabs">
            {matches.map((entry) => (
              <button key={entry.countyFips} type="button" aria-pressed={entry.countyFips === county?.countyFips}
                className={entry.countyFips === county?.countyFips ? 'active' : ''}
                onClick={() => setChosenFips(entry.countyFips)}>{entry.countyName}</button>
            ))}
          </div>
        </div>
      )}
      {lookup.status === 'not-in-this-release' && (
        <div className="health-status health-status-review" role="status">
          <span>Priced by a state exchange</span>
          <ul><li>{lookup.stateCodes.map((code) => US_STATES[code as StateCode]).join(' and ') || 'This state'} runs its own Marketplace and files premiums separately, so this release carries no plans for it.</li></ul>
        </div>
      )}
      {lookup.status === 'unknown-zip' && zip.trim() !== '' && (
        <div className="health-status health-status-review" role="status">
          <span>ZIP not recognised</span>
          <ul><li>Enter a five-digit ZIP code that the Census ZCTA file maps to a county.</li></ul>
        </div>
      )}
      {county && (
        <p className="data-footnote">
          Pricing {county.countyName} County, {US_STATES[county.stateCode]} · rating area {county.ratingArea} · {county.planCount} plans filed
          {priced && ` · benchmark Silver ${formatMoney(priced.benchmark.premium)} a month`}
          {county.ageCurve === 'state-filed' && ' · this state files its own adult age curve, so adult premiums are quoted at the nearest published age'}
          {county.childAgeCurve === 'state-filed' && ' · under-21 rates are filed separately here, so an age between the published ones is quoted at the nearest of them'}
        </p>
      )}

      {calculation.error && <InlineError message={calculation.error} />}
      {result && value && cheapestNow && (
        <div className="calculation-output">
          <PrimaryResult
            label={`Cheapest ${METAL_LABEL[value.cheapestHealthyYear]} plan, a year with no claims`}
            value={formatMoney(cheapestNow.healthyYearCost)}
            note={`${formatMoney(cheapestNow.monthlyPremiumAfterCredit)} a month${county ? ` · ${county.countyName} County` : ''}`}
          />
          {/*
            The verdict people come for is which level to buy, and it genuinely
            depends on the year they have. Naming both winners is the honest
            answer; naming one would be picking a risk appetite for the reader.
          */}
          <div className={`health-status health-status-${value.hasTradeoff ? 'review' : 'estimate'}`} role="status">
            <span>{value.hasTradeoff ? 'The cheapest plan depends on the year you have' : 'One level is cheapest either way'}</span>
            <ul>
              {value.hasTradeoff ? (
                <>
                  <li>
                    In a year with no claims, {METAL_LABEL[value.cheapestHealthyYear]} costs least, saving {formatMoney(value.healthyYearSpread)} a year against the dearest level here.
                  </li>
                  <li>
                    In the worst year, {METAL_LABEL[value.cheapestWorstYear]} costs least: the gap between the best and worst ceiling is {formatMoney(value.worstYearSpread)}.
                    A cheaper premium is being paid for with a higher ceiling, and no calculation can tell you which year you will have.
                  </li>
                </>
              ) : (
                <li>{METAL_LABEL[value.cheapestHealthyYear]} costs least both in a year with no claims and in the worst year, so there is no premium-versus-ceiling trade-off to weigh here.</li>
              )}
            </ul>
          </div>

          <div className="health-metal-table">
            <table>
              <caption>Cost of a year at each metal level, cheapest plan in this county</caption>
              <thead>
                <tr>
                  <th scope="col">Level</th><th scope="col">Per month</th><th scope="col">No claims</th>
                  <th scope="col">With your care</th><th scope="col">Most it can cost</th><th scope="col">Deductible</th>
                </tr>
              </thead>
              <tbody>
                {byDisplayOrder(value.plans).map((plan) => (
                  <tr key={plan.metal}>
                    <th scope="row">{METAL_LABEL[plan.metal]}</th>
                    <td>{formatMoney(plan.monthlyPremiumAfterCredit)}</td>
                    <td>{formatMoney(plan.healthyYearCost)}</td>
                    <td>{formatMoney(plan.expectedYearCost)}</td>
                    <td>{formatMoney(plan.worstYearCost)}</td>
                    <td>{formatMoney(plan.individualDeductible.median, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Deductibles are the median across this county&rsquo;s plans at that level; the range is in the steps below. The worst-year figure adds the whole individual out-of-pocket maximum, the ceiling on covered in-network care.</p>
          </div>

          <StatGrid items={byDisplayOrder(value.plans).map((plan) => ({
            label: `${METAL_LABEL[plan.metal]} out-of-pocket maximum`,
            value: formatMoney(plan.individualMaximumOutOfPocket.median, 0),
            note: `${formatMoney(plan.individualMaximumOutOfPocket.low, 0)} to ${formatMoney(plan.individualMaximumOutOfPocket.high, 0)} across county plans`,
          }))} />

          <ResultDetails
            breakdown={result.breakdown}
            assumptions={result.assumptions}
            calculationVersion={result.calculationVersion}
            datasetSnapshotIds={[cmsMarketplaceIndex.snapshotId]}
          />
          <p className="health-range-note">
            These are full prices unless you entered a credit. To find out what assistance you qualify for, and whether your income unlocks a lower Silver deductible,
            use the <Link href="/money/health-insurance">health insurance subsidy calculator →</Link>
          </p>
        </div>
      )}
    </CalculatorPanel>
  );
}
