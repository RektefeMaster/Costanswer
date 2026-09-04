'use client';

import { useMemo, useState } from 'react';
import type { ElectricityStateRate } from '@/lib/data/eia-electricity';
import type { EiaGasolineSnapshot } from '@/lib/data/eia-gasoline';
import type { BlsGrocerySnapshot } from '@/lib/data/bls-grocery';
import { BASKET_KINDS, compareWhereCheaper, type BasketKind, type GroceryStapleRow, type WhereCheaperValue } from '@/lib/calculations/where-cheaper';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getStateName, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from './CalculatorUI';

const KIND_LABELS: Record<BasketKind, string> = {
  electricity: 'Electricity',
  gasoline: 'Gasoline',
  grocery: 'Groceries',
  household: 'Home + car',
};

const KIND_HINTS: Record<BasketKind, string> = {
  electricity: 'Monthly bill',
  gasoline: 'Monthly fill-ups',
  grocery: 'Regional staples',
  household: 'Power and gasoline',
};

const STAPLE_SHORT_NAME: Record<string, string> = {
  'milk-whole-gallon': 'Milk',
  'bread-white-lb': 'White bread',
  'eggs-grade-a-dozen': 'Eggs',
  'ground-beef-lb': 'Ground beef',
  'chicken-whole-lb': 'Whole chicken',
  'chicken-breast-lb': 'Chicken breast',
  'bananas-lb': 'Bananas',
  'potatoes-white-lb': 'Potatoes',
  'flour-all-purpose-lb': 'Flour',
  'bacon-sliced-lb': 'Bacon',
  'pork-chops-boneless-lb': 'Pork chops',
  'ham-boneless-lb': 'Ham',
  'chuck-roast-lb': 'Chuck roast',
  'tomatoes-field-lb': 'Tomatoes',
  'lemons-lb': 'Lemons',
  'lettuce-iceberg-lb': 'Iceberg lettuce',
  'potato-chips-16oz': 'Potato chips',
  'rice-white-lb': 'Rice',
  'spaghetti-lb': 'Pasta',
  'cheddar-cheese-lb': 'Cheddar',
  'butter-stick-lb': 'Butter',
  'yogurt-8oz': 'Yogurt',
  'coffee-ground-lb': 'Coffee',
  'sugar-white-lb': 'Sugar',
  'orange-juice-16oz': 'Orange juice',
};

function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function tileMetric(kind: BasketKind, place: WhereCheaperValue['home']): string {
  switch (kind) {
    case 'electricity':
      return `${place.unitPrice.toFixed(2)}¢/kWh`;
    case 'gasoline':
      return `$${place.unitPrice.toFixed(2)}/gal`;
    case 'grocery':
      return money(place.amount);
    case 'household':
      return money(place.amount);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled basket kind: ${exhaustive}`);
    }
  }
}

function stapleWinner(item: GroceryStapleRow): 'home' | 'compare' | 'tie' | 'us-only' {
  if (item.home === null || item.compare === null) return 'us-only';
  if (item.home === item.compare) return 'tie';
  return item.home < item.compare ? 'home' : 'compare';
}

function splitGroceryStaples(items: GroceryStapleRow[]) {
  const compared = items
    .filter((item) => stapleWinner(item) !== 'us-only')
    .sort((left, right) => Math.abs((right.home ?? 0) - (right.compare ?? 0)) - Math.abs((left.home ?? 0) - (left.compare ?? 0)));
  const national = items.filter((item) => stapleWinner(item) === 'us-only');
  return { compared, national };
}

function groceryRegionNote(homeLabel: string, compareLabel: string): string {
  const homeRegion = homeLabel.replace(' census region', '');
  const compareRegion = compareLabel.replace(' census region', '');
  if (homeRegion === compareRegion) return `same ${homeRegion} region`;
  return `${homeRegion} vs ${compareRegion}`;
}

function winnerLabel(board: WhereCheaperValue): string {
  if (board.cheaperPlace === 'tie') return 'Same published average';
  return board.cheaperPlace === 'home' ? `${board.home.stateName} is lower` : `${board.compare.stateName} is lower`;
}

/**
 * Rank the geography the provider actually measured.
 *
 * BLS publishes these grocery staples for four census regions, so seventeen
 * southern states share one figure. Reporting a 1-of-51 position off that
 * shared number read as a state-level measurement that does not exist.
 */
function rankingNote(
  homeName: string,
  ranking: WhereCheaperValue['geographyRanking'],
  kindLabel: string,
): string {
  const place = ranking.sharedAcrossStates ? ranking.homeLabel : homeName;
  const shared = ranking.sharedAcrossStates
    ? ` One published figure covers ${ranking.statesSharing} states, including ${homeName}.`
    : '';
  return `${kindLabel} · ${place} ranks ${ranking.homeRank} of ${ranking.total} ${ranking.unitLabel}.${shared}`;
}

export function WhereCheaperCalculator({
  electricity,
  electricitySnapshotId,
  electricityPeriod,
  gasoline,
  grocery,
}: {
  electricity: ElectricityStateRate[];
  electricitySnapshotId: string;
  electricityPeriod: string;
  gasoline: EiaGasolineSnapshot;
  grocery: BlsGrocerySnapshot;
}) {
  const [kind, setKind] = useState<BasketKind>('grocery');
  const [homeState, setHomeState] = useState<StateCode>('TX');
  const [compareState, setCompareState] = useState<StateCode>('CA');
  const [monthlyKwh, setMonthlyKwh] = useState('900');
  const [monthlyGallons, setMonthlyGallons] = useState('40');
  const stateOptions = [...electricity].sort((left, right) => left.stateName.localeCompare(right.stateName));
  const homeName = getStateName(homeState);
  const compareName = getStateName(compareState);

  const boards = useMemo(() => {
    const datasets = { electricity, electricitySnapshotId, gasoline, grocery };
    try {
      const input = { homeState, compareState, monthlyKwh: Number(monthlyKwh), monthlyGallons: Number(monthlyGallons) };
      return {
        results: {
          electricity: compareWhereCheaper({ ...input, kind: 'electricity' }, datasets),
          gasoline: compareWhereCheaper({ ...input, kind: 'gasoline' }, datasets),
          grocery: compareWhereCheaper({ ...input, kind: 'grocery' }, datasets),
          household: compareWhereCheaper({ ...input, kind: 'household' }, datasets),
        },
        error: '',
      };
    } catch (error) {
      return { results: null, error: calculationErrorMessage(error) };
    }
  }, [homeState, compareState, monthlyKwh, monthlyGallons, electricity, electricitySnapshotId, gasoline, grocery]);

  const selected = boards.results?.[kind];
  const groceryBoard = boards.results?.grocery.value;
  const groceryGroups = groceryBoard ? splitGroceryStaples(groceryBoard.groceryStaples) : null;
  const showEnergy = kind === 'electricity' || kind === 'household';
  const showFuel = kind === 'gasoline' || kind === 'household';
  const keepStates = new Set(selected ? [selected.value.home.stateCode, selected.value.compare.stateCode, selected.value.cheapest.stateCode] : []);
  const tableRows = selected
    ? (kind === 'electricity' || kind === 'household'
      ? selected.value.ranked.filter((row, index) => index < 6 || keepStates.has(row.stateCode)).map((row) => ({
        key: row.stateCode,
        rank: row.rank,
        name: row.stateName,
        amount: row.amount,
        note: row.geographyLabel,
        highlight: row.stateCode === homeState ? 'home' as const : row.stateCode === compareState ? 'compare' as const : null,
        tied: row.tiedCount > 1,
      }))
      : selected.value.uniqueGeographies.map((row) => ({
        key: row.label,
        rank: row.rank,
        name: row.label,
        amount: row.amount,
        note: `${row.stateCount} state${row.stateCount === 1 ? '' : 's'}`,
        highlight: row.label === selected.value.home.geographyLabel ? 'home' as const : row.label === selected.value.compare.geographyLabel ? 'compare' as const : null,
        tied: row.stateCount > 1,
      })))
    : [];

  const headline = selected
    ? selected.value.cheaperPlace === 'tie'
      ? `${homeName} matches ${compareName}`
      : selected.value.cheaperPlace === 'home'
        ? `${homeName} is cheaper than ${compareName}`
        : `${compareName} is cheaper than ${homeName}`
    : '';

  return (
    <CalculatorPanel
      title="Is it cheaper there?"
      intro="Pick two states. Electricity and gasoline always compare. Groceries compare only the staples BLS split by region this month."
      toolId="where-cheaper"
      category="shopping"
      calculationState={selected ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([kind, homeState, compareState, monthlyKwh, monthlyGallons])}
    >
      <div className="place-bar">
        <Field label="Your state" htmlFor="home-state">
          <span className="input-shell select-shell">
            <select id="home-state" value={homeState} onChange={(event) => setHomeState(event.target.value as StateCode)}>
              {stateOptions.map((row) => <option value={row.stateCode} key={`home-${row.stateCode}`}>{row.stateName}</option>)}
            </select>
          </span>
        </Field>
        <button type="button" className="place-swap" onClick={() => { setHomeState(compareState); setCompareState(homeState); }} aria-label="Swap the two states">
          Swap
        </button>
        <Field label="Compare with" htmlFor="compare-state">
          <span className="input-shell select-shell">
            <select id="compare-state" value={compareState} onChange={(event) => setCompareState(event.target.value as StateCode)}>
              {stateOptions.map((row) => <option value={row.stateCode} key={`compare-${row.stateCode}`}>{row.stateName}</option>)}
            </select>
          </span>
        </Field>
      </div>

      {boards.results && (
        <div className="score-board" role="group" aria-label="Price basket">
          {BASKET_KINDS.map((option) => {
            const board = boards.results?.[option].value;
            if (!board) return null;
            return (
              <button
                type="button"
                key={option}
                aria-pressed={kind === option}
                aria-label={KIND_LABELS[option]}
                className={kind === option ? 'score-tile is-active' : 'score-tile'}
                onClick={() => setKind(option)}
              >
                <span>{KIND_LABELS[option]}</span>
                <strong>{winnerLabel(board)}</strong>
                <small>{KIND_HINTS[option]}</small>
                <div className="score-split">
                  <b>{homeState}<em>{tileMetric(option, board.home)}</em></b>
                  <b>{compareState}<em>{tileMetric(option, board.compare)}</em></b>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(showEnergy || showFuel) && (
        <div className="calc-form-grid compact-grid">
          {showEnergy && (
            <Field label="Monthly electricity" htmlFor="cheaper-kwh">
              <InputShell suffix="kWh">
                <input id="cheaper-kwh" type="number" min="0" step="10" inputMode="decimal" value={monthlyKwh} onChange={(event) => setMonthlyKwh(event.target.value)} />
              </InputShell>
            </Field>
          )}
          {showFuel && (
            <Field label="Monthly gasoline" htmlFor="cheaper-gallons">
              <InputShell suffix="gal">
                <input id="cheaper-gallons" type="number" min="0" step="1" inputMode="decimal" value={monthlyGallons} onChange={(event) => setMonthlyGallons(event.target.value)} />
              </InputShell>
            </Field>
          )}
        </div>
      )}

      {kind === 'grocery' && groceryBoard && groceryGroups && (
          <section className="product-shelf" id="grocery-products" aria-labelledby="grocery-products-title">
            <div className="product-shelf-head">
              <p>Compared staples · {datasetSourceDisplay({
                datasetId: 'bls-grocery',
                observationPeriod: grocery.observationPeriod,
                sourceStatus: 'preliminary',
              }).periodLabel}</p>
              <h3 id="grocery-products-title">{homeName} vs {compareName}</h3>
              <span>
                Some example products have a regional price this month
                ({groceryRegionNote(groceryBoard.home.geographyLabel, groceryBoard.compare.geographyLabel)}).
                Not a store shelf.
              </span>
            </div>
            <div className="staple-grid">
              {groceryGroups.compared.map((item) => {
                const winner = stapleWinner(item);
                const gap = item.home !== null && item.compare !== null ? Math.abs(item.home - item.compare) : 0;
                return (
                  <article className="staple-card" key={item.id}>
                    <p>{STAPLE_SHORT_NAME[item.id] ?? item.name}</p>
                    <span className="staple-official">{item.name} · per {item.unitLabel}</span>
                    <div className="staple-duel">
                      <div className={winner === 'home' ? 'is-winner' : undefined}>
                        <span>{homeState}</span>
                        <b>{item.home === null ? 'n/a' : money(item.home)}</b>
                      </div>
                      <i>vs</i>
                      <div className={winner === 'compare' ? 'is-winner' : undefined}>
                        <span>{compareState}</span>
                        <b>{item.compare === null ? 'n/a' : money(item.compare)}</b>
                      </div>
                    </div>
                    <small>
                      {winner === 'tie' ? 'Same regional average' : `${winner === 'home' ? homeState : compareState} is ${money(gap)} lower`}
                      {' · '}U.S. {money(item.national)}
                    </small>
                  </article>
                );
              })}
            </div>
            {groceryGroups.national.length > 0 && (
              <details className="staple-national">
                <summary>Some example products are U.S. city averages with no state split this month</summary>
                <p>BLS published a national price, not four census regions. These do not change when you swap states.</p>
                <ul>
                  {groceryGroups.national.map((item) => (
                    <li key={item.id}>
                      <span>
                        <b>{STAPLE_SHORT_NAME[item.id] ?? item.name}</b>
                        <small>{item.name} · per {item.unitLabel}</small>
                      </span>
                      <strong>{money(item.national)}</strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
      )}

      {boards.error && <InlineError message={boards.error} />}
      {selected && (
        <div className="calculation-output">
          <PrimaryResult
            label={headline}
            value={selected.value.cheaperPlace === 'tie' ? 'Same published average' : `${money(Math.abs(selected.value.savings))} ${selected.value.cheaperPlace === 'home' ? 'less' : 'more'} in ${homeName}`}
            note={rankingNote(homeName, selected.value.geographyRanking, KIND_LABELS[kind])}
            tone="violet"
          />
          <div className="rank-table-wrap">
            <table className="rank-table">
              <caption>Lowest published averages for {KIND_LABELS[kind].toLowerCase()}</caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Place</th>
                  <th scope="col">Estimate</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={`${row.key}-${row.rank}`} className={row.highlight === 'home' ? 'is-home' : row.highlight === 'compare' ? 'is-compare' : undefined}>
                    <td>{row.rank}{row.tied ? '*' : ''}</td>
                    <td>{row.name}{row.highlight === 'home' ? ' · you' : row.highlight === 'compare' ? ' · compare' : ''}</td>
                    <td>{money(row.amount)}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="data-footnote">
            Electricity {datasetSourceDisplay({ datasetId: 'eia-electricity', observationPeriod: electricityPeriod, sourceStatus: 'preliminary' }).periodLabel}
            {' · '}
            Gasoline {datasetSourceDisplay({ datasetId: 'eia-gasoline', observationPeriod: gasoline.observationPeriod, sourceStatus: 'preliminary' }).periodLabel}
            {' · '}
            Groceries {datasetSourceDisplay({ datasetId: 'bls-grocery', observationPeriod: grocery.observationPeriod, sourceStatus: 'preliminary' }).periodLabel}.
            Not Walmart, Kroger, Costco, or a pump quote.
          </p>
          <ResultDetails breakdown={selected.breakdown} assumptions={selected.assumptions} calculationVersion={selected.calculationVersion} datasetSnapshotIds={selected.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
