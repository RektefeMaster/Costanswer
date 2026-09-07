'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { JOB_CATALOG, JOB_IDS, type JobId, jobPath } from '@/lib/job/catalog';

export function JobPicker({
  activeJobId,
  onSelect,
}: {
  activeJobId?: JobId;
  onSelect?: (jobId: JobId) => void;
}) {
  const [query, setQuery] = useState('');
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const visible = useMemo(() => {
    const needle = query.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
    if (needle.length < 2) return JOB_IDS;
    return JOB_IDS.filter((jobId) => {
      const job = JOB_CATALOG[jobId];
      const haystack = [job.title, job.shortTitle, job.tradeLabel, ...job.searchTerms].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  return (
    <div className="job-picker-wrap" data-hydrated={hydrated}>
      <label className="job-picker-filter">
        <span>Find a job</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="HVAC, windows, paint…"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      {visible.length === 0 ? (
        <p className="job-picker-empty" role="status">No jobs match that yet. Try HVAC, windows, or tree.</p>
      ) : (
        <div className="job-picker">
          {visible.map((jobId) => {
            const job = JOB_CATALOG[jobId];
            const current = jobId === activeJobId;
            const body = (
              <>
                <span className="job-picker-trade">{job.tradeLabel}</span>
                <strong>{job.shortTitle}</strong>
                <small>{job.unitLabel}</small>
              </>
            );
            if (onSelect) {
              return (
                <button className={`job-picker-card${current ? ' is-active' : ''}`} type="button" key={jobId} aria-pressed={current} onClick={() => onSelect(jobId)}>
                  {body}
                </button>
              );
            }
            return (
              <Link className={`job-picker-card${current ? ' is-active' : ''}`} href={jobPath(jobId)} key={jobId} aria-current={current ? 'page' : undefined}>
                {body}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
