import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  GSA_MIE_BREAKDOWN_URL,
  GSA_PERDIEM_API_URL,
  gsaPerDiemSnapshotSchema,
  normalizeGsaPerDiemResponse,
  parseMieBreakdowns,
  type GsaPerDiemSnapshot,
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

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  const releaseLock = await acquireIngestionLock(dataDirectory);
  try {
    await runIngestion();
  } finally {
    await releaseLock();
  }
}
