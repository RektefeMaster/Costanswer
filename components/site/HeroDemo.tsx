'use client';

import { useMemo, useState } from 'react';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';

const regularHours = 40;
const weeksPerYear = 52;

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function HeroDemo() {
  const [hourlyRate, setHourlyRate] = useState('28');

  const calculation = useMemo(() => {
    try {
      return calculateHourlySalary({
        hourlyRate: Number(hourlyRate),
        regularHoursPerWeek: regularHours,
        overtimeHoursPerWeek: 0,
        overtimeMultiplier: 1.5,
        weeksPerYear,
      });
    } catch {
      return null;
    }
  }, [hourlyRate]);

  const rateNumber = Number(hourlyRate);
  const rateLabel = Number.isFinite(rateNumber) && hourlyRate.trim() !== ''
    ? rateNumber.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: rateNumber % 1 === 0 ? 0 : 2 })
    : '$—';

  return (
    <div className="hero-demo" aria-label="Example calculation">
      <div className="demo-topline">
        <span className="live-dot">Example</span>
        <span>Updates as you type</span>
      </div>
      <p className="demo-kicker">{rateLabel} an hour is how much a year?</p>
      <div className="demo-answer" aria-live="polite">
        <span>{calculation ? money(calculation.value.annual) : '—'}</span>
        <small>per year</small>
      </div>
      <div className="demo-math">
        <label className="sr-only" htmlFor="hero-hourly-rate">Hourly rate</label>
        <span>
          {'$'}
          <input
            id="hero-hourly-rate"
            className="demo-math-input"
            type="number"
            min="0.01"
            max="10000"
            step="0.25"
            inputMode="decimal"
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
          />
          {'/hour'}
        </span>
        <b>×</b>
        <span>{regularHours} hours</span>
        <b>×</b>
        <span>{weeksPerYear} weeks</span>
      </div>
      <div className="demo-footer">
        <span>Before taxes · 2,080 work hours</span>
        <a href="/money/hourly-to-salary">Open the salary calculator →</a>
      </div>
    </div>
  );
}
