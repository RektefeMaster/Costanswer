'use client';

import { useMemo, useState } from 'react';
import { calculateInflation, type InflationCpiObservation } from '@/lib/calculations/inflation';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { CalculatorPanel, Field, InlineError, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

const MONTH_NAMES = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

function monthsInYear(observations: InflationCpiObservation[], year: string): Array<(typeof MONTH_NAMES)[number]> {
  const available = new Set(observations.filter((row) => row.period.startsWith(`${year}-`)).map((row) => row.period.slice(5)));
  return MONTH_NAMES.filter(([month]) => available.has(month));
}

function fallbackPeriod(observations: InflationCpiObservation[], year: string, preferredMonth: string): string {
  const months = monthsInYear(observations, year);
  const last = months[months.length - 1];
  if (!last) throw new Error(`No CPI-U months are published for ${year}.`);
  const match = months.find(([month]) => month === preferredMonth);
  return `${year}-${(match ?? last)[0]}`;
}

export function InflationCalculator({
  observations,
  snapshotId,
  observationPeriod,
  years,
}: {
  observations: InflationCpiObservation[];
  snapshotId: string;
  observationPeriod: string;
  years: number[];
}) {
  const latestYear = observationPeriod.slice(0, 4);
  const latestMonth = observationPeriod.slice(5);
  const [amount, setAmount] = useState('100');
  const [startYear, setStartYear] = useState('2000');
  const [startMonth, setStartMonth] = useState('01');
  const [endYear, setEndYear] = useState(latestYear);
  const [endMonth, setEndMonth] = useState(latestMonth);

  const availableYears = years.filter((year) => monthsInYear(observations, String(year)).length > 0);
  const startMonths = monthsInYear(observations, startYear);
  const endMonths = monthsInYear(observations, endYear);
  const startPeriod = fallbackPeriod(observations, startYear, startMonth);
  const endPeriod = fallbackPeriod(observations, endYear, endMonth);

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateInflation({ amount, startPeriod, endPeriod }, { observations, snapshotId }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [amount, startPeriod, endPeriod, observations, snapshotId]);

  const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <CalculatorPanel
      title="Buying power over time"
      intro="See what an amount in one U.S. month would buy in another, using CPI-U."
      toolId="inflation"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([amount, startPeriod, endPeriod])}
    >
      <div className="data-callout">
        <span>BLS CPI-U</span>
        <p>
          <strong>U.S. city average, all items</strong>
          <small>Not seasonally adjusted · {datasetSourceDisplay({
            datasetId: 'bls-cpi',
            observationPeriod,
            sourceStatus: 'preliminary',
          }).periodLabel}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="Amount" htmlFor="inflation-amount">
          <span className="input-shell">
            <span className="input-affix">$</span>
            <input id="inflation-amount" type="number" min="0.01" step="1" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </span>
        </Field>
        <Field label="Starting month" htmlFor="inflation-start-month">
          <span className="input-shell select-shell">
            <select id="inflation-start-month" value={startPeriod.slice(5)} onChange={(event) => setStartMonth(event.target.value)}>
              {startMonths.map(([month, label]) => <option value={month} key={`start-${month}`}>{label}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Starting year" htmlFor="inflation-start-year">
          <span className="input-shell select-shell">
            <select
              id="inflation-start-year"
              value={startYear}
              onChange={(event) => {
                const year = event.target.value;
                setStartYear(year);
                setStartMonth(fallbackPeriod(observations, year, startMonth).slice(5));
              }}
            >
              {availableYears.map((year) => <option value={String(year)} key={`start-year-${year}`}>{year}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Ending month" htmlFor="inflation-end-month">
          <span className="input-shell select-shell">
            <select id="inflation-end-month" value={endPeriod.slice(5)} onChange={(event) => setEndMonth(event.target.value)}>
              {endMonths.map(([month, label]) => <option value={month} key={`end-${month}`}>{label}</option>)}
            </select>
          </span>
        </Field>
        <Field label="Ending year" htmlFor="inflation-end-year">
          <span className="input-shell select-shell">
            <select
              id="inflation-end-year"
              value={endYear}
              onChange={(event) => {
                const year = event.target.value;
                setEndYear(year);
                setEndMonth(fallbackPeriod(observations, year, endMonth).slice(5));
              }}
            >
              {availableYears.map((year) => <option value={String(year)} key={`end-year-${year}`}>{year}</option>)}
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label={`Same buying power in ${endMonths.find(([month]) => month === endPeriod.slice(5))?.[1] ?? ''} ${endYear}`}
            value={money(calculation.result.value.equivalentAmount)}
            note={`${money(Number(amount) || 0)} in ${startMonths.find(([month]) => month === startPeriod.slice(5))?.[1] ?? ''} ${startYear}`}
            tone="mint"
          />
          <StatGrid items={[
            { label: 'Price change', value: `${calculation.result.value.percentChange > 0 ? '+' : ''}${calculation.result.value.percentChange}%`, note: 'All-items CPI-U' },
            { label: 'Multiplier', value: `${calculation.result.value.multiplier}×`, note: 'End index ÷ start index' },
            { label: 'Latest CPI month', value: datasetSourceDisplay({
              datasetId: 'bls-cpi',
              observationPeriod,
              sourceStatus: 'preliminary',
            }).periodLabel, note: 'BLS all-items index' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
