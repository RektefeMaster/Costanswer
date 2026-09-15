/**
 * The bridge from a wage figure to the pages that answer what comes after it.
 *
 * Every salary page ends on a number. The reader's next question is always one
 * of four: what lands in the bank, what that is an hour, what house it buys,
 * and whether it goes far where they live. Those four pages exist already. What
 * did not exist was one place deciding which of them to name and how, so the
 * decision was about to be copied onto fifty thousand pages by hand.
 *
 * Two rules the resolver enforces, because getting them wrong costs more than
 * the links earn:
 *
 * 1. An anchor promises only what the destination delivers. The wage matrix
 *    leaves carry an all-fifty-states table, so naming a state on those is
 *    honest. The affordability and cost-of-living calculators do not open on a
 *    state, so they are never labelled as if they did.
 * 2. Spanish readers are never sent to English pages. The matrix leaves under
 *    `/money/hourly-to-salary/*` and `/money/salary-after-tax/*` are authored in
 *    English only, so the Spanish set routes to the localized calculators and
 *    the Spanish salary family instead. A link that lands a reader in the wrong
 *    language is a bounce, not a session.
 */
import { formatMoney } from '@/lib/calculations/contracts';
import { localized, type Locale } from '@/lib/i18n/locales';
import { getStateName, type StateCode } from '@/lib/location/states';
import {
  ANNUAL_SALARIES,
  HOURLY_RATES,
  hourlyToSlug,
  salaryToSlug,
  type AnnualSalary,
  type HourlyRate,
} from '@/lib/matrices/wage-matrix-data';
import { salaryStatePath } from '@/lib/salary-pages';

/**
 * A resolved next step.
 *
 * `id` is stable across locales and across the figure that produced it, so the
 * click-through rate of "the take-home step" is one number rather than one per
 * salary bracket.
 */
export type IncomeLinkItem = {
  id: string;
  href: string;
  badge: string;
  label: string;
  note: string;
};

export type IncomeLinksResult = {
  links: IncomeLinkItem[];
  /** The published bracket the income snapped to, when one was resolved. */
  matchedSalary?: AnnualSalary;
  matchedHourly?: HourlyRate;
};

/** Hours behind every annual/hourly conversion on the site: 40 a week, 52 weeks. */
const FULL_TIME_HOURS = 2080;

function closest<T extends number>(values: readonly T[], target: number): T {
  let best = values[0];
  let bestGap = Math.abs(best - target);
  for (const value of values) {
    const gap = Math.abs(value - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = value;
    }
  }
  return best;
}

/** Snaps an annual figure to the nearest salary that has a published page. */
export function resolveClosestAnnualSalary(amount: number): AnnualSalary {
  return closest(ANNUAL_SALARIES, amount);
}

/** Snaps an hourly figure to the nearest rate that has a published page. */
export function resolveClosestHourlyRate(rate: number): HourlyRate {
  return closest(HOURLY_RATES, rate);
}

const BADGES = {
  takeHome: localized({ 'en-US': 'Take-home pay', 'es-US': 'Sueldo neto' }),
  hourly: localized({ 'en-US': 'By the hour', 'es-US': 'Por hora' }),
  housing: localized({ 'en-US': 'Housing', 'es-US': 'Vivienda' }),
  prices: localized({ 'en-US': 'Local prices', 'es-US': 'Precios locales' }),
  state: localized({ 'en-US': 'Same state', 'es-US': 'El mismo estado' }),
} as const;

const TAKE_HOME_LABEL = localized({
  'en-US': (salary: string, state: string | null) =>
    state ? `What ${salary} a year leaves after tax in ${state}` : `What ${salary} a year leaves after tax`,
  'es-US': (salary: string, state: string | null) =>
    state ? `Qué queda de ${salary} al año después de impuestos en ${state}` : `Qué queda de ${salary} al año después de impuestos`,
});

const TAKE_HOME_NOTE = localized({
  'en-US': (state: string | null) =>
    state
      ? `Federal tax, FICA and ${state} withholding on that salary, with the other 49 states beside it.`
      : 'Federal tax, FICA and state withholding, with all fifty states beside it.',
  'es-US': () => 'Impuesto federal, FICA y retención estatal, con el neto mensual y quincenal.',
});

const HOURLY_LABEL = localized({
  'en-US': (rate: string) => `${rate} an hour is how much a year`,
  'es-US': () => 'De salario por hora a sueldo anual',
});

const HOURLY_NOTE = localized({
  'en-US': () => 'Weekly, biweekly and monthly gross at 2,080 hours, plus time and a half.',
  'es-US': () => 'Bruto semanal, quincenal y mensual sobre 2.080 horas al año.',
});

const HOUSING_LABEL = localized({
  'en-US': (salary: string) => `What a ${salary} salary buys at today's rates`,
  'es-US': (salary: string) => `Qué casa alcanza con un sueldo de ${salary}`,
});

const HOUSING_NOTE = localized({
  'en-US': () => 'Price range, down payment and the monthly payment behind it, on current mortgage rates.',
  'es-US': () => 'Rango de precio, enganche y el pago mensual, con las tasas hipotecarias actuales.',
});

const PRICES_LABEL = localized({
  'en-US': (salary: string) => `What ${salary} is worth where you live`,
  'es-US': (salary: string) => `Cuánto vale ${salary} donde usted vive`,
});

const PRICES_NOTE = localized({
  'en-US': () => 'Rent, groceries and the local price level against the national average.',
  'es-US': () => 'Renta, alimentos y el nivel de precios local frente al promedio nacional.',
});

const STATE_LABEL = localized({
  'en-US': (state: string) => `Every occupation ${state} publishes a wage for`,
  'es-US': (state: string) => `Todas las ocupaciones con sueldo publicado en ${state}`,
});

const STATE_NOTE = localized({
  'en-US': (state: string) => `The biggest employers, the best paid, and what is distinctive about ${state}.`,
  'es-US': (state: string) => `Los empleos más comunes, los mejor pagados y lo que distingue a ${state}.`,
});

/**
 * The set shown when a page has no wage to work from.
 *
 * A salary page without a published median still has a reader on it, and the
 * same four questions follow. They just get asked of the calculators rather
 * than of a bracket.
 */
function fallbackLinks(locale: Locale): IncomeLinkItem[] {
  const es = locale === 'es-US';
  return [
    {
      id: 'take-home',
      href: '/money/salary-after-tax',
      badge: BADGES.takeHome[locale],
      label: es ? 'Sueldo anual después de impuestos' : 'Salary after tax',
      note: TAKE_HOME_NOTE[locale](null),
    },
    {
      id: 'hourly',
      href: '/money/hourly-to-salary',
      badge: BADGES.hourly[locale],
      label: es ? 'De salario por hora a sueldo anual' : 'Hourly wage to a yearly salary',
      note: HOURLY_NOTE[locale](),
    },
    {
      id: 'housing',
      href: '/money/home-affordability',
      badge: BADGES.housing[locale],
      label: es ? 'Qué casa alcanza con su sueldo' : 'What your salary buys at today’s rates',
      note: HOUSING_NOTE[locale](),
    },
    {
      id: 'prices',
      href: '/money/cost-of-living',
      badge: BADGES.prices[locale],
      label: es ? 'Costo de vida por estado' : 'Cost of living where you live',
      note: PRICES_NOTE[locale](),
    },
  ];
}

/**
 * The next steps to name beside a wage figure.
 *
 * Ordered by the question a reader actually asks next: what lands in the bank,
 * what that is an hour, what house it buys, what it is worth locally, and only
 * then what else the state pays. Reordering this changes what people click, so
 * it is a decision, not an arrangement.
 */
export function resolveIncomeLinks({
  annualIncome,
  hourlyIncome,
  state,
  locale = 'en-US',
  currentPath,
}: {
  annualIncome?: number | null;
  hourlyIncome?: number | null;
  state?: StateCode | null;
  locale?: Locale;
  /**
   * The page doing the linking, so it never appears in its own next steps. A
   * state hub asks for the state's name in the copy and would otherwise offer
   * itself as the fifth card.
   *
   * Give the English canonical path even on a Spanish page. Every href returned
   * here is canonical and `LocalizedLink` maps it at render, so comparing
   * against the Spanish address would never match.
   */
  currentPath?: string;
}): IncomeLinksResult {
  const annual = annualIncome ?? (hourlyIncome != null ? hourlyIncome * FULL_TIME_HOURS : null);
  const hourly = hourlyIncome ?? (annualIncome != null ? annualIncome / FULL_TIME_HOURS : null);

  const drop = (items: IncomeLinkItem[]) => items.filter((item) => item.href !== currentPath);

  if (annual === null || !Number.isFinite(annual) || annual <= 0) {
    return { links: drop(fallbackLinks(locale)) };
  }

  const matchedSalary = resolveClosestAnnualSalary(annual);
  const matchedHourly = resolveClosestHourlyRate(hourly ?? annual / FULL_TIME_HOURS);
  const stateName = state ? getStateName(state) : null;
  const salaryText = formatMoney(matchedSalary, 0);
  const rateText = formatMoney(matchedHourly, 0);
  const es = locale === 'es-US';

  /*
   * Spanish stops at the calculators. The matrix leaf pages are authored in
   * English and carry no Spanish alternate, so linking a Spanish reader into
   * one trades a session for a bounce and splits the hreflang pair.
   */
  const takeHomeHref = es ? '/money/salary-after-tax' : `/money/salary-after-tax/${salaryToSlug(matchedSalary)}`;
  const hourlyHref = es ? '/money/hourly-to-salary' : `/money/hourly-to-salary/${hourlyToSlug(matchedHourly)}`;

  const links: IncomeLinkItem[] = [
    {
      id: 'take-home',
      href: takeHomeHref,
      badge: BADGES.takeHome[locale],
      /*
       * Naming the state here is honest only because the destination carries a
       * fifty-state table. The two calculators below it do not, so they are not
       * labelled with one.
       */
      label: TAKE_HOME_LABEL[locale](salaryText, es ? null : stateName),
      note: TAKE_HOME_NOTE[locale](es ? null : stateName),
    },
    {
      id: 'hourly',
      href: hourlyHref,
      badge: BADGES.hourly[locale],
      label: HOURLY_LABEL[locale](rateText),
      note: HOURLY_NOTE[locale](),
    },
    {
      id: 'housing',
      href: '/money/home-affordability',
      badge: BADGES.housing[locale],
      label: HOUSING_LABEL[locale](salaryText),
      note: HOUSING_NOTE[locale](),
    },
    {
      id: 'prices',
      href: '/money/cost-of-living',
      badge: BADGES.prices[locale],
      label: PRICES_LABEL[locale](salaryText),
      note: PRICES_NOTE[locale](),
    },
  ];

  if (state && stateName) {
    links.push({
      id: 'state-hub',
      href: salaryStatePath(state),
      badge: BADGES.state[locale],
      label: STATE_LABEL[locale](stateName),
      note: STATE_NOTE[locale](stateName),
    });
  }

  return { links: drop(links), matchedSalary, matchedHourly };
}
