import path from 'node:path';
import {
  GSA_MIE_BREAKDOWN_URL,
  GSA_PERDIEM_API_URL,
  gsaPerDiemSnapshotSchema,
  normalizeGsaPerDiemResponse,
  type GsaPerDiemSnapshot,
  type MieBreakdown,
} from '../lib/data/gsa-perdiem';
import {
  acquireIngestionLock,
  evaluateRefreshDecision,
  fetchText,
  promoteSnapshotFiles,
  readJsonIfPresent,
  sealNormalizedSnapshot,
  sha256,
} from './ingest-io';

const root = process.cwd();
const dataDirectory = path.join(root, 'data', 'gsa-perdiem');

/**
 * The federal fiscal year in effect on a given day.
 *
 * Per diem rates change on 1 October, so a September ingest must not pull next
 * year's table before it applies.
 */
function currentFiscalYear(now = new Date()): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 9 ? year + 1 : year;
}

/**
 * Read the M&IE tier table off GSA's own breakdown page.
 *
 * The API returns only the M&IE total for a destination. How that total splits
 * across meals, and what the first and last day of travel are worth, is
 * published separately, so it is parsed rather than assumed: taking three
 * quarters and rounding would not reproduce GSA's own published figures for
 * every tier.
 */
export function parseMieBreakdowns(pageHtml: string): MieBreakdown[] {
  const text = pageHtml
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  // Rows read: total, breakfast, lunch, dinner, incidentals, first and last day.
  const rowPattern = /\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+)\s+\$(\d+(?:\.\d{2})?)/g;
  const seen = new Map<number, MieBreakdown>();
  for (const match of text.matchAll(rowPattern)) {
    const [total, breakfast, lunch, dinner, incidentals, firstLastDay] = match.slice(1).map(Number);
    const components = breakfast + lunch + dinner + incidentals;
    // The page also carries an OCONUS table and unrelated dollar runs; only
    // rows that actually behave like an M&IE tier are accepted.
    if (Math.abs(components - total) > 0.005) continue;
    if (Math.abs(firstLastDay - total * 0.75) > 0.005) continue;
    seen.set(total, { total, breakfast, lunch, dinner, incidentals, firstLastDay });
  }
  const rows = [...seen.values()].sort((left, right) => left.total - right.total);
  if (rows.length < 3) {
    throw new Error(`GSA M&IE breakdown page yielded only ${rows.length} usable tiers; the table layout has probably changed.`);
  }
  return rows;
}

async function runIngestion(): Promise<void> {
  const fiscalYear = Number(process.env.GSA_FISCAL_YEAR ?? currentFiscalYear());
  // DEMO_KEY works for this volume; set GSA_API_KEY for a signed, higher quota.
  const apiKey = process.env.GSA_API_KEY ?? 'DEMO_KEY';
  const ratesUrl = `${GSA_PERDIEM_API_URL}/${fiscalYear}?api_key=${apiKey}`;

  const ratesText = await fetchText(ratesUrl, { headers: { accept: 'application/json' } });
  const payload = JSON.parse(ratesText) as unknown;
  const mieHtml = await fetchText(GSA_MIE_BREAKDOWN_URL, { headers: { accept: 'text/html' } });
  const mieBreakdowns = parseMieBreakdowns(mieHtml);

  const fetchedAt = new Date().toISOString();
  // The raw record keeps the key out of the stored URL so a stored artefact
  // never carries a credential.
  const rawText = `${JSON.stringify([
    { source: `${GSA_PERDIEM_API_URL}/${fiscalYear}`, payload },
    { source: GSA_MIE_BREAKDOWN_URL, mieBreakdowns },
  ], null, 2)}\n`;

  const normalized = sealNormalizedSnapshot(
    normalizeGsaPerDiemResponse(payload, mieBreakdowns, { fiscalYear, fetchedAt, rawSha256: sha256(rawText) }),
  );
  gsaPerDiemSnapshotSchema.parse(normalized);

  const previous = await readJsonIfPresent<GsaPerDiemSnapshot>(path.join(dataDirectory, 'perdiem.normalized.json'));
  const decision = evaluateRefreshDecision({
    previous,
    nextPeriod: normalized.observationPeriod,
    payloadUnchanged: previous ? JSON.stringify(normalized.destinations) === JSON.stringify(previous.destinations) : true,
  });
  if (decision === 'already-current') {
    console.log(`${normalized.snapshotId} is already current; no files changed.`);
    return;
  }

  await promoteSnapshotFiles({
    dataDirectory,
    snapshot: normalized,
    normalizedFileName: 'perdiem.normalized.json',
    rawRelativePath: path.join('raw', `fy${fiscalYear}.json`),
    rawContents: rawText,
  });

  console.log(
    `Published ${normalized.snapshotId}: ${normalized.destinations.length} CONUS destinations, ${normalized.mieBreakdowns.length} M&IE tiers.`,
  );
}

const releaseLock = await acquireIngestionLock(dataDirectory);
try {
  await runIngestion();
} finally {
  await releaseLock();
}
