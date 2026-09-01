'use client';

import { useEffect, useMemo, useState } from 'react';
import { addBusinessDays, calculateBusinessDaysBetween, parseDateOnly } from '@/lib/calculations/business-days';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type Mode = 'between' | 'add';

export function BusinessDaysCalculator({ initialDate }: { initialDate: string }) {
  const [mode, setMode] = useState<Mode>('between');
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(() => {
    const date = parseDateOnly(initialDate);
    date.setUTCDate(date.getUTCDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const [daysToAdd, setDaysToAdd] = useState('10');
  const [includeStart, setIncludeStart] = useState(false);
  const [includeEnd, setIncludeEnd] = useState(true);
  const [excludeFederalHolidays, setExcludeFederalHolidays] = useState(true);

  useEffect(() => emitAnalyticsEvent('tool_opened', { toolId: 'business-days', category: 'everyday' }), []);

  const calculation = useMemo(() => {
    try {
      const result = mode === 'between'
        ? calculateBusinessDaysBetween({ startDate, endDate, includeStart, includeEnd, excludeFederalHolidays })
        : addBusinessDays({ startDate, businessDays: Number(daysToAdd), excludeFederalHolidays });
      return { result, error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, startDate, endDate, daysToAdd, includeStart, includeEnd, excludeFederalHolidays]);

  const betweenResult = mode === 'between' && calculation.result ? calculation.result as ReturnType<typeof calculateBusinessDaysBetween> : null;
  const addResult = mode === 'add' && calculation.result ? calculation.result as ReturnType<typeof addBusinessDays> : null;
  const readableDate = addResult ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(parseDateOnly(addResult.value.resultDate)) : '';

  return (
    <CalculatorPanel title="Work with the calendar you mean" intro="Choose whether to count a span or move forward or backward by workdays.">
      <div className="mode-tabs" role="group" aria-label="Calculation mode">
        <button type="button" className={mode === 'between' ? 'active' : ''} onClick={() => setMode('between')}>Between two dates</button>
        <button type="button" className={mode === 'add' ? 'active' : ''} onClick={() => setMode('add')}>Add or subtract days</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Start date" htmlFor="business-start"><span className="input-shell"><input id="business-start" type="date" min="1900-01-01" max="2200-12-31" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
        {mode === 'between' ? (
          <Field label="End date" htmlFor="business-end"><span className="input-shell"><input id="business-end" type="date" min="1900-01-01" max="2200-12-31" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></span></Field>
        ) : (
          <Field label="Business days to move" htmlFor="business-add" hint="Use a negative number to move backward"><InputShell suffix="days"><input id="business-add" type="number" min="-10000" max="10000" step="1" value={daysToAdd} onChange={(event) => setDaysToAdd(event.target.value)} /></InputShell></Field>
        )}
      </div>
      <div className="check-row">
        <label><input type="checkbox" checked={excludeFederalHolidays} onChange={(event) => setExcludeFederalHolidays(event.target.checked)} /> Exclude observed U.S. federal holidays</label>
        {mode === 'between' && <>
          <label><input type="checkbox" checked={includeStart} onChange={(event) => setIncludeStart(event.target.checked)} /> Count start date</label>
          <label><input type="checkbox" checked={includeEnd} onChange={(event) => setIncludeEnd(event.target.checked)} /> Count end date</label>
        </>}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {betweenResult && (
        <div className="calculation-output">
          <PrimaryResult label="Business days" value={Math.abs(betweenResult.value.businessDays).toLocaleString('en-US')} note={betweenResult.value.direction === 'backward' ? 'The end date is before the start date' : 'Using your endpoint and holiday settings'} tone="rose" />
          <StatGrid items={[
            { label: 'Calendar-day span', value: `${betweenResult.value.calendarDays}`, note: 'Elapsed days' },
            { label: 'Weekend days excluded', value: `${betweenResult.value.weekendDays}`, note: 'Saturday + Sunday' },
            { label: 'Federal holidays excluded', value: `${betweenResult.value.federalHolidays}`, note: excludeFederalHolidays ? 'Observed dates' : 'Holiday mode off' },
          ]} />
          <ResultDetails breakdown={betweenResult.breakdown} assumptions={betweenResult.assumptions} calculationVersion={betweenResult.calculationVersion} datasetSnapshotIds={betweenResult.datasetSnapshotIds} />
        </div>
      )}
      {addResult && (
        <div className="calculation-output">
          <PrimaryResult label="Resulting date" value={readableDate} note={`${daysToAdd} business days from ${startDate}`} tone="rose" />
          <StatGrid items={[
            { label: 'ISO date', value: addResult.value.resultDate },
            { label: 'Calendar days moved', value: `${addResult.value.calendarDaysMoved}` },
          ]} />
          <ResultDetails breakdown={addResult.breakdown} assumptions={addResult.assumptions} calculationVersion={addResult.calculationVersion} datasetSnapshotIds={addResult.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
