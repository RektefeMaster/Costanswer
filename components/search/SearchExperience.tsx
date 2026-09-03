'use client';

import { FormEvent, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { searchTools } from '@/lib/search';
import { categories, tools } from '@/lib/tool-registry';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { CategoryChip } from '@/components/site/CategoryArt';

export function SearchExperience() {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [showAll, setShowAll] = useState(false);
  const browsing = query.trim() === '';
  const results = useMemo(
    () => searchTools(query, browsing && showAll ? tools.length : 8),
    [query, browsing, showAll],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';
    window.history.replaceState(null, '', nextUrl);
    emitAnalyticsEvent('search', { resultType: results.length ? 'matched' : 'empty' });
  };

  return (
    <div className="search-experience" data-hydrated={hydrated}>
      <form className="answer-search search-page-form" role="search" action="/search" method="get" onSubmit={submit}>
        <label className="sr-only" htmlFor="site-search">Search {siteConfig.name} calculators</label>
        <span className="search-icon" aria-hidden="true" />
        <input id="site-search" name="q" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Hourly to salary, electricity, concrete…" />
        <button type="submit">Search <span aria-hidden="true">→</span></button>
      </form>
      <div className="search-results">
        <p role="status" aria-live="polite" aria-atomic="true">
          {browsing
            ? (showAll ? `All ${tools.length} calculators` : 'Popular calculators')
            : `${results.length} match${results.length === 1 ? '' : 'es'}`}
        </p>
        {results.length > 0 ? results.map(({ tool }) => (
          <a href={tool.path} key={tool.id} onClick={() => emitAnalyticsEvent('result_interaction', { toolId: tool.id, category: tool.category, interaction: 'search_result_click' })}>
            <CategoryChip category={tool.category} size="row" tone="color" />
            <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            <span className="search-result-category">{categories[tool.category].name}</span>
            <b aria-hidden="true">→</b>
          </a>
        )) : (
          <div className="empty-search">
            <h2>No calculator matches that yet.</h2>
            <p>Try pay, electricity, concrete, shopping, a recipe, or business days.</p>
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
