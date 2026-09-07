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
import type { JobId } from '@/lib/job/catalog';

const SALARY_RESULT_LIMIT = 5;
const JOB_RESULT_LIMIT = 5;

type JobSearchEntry = { jobId: JobId; name: string; path: `/cost/${JobId}`; terms: string[] };

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

function matchJobPages(query: string, index: readonly JobSearchEntry[]): JobSearchEntry[] {
  const needle = query.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\bcost|price|quote\b/g, '').trim();
  if (needle.length < 3) return [];
  return index
    .filter((entry) => entry.terms.some((term) => term.includes(needle)) || entry.name.toLowerCase().includes(needle))
    .sort((left, right) => left.name.length - right.name.length || left.name.localeCompare(right.name))
    .slice(0, JOB_RESULT_LIMIT);
}

export function SearchExperience({
  salaryIndex = [],
  jobIndex = [],
}: {
  salaryIndex?: readonly SalarySearchEntry[];
  jobIndex?: readonly JobSearchEntry[];
}) {
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
  const jobResults = useMemo(
    () => (browsing ? [] : matchJobPages(query, jobIndex)),
    [query, browsing, jobIndex],
  );
  const matchCount = results.length + salaryResults.length + jobResults.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';
    window.history.replaceState(null, '', nextUrl);
    emitAnalyticsEvent('search', { resultType: matchCount ? 'matched' : 'empty' });
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
            : `${matchCount} match${matchCount === 1 ? '' : 'es'}`}
        </p>
        {jobResults.map((entry) => (
          <Link href={entry.path} key={entry.jobId}>
            <CategoryChip category="home" size="row" tone="color" />
            <span><strong>{`${entry.name} cost`}</strong><small>CostAnswer estimated range for this job</small></span>
            <span className="search-result-category">Job costs</span>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
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
        )) : salaryResults.length === 0 && jobResults.length === 0 && (
          <div className="empty-search">
            <h2>Nothing matches that yet.</h2>
            <p>Try a job title, a home project, pay, electricity, concrete, shopping, a recipe, or business days.</p>
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
