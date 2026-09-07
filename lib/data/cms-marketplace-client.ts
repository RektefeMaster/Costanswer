/**
 * What the ACA calculator islands may know without downloading the snapshot.
 *
 * The premium columns are 2,055 counties wide and belong on the server. What a
 * page genuinely needs in the browser is the shape of one county's answer and
 * the handful of figures the page prints about the release — so those are here,
 * and importing this file pulls in nothing but types.
 */
import type {
  CmsCostSharingLevel, CmsCostSharingVariant, CmsHouseholdQuote,
  CmsMetal, CmsMetalSummary, CmsZipLookup,
} from './cms-marketplace';

/** Metadata a page prints, passed down from the server rather than imported. */
export type CmsReleaseSummary = {
  readonly snapshotId: string;
  readonly countyCount: number;
  readonly coveredStateCount: number;
  readonly planYear: string;
};

export type CmsQuoteResponse =
  | { readonly status: 'covered';
      readonly lookup: Extract<CmsZipLookup, { status: 'covered' }>;
      readonly county: { readonly countyFips: string; readonly countyName: string; readonly stateCode: string };
      readonly ages: readonly number[];
      readonly invalidTokens: readonly string[];
      readonly benchmark: CmsHouseholdQuote | null;
      readonly metals: Readonly<Record<CmsMetal, { quote: CmsHouseholdQuote | null; summary: CmsMetalSummary | null }>>;
      readonly costSharing: Readonly<Record<CmsCostSharingLevel, CmsCostSharingVariant | null>>;
      readonly snapshotId: string; }
  | { readonly status: 'not-a-zcta' | 'uncovered-state' | 'no-county'; readonly lookup: CmsZipLookup }
  | { readonly status: 'invalid-zip' | 'too-many-ages'; readonly message: string };

export type CmsQuoteState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready'; readonly quote: CmsQuoteResponse }
  | { readonly phase: 'error'; readonly message: string };

/**
 * Ask the server to price one county.
 *
 * Returns an error state rather than throwing: a failed lookup must leave the
 * page usable, because the reader can still enter a benchmark by hand and the
 * rest of the calculator does not depend on this at all.
 */
export async function fetchCmsQuote(
  input: { zip: string; ages: string; countyFips?: string },
  signal?: AbortSignal,
): Promise<CmsQuoteState> {
  const params = new URLSearchParams({ zip: input.zip, ages: input.ages });
  if (input.countyFips) params.set('county', input.countyFips);

  try {
    const response = await fetch(`/api/marketplace/quote?${params}`, { signal });
    const body = (await response.json()) as CmsQuoteResponse;
    return { phase: 'ready', quote: body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { phase: 'loading' };
    return {
      phase: 'error',
      message: 'County premiums could not be loaded. You can still enter a benchmark premium by hand.',
    };
  }
}
