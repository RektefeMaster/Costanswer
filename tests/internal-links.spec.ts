import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { SalaryNextSteps } from '@/components/salary/SalaryNextSteps';
import { StateEconomicCluster } from '@/components/salary/StateEconomicCluster';
import { HourlyMatrixDirectory, SalaryMatrixDirectory } from '@/components/matrices/WageMatrixDirectory';
import { parseAnalyticsEvent, ANALYTICS_EVENTS, LINK_SURFACES } from '@/lib/analytics';
import { localizedHref } from '@/lib/i18n/routing';
import { LOCALES } from '@/lib/i18n/locales';
import { spanishSalaryPathForEnglish } from '@/lib/salary-es-pages';
import { STATE_CODES } from '@/lib/location/states';
import { salaryStatePath } from '@/lib/salary-pages';
import { ANNUAL_SALARIES, HOURLY_RATES, slugToHourly, slugToSalary } from '@/lib/matrices/wage-matrix-data';
import {
  resolveClosestAnnualSalary,
  resolveClosestHourlyRate,
  resolveIncomeLinks,
} from '@/lib/salary/income-links';

const MATRIX_LEAF = /^\/money\/(hourly-to-salary|salary-after-tax)\/(.+)$/;

/** Every bracket href a resolver hands out must be a page that exists. */
function assertResolvableLeaf(href: string): void {
  const match = href.match(MATRIX_LEAF);
  if (!match) return;
  const [, family, slug] = match;
  const resolved = family === 'hourly-to-salary' ? slugToHourly(slug) : slugToSalary(slug);
  expect(resolved, `${href} is not a published bracket`).toBeDefined();
}

describe('income link resolver', () => {
  it('only ever resolves brackets that have a published page', () => {
    for (let annual = 12_000; annual <= 400_000; annual += 1_000) {
      for (const state of [null, 'TX' as const, 'CA' as const]) {
        for (const locale of LOCALES) {
          const { links } = resolveIncomeLinks({ annualIncome: annual, state, locale });
          for (const link of links) assertResolvableLeaf(link.href);
        }
      }
    }
  });

  it('snaps to the nearest published bracket in both directions', () => {
    expect(resolveClosestAnnualSalary(84_300)).toBe(85_000);
    expect(resolveClosestAnnualSalary(62_000)).toBe(60_000);
    // Below and above the published range still land on a real page.
    expect(resolveClosestAnnualSalary(9_000)).toBe(30_000);
    expect(resolveClosestAnnualSalary(900_000)).toBe(200_000);
    expect(resolveClosestHourlyRate(41.2)).toBe(40);
    expect(resolveClosestHourlyRate(4)).toBe(15);
  });

  it('derives the hourly bracket from an annual figure and the reverse', () => {
    const fromAnnual = resolveIncomeLinks({ annualIncome: 62_400 });
    expect(fromAnnual.matchedHourly).toBe(30);
    const fromHourly = resolveIncomeLinks({ hourlyIncome: 30 });
    expect(fromHourly.matchedSalary).toBe(60_000);
    expect(fromHourly.matchedHourly).toBe(30);
  });

  it('names a state only on the page that carries a fifty-state table', () => {
    const { links } = resolveIncomeLinks({ annualIncome: 85_000, state: 'TX' });
    const byId = Object.fromEntries(links.map((link) => [link.id, link]));

    expect(byId['take-home'].href).toBe('/money/salary-after-tax/85k-a-year');
    expect(byId['take-home'].label).toContain('Texas');

    // The affordability and cost-of-living calculators do not open on a state,
    // so an anchor must not promise one.
    expect(byId['housing'].label).not.toContain('Texas');
    expect(byId['prices'].label).not.toContain('Texas');
  });

  it('never claims a state on a page that has no state to claim', () => {
    const { links } = resolveIncomeLinks({ annualIncome: 85_000 });
    expect(links.some((link) => link.id === 'state-hub')).toBe(false);
    for (const link of links) expect(link.label).not.toMatch(/\bin undefined\b|\bin null\b/);
  });

  it('keeps Spanish readers out of the English-only bracket pages', () => {
    for (const state of [null, 'TX' as const]) {
      const { links } = resolveIncomeLinks({ annualIncome: 85_000, state, locale: 'es-US' });
      for (const link of links) expect(link.href).not.toMatch(MATRIX_LEAF);
      expect(links.map((link) => link.href)).toContain('/money/salary-after-tax');
      expect(links.map((link) => link.href)).toContain('/money/hourly-to-salary');
    }
  });

  it('writes Spanish with its accents', () => {
    const { links } = resolveIncomeLinks({ annualIncome: 85_000, state: 'TX', locale: 'es-US' });
    const text = links.map((link) => `${link.badge} ${link.label} ${link.note}`).join(' ');
    expect(text).toContain('año');
    expect(text).toContain('después');
    // "ano" is a different word. Guard the whole block, not just the one string.
    expect(text).not.toMatch(/\bal ano\b/);
    expect(text).not.toMatch(/\bdespues\b/);
    expect(text).not.toMatch(/\bsegun\b/);
  });

  it('drops the page from its own next steps', () => {
    const path = salaryStatePath('TX');
    const withSelf = resolveIncomeLinks({ annualIncome: 50_000, state: 'TX' });
    expect(withSelf.links.some((link) => link.href === path)).toBe(true);

    const withoutSelf = resolveIncomeLinks({ annualIncome: 50_000, state: 'TX', currentPath: path });
    expect(withoutSelf.links.some((link) => link.href === path)).toBe(false);
  });

  it('falls back to the calculators when no wage was published', () => {
    for (const locale of LOCALES) {
      for (const income of [null, undefined, 0, Number.NaN]) {
        const { links, matchedSalary } = resolveIncomeLinks({ annualIncome: income, locale });
        expect(matchedSalary).toBeUndefined();
        expect(links).toHaveLength(4);
        for (const link of links) {
          expect(link.href).not.toMatch(MATRIX_LEAF);
          expect(link.label.trim()).toBe(link.label);
          expect(link.label.length).toBeGreaterThan(8);
        }
      }
    }
  });

  it('gives every step a badge, a label and a note in both locales', () => {
    for (const locale of LOCALES) {
      const { links } = resolveIncomeLinks({ annualIncome: 100_000, state: 'NY', locale });
      const ids = links.map((link) => link.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const link of links) {
        expect(link.badge.length).toBeGreaterThan(0);
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.note.length).toBeGreaterThan(0);
        expect(link.href.startsWith('/')).toBe(true);
      }
    }
  });
});

describe('Spanish addresses for linked state hubs', () => {
  it('routes every state hub link to the Spanish hub, not a rewrite of the English one', () => {
    for (const state of STATE_CODES) {
      const english = salaryStatePath(state);
      expect(localizedHref(english, 'es-US')).toBe(spanishSalaryPathForEnglish(english));
      expect(localizedHref(english, 'en-US')).toBe(english);
    }
  });
});

describe('internal link analytics', () => {
  it('registers the event and rejects a surface that is not a real placement', () => {
    expect(ANALYTICS_EVENTS).toContain('internal_link_click');
    for (const surface of LINK_SURFACES) {
      expect(parseAnalyticsEvent('internal_link_click', { surface, target: 'take-home' })).not.toBeNull();
    }
    expect(parseAnalyticsEvent('internal_link_click', { surface: 'sidebar', target: 'take-home' })).toBeNull();
    expect(parseAnalyticsEvent('internal_link_click', { surface: 'answer-next-step' })).toBeNull();
    expect(parseAnalyticsEvent('internal_link_click', { surface: 'answer-next-step', target: 'x', extra: 1 })).toBeNull();
  });

  it('carries the step id that the resolver assigns, so one step is one funnel', () => {
    const { links } = resolveIncomeLinks({ annualIncome: 85_000, state: 'TX' });
    for (const link of links) {
      expect(parseAnalyticsEvent('internal_link_click', { surface: 'answer-next-step', target: link.id })).not.toBeNull();
    }
  });
});

/*
 * Rendered-markup checks, in the same style as tests/calculator-ui.spec.ts.
 * The resolver tests above prove the decisions; these prove the decisions
 * survive into the HTML a crawler and a reader actually get, including the
 * `data-link-target` hooks the analytics surfaces read.
 */
describe('internal link surfaces render', () => {
  const html = (node: Parameters<typeof renderToStaticMarkup>[0], locale: 'en-US' | 'es-US' = 'en-US') =>
    renderToStaticMarkup(createElement(LocaleProvider, { locale, children: node }));

  it('gives every next step an anchor, a destination and a tracking hook', () => {
    const markup = html(createElement(SalaryNextSteps, { annualMedian: 85_300, hourlyMedian: 41.01, state: 'TX' }));
    expect(markup).toContain('href="/money/salary-after-tax/85k-a-year"');
    expect(markup).toContain('href="/money/hourly-to-salary/40-an-hour"');
    expect(markup).toContain('href="/salary/states/texas"');
    for (const target of ['take-home', 'hourly', 'housing', 'prices', 'state-hub']) {
      expect(markup).toContain(`data-link-target="${target}"`);
    }
    expect(markup).toContain('Texas');
  });

  it('sends a Spanish reader to Spanish addresses only', () => {
    const markup = html(
      createElement(SalaryNextSteps, { locale: 'es-US', annualMedian: 85_300, hourlyMedian: 41.01, state: 'TX' }),
      'es-US',
    );
    expect(markup).toContain('href="/es/salario/estados/texas"');
    expect(markup).not.toContain('/es/salary/states/');
    expect(markup).not.toMatch(/href="[^"]*salary-after-tax\/\d+k-a-year"/);
    expect(markup).toContain('año');
  });

  it('puts the state figure in front of the link on a state hub', () => {
    const markup = html(createElement(StateEconomicCluster, { state: 'TX', stateName: 'Texas', medianWage: 48_710 }));
    expect(markup).toContain('Take-home pay on a Texas salary');
    expect(markup).toContain('href="/money/salary-after-tax/75k-a-year"');
    expect(markup).toContain('href="/money/hourly-to-salary/30-an-hour"');
    expect(markup).toContain('data-link-target="state-salary-bracket"');
    // Texas takes nothing from wages, so the sentence must not name a state tax.
    expect(markup).toContain('2026 federal tax and FICA');
    expect(markup).not.toContain('Texas income tax');
  });

  it('never tells a state with an income tax that it has none', () => {
    for (const [state, name] of [['ND', 'North Dakota'], ['CA', 'California']] as const) {
      const markup = html(createElement(StateEconomicCluster, { state, stateName: name, medianWage: 50_000 }));
      expect(markup).not.toMatch(/levies no income tax|no state income tax/i);
      expect(markup).toContain(`${name} income tax`);
    }
  });

  it('lists every published bracket on the root tool directories', () => {
    const hourly = html(createElement(HourlyMatrixDirectory, {}));
    for (const rate of HOURLY_RATES) expect(hourly).toContain(`href="/money/hourly-to-salary/${rate}-an-hour"`);

    const salary = html(createElement(SalaryMatrixDirectory, {}));
    for (const amount of ANNUAL_SALARIES) expect(salary).toContain(`href="/money/salary-after-tax/${amount / 1000}k-a-year"`);
  });

  it('renders no directory at all on a Spanish page', () => {
    expect(html(createElement(HourlyMatrixDirectory, { locale: 'es-US' }), 'es-US')).toBe('');
    expect(html(createElement(SalaryMatrixDirectory, { locale: 'es-US' }), 'es-US')).toBe('');
  });
});
