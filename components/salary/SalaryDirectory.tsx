'use client';

import { useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { useRouter } from 'next/navigation';
import { SalaryOccupationList } from '@/components/salary/SalaryCatalog';
import { formatNumber } from '@/lib/calculations/contracts';
import {
  compareSalaryHubOccupations,
  filterSalaryHubGroups,
  flattenSalaryHub,
  normalizeSalaryQuery,
  type SalaryHubGroup,
  type SalaryHubSort,
} from '@/lib/salary-hub-view';
import { SALARY_STATE_INDEX_PATH, SALARY_ES_STATE_INDEX_PATH } from '@/lib/salary-routes';
import type { Locale } from '@/lib/i18n/locales';

const SORT_OPTIONS: Record<Locale, ReadonlyArray<{ id: SalaryHubSort; label: string }>> = {
  'en-US': [
    { id: 'field', label: 'By field' },
    { id: 'pay', label: 'Highest pay' },
    { id: 'jobs', label: 'Most jobs' },
  ],
  'es-US': [
    { id: 'field', label: 'Por campo' },
    { id: 'pay', label: 'Mayor sueldo' },
    { id: 'jobs', label: 'Más empleos' },
  ],
};

function rankedHeading(sort: Exclude<SalaryHubSort, 'field'>, locale: Locale): { kicker: string; title: string } {
  switch (sort) {
    case 'pay':
      return locale === 'es-US'
        ? { kicker: 'La mediana más alta primero', title: 'Qué trabajos pagan más' }
        : { kicker: 'Highest median first', title: 'What jobs pay most' };
    case 'jobs':
      return locale === 'es-US'
        ? { kicker: 'Más empleos primero', title: 'Trabajos con más gente' }
        : { kicker: 'Most jobs first', title: 'Jobs with the most workers' };
    default: {
      const _exhaustive: never = sort;
      throw new Error(`Unhandled salary hub sort: ${String(_exhaustive)}`);
    }
  }
}

function SortControl({
  sort,
  locale,
  onChange,
}: {
  sort: SalaryHubSort;
  locale: Locale;
  onChange: (next: SalaryHubSort) => void;
}) {
  return (
    <fieldset className="salary-hub-sort">
      <legend className="sr-only">{locale === 'es-US' ? 'Ordenar ocupaciones' : 'Sort occupations'}</legend>
      {SORT_OPTIONS[locale].map((option) => (
        <label className={sort === option.id ? 'is-active' : undefined} key={option.id}>
          <input
            type="radio"
            name="salary-sort"
            value={option.id}
            checked={sort === option.id}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Search, sort, and jump controls over the server-rendered catalogue.
 *
 * The 761 occupation links stay server HTML so the page hydrates as a toolbar,
 * not as a tree of every job. Filtering and ranking swap that catalogue for a
 * smaller client list only after the reader asks.
 */
export function SalaryDirectory({
  groups,
  children,
  locale = 'en-US',
}: {
  groups: SalaryHubGroup[];
  children: ReactNode;
  locale?: Locale;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SalaryHubSort>('field');
  const needle = normalizeSalaryQuery(query);
  const searching = needle.length >= 2;

  const visibleGroups = useMemo(
    () => filterSalaryHubGroups(groups, query),
    [groups, query],
  );
  const matches = useMemo(() => flattenSalaryHub(visibleGroups), [visibleGroups]);
  const ranked = useMemo(() => {
    if (sort === 'field') return matches;
    return [...matches].sort((left, right) => compareSalaryHubOccupations(left, right, sort));
  }, [matches, sort]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const onlyMatch = matches.length === 1 ? matches[0] : undefined;
    if (onlyMatch) {
      router.push(onlyMatch.path);
      return;
    }
    document.getElementById('salary-hub-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const stateIndexPath = locale === 'es-US' ? SALARY_ES_STATE_INDEX_PATH : SALARY_STATE_INDEX_PATH;
  const searchingCopy = locale === 'es-US';
  const showGrouped = sort === 'field';
  const ranking = sort === 'field' ? null : rankedHeading(sort, locale);
  const overlay = searching || ranking !== null;
  const resultLabel = searching
    ? searchingCopy
      ? `${formatNumber(matches.length)} coincidencia${matches.length === 1 ? '' : 's'}`
      : `${formatNumber(matches.length)} match${matches.length === 1 ? '' : 'es'}`
    : searchingCopy
      ? `${formatNumber(matches.length)} ocupaciones`
      : `${formatNumber(matches.length)} occupations`;

  return (
    <div className="tool-workspace salary-hub" data-hydrated={hydrated}>
      <div className="tool-main-column">
        <div className="salary-hub-toolbar">
          <form className="answer-search salary-hub-search" role="search" onSubmit={submit}>
            <label className="sr-only" htmlFor="salary-job-search">{searchingCopy ? 'Buscar ocupaciones' : 'Search occupations'}</label>
            <span className="search-icon" aria-hidden="true" />
            <input
              id="salary-job-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchingCopy ? 'Enfermero, RN, electricista…' : 'Nurse, RN, electrician…'}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit">{searchingCopy ? 'Buscar' : 'Find'} <span aria-hidden="true">→</span></button>
          </form>
          <div className="salary-hub-toolbar-row">
            <p className="salary-hub-status" role="status" aria-live="polite">{resultLabel}</p>
            <SortControl sort={sort} locale={locale} onChange={setSort} />
          </div>
          {showGrouped && visibleGroups.length > 1 && (
            <nav className="salary-hub-fields" aria-label={searchingCopy ? 'Ir a un campo' : 'Jump to a field'}>
              {visibleGroups.map((group) => (
                <a href={`#group-${group.majorCode}`} key={group.majorCode}>
                  {group.shortTitle}
                  <span>{formatNumber(group.members.length)}</span>
                </a>
              ))}
            </nav>
          )}
        </div>

        <div id="salary-hub-results">
          {overlay && matches.length === 0 ? (
            <div className="salary-hub-empty">
              <h2>{searchingCopy ? 'Ninguna ocupación coincide.' : 'No occupation matches that.'}</h2>
              <p>{searchingCopy ? 'Pruebe un título más corto, una abreviación como RN, o un código SOC. También puede mirar por campo o por estado.' : 'Try a shorter title, an abbreviation like RN, or a SOC code. You can also browse by field or by state.'}</p>
            </div>
          ) : overlay && showGrouped ? (
            visibleGroups.map((group) => (
              <section
                className="related-section salary-hub-group"
                aria-labelledby={`group-${group.majorCode}-title`}
                id={`group-${group.majorCode}`}
                key={group.majorCode}
              >
                <p className="eyebrow muted"><span /> {`SOC ${group.majorCode} · ${formatNumber(group.members.length)}`}</p>
                <h2 id={`group-${group.majorCode}-title`}>{group.title}</h2>
                <SalaryOccupationList occupations={group.members} />
              </section>
            ))
          ) : ranking ? (
            <section className="related-section salary-hub-group" aria-labelledby="salary-ranked-title">
              <p className="eyebrow muted"><span /> {ranking.kicker}</p>
              <h2 id="salary-ranked-title">{ranking.title}</h2>
              <SalaryOccupationList occupations={ranked} ranked />
            </section>
          ) : children}
        </div>
      </div>

      <aside className="tool-rail salary-hub-rail">
        <div className="rail-card">
          <p className="rail-kicker">{searchingCopy ? 'Dónde' : 'Where'}</p>
          <h2>{searchingCopy ? 'El sueldo cambia por estado' : 'Pay changes by state'}</h2>
          <p>
            {searchingCopy
              ? 'El mismo trabajo puede dejar más en un estado con poco impuesto aunque la mediana sea más baja.'
              : 'The same job can leave more in a low-tax state even when the median is lower.'}
            {' '}
            <Link href={stateIndexPath}>{searchingCopy ? 'Ver sueldos por estado →' : 'Browse salaries by state →'}</Link>
          </p>
        </div>
        <div className="rail-card">
          <p className="rail-kicker">{searchingCopy ? 'Siguiente' : 'Next'}</p>
          <h2>{searchingCopy ? 'Pase un sueldo a neto' : 'Turn a wage into take-home'}</h2>
          <p>
            <Link href="/money/salary-after-tax">{searchingCopy ? 'Sueldo después de impuestos →' : 'Salary after tax →'}</Link>
            {' '}
            {searchingCopy
              ? 'aplica federal, FICA y el impuesto estatal a cualquier cifra, no solo a la mediana.'
              : 'applies federal, FICA, and state wage tax to any figure, not only the median.'}
          </p>
          <p>
            <Link href="/money/hourly-to-salary">{searchingCopy ? 'De hora a sueldo anual →' : 'Hourly to salary →'}</Link>
            {' '}
            {searchingCopy ? 'si la oferta es por hora.' : 'if the offer is an hourly rate.'}
          </p>
        </div>
      </aside>
    </div>
  );
}
