'use client';

import { useMemo, useState } from 'react';
import {
  calculateDateOffset,
  calculateDaysFromToday,
  calculateRandomNumber,
  calculateTime,
  calculateTimeCard,
} from '@/lib/calculations/everyday';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

export function TimeCalculator() {
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [leftH, setLeftH] = useState('2');
  const [leftM, setLeftM] = useState('45');
  const [leftS, setLeftS] = useState('0');
  const [rightH, setRightH] = useState('1');
  const [rightM, setRightM] = useState('30');
  const [rightS, setRightS] = useState('0');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateTime({
          operation,
          left: { hours: Number(leftH), minutes: Number(leftM), seconds: Number(leftS) },
          right: { hours: Number(rightH), minutes: Number(rightM), seconds: Number(rightS) },
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [operation, leftH, leftM, leftS, rightH, rightM, rightS]);

  return (
    <CalculatorPanel title="Duration arithmetic" intro="Add or subtract hours, minutes, and seconds. Not a clock and not a date." toolId="time" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([operation, leftH, leftM, leftS, rightH, rightM, rightS])}>
      <div className="mode-tabs" role="group" aria-label="Operation">
        <button type="button" aria-pressed={operation === 'add'} className={operation === 'add' ? 'active' : ''} onClick={() => setOperation('add')}>Add</button>
        <button type="button" aria-pressed={operation === 'subtract'} className={operation === 'subtract' ? 'active' : ''} onClick={() => setOperation('subtract')}>Subtract</button>
      </div>
      <div className="calc-form-grid three-up">
        <Field label="First hours" htmlFor="time-lh"><InputShell suffix="h"><input id="time-lh" type="number" step="1" inputMode="numeric" value={leftH} onChange={(event) => setLeftH(event.target.value)} /></InputShell></Field>
        <Field label="First minutes" htmlFor="time-lm"><InputShell suffix="m"><input id="time-lm" type="number" step="1" inputMode="numeric" value={leftM} onChange={(event) => setLeftM(event.target.value)} /></InputShell></Field>
        <Field label="First seconds" htmlFor="time-ls"><InputShell suffix="s"><input id="time-ls" type="number" step="1" inputMode="numeric" value={leftS} onChange={(event) => setLeftS(event.target.value)} /></InputShell></Field>
        <Field label="Second hours" htmlFor="time-rh"><InputShell suffix="h"><input id="time-rh" type="number" step="1" inputMode="numeric" value={rightH} onChange={(event) => setRightH(event.target.value)} /></InputShell></Field>
        <Field label="Second minutes" htmlFor="time-rm"><InputShell suffix="m"><input id="time-rm" type="number" step="1" inputMode="numeric" value={rightM} onChange={(event) => setRightM(event.target.value)} /></InputShell></Field>
        <Field label="Second seconds" htmlFor="time-rs"><InputShell suffix="s"><input id="time-rs" type="number" step="1" inputMode="numeric" value={rightS} onChange={(event) => setRightS(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Normalized duration" value={calculation.result.value.display} tone="rose" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function DateCalculator() {
  const [startDate, setStartDate] = useState('2026-01-31');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [direction, setDirection] = useState<'after' | 'before'>('after');
  const calculation = useMemo(() => {
    try {
      return { result: calculateDateOffset({ startDate, amount: Number(amount), unit, direction }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [startDate, amount, unit, direction]);

  return (
    <CalculatorPanel title="Date offset" intro="Move a calendar date by days, weeks, months, or years. End-of-month days are clamped." toolId="date" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${startDate}|${amount}|${unit}|${direction}`}>
      <div className="mode-tabs" role="group" aria-label="Direction">
        <button type="button" aria-pressed={direction === 'after'} className={direction === 'after' ? 'active' : ''} onClick={() => setDirection('after')}>After</button>
        <button type="button" aria-pressed={direction === 'before'} className={direction === 'before' ? 'active' : ''} onClick={() => setDirection('before')}>Before</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Starting date" htmlFor="date-start"><span className="input-shell"><input id="date-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></Field>
        <Field label="Amount" htmlFor="date-amount"><InputShell><input id="date-amount" type="number" min="0" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></InputShell></Field>
        <Field label="Unit" htmlFor="date-unit">
          <span className="input-shell select-shell">
            <select id="date-unit" value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Resulting date" value={calculation.result.value.resultDate} note={calculation.result.value.weekday} tone="rose" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function DaysFromTodayCalculator({ today }: { today: string }) {
  const [days, setDays] = useState('30');
  const [direction, setDirection] = useState<'from-today' | 'ago'>('from-today');
  const calculation = useMemo(() => {
    try {
      return { result: calculateDaysFromToday({ days: Number(days), direction }, () => today), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [days, direction, today]);

  return (
    <CalculatorPanel title="Days from today" intro="A single offset from today’s calendar date. Weekends still count." toolId="days-from-today" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${today}|${days}|${direction}`}>
      <div className="mode-tabs" role="group" aria-label="Direction">
        <button type="button" aria-pressed={direction === 'from-today'} className={direction === 'from-today' ? 'active' : ''} onClick={() => setDirection('from-today')}>From today</button>
        <button type="button" aria-pressed={direction === 'ago'} className={direction === 'ago' ? 'active' : ''} onClick={() => setDirection('ago')}>Days ago</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Calendar days" htmlFor="days-n"><InputShell suffix="days"><input id="days-n" type="number" min="0" step="1" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Resulting calendar date" value={calculation.result.value.resultDate} note={calculation.result.value.weekday} tone="rose" />
          <StatGrid items={[
            { label: 'Today', value: calculation.result.value.today },
            { label: 'Offset', value: `${calculation.result.value.signedDays} days` },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

type ShiftRow = { id: string; start: string; end: string; unpaidBreakMinutes: string };

export function TimeCardCalculator() {
  const [shifts, setShifts] = useState<ShiftRow[]>([
    { id: 'shift-1', start: '09:00', end: '17:30', unpaidBreakMinutes: '30' },
  ]);
  const [hourlyRate, setHourlyRate] = useState('');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateTimeCard({
          shifts: shifts.map((shift) => ({
            id: shift.id,
            start: shift.start,
            end: shift.end,
            unpaidBreakMinutes: Number(shift.unpaidBreakMinutes),
          })),
          hourlyRate: hourlyRate === '' ? undefined : Number(hourlyRate),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [shifts, hourlyRate]);

  return (
    <CalculatorPanel title="Hours worked" intro="Shift start, end, and unpaid break. Overnight shifts are allowed. Overtime law is not applied." toolId="time-card" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([shifts, hourlyRate])}>
      <div className="ingredient-editor time-card-editor" role="group" aria-label="Shifts">
        <div className="ingredient-head" aria-hidden="true"><span>Start</span><span>End</span><span>Break</span><span /></div>
        {shifts.map((shift, index) => (
          <div className="ingredient-row" key={shift.id}>
            <label>
              <span className="sr-only">Shift {index + 1} start</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Start</span>
              <input id={index === 0 ? 'timecard-start-0' : undefined} type="time" value={shift.start} onChange={(event) => setShifts((current) => current.map((row) => row.id === shift.id ? { ...row, start: event.target.value } : row))} />
            </label>
            <label>
              <span className="sr-only">Shift {index + 1} end</span>
              <span className="ingredient-mobile-label" aria-hidden="true">End</span>
              <input type="time" value={shift.end} onChange={(event) => setShifts((current) => current.map((row) => row.id === shift.id ? { ...row, end: event.target.value } : row))} />
            </label>
            <label>
              <span className="sr-only">Shift {index + 1} unpaid break minutes</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Break min</span>
              <input type="number" min="0" step="5" inputMode="numeric" value={shift.unpaidBreakMinutes} onChange={(event) => setShifts((current) => current.map((row) => row.id === shift.id ? { ...row, unpaidBreakMinutes: event.target.value } : row))} />
            </label>
            <button type="button" aria-label={`Remove shift ${index + 1}`} disabled={shifts.length === 1} onClick={() => setShifts((current) => current.filter((row) => row.id !== shift.id))}>×</button>
          </div>
        ))}
        {shifts.length < 14 && (
          <button className="add-row-button" type="button" onClick={() => setShifts((current) => [...current, { id: `shift-${current.length + 1}`, start: '09:00', end: '17:00', unpaidBreakMinutes: '0' }])}>+ Add a shift</button>
        )}
      </div>
      <div className="calc-form-grid compact-grid">
        <Field label="Hourly rate" htmlFor="timecard-rate" hint="Optional. No overtime rules.">
          <InputShell prefix="$"><input id="timecard-rate" type="number" min="0" step="0.25" inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} /></InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Total hours" value={`${calculation.result.value.decimalHours.toFixed(2)} h`} note={`${calculation.result.value.totalMinutes} minutes after breaks`} tone="rose" />
          {calculation.result.value.grossPay !== undefined && (
            <StatGrid items={[{ label: 'Hours × rate', value: calculation.result.value.grossPay.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), note: 'Not a wage claim' }]} />
          )}
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function RandomNumberCalculator() {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [integer, setInteger] = useState(true);
  const [unique, setUnique] = useState(false);
  const [output, setOutput] = useState<ReturnType<typeof calculateRandomNumber> | null>(null);
  const [error, setError] = useState('');

  const generate = () => {
    try {
      setOutput(calculateRandomNumber({ min: Number(min), max: Number(max), count: Number(count), integer, unique }));
      setError('');
    } catch (caught) {
      setOutput(null);
      setError(calculationErrorMessage(caught));
    }
  };

  return (
    <CalculatorPanel title="Random numbers" intro="Generate numbers in a range. Ordinary utility randomness, not a security tool." toolId="random-number" category="everyday" calculationState={output ? 'complete' : error ? 'invalid' : 'waiting'} calculationSignature={JSON.stringify([min, max, count, integer, unique, output?.value.values])}>
      <div className="calc-form-grid">
        <Field label="Minimum" htmlFor="rand-min"><InputShell><input id="rand-min" type="number" step="1" inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} /></InputShell></Field>
        <Field label="Maximum" htmlFor="rand-max"><InputShell><input id="rand-max" type="number" step="1" inputMode="decimal" value={max} onChange={(event) => setMax(event.target.value)} /></InputShell></Field>
        <Field label="Count" htmlFor="rand-count"><InputShell><input id="rand-count" type="number" min="1" max="100" step="1" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} /></InputShell></Field>
      </div>
      <div className="mode-tabs" role="group" aria-label="Integer mode">
        <button type="button" aria-pressed={integer} className={integer ? 'active' : ''} onClick={() => setInteger(true)}>Integers</button>
        <button type="button" aria-pressed={!integer} className={!integer ? 'active' : ''} onClick={() => { setInteger(false); setUnique(false); }}>Decimals</button>
      </div>
      {integer && (
        <div className="mode-tabs" role="group" aria-label="Uniqueness">
          <button type="button" aria-pressed={!unique} className={!unique ? 'active' : ''} onClick={() => setUnique(false)}>Allow repeats</button>
          <button type="button" aria-pressed={unique} className={unique ? 'active' : ''} onClick={() => setUnique(true)}>Unique</button>
        </div>
      )}
      <div className="row-editor-actions">
        <button className="generate-button" type="button" onClick={generate}>Generate</button>
      </div>
      {error && <InlineError message={error} />}
      {output && (
        <div className="calculation-output">
          <PrimaryResult label={output.value.values.length === 1 ? 'Random number' : 'Random numbers'} value={String(output.value.values[0])} note={`${output.value.values.length} value${output.value.values.length === 1 ? '' : 's'}`} tone="rose" />
          <div className="generated-list" aria-label="Generated numbers">
            {output.value.values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
          </div>
          <ResultDetails breakdown={output.breakdown} assumptions={output.assumptions} calculationVersion={output.calculationVersion} datasetSnapshotIds={output.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
