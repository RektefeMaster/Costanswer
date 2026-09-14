import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { taxesOnWagesLabel, type OccupationWageProfile } from '@/lib/calculations/salary';
import type { CalculationResult } from '@/lib/calculations/contracts';
import { FILING_STATUS_LABELS } from '@/lib/calculations/tax/types';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import { stateAreaLabelEs } from '@/lib/location/states-es';
import { occupationHeadingEs } from '@/lib/salary-content-es';
import { wageUi } from '@/lib/salary/wage-ui';

/**
 * The composed wage answer, rendered on the server.
 *
 * These pages have nothing to interact with — every number is fixed by the
 * release — so they ship no client JavaScript at all. The markup reuses the
 * calculator result classes so a salary page and a calculator result read as
 * the same object, and the folding sections are native `<details>` rather than
 * state.
 */

const PERCENTILE_ROWS = [
  { key: 'p10', labelKey: 'p10', noteKey: 'p10Note' },
  { key: 'p25', labelKey: 'p25', noteKey: null },
  { key: 'median', labelKey: 'median', noteKey: 'medianNote' },
  { key: 'p75', labelKey: 'p75', noteKey: null },
  { key: 'p90', labelKey: 'p90', noteKey: 'p90Note' },
] as const;

function placeLabel(profile: OccupationWageProfile, locale: Locale): string {
  return locale === 'es-US' ? stateAreaLabelEs(profile.area) : profile.areaLabel;
}

function money(locale: Locale, value: number, digits = 0): string {
  return locale === 'en-US' ? formatMoney(value, digits) : formatMoneyLocale(locale, value, digits);
}

function number(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return locale === 'en-US' ? formatNumber(value, options) : formatNumberLocale(locale, value, options);
}

function annualOrDash(locale: Locale, value: number | null, capped: boolean): string {
  if (value !== null) return money(locale, value, 0);
  return capped ? wageUi('capped', locale) : wageUi('unpublished', locale);
}

function hourlyOrDash(locale: Locale, value: number | null, capped: boolean): string {
  if (value !== null) return money(locale, value);
  return capped ? wageUi('capped', locale) : wageUi('unpublished', locale);
}

export function WagePercentileTable({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  const caption = locale === 'es-US'
    ? `Lo que ganan ${profile.occupation.displayTitle} en ${profile.areaLabel}, ${profile.referenceLabel}`
    : `What ${profile.occupation.displayTitle.toLowerCase()} earn in ${profile.areaLabel}, ${profile.referenceLabel}`;
  return (
    <div className="rank-table-wrap">
      <table className="rank-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{wageUi('percentile', locale)}</th>
            <th scope="col">{wageUi('annual', locale)}</th>
            <th scope="col">{wageUi('hourly', locale)}</th>
          </tr>
        </thead>
        <tbody>
          {PERCENTILE_ROWS.map((percentile) => (
            <tr className={percentile.key === 'median' ? 'is-home' : undefined} key={percentile.key}>
              <th scope="row">
                {wageUi(percentile.labelKey, locale)}
                {percentile.noteKey && <small>{wageUi(percentile.noteKey, locale)}</small>}
              </th>
              <td>{annualOrDash(locale, profile.wage.annual[percentile.key], profile.wage.atOrAboveWageCap)}</td>
              <td>{hourlyOrDash(locale, profile.wage.hourly[percentile.key], profile.wage.atOrAboveWageCap)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{wageUi('mean', locale)}<small>{wageUi('meanNote', locale)}</small></th>
            <td>{annualOrDash(locale, profile.wage.annualMean, profile.wage.atOrAboveWageCap)}</td>
            <td>{hourlyOrDash(locale, profile.wage.hourlyMean, profile.wage.atOrAboveWageCap)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function headlineWage(profile: OccupationWageProfile, locale: Locale): { label: string; value: string; note: string } {
  const place = placeLabel(profile, locale);
  const label = locale === 'es-US' ? `Sueldo mediano · ${place}` : `Median pay · ${profile.areaLabel}`;
  if (profile.wage.annualMedian !== null) {
    return {
      label,
      value: money(locale, profile.wage.annualMedian, 0),
      note: profile.wage.hourlyMedian === null
        ? (locale === 'es-US' ? 'Al año. BLS no publica un sueldo por hora para esta ocupación.' : 'A year. BLS publishes no hourly wage for this occupation.')
        : (locale === 'es-US' ? `Al año, o ${money(locale, profile.wage.hourlyMedian)} por hora.` : `A year, or ${money(locale, profile.wage.hourlyMedian)} an hour.`),
    };
  }
  if (profile.wage.hourlyMedian !== null) {
    return {
      label,
      value: `${money(locale, profile.wage.hourlyMedian)}/hr`,
      note: locale === 'es-US' ? 'BLS publica solo un sueldo por hora para esta ocupación.' : 'BLS publishes only an hourly wage for this occupation.',
    };
  }
  return { label, value: wageUi('unpublished', locale), note: locale === 'es-US' ? 'BLS retuvo esta estimación.' : 'BLS withheld this estimate.' };
}

export function WageStatGrid({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  const items: Array<{ label: string; value: string; note?: string }> = [];
  if (profile.takeHome) {
    items.push({
      label: wageUi('takeHomeMonth', locale),
      value: money(locale, profile.takeHome.monthly, 0),
      note: locale === 'es-US'
        ? `Después de ${taxesOnWagesLabel(profile.takeHome) === 'federal, state and FICA tax' ? 'impuestos federales, estatales y FICA' : 'impuestos federales y FICA'} al ${number(locale, profile.takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}`
        : `After ${taxesOnWagesLabel(profile.takeHome)} at ${number(locale, profile.takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}`,
    });
  }
  if (profile.costAdjusted) {
    items.push({
      label: wageUi('worthNational', locale),
      value: money(locale, profile.costAdjusted.adjustedAnnualMedian, 0),
      note: locale === 'es-US'
        ? `Los precios aquí están en ${number(locale, profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} frente a 100`
        : `Prices here sit at ${number(locale, profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against 100`,
    });
  }
  if (profile.versusNation) {
    const direction = profile.versusNation.differencePercent >= 0 ? wageUi('above', locale) : wageUi('below', locale);
    items.push({
      label: wageUi('againstNation', locale),
      value: `${number(locale, Math.abs(profile.versusNation.differencePercent), { maximumFractionDigits: 1 })}% ${direction}`,
      note: locale === 'es-US'
        ? `Mediana nacional ${money(locale, profile.versusNation.nationalAnnualMedian, 0)}`
        : `National median ${money(locale, profile.versusNation.nationalAnnualMedian, 0)}`,
    });
  }
  if (items.length < 3 && profile.employment.total !== null) {
    items.push({
      label: wageUi('jobsCounted', locale),
      value: number(locale, profile.employment.total),
      note: profile.employment.locationQuotient === null
        ? (locale === 'es-US' ? 'Empleos asalariados' : 'Wage and salary jobs')
        : (locale === 'es-US'
          ? `Concentración ${number(locale, profile.employment.locationQuotient, { maximumFractionDigits: 2 })} frente a 1.00`
          : `Concentration ${number(locale, profile.employment.locationQuotient, { maximumFractionDigits: 2 })} against 1.00`),
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="result-stat-grid">
      {items.slice(0, 3).map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}

export function WageResultDetails({ result, locale = 'en-US' }: { result: CalculationResult<OccupationWageProfile>; locale?: Locale }) {
  return (
    <div className="result-details">
      <details open>
        <summary>{wageUi('howWeGotThis', locale)}</summary>
        <ol>
          {result.breakdown.map((step, index) => (
            <li key={`${index}-${step.label}`}>
              <span><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</span>
              <b>{step.value}</b>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>{wageUi('whatWeAssumed', locale)}</summary>
        <ul>{result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
      <details className="result-audit-details">
        <summary>{wageUi('technical', locale)}</summary>
        <p className="result-audit">
          <span>Method {result.calculationVersion}</span>
          <span>Data {result.datasetSnapshotIds.join(', ')}</span>
        </p>
      </details>
    </div>
  );
}

export function WagePanel({
  result,
  tone = 'mint',
  footnote,
  locale = 'en-US',
}: {
  result: CalculationResult<OccupationWageProfile>;
  tone?: 'mint' | 'amber' | 'blue' | 'violet';
  footnote?: string;
  locale?: Locale;
}) {
  const profile = result.value;
  const headline = headlineWage(profile, locale);
  const where = placeLabel(profile, locale);
  const jobName = locale === 'es-US' ? occupationHeadingEs(profile.occupation) : profile.occupation.displayTitle;
  const stamp = footnote
    ?? `${wageUi('surveyStamp', locale)} · BLS ${profile.referenceLabel}`;
  return (
    <section className="calculator-panel" aria-label={locale === 'es-US' ? `Sueldo de ${jobName} en ${where}` : `${profile.occupation.displayTitle} pay in ${profile.areaLabel}`}>
      <div className="calculation-output">
        <div className={`primary-result result-${tone}`}>
          <p>{headline.label}</p>
          <strong>{headline.value}</strong>
          <span>{headline.note}</span>
        </div>
        <WageStatGrid profile={profile} locale={locale} />
        <WagePercentileTable profile={profile} locale={locale} />
        <p className="data-footnote">{stamp}</p>
        <WageResultDetails result={result} locale={locale} />
      </div>
    </section>
  );
}

export function TakeHomeSection({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  if (!profile.takeHome) return null;
  const takeHome = profile.takeHome;
  const filing = locale === 'es-US' ? 'soltero' : FILING_STATUS_LABELS[takeHome.filingStatus].toLowerCase();
  const where = placeLabel(profile, locale);
  return (
    <section className="engine-notes" aria-labelledby="take-home-title">
      <h2 id="take-home-title">{wageUi('takeHomeTitle', locale)}</h2>
      <p className="engine-notes-lede">
        {locale === 'es-US'
          ? `Un sueldo de ${money(locale, takeHome.grossAnnual, 0)} en ${where}, para un declarante ${filing} que toma la deducción estándar en ${takeHome.taxYear}.`
          : `A ${formatMoney(takeHome.grossAnnual, 0)} salary in ${profile.areaLabel}, for one ${FILING_STATUS_LABELS[takeHome.filingStatus].toLowerCase()} filer taking the standard deduction in ${takeHome.taxYear}.`}
      </p>
      <ul>
        <li><strong>{wageUi('federalTax', locale)}</strong> {money(locale, takeHome.federalIncomeTax, 0)}{locale === 'es-US' ? ' al año.' : ' a year.'}</li>
        <li>
          <strong>{wageUi('stateTax', locale)}</strong>{' '}
          {takeHome.stateTaxStatus === 'unsupported'
            ? (locale === 'es-US'
              ? `No modelado para ${where}, así que esta cifra cubre solo federal y FICA.`
              : `Not modeled for ${profile.areaLabel}, so this figure covers federal and FICA only.`)
            : takeHome.stateIncomeTax === 0
              ? (locale === 'es-US'
                ? `${where} no cobra impuesto estatal sobre salarios.`
                : `${profile.areaLabel} levies no state income tax on wages.`)
              : `${money(locale, takeHome.stateIncomeTax, 0)}${locale === 'es-US' ? ' al año.' : ' a year.'}`}
        </li>
        <li><strong>{wageUi('fica', locale)}</strong> {money(locale, takeHome.fica, 0)}{locale === 'es-US' ? ' al año.' : ' a year.'}</li>
        <li>
          <strong>{wageUi('leftOver', locale)}</strong> {money(locale, takeHome.annual, 0)}{locale === 'es-US' ? ' al año, ' : ' a year, '}{money(locale, takeHome.monthly, 0)}{locale === 'es-US' ? ' al mes, una tasa efectiva de ' : ' a month, an effective rate of '}{number(locale, takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}.
        </li>
      </ul>
      <p className="engine-notes-lede">
        <Link href="/money/salary-after-tax">{wageUi('runOwn', locale)}</Link>
      </p>
    </section>
  );
}

export function WageSources({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  const where = placeLabel(profile, locale);
  const sources = locale === 'es-US'
    ? [
        {
          name: 'BLS Occupational Employment and Wage Statistics',
          detail: `Estimaciones ${profile.referenceLabel}, todas las industrias, trabajadores asalariados`,
          href: 'https://www.bls.gov/oes/',
          dateLabel: profile.referenceLabel,
        },
        ...(profile.takeHome ? [{
          name: 'IRS y departamentos de ingresos estatales',
          detail: `Tramos federales ${profile.takeHome.taxYear}, deducción estándar, FICA y tablas estatales`,
          href: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
          dateLabel: String(profile.takeHome.taxYear),
        }] : []),
        ...(profile.costAdjusted ? [{
          name: 'BEA Regional Price Parities',
          detail: `Nivel de precios de ${where} frente a un 100 nacional`,
          href: 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area',
          dateLabel: String(profile.costAdjusted.referenceYear),
        }] : []),
        ...(profile.versusHousehold ? [{
          name: 'Census American Community Survey',
          detail: `Ingreso mediano del hogar, estimaciones de 5 años ${profile.versusHousehold.surveyYears}`,
          href: 'https://www.census.gov/programs-surveys/acs',
          dateLabel: profile.versusHousehold.surveyYears,
        }] : []),
      ]
    : [
        {
          name: 'BLS Occupational Employment and Wage Statistics',
          detail: `${profile.referenceLabel} estimates, cross-industry, wage and salary workers`,
          href: 'https://www.bls.gov/oes/',
          dateLabel: profile.referenceLabel,
        },
        ...(profile.takeHome ? [{
          name: 'IRS and state revenue departments',
          detail: `${profile.takeHome.taxYear} federal brackets, standard deduction, FICA and state schedules`,
          href: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
          dateLabel: String(profile.takeHome.taxYear),
        }] : []),
        ...(profile.costAdjusted ? [{
          name: 'BEA Regional Price Parities',
          detail: `Price level of ${profile.areaLabel} against a national 100`,
          href: 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area',
          dateLabel: String(profile.costAdjusted.referenceYear),
        }] : []),
        ...(profile.versusHousehold ? [{
          name: 'Census American Community Survey',
          detail: `Median household income, ${profile.versusHousehold.surveyYears} 5-year estimates`,
          href: 'https://www.census.gov/programs-surveys/acs',
          dateLabel: profile.versusHousehold.surveyYears,
        }] : []),
      ];
  const isEs = locale === 'es-US';
  const mailSubject = isEs
    ? `CostAnswer Reporte: ${profile.occupation.displayTitle} (${profile.areaLabel})`
    : `CostAnswer Wage Report: ${profile.occupation.displayTitle} (${profile.areaLabel})`;

  const mailBody = [
    isEs ? '[Describa aquí qué cifra parece incorrecta o qué tabla oficial esperaba]' : '[Describe what looks wrong or what official source table you expected]',
    '',
    '=== WAGE PROFILE DIAGNOSTIC ===',
    `Occupation: ${profile.occupation.displayTitle} (${profile.occupation.code})`,
    `Area: ${profile.areaLabel} (${profile.area})`,
    `Data Period: ${profile.referenceLabel}`,
    `Median Annual: ${profile.wage.annualMedian ? `$${profile.wage.annualMedian.toLocaleString('en-US')}` : 'Unpublished'}`,
    `Median Hourly: ${profile.wage.hourlyMedian ? `$${profile.wage.hourlyMedian.toFixed(2)}` : 'Unpublished'}`,
    `Tax Year: ${profile.takeHome?.taxYear ?? 'N/A'}`,
    `BEA Reference: ${profile.costAdjusted?.referenceYear ?? 'N/A'}`,
    `ACS Survey: ${profile.versusHousehold?.surveyYears ?? 'N/A'}`,
  ].join('\n');

  const mailtoHref = `mailto:hello@costanswer.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

  return (
    <section className="sources-section" aria-labelledby="sources-title">
      <div>
        <p className="eyebrow muted"><span /> {wageUi('sourcesKicker', locale)}</p>
        <h2 id="sources-title">{wageUi('sourcesTitle', locale)}</h2>
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <a href={source.href} key={source.name} target="_blank" rel="noreferrer">
            <span><strong>{source.name}</strong><small>{source.detail}</small></span>
            <span>{source.dateLabel} ↗</span>
          </a>
        ))}
      </div>
      <div className="wage-report-box">
        <p>
          {isEs ? '¿Encontró alguna discrepancia con los datos oficiales?' : 'Notice a discrepancy with official data?'}
          {' '}
          <a href={mailtoHref} className="wage-report-link">
            {isEs ? 'Reportar error a hello@costanswer.com ↗' : 'Report an issue to hello@costanswer.com ↗'}
          </a>
        </p>
      </div>
    </section>
  );
}
