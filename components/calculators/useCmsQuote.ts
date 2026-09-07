'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchCmsQuote, type CmsQuoteResponse } from '@/lib/data/cms-marketplace-client';

/**
 * One county's marketplace premiums, fetched rather than bundled.
 *
 * Both ACA calculators used to import the CMS snapshot and price locally, which
 * put 3.8 MB of premium columns into the browser to answer a question about one
 * county. This asks the server instead.
 *
 * Two behaviours matter for how the page feels. The request is debounced, so
 * typing a ZIP does not fire five lookups. And a failed or in-flight request
 * keeps the last good answer on screen rather than blanking the result — the
 * reader is mid-thought, and a result that flickers to empty between keystrokes
 * reads as the calculator breaking.
 */
export type CmsQuote = {
  readonly data: CmsQuoteResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
};

const DEBOUNCE_MS = 220;
const ZIP = /^\d{5}$/;

export function useCmsQuote(zip: string, ages: string, countyFips?: string): CmsQuote {
  const [data, setData] = useState<CmsQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept so a stale response from an earlier ZIP cannot overwrite a newer one.
  const requestId = useRef(0);

  const trimmedZip = zip.trim();

  useEffect(() => {
    if (!ZIP.test(trimmedZip)) {
      setData(null);
      setError(null);
      return;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      void fetchCmsQuote({ zip: trimmedZip, ages, countyFips }, controller.signal).then((state) => {
        // A response for a ZIP the reader has already moved on from is discarded.
        if (requestId.current !== id) return;
        if (state.phase === 'ready') {
          setData(state.quote);
          setError(null);
        } else if (state.phase === 'error') {
          setError(state.message);
        }
        setLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedZip, ages, countyFips]);

  return { data, loading, error };
}
