import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { US_STATES } from '../lib/location/states';
import { NAIC_AUTO_SOURCE_URL, NAIC_HOMEOWNERS_SOURCE_URL, naicInsuranceRecordedSchema,
  naicInsuranceSnapshotSchema, normalizeNaicInsuranceRecorded, type NaicInsuranceRecorded,
  type NaicInsuranceSnapshot } from '../lib/data/naic-insurance';
import { assertManifestMatchesSnapshot, assertNormalizedHash } from '../lib/data/envelope';
import { acquireIngestionLock, evaluateRefreshDecision, fetchBytes, promoteSnapshotFiles,
  readJsonIfPresent, sealNormalizedSnapshot, sha256, sha256Bytes } from './ingest-io';

const dataDirectory = path.join(process.cwd(), 'data', 'naic-insurance');
const sourceNames = new Set<string>(['Countrywide', ...Object.values(US_STATES)]);
const numericCells = (text: string) => (text.match(/[\d,]+(?:\.\d+)?/g) ?? []).map((value) => Number(value.replaceAll(',', '')));

/** Extract factual table cells only. Full copyrighted reports are not redistributed. */
export function extractNaicPdfTables(homeownersText: string, autoText: string, metadata: {
  fetchedAt: string; homeownersPdfSha256: string; autoPdfSha256: string;
}): NaicInsuranceRecorded {
  const period = /Report:\s*Data for (\d{4})/.exec(homeownersText)?.[1];
  if (period !== '2023' || !/2022\/2023 Auto Insurance Database Report/.test(autoText)
    || !/July\s+2026/.test(homeownersText.slice(0, 1000))) {
    throw new Error('NAIC report edition changed. Review report dates, table definitions and parser before promotion.');
  }
  const property = (form: 'HO-3' | 'HO-4') => homeownersText.split('\f').flatMap((page, index) => {
    if (!page.includes(form) || !/2023 Average Premium by Amount of Insurance/.test(page)
      || !/\bTotal\s+Exposure/.test(page)) return [];
    const geography = page.split('\n').map((line) => line.trim()).find((line) => sourceNames.has(line));
    if (!geography) throw new Error(`Missing property geography on PDF page ${index + 1}.`);
    const total = page.slice(page.lastIndexOf('Total')).split('\n');
    const exposure = numericCells(total[0]);
    const premium = numericCells(total[1]);
    const average = numericCells(total[2]);
    if (!total[0].includes('Exposure') || !total[1].includes('Premium') || !total[2].includes('Average')) {
      throw new Error(`Property total layout changed on PDF page ${index + 1}.`);
    }
    return [{ geography, pdfPage: index + 1, printedPage: index - 2,
      writtenHouseYears: form === 'HO-3' ? exposure.at(-2)! : exposure[0],
      writtenPremium: form === 'HO-3' ? premium.at(-2)! : premium[0],
      annualPremium: form === 'HO-3' ? average.at(-1)! : average[0] }];
  });
  const auto = (table: string, title: string) => {
    const pages = autoText.split('\f');
    const index = pages.findIndex((page) => new RegExp(`Table ${table}\\s`).test(page)
      && page.includes(title) && /STATE\s+2023\s+2022\s+2021\s+2020\s+2019/.test(page));
    if (index < 0) throw new Error(`NAIC auto Table ${table} header is missing.`);
    const rows = pages[index].split('\n').flatMap((line) => {
      const match = /^\s*([A-Za-z ]+?)\s{2,}([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(line);
      if (!match || !sourceNames.has(match[1])) return [];
      return [{ geography: match[1], annualValue: numericCells(match[2])[0], previousAnnualValue: numericCells(match[3])[0] }];
    });
    return { table, pdfPage: index + 1, printedPage: index - 4, rows };
  };
  return naicInsuranceRecordedSchema.parse({
    schemaVersion: 'naic-insurance-recorded-v1', observationPeriod: period, fetchedAt: metadata.fetchedAt,
    sources: {
      homeowners: { sourceUrl: NAIC_HOMEOWNERS_SOURCE_URL,
        title: 'Dwelling Fire, Homeowners Owner-Occupied, and Homeowners Tenant and Condominium/Cooperative Unit Owners Insurance: Data for 2023',
        observationPeriod: period, publicationLabel: 'July 2026', publishedAt: null,
        publicationPeriod: '2026-07', publicationPrecision: 'month', pdfSha256: metadata.homeownersPdfSha256,
        tables: ['Table 4: HO-3 total average by state and countrywide', 'Table 5: HO-4 total average by state and countrywide'] },
      auto: { sourceUrl: NAIC_AUTO_SOURCE_URL, title: '2022/2023 Auto Insurance Database Report',
        observationPeriod: period, publicationLabel: 'February 13, 2026', publishedAt: '2026-02-13T00:00:00.000Z',
        publicationPeriod: '2026-02-13', publicationPrecision: 'day', pdfSha256: metadata.autoPdfSha256,
        tables: ['Table 1C: Liability average premium', 'Table 2C: Collision average premium',
          'Table 3C: Comprehensive average premium', 'Table 4: Average expenditure', 'Table 5: Combined average premium'] },
    },
    homeowners: property('HO-3'), renters: property('HO-4'),
    auto: { expenditure: auto('4', 'Average Expenditure'), liability: auto('1C', 'Liability Average Premium'),
      collision: auto('2C', 'Collision Average Premium'), comprehensive: auto('3C', 'Comprehensive Average Premium'),
      combined: auto('5', 'Combined Average Premium') },
  });
}

async function verifyRecorded(): Promise<void> {
  const rawText = await readFile(path.join(dataDirectory, 'raw', '2023.json'), 'utf8');
  const raw = JSON.parse(rawText);
  const normalized = sealNormalizedSnapshot(normalizeNaicInsuranceRecorded(raw, { rawSha256: sha256(rawText) }));
  naicInsuranceSnapshotSchema.parse(normalized);
  const envelope = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8'));
  const hash = assertNormalizedHash(envelope.snapshot, 'NAIC insurance');
  assertManifestMatchesSnapshot(envelope.manifest, normalized, hash, 'NAIC insurance');
  if (JSON.stringify(normalized) !== JSON.stringify(envelope.snapshot)) throw new Error('NAIC recorded replay does not match the current snapshot.');
  const immutable = JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${normalized.snapshotId}.json`), 'utf8'));
  if (JSON.stringify(immutable) !== JSON.stringify(normalized)) throw new Error('NAIC immutable snapshot does not match.');
  console.log(`Verified ${normalized.snapshotId}: 51 states/DC, seven annual metrics, exact recorded replay.`);
}

async function ingest(): Promise<void> {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'costanswer-naic-'));
  try {
    const localIndex = process.argv.indexOf('--pdf-dir');
    const localDirectory = localIndex < 0 ? undefined : process.argv[localIndex + 1];
    const pdfs = await Promise.all(['homeowners', 'auto'].map(async (name) => {
      const url = name === 'homeowners' ? NAIC_HOMEOWNERS_SOURCE_URL : NAIC_AUTO_SOURCE_URL;
      const bytes = localDirectory ? new Uint8Array(await readFile(path.join(localDirectory, `${name}.pdf`))) : (await fetchBytes(url)).bytes;
      if (Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') throw new Error(`NAIC ${name} response is not a PDF.`);
      const pdfPath = path.join(temporaryDirectory, `${name}.pdf`);
      await writeFile(pdfPath, bytes);
      const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 8_000_000 });
      return { text, sha256: sha256Bytes(bytes) };
    }));
    const recorded = extractNaicPdfTables(pdfs[0].text, pdfs[1].text, {
      fetchedAt: new Date().toISOString(), homeownersPdfSha256: pdfs[0].sha256, autoPdfSha256: pdfs[1].sha256,
    });
    const rawText = `${JSON.stringify(recorded, null, 2)}\n`;
    const normalized = sealNormalizedSnapshot(normalizeNaicInsuranceRecorded(recorded, { rawSha256: sha256(rawText) }));
    naicInsuranceSnapshotSchema.parse(normalized);
    const previous = await readJsonIfPresent<NaicInsuranceSnapshot>(path.join(dataDirectory, 'insurance.normalized.json'));
    const decision = evaluateRefreshDecision({ previous, nextPeriod: normalized.observationPeriod,
      payloadUnchanged: previous ? JSON.stringify(previous.states) === JSON.stringify(normalized.states)
        && JSON.stringify(previous.national) === JSON.stringify(normalized.national)
        && JSON.stringify(previous.sources) === JSON.stringify(normalized.sources) : true });
    if (decision === 'already-current') {
      console.log(`${normalized.snapshotId} already current; no files changed.`);
      return;
    }
    await promoteSnapshotFiles({ dataDirectory, snapshot: normalized, normalizedFileName: 'insurance.normalized.json',
      rawRelativePath: 'raw/2023.json', rawContents: rawText });
    console.log(`Published ${normalized.snapshotId}: HO-3 $${normalized.national.homeownersAnnualPremium}, HO-4 $${normalized.national.rentersAnnualPremium}, auto expenditure $${normalized.national.autoAnnualExpenditure}.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--verify') || process.argv.includes('--rebuild')) await verifyRecorded();
  else {
    const releaseLock = await acquireIngestionLock(dataDirectory);
    try { await ingest(); } finally { await releaseLock(); }
  }
}
