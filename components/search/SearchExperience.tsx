'use client';

import { FormEvent, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { searchTools } from '@/lib/search';
import { categories, tools } from '@/lib/tool-registry';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CategoryChip } from '@/components/site/CategoryArt';
import type { SalarySearchEntry } from '@/lib/salary-pages';

const SALARY_RESULT_LIMIT = 5;

/**
 * Occupations whose name or common alias contains what was typed.
 *
 * Deliberately simpler than the tool scoring: someone searching for a job
 * types its name, so a substring match on the name, the official title or an
 * alias is the whole requirement. Shorter matches rank first, which puts
 * "Nurse Practitioner" above "Licensed Practical Nurse" for "nurse".
 */
function matchSalaryPages(query: string, index: readonly SalarySearchEntry[]): SalarySearchEntry[] {
  const needle = query.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\bsalary|salaries|pay|wage|wages\b/g, '').trim();
  if (needle.length < 3) return [];
  return index
    .filter((entry) => entry.terms.some((term) => term.includes(needle)))
    .sort((left, right) => left.name.length - right.name.length || left.name.localeCompare(right.name))
    .slice(0, SALARY_RESULT_LIMIT);
}

export function SearchExperience({ salaryIndex = [] }: { salaryIndex?: readonly SalarySearchEntry[] }) {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [showAll, setShowAll] = useState(false);
  const browsing = query.trim() === '';
  const results = useMemo(
    () => searchTools(query, browsing && showAll ? tools.length : 8),
    [query, browsing, showAll],
  );
  const salaryResults = useMemo(
    () => (browsing ? [] : matchSalaryPages(query, salaryIndex)),
    [query, browsing, salaryIndex],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';
    window.history.replaceState(null, '', nextUrl);
    emitAnalyticsEvent('search', { resultType: results.length + salaryResults.length ? 'matched' : 'empty' });
  };

  return (
    <div className="search-experience" data-hydrated={hydrated}>
      <form className="answer-search search-page-form" role="search" action="/search" method="get" onSubmit={submit}>
        <label className="sr-only" htmlFor="site-search">Search {siteConfig.name} calculators</label>
        <span className="search-icon" aria-hidden="true" />
        <input id="site-search" name="q" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Hourly to salary, electricity, concrete…" autoCapitalize="none" autoCorrect="off" enterKeyHint="search" />
        <button type="submit">Search <span aria-hidden="true">→</span></button>
      </form>
      <div className="search-results">
        <p role="status" aria-live="polite" aria-atomic="true">
          {browsing
            ? (showAll ? `All ${tools.length} calculators` : 'Popular calculators')
            : `${results.length + salaryResults.length} match${results.length + salaryResults.length === 1 ? '' : 'es'}`}
        </p>
        {salaryResults.map((entry) => (
          <Link href={`/salary/${entry.slug}`} key={entry.slug}>
            <CategoryChip category="money" size="row" tone="color" />
            <span><strong>{`${entry.name} salary`}</strong><small>{`What the job pays nationally and in every state · SOC ${entry.code}`}</small></span>
            <span className="search-result-category">Salaries</span>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
        {results.length > 0 ? results.map(({ tool }) => (
          <Link href={tool.path} key={tool.id} onClick={() => emitAnalyticsEvent('result_interaction', { toolId: tool.id, category: tool.category, interaction: 'search_result_click' })}>
            <CategoryChip category={tool.category} size="row" tone="color" />
            <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            <span className="search-result-category">{categories[tool.category].name}</span>
            <b aria-hidden="true">→</b>
          </Link>
        )) : salaryResults.length === 0 && (
          <div className="empty-search">
            <h2>Nothing matches that yet.</h2>
            <p>Try a job title, pay, electricity, concrete, shopping, a recipe, or business days.</p>
          </div>
        )}
        {browsing && !showAll && results.length < tools.length && (
          <button type="button" className="search-see-all" onClick={() => setShowAll(true)}>
            See all {tools.length} calculators <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
