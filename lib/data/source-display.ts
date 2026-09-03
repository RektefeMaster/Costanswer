import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { DATASET_POLICIES, type DatasetId, type DatasetPeriodKind } from './dataset-policy';
import {
  evaluateFreshness,
  isPublicationSourceStatus,
  type FreshnessInput,
  type FreshnessStatus,
  type PublicationSourceStatus,
} from './freshness';

export type DatasetSourceDisplay = {
  datasetId: DatasetId;
  providerLabel: string;
  periodLabel: string;
  line: string;
  freshness: FreshnessStatus;
  freshnessNote: string | null;
  sourceStatus: PublicationSourceStatus | string;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function monthName(month: number, style: 'long' | 'short'): string {
  const names = style === 'long' ? MONTH_NAMES : SHORT_MONTH_NAMES;
  return names[month - 1];
}

export function formatObservationPeriod(period: string, kind: DatasetPeriodKind): string {
  if (kind === 'weekly') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
    if (!match) throw new Error(`Weekly period must be YYYY-MM-DD, got ${period}.`);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return `${SHORT_MONTH_NAMES[month - 1]} ${day}, ${match[1]}`;
  }
  if (kind === 'monthly') {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
    if (!match) throw new Error(`Monthly period must be YYYY-MM, got ${period}.`);
    return `${monthName(Number(match[2]), 'long')} ${match[1]}`;
  }
  if (kind === 'yearly') {
    if (!/^\d{4}$/.test(period)) throw new Error(`Yearly period must be YYYY, got ${period}.`);
    return `Tax year ${period}`;
  }
  if (kind === 'fiscal-year') {
    if (!/^\d{4}$/.test(period)) throw new Error(`Fiscal year period must be YYYY, got ${period}.`);
    return `FY ${period}`;
  }
  if (kind === 'reference-year') {
    if (!/^\d{4}$/.test(period)) throw new Error(`Reference year must be YYYY, got ${period}.`);
    return period;
  }
  if (kind === 'survey-vintage') {
    if (period === '2024') return '2020–2024 ACS 5-Year / 2024 geography';
    if (!/^\d{4}$/.test(period)) throw new Error(`Survey vintage must be YYYY, got ${period}.`);
    return `${period} vintage`;
  }
  const exhaustive: never = kind;
  throw new Error(`Unhandled period kind: ${exhaustive}`);
}

export function datasetSourceDisplay(input: {
  datasetId: DatasetId;
  observationPeriod: string;
  sourceStatus: string;
  publishedAt?: string;
  verifiedAt?: string;
  fetchedAt?: string;
  asOf?: string;
}): DatasetSourceDisplay {
  const policy = DATASET_POLICIES[input.datasetId];
  const freshnessInput: FreshnessInput = {
    observationPeriod: input.observationPeriod,
    publishedAt: input.publishedAt,
    verifiedAt: input.verifiedAt,
    fetchedAt: input.fetchedAt,
  };
  const freshness = evaluateFreshness(policy, freshnessInput, input.asOf ?? PUBLISHING_SNAPSHOT_DATE);
  const periodLabel = formatObservationPeriod(input.observationPeriod, policy.periodKind);
  const sourceStatus = isPublicationSourceStatus(input.sourceStatus) ? input.sourceStatus : input.sourceStatus;
  return {
    datasetId: input.datasetId,
    providerLabel: policy.providerShort,
    periodLabel,
    line: `${policy.providerShort} · ${periodLabel}`,
    freshness,
    freshnessNote: freshness === 'stale' ? 'Latest available official data' : null,
    sourceStatus,
  };
}

export function officialDatasetJsonLd(input: {
  name: string;
  description: string;
  temporalCoverage: string;
  dateModified: string;
  creatorName: string;
  sourceUrl: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.name,
    description: input.description,
    temporalCoverage: input.temporalCoverage,
    dateModified: input.dateModified,
    creator: {
      '@type': 'Organization',
      name: input.creatorName,
    },
    isAccessibleForFree: true,
    distribution: {
      '@type': 'DataDownload',
      contentUrl: input.sourceUrl,
    },
  };
}
