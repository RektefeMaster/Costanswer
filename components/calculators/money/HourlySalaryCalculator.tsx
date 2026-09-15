'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';
import { siteText } from '@/lib/i18n/site-copy';
import { useMemo, useState } from 'react';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

export function HourlySalaryCalculator() {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const [hourlyRate, setHourlyRate] = useState('28');
  const [regularHours, setRegularHours] = useState('40');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5');
  const [weeks, setWeeks] = useState('52');

  const calculation = useMemo(() => {
    try {
      return { result: calculateHourlySalary({
        hourlyRate,
        regularHoursPerWeek: regularHours,
        overtimeHoursPerWeek: overtimeHours,
        overtimeMultiplier,
        weeksPerYear: weeks,
      }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [hourlyRate, regularHours, overtimeHours, overtimeMultiplier, weeks]);

  const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <CalculatorPanel
      title={t("Hourly wage to annual salary")}
      intro={t("Put in your rate, hours, and how many weeks you get paid. This is before taxes.")}
      toolId="hourly-to-salary"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([hourlyRate, regularHours, overtimeHours, overtimeMultiplier, weeks])}
    >
      <div className="calc-form-grid">
        <Field label={t("Hourly rate")} htmlFor="hourly-rate">
          <InputShell prefix="$" suffix={t("/ hour")}>
            <input id="hourly-rate" type="number" min="0.01" step="0.25" inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={t("Regular hours")} htmlFor="regular-hours" hint={t("Hours per week at your base rate")}>
          <InputShell suffix={t("hours")}>
            <input id="regular-hours" type="number" min="0" max="168" step="0.5" inputMode="decimal" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={t("Overtime hours")} htmlFor="overtime-hours" hint={t("Only hours paid at the overtime rate")}>
          <InputShell suffix={t("hours")}>
            <input id="overtime-hours" type="number" min="0" max="168" step="0.5" inputMode="decimal" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={t("Overtime rate")} htmlFor="overtime-rate">
          <InputShell suffix={t("× base")}>
            <input id="overtime-rate" type="number" min="1" max="3" step="0.1" inputMode="decimal" value={overtimeMultiplier} onChange={(event) => setOvertimeMultiplier(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={t("Paid weeks")} htmlFor="paid-weeks" hint={t("Use 52 if you are paid every week of the year")}>
          <InputShell suffix={t("/ year")}>
            <input id="paid-weeks" type="number" min="1" max="53" step="1" inputMode="numeric" value={weeks} onChange={(event) => setWeeks(event.target.value)} />
          </InputShell>
        </Field>
      </div>

      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label={t("Estimated annual gross pay")} value={money(calculation.result.value.annual)} note="Before taxes and deductions" tone="mint" />
          <StatGrid items={[
            { label: 'Monthly', value: money(calculation.result.value.monthly), note: 'Annual ÷ 12' },
            { label: 'Twice a month', value: money(calculation.result.value.semimonthly), note: '24 pay periods' },
            { label: 'Biweekly', value: money(calculation.result.value.biweekly), note: '26 pay periods' },
            { label: 'Weekly', value: money(calculation.result.value.weekly), note: 'Regular + overtime' },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
