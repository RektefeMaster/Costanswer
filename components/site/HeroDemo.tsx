'use client';

import type { Locale } from '@/lib/i18n/locales';
import { siteText } from '@/lib/i18n/site-copy';
import Link from '@/components/i18n/LocalizedLink';
import { useMemo, useState } from 'react';
import { calculateHourlySalary } from '@/lib/calculations/hourly-salary';

const regularHours = 40;
const weeksPerYear = 52;

function money(value: number, locale: Locale) {
  return value.toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function HeroDemo({ locale = 'en-US' }: { locale?: Locale }) {
  const t = (text: string) => siteText(text, locale);
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
    ? rateNumber.toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: rateNumber % 1 === 0 ? 0 : 2 })
    : '$0';

  return (
    <div className="hero-demo" aria-label={t("Example calculation")}>
      <div className="demo-topline">
        <span className="live-dot">{t("Example")}</span>
        <span>{t("Updates as you type")}</span>
      </div>
      <p className="demo-kicker">{locale === 'es-US' ? `¿Cuánto son ${rateLabel} por hora al año?` : `${rateLabel} an hour is how much a year?`}</p>
      <div className="demo-answer" aria-live="polite">
        <span>{calculation ? money(calculation.value.annual, locale) : 'n/a'}</span>
        <small>{t("per year")}</small>
      </div>
      <div className="demo-math">
        <label className="sr-only" htmlFor="hero-hourly-rate">{t("Hourly rate")}</label>
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
          {t('/hour')}
        </span>
        <b>×</b>
        <span>{regularHours} {t("hours")}</span>
        <b>×</b>
        <span>{weeksPerYear} {t("weeks")}</span>
      </div>
      <div className="demo-footer">
        <span>{t("Before taxes · 2,080 work hours")}</span>
        <Link href="/money/hourly-to-salary">{t("Open the salary calculator →")}</Link>
      </div>
    </div>
  );
}
