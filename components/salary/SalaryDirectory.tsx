'use client';

import { useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
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
} from '@/lib/salary-hub';
import { salaryStateIndexPath } from '@/lib/salary-pages';

const SORT_OPTIONS: ReadonlyArray<{ id: SalaryHubSort; label: string }> = [
  { id: 'field', label: 'By field' },
  { id: 'pay', label: 'Highest pay' },
  { id: 'jobs', label: 'Most jobs' },
];

function rankedHeading(sort: Exclude<SalaryHubSort, 'field'>): { kicker: string; title: string } {
  switch (sort) {
    case 'pay':
      return { kicker: 'Highest median first', title: 'What jobs pay most' };
    case 'jobs':
      return { kicker: 'Most jobs first', title: 'Jobs with the most workers' };
    default: {
      const _exhaustive: never = sort;
      throw new Error(`Unhandled salary hub sort: ${String(_exhaustive)}`);
    }
  }
}

function SortControl({
  sort,
  onChange,
}: {
  sort: SalaryHubSort;
  onChange: (next: SalaryHubSort) => void;
}) {
  return (
    <fieldset className="salary-hub-sort">
      <legend className="sr-only">Sort occupations</legend>
      {SORT_OPTIONS.map((option) => (
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
}: {
  groups: SalaryHubGroup[];
  children: ReactNode;
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

  const showGrouped = sort === 'field';
  const ranking = sort === 'field' ? null : rankedHeading(sort);
  const overlay = searching || ranking !== null;
  const resultLabel = searching
    ? `${formatNumber(matches.length)} match${matches.length === 1 ? '' : 'es'}`
    : `${formatNumber(matches.length)} occupations`;

  return (
    <div className="tool-workspace salary-hub" data-hydrated={hydrated}>
      <div className="tool-main-column">
        <div className="salary-hub-toolbar">
          <form className="answer-search salary-hub-search" role="search" onSubmit={submit}>
            <label className="sr-only" htmlFor="salary-job-search">Search occupations</label>
            <span className="search-icon" aria-hidden="true" />
            <input
              id="salary-job-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nurse, RN, electrician…"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit">Find <span aria-hidden="true">→</span></button>
          </form>
          <div className="salary-hub-toolbar-row">
            <p className="salary-hub-status" role="status" aria-live="polite">{resultLabel}</p>
            <SortControl sort={sort} onChange={setSort} />
          </div>
          {showGrouped && visibleGroups.length > 1 && (
            <nav className="salary-hub-fields" aria-label="Jump to a field">
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
              <h2>No occupation matches that.</h2>
              <p>Try a shorter title, an abbreviation like RN, or a SOC code. You can also browse by field or by state.</p>
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
          <p className="rail-kicker">Where</p>
          <h2>Pay changes by state</h2>
          <p>
            The same job can leave more in a low-tax state even when the median is lower.
            {' '}
            <Link href={salaryStateIndexPath()}>Browse salaries by state →</Link>
          </p>
        </div>
        <div className="rail-card">
          <p className="rail-kicker">Next</p>
          <h2>Turn a wage into take-home</h2>
          <p>
            <Link href="/money/salary-after-tax">Salary after tax →</Link>
            {' '}
            applies federal, FICA, and state wage tax to any figure, not only the median.
          </p>
          <p>
            <Link href="/money/hourly-to-salary">Hourly to salary →</Link>
            {' '}
            if the offer is an hourly rate.
          </p>
        </div>
      </aside>
    </div>
  );
}
