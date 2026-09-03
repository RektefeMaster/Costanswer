/**
 * Versioned publication clock used by build-time SEO decisions.
 *
 * Do not replace this with Date.now(): metadata can be evaluated in different
 * runtimes and at different moments. Advance this date only as part of a
 * reviewed release so the same commit always makes the same crawl decision.
 */
export const PUBLISHING_SNAPSHOT_DATE = '2026-09-02';
export const PUBLISHING_SNAPSHOT_INSTANT = `${PUBLISHING_SNAPSHOT_DATE}T00:00:00.000Z`;

export function parsePublishingDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp;
}

export function formatPublishingDateLong(value: string): string {
  const timestamp = parsePublishingDate(value);
  if (timestamp === null) throw new Error(`Invalid publication date: ${value}`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(timestamp);
}
