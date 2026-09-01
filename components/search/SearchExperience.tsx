'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchTools } from '@/lib/search';
import { categories } from '@/lib/tool-registry';
import { emitAnalyticsEvent } from '@/lib/analytics';

export function SearchExperience() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const results = useMemo(() => searchTools(query), [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';
    window.history.replaceState(null, '', nextUrl);
    emitAnalyticsEvent('search', { resultType: results.length ? 'matched' : 'empty' });
  };

  return (
    <div className="search-experience">
      <form className="answer-search search-page-form" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="site-search">Search HowMuchUSA tools</label>
        <span className="search-icon" aria-hidden="true" />
        <input id="site-search" type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try paycheck, electricity, concrete, business days…" />
        <button type="submit">Search <span aria-hidden="true">→</span></button>
      </form>
      <div className="search-results" aria-live="polite">
        <p>{query.trim() ? `${results.length} useful match${results.length === 1 ? '' : 'es'}` : 'Start with a popular tool'}</p>
        {results.length > 0 ? results.map(({ tool }) => (
          <a href={tool.path} key={tool.id}>
            <span className={`search-result-mark accent-${tool.accent}`}>{categories[tool.category].name.slice(0, 1)}</span>
            <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
            <span className="search-result-category">{categories[tool.category].name}</span>
            <b aria-hidden="true">→</b>
          </a>
        )) : (
          <div className="empty-search">
            <h2>No tool matches that yet.</h2>
            <p>Try a broader idea such as “pay,” “energy,” “shopping,” “recipe,” or “date.” We do not create a thin page just because a phrase exists.</p>
          </div>
        )}
      </div>
    </div>
  );
}

