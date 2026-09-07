'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculatePerDiem } from '@/lib/calculations/travel/per-diem';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatPerDiemDestinationLabel, type PerDiemDestination } from '@/lib/data/gsa-perdiem';
import { US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';
import { pluralize } from '@/lib/plural';

/** GSA's county field can be a sentence listing every covered jurisdiction, so it is trimmed for the picker. */
function label(destination: PerDiemDestination): string {
  const base = formatPerDiemDestinationLabel(destination);
  if (destination.isStandardRate || destination.city === 'District of Columbia' || !destination.county) return base;
  const county = destination.county.length > 44 ? `${destination.county.slice(0, 41).trimEnd()}…` : destination.county;
  return `${base} · ${county}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isZipQuery(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

/**
 * Mirrors the API payload from `/api/perdiem/zip`. Kept local so the Census
 * ZCTA table never enters the client bundle.
 */
type ZipResolution =
  | { status: 'not-a-zcta'; zip: string; message: string }
  | { status: 'outside-conus'; zip: string; state: string; message: string }
  | {
    status: 'resolved';
    zip: string;
    destinationKey: string;
    destinationLabel: string;
    usesStandardRate: boolean;
    countyLabel: string;
    state: string;
    summary: string;
    splitByCity: boolean;
    citySplitDestinationKeys: string[];
    citySplitLabels: string[];
    alternateDestinationKeys: string[];
    alternateLabels: string[];
  };

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
  const [actualNightlyRate, setActualNightlyRate] = useState('');
  const [zipLookup, setZipLookup] = useState<Extract<ZipResolution, { status: 'resolved' }> | null>(null);
  const [zipError, setZipError] = useState('');
  const [zipLoading, setZipLoading] = useState(false);

  const index = useMemo(
    () => destinations.map((destination) => ({
      destination,
      haystack: normalize(`${formatPerDiemDestinationLabel(destination)} ${destination.city} ${destination.state} ${US_STATES[destination.state as StateCode]} ${destination.county ?? ''} ${destination.isStandardRate ? 'standard conus rate' : ''}`),
    })),
    [destinations],
  );

  const selected = destinations.find((destination) => destination.key === destinationKey) ?? destinations[0];

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (needle.length < 2 || isZipQuery(query)) return [];
    if (normalize(label(selected)) === needle) return [];
    return index
      .filter((row) => row.haystack.includes(needle))
      .slice(0, 8)
      .map((row) => row.destination);
  }, [index, query, selected]);

  const zipQuery = isZipQuery(query);
  const activeZip = zipLookup && (query.trim() === '' || (zipQuery && query.trim() === zipLookup.zip))
    ? zipLookup
    : null;
  const visibleZipError = zipQuery ? zipError : '';
  const showZipLoading = zipLoading && zipQuery;

  useEffect(() => {
    const zip = query.trim();
    if (!isZipQuery(zip) || zipLookup?.zip === zip) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setZipLoading(true);
      fetch(`/api/perdiem/zip?zip=${encodeURIComponent(zip)}`, { signal: controller.signal })
        .then(async (response) => (response.ok ? await response.json() as { resolution?: ZipResolution } : { resolution: undefined }))
        .then((body) => {
          if (controller.signal.aborted) return;
          const resolution = body.resolution;
          if (!resolution) {
            setZipLookup(null);
            setZipError('This ZIP code could not be looked up. Pick the destination by name instead.');
            return;
          }
          if (resolution.status === 'resolved') {
            setDestinationKey(resolution.destinationKey);
            setZipLookup(resolution);
            setZipError('');
            return;
          }
          setZipLookup(null);
          setZipError(resolution.message);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setZipLookup(null);
          setZipError('This ZIP code could not be looked up. Pick the destination by name instead.');
        })
        .finally(() => { if (!controller.signal.aborted) setZipLoading(false); });
    }, 140);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setZipLoading(false);
    };
  }, [query, zipLookup]);

  const parsedRoomRate = (() => {
    const trimmed = actualNightlyRate.trim();
    if (trimmed === '') return undefined;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  })();

  const calculation = useMemo(() => {
    try {
      return {
        result: calculatePerDiem({
          destinationKey,
          startDate,
          endDate,
          actualNightlyRate: parsedRoomRate,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [destinationKey, startDate, endDate, parsedRoomRate]);

  const value = calculation.result?.value;
  const hotelCheck = value?.hotelCheck ?? null;

  const pickDestination = (key: string) => {
    setDestinationKey(key);
    setQuery('');
    setZipLookup(null);
    setZipError('');
  };

  const selectedLine = activeZip
    ? `ZIP ${activeZip.zip} → ${formatPerDiemDestinationLabel(selected)}`
    : `Selected: ${label(selected)}`;

  return (
    <CalculatorPanel
      title="Federal travel per diem"
      intro={`GSA ceilings for FY${fiscalYear}, effective ${effectiveFrom} to ${effectiveTo}. Continental U.S. only.`}
      toolId="per-diem"
      category="everyday"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([destinationKey, startDate, endDate, parsedRoomRate ?? null, activeZip?.zip ?? null])}
    >
      <div className="calc-form-grid">
        <Field
          label="Destination"
          htmlFor="perdiem-destination"
          hint="Type a city, county, or five-digit ZIP. Anywhere GSA does not list separately takes its state's standard CONUS rate."
        >
          <InputShell>
            <input
              id="perdiem-destination"
              type="search"
              autoComplete="off"
              placeholder={label(selected)}
              value={query}
              aria-busy={showZipLoading}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputShell>
          <p className="location-selected">{selectedLine}</p>
          {showZipLoading && <small>Looking up this ZIP…</small>}
          {visibleZipError && <small role="alert">{visibleZipError}</small>}
          {matches.length > 0 && (
            <ul className="location-results" role="listbox" aria-label="Matching destinations">
              {matches.map((destination) => (
                <li key={destination.key} role="option" aria-selected={destination.key === destinationKey}>
                  <button type="button" onClick={() => pickDestination(destination.key)}>
                    <strong>{label(destination)}</strong>
                    <span>
                      {destination.isStandardRate ? 'Standard CONUS rate · ' : ''}
                      M&amp;IE {money(destination.mieTotal, 0)} a day
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field
          label="Nightly room rate"
          htmlFor="perdiem-room-rate"
          hint="Optional. Before tax. Compared with the GSA lodging ceiling, night by night."
        >
          <InputShell prefix="$" suffix="a night">
            <input
              id="perdiem-room-rate"
              type="number"
              min="0"
              step="5"
              inputMode="decimal"
              placeholder="Leave blank"
              value={actualNightlyRate}
              onChange={(event) => setActualNightlyRate(event.target.value)}
            />
          </InputShell>
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
            label={
              !hotelCheck
                ? 'Trip total'
                : hotelCheck.withinLimit
                  ? 'Trip total at your room rate'
                  : 'Reimbursable trip total'
            }
            value={money(
              !hotelCheck
                ? value.grandTotal
                : hotelCheck.withinLimit
                  ? hotelCheck.tripTotalAtActualRate
                  : hotelCheck.reimbursableTripTotal,
            )}
            note={
              hotelCheck && hotelCheck.withinLimit
                ? `${money(hotelCheck.actualLodgingCost)} lodging + ${money(value.mieTotal)} meals and incidentals. GSA maximum is ${money(value.grandTotal)}.`
                : hotelCheck
                  ? `${money(hotelCheck.allowedLodgingCost)} lodging allowed + ${money(value.mieTotal)} meals and incidentals. Room is over by ${money(hotelCheck.overBy)}.`
                  : `${money(value.lodgingTotal)} lodging + ${money(value.mieTotal)} meals and incidentals · ${pluralize(value.lodgingNights, 'night', 'nights')} and ${pluralize(value.totalDays, 'day', 'days')} in ${value.destinationLabel}`
            }
            tone="rose"
          />
          {hotelCheck && (
            <div className="data-callout">
              <span>{hotelCheck.withinLimit ? 'WITHIN LIMIT' : `OVER BY ${money(hotelCheck.overBy, 0)}`}</span>
              <p>
                <strong>
                  {hotelCheck.withinLimit
                    ? `${money(hotelCheck.nightlyRate)} a night is at or under the GSA ceiling`
                    : `${money(hotelCheck.nightlyRate)} a night is over the GSA lodging ceiling`}
                </strong>
                <small>
                  {hotelCheck.withinLimit
                    ? value.lowestNightlyCap === value.highestNightlyCap
                      ? `The ceiling is ${money(value.lowestNightlyCap, 0)} a night before tax, on every night of this trip.`
                      : `At or under the ceiling on ${pluralize(hotelCheck.nightsWithinLimit, 'night', 'nights')}. Seasonal caps range from ${money(value.lowestNightlyCap, 0)} to ${money(value.highestNightlyCap, 0)}.`
                    : hotelCheck.nightsOverLimit === value.lodgingNights
                      ? `${money(hotelCheck.actualLodgingCost)} for ${pluralize(value.lodgingNights, 'night', 'nights')}. The ceiling allows ${money(hotelCheck.allowedLodgingCost)}. The difference is usually the traveller’s own cost, unless an exception is approved.`
                      : `Over the ceiling on ${hotelCheck.nightsOverLimit} of ${pluralize(value.lodgingNights, 'night', 'nights')}. Seasonal caps range from ${money(value.lowestNightlyCap, 0)} to ${money(value.highestNightlyCap, 0)}. The ${money(hotelCheck.overBy)} difference is usually the traveller’s own cost.`}
                </small>
              </p>
            </div>
          )}
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
              <span>STANDARD CONUS RATE</span>
              <p>
                <strong>GSA does not list this locality separately</strong>
                <small>
                  {activeZip?.summary
                    ?? `It takes the ${US_STATES[value.state as StateCode]} standard CONUS rate, which covers everywhere in the state without its own listing.`}
                </small>
              </p>
            </div>
          )}
          {parsedRoomRate !== undefined && value.lodgingNights === 0 && (
            <p className="data-footnote">A same-day trip has no lodging nights, so the room rate is not compared with a ceiling.</p>
          )}
          {activeZip?.splitByCity && (
            <div className="data-callout">
              <span>COUNTY IS SPLIT</span>
              <p>
                <strong>GSA has a different rate for a city inside this county</strong>
                <small>{activeZip.summary}</small>
              </p>
            </div>
          )}
          {activeZip?.splitByCity && (
            <ul className="location-results" role="list" aria-label="GSA rates in this split county">
              <li>
                <button type="button" aria-pressed={destinationKey === activeZip.destinationKey} onClick={() => setDestinationKey(activeZip.destinationKey)}>
                  <strong>Use {activeZip.destinationLabel}</strong>
                  <span>County rate for this ZIP</span>
                </button>
              </li>
              {activeZip.citySplitDestinationKeys.map((key, index) => (
                <li key={key}>
                  <button type="button" aria-pressed={destinationKey === key} onClick={() => setDestinationKey(key)}>
                    <strong>Use {activeZip.citySplitLabels[index] ?? key}</strong>
                    <span>City GSA carved out of this county</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {activeZip && !value.usesStandardRate && !activeZip.splitByCity && (
            <p className="data-footnote">{activeZip.summary}</p>
          )}
          {value.coveredArea && !value.usesStandardRate && !activeZip && (
            <p className="data-footnote">This rate covers {value.coveredArea}.</p>
          )}
          <StatGrid items={[
            {
              label: hotelCheck ? 'Lodging (your room)' : 'Lodging',
              value: money(hotelCheck ? hotelCheck.actualLodgingCost : value.lodgingTotal),
              note: hotelCheck
                ? hotelCheck.withinLimit
                  ? `Ceiling allows ${money(hotelCheck.allowedLodgingCost)}`
                  : `Ceiling allows ${money(hotelCheck.allowedLodgingCost)} · over by ${money(hotelCheck.overBy)}`
                : value.lodgingNights > 0
                  ? value.seasonalRates
                    ? `${money(value.lowestNightlyCap, 0)} to ${money(value.highestNightlyCap, 0)} a night, before tax`
                    : `${money(value.lowestNightlyCap, 0)} a night, before tax`
                  : 'No overnight stay',
            },
            {
              label: 'Meals and incidentals',
              value: money(value.mieTotal),
              note: `${money(value.fullDayMie, 0)} a full day, ${money(value.travelDayMie)} on travel days`,
            },
            {
              label: 'Trip total',
              value: money(
                !hotelCheck
                  ? value.grandTotal
                  : hotelCheck.withinLimit
                    ? hotelCheck.tripTotalAtActualRate
                    : hotelCheck.reimbursableTripTotal,
              ),
              note: hotelCheck && hotelCheck.withinLimit
                ? `GSA maximum ${money(value.grandTotal)}`
                : hotelCheck
                  ? `Over by ${money(hotelCheck.overBy)} · GSA maximum ${money(value.grandTotal)}`
                  : `${pluralize(value.lodgingNights, 'night', 'nights')} of lodging · ${pluralize(value.totalDays, 'day', 'days')} of meals`,
            },
          ]} />
          <p className="data-footnote">
            Daily meal split: {money(value.mealBreakdown.breakfast, 0)} breakfast · {money(value.mealBreakdown.lunch, 0)} lunch · {money(value.mealBreakdown.dinner, 0)} dinner · {money(value.mealBreakdown.incidentals, 0)} incidentals.
          </p>
          {value.seasonalRates && (
            <div className="rank-table-wrap">
              <table className="rank-table">
                <caption>This destination changes rate by season, so each night is priced in its own month</caption>
                <thead>
                  <tr>
                    <th scope="col">Night of</th>
                    <th scope="col">Lodging ceiling</th>
                    {hotelCheck && <th scope="col">Your room</th>}
                  </tr>
                </thead>
                <tbody>
                  {value.nights.map((night) => (
                    <tr key={night.date}>
                      <td>{night.date}</td>
                      <td>{money(night.lodgingCap, 0)}</td>
                      {hotelCheck && (
                        <td>{hotelCheck.nightlyRate > night.lodgingCap ? `Over by ${money(hotelCheck.nightlyRate - night.lodgingCap)}` : 'Within limit'}</td>
                      )}
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
