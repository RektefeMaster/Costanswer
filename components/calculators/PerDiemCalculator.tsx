'use client';

import { useMemo, useState } from 'react';
import { calculatePerDiem } from '@/lib/calculations/travel/per-diem';
import { calculationErrorMessage } from '@/lib/calculations/error';
import type { PerDiemDestination } from '@/lib/data/gsa-perdiem';
import { US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { money } from './finance-format';
import { pluralize } from '@/lib/plural';

/** GSA's county field can be a sentence listing every covered jurisdiction, so it is trimmed for the picker. */
function label(destination: PerDiemDestination): string {
  if (destination.isStandardRate) return `${US_STATES[destination.state as StateCode]} — standard rate`;
  const base = `${destination.city}, ${destination.state}`;
  if (!destination.county) return base;
  const county = destination.county.length > 44 ? `${destination.county.slice(0, 41).trimEnd()}…` : destination.county;
  return `${base} · ${county}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function PerDiemCalculator({
  destinations,
  fiscalYear,
  effectiveFrom,
  effectiveTo,
  defaultDestinationKey,
  defaultStartDate,
  defaultEndDate,
}: {
  destinations: PerDiemDestination[];
  fiscalYear: number;
  effectiveFrom: string;
  effectiveTo: string;
  defaultDestinationKey: string;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [query, setQuery] = useState('');
  const [destinationKey, setDestinationKey] = useState(defaultDestinationKey);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const index = useMemo(
    () => destinations.map((destination) => ({
      destination,
      haystack: normalize(`${destination.city} ${destination.state} ${US_STATES[destination.state as StateCode]} ${destination.county ?? ''}`),
    })),
    [destinations],
  );

  const selected = destinations.find((destination) => destination.key === destinationKey) ?? destinations[0];

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (needle.length < 2) return [];
    if (normalize(label(selected)) === needle) return [];
    return index
      .filter((row) => row.haystack.includes(needle))
      .slice(0, 8)
      .map((row) => row.destination);
  }, [index, query, selected]);

  const calculation = useMemo(() => {
    try {
      return { result: calculatePerDiem({ destinationKey, startDate, endDate }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [destinationKey, startDate, endDate]);

  const value = calculation.result?.value;

  return (
    <CalculatorPanel
      title="Federal travel per diem"
      intro={`GSA ceilings for FY${fiscalYear}, effective ${effectiveFrom} to ${effectiveTo}. Continental U.S. only.`}
      toolId="per-diem"
      category="everyday"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([destinationKey, startDate, endDate])}
    >
      <div className="calc-form-grid">
        <Field
          label="Destination"
          htmlFor="perdiem-destination"
          hint="Type a city or county. Anywhere GSA does not list separately takes its state's standard rate."
        >
          <InputShell>
            <input
              id="perdiem-destination"
              type="search"
              autoComplete="off"
              placeholder={label(selected)}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputShell>
          <p className="location-selected">Selected: {label(selected)}</p>
          {matches.length > 0 && (
            <ul className="location-results" role="listbox" aria-label="Matching destinations">
              {matches.map((destination) => (
                <li key={destination.key} role="option" aria-selected={destination.key === destinationKey}>
                  <button
                    type="button"
                    onClick={() => { setDestinationKey(destination.key); setQuery(''); }}
                  >
                    <strong>{label(destination)}</strong>
                    <span>M&amp;IE {money(destination.mieTotal, 0)} a day</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Leaving" htmlFor="perdiem-start">
          <InputShell>
            <input id="perdiem-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Returning" htmlFor="perdiem-end" hint="Same day for a trip with no overnight stay">
          <InputShell>
            <input id="perdiem-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </InputShell>
        </Field>
      </div>

      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Maximum per diem for this trip"
            value={money(value.grandTotal)}
            note={`${pluralize(value.lodgingNights, 'night', 'nights')} of lodging and ${pluralize(value.totalDays, 'day', 'days')} of meals in ${value.destinationLabel}`}
            tone="rose"
          />
          {value.outsideRateYear && (
            <div className="data-callout">
              <span>OUTSIDE THIS RATE YEAR</span>
              <p>
                <strong>These are FY{value.fiscalYear} rates</strong>
                <small>
                  They apply from {effectiveFrom} to {effectiveTo}. Part of your trip falls outside that federal fiscal
                  year, and a different rate table applies to those days.
                </small>
              </p>
            </div>
          )}
          {value.usesStandardRate && (
            <div className="data-callout">
              <span>STANDARD RATE</span>
              <p>
                <strong>GSA does not list this locality separately</strong>
                <small>It takes the {US_STATES[value.state as StateCode]} standard rate, which covers everywhere in the state without its own listing.</small>
              </p>
            </div>
          )}
          {value.coveredArea && !value.usesStandardRate && (
            <p className="data-footnote">This rate covers {value.coveredArea}.</p>
          )}
          <StatGrid items={[
            { label: 'Lodging ceiling', value: money(value.lodgingTotal), note: value.seasonalRates ? `${money(value.lowestNightlyCap, 0)} to ${money(value.highestNightlyCap, 0)} a night` : value.lodgingNights > 0 ? `${money(value.lowestNightlyCap, 0)} a night, before tax` : 'No overnight stay' },
            { label: 'Meals and incidentals', value: money(value.mieTotal), note: `${money(value.fullDayMie, 0)} a full day, ${money(value.travelDayMie)} on travel days` },
            { label: 'Nights', value: String(value.lodgingNights), note: `${value.totalDays} days of meals` },
            { label: 'Daily meal split', value: money(value.fullDayMie, 0), note: `${money(value.mealBreakdown.breakfast, 0)} breakfast · ${money(value.mealBreakdown.lunch, 0)} lunch · ${money(value.mealBreakdown.dinner, 0)} dinner · ${money(value.mealBreakdown.incidentals, 0)} incidentals` },
          ]} />
          {value.seasonalRates && (
            <div className="rank-table-wrap">
              <table className="rank-table">
                <caption>This destination changes rate by season, so each night is priced in its own month</caption>
                <thead>
                  <tr>
                    <th scope="col">Night of</th>
                    <th scope="col">Lodging ceiling</th>
                  </tr>
                </thead>
                <tbody>
                  {value.nights.map((night) => (
                    <tr key={night.date}>
                      <td>{night.date}</td>
                      <td>{money(night.lodgingCap, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
