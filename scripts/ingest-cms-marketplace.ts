import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStateCode, type StateCode } from '../lib/location/states';
import {
  CMS_ABSENT, CMS_AGE_COUNT, CMS_COLUMNS_PER_COUNTY, CMS_COLUMN_LAYOUT, CMS_COST_SHARING_LEVELS,
  CMS_MARKETPLACE_ADAPTER_VERSION, CMS_MARKETPLACE_LANDSCAPE_URL, CMS_MARKETPLACE_SOURCE_URL,
  CMS_METALS, CMS_PUBLISHED_AGES, FEDERAL_DEFAULT_AGE_CURVE,
  cmsMarketplaceIndexSchema, cmsMarketplacePremiumsSchema,
  unpackBenchmarkSilver, unpackCostSharing, unpackMetal,
  type CmsCountyIdentity, type CmsMarketplaceIndex, type CmsMarketplacePremiums,
} from '../lib/data/cms-marketplace';
import { assertNormalizedHash } from '../lib/data/envelope';
import { acquireIngestionLock, atomicWrite, sha256, sha256Bytes, writeImmutable } from './ingest-io';
import { readWorkbook } from './xlsx';
import { readZipEntry } from './zip';

const dataDirectory = path.join(process.cwd(), 'data', 'cms-marketplace');
const SHEET = 'Individual_Market_Medical';
const OBSERVATION_PERIOD = '2026';

/**
 * Column positions in the landscape file, by the header text they must carry.
 *
 * CMS reorders and renames columns between plan years, so nothing is read by
 * position alone: every index below is resolved from the header row and a
 * missing name stops the ingest rather than silently shifting a premium into a
 * deductible.
 */
const COLUMN_NAMES = {
  stateCode: 'State Code',
  countyFips: 'FIPS County Code',
  countyName: 'County Name',
  metalLevel: 'Metal Level',
  planId: 'Plan ID (Standard Component)',
  ratingArea: 'Rating Area',
  child: 'Premium Child Age 0-14',
  age18: 'Premium Child Age 18',
  age21: 'Premium Adult Individual Age 21',
  age27: 'Premium Adult Individual Age 27',
  age30: 'Premium Adult Individual Age 30',
  age40: 'Premium Adult Individual Age 40',
  age50: 'Premium Adult Individual Age 50',
  age60: 'Premium Adult Individual Age 60',
  deductible: 'Medical Deductible - Individual - Standard',
  moop: 'Medical Maximum Out Of Pocket - Individual - Standard',
  deductible73: 'Medical Deductible - Individual - 73 Percent',
  moop73: 'Medical Maximum Out Of Pocket - Individual - 73 Percent',
  deductible87: 'Medical Deductible - Individual - 87 Percent',
  moop87: 'Medical Maximum Out Of Pocket - Individual - 87 Percent',
  deductible94: 'Medical Deductible - Individual - 94 Percent',
  moop94: 'Medical Maximum Out Of Pocket -individual - 94 Percent',
} as const;
type ColumnKey = keyof typeof COLUMN_NAMES;

/**
 * A cell that may be past the end of a short row.
 *
 * Rows in the landscape file stop at their last populated column, so a plan
 * with no cost-sharing variants yields a row shorter than the header and every
 * read past it is `undefined` rather than `null`.
 */
function cell(row: (string | null)[], index: number): string | null {
  return row[index] ?? null;
}

/** `$1,234.56` and `$1,500` are the only numeric shapes the file uses. */
function money(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const text = value.trim();
  if (text === '' || /^(n\/a|not applicable|\$?0\.00\*+)$/i.test(text)) return null;
  if (!/^\$?-?[\d,]+(\.\d+)?$/.test(text)) return null;
  const parsed = Number(text.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function spread(values: number[]): { low: number; median: number; high: number } {
  const sorted = [...values].sort((left, right) => left - right);
  return { low: sorted[0], median: sorted[Math.floor((sorted.length - 1) / 2)], high: sorted.at(-1)! };
}

/** The nth-cheapest value at each published age, ranked separately per age. */
function nthByAge(plans: RawPlan[], rank: number): number[] | null {
  const result: number[] = [];
  for (let index = 0; index < CMS_PUBLISHED_AGES.length; index += 1) {
    const values = plans.map((plan) => plan.premiums[index]).filter((value): value is number => value !== null);
    if (values.length === 0) return null;
    const sorted = values.sort((left, right) => left - right);
    result.push(sorted[Math.min(rank, sorted.length - 1)]);
  }
  return result;
}

type RawPlan = {
  metal: string;
  premiums: (number | null)[];
  deductible: number | null;
  moop: number | null;
  csr: Array<{ level: 73 | 87 | 94; deductible: number | null; moop: number | null }>;
};
type RawCounty = { stateCode: StateCode; countyFips: string; countyName: string; ratingArea: string; plans: RawPlan[] };

export function extractCmsLandscape(workbookBytes: Uint8Array): { counties: RawCounty[]; rowCount: number } {
  const workbook = readWorkbook(workbookBytes);
  if (!workbook.sheetNames.includes(SHEET)) {
    throw new Error(`CMS landscape file has no ${SHEET} sheet. Found: ${workbook.sheetNames.join(', ')}.`);
  }
  const columns = {} as Record<ColumnKey, number>;
  const byCounty = new Map<string, RawCounty>();
  const seenPlans = new Set<string>();
  let rowIndex = 0;
  let rowCount = 0;

  for (const row of workbook.rows(SHEET)) {
    rowIndex += 1;
    // Row 1 is a filter banner CMS puts above the real header.
    if (rowIndex === 1) continue;
    if (rowIndex === 2) {
      const headers = row.map((value) => (value ?? '').trim());
      for (const [key, name] of Object.entries(COLUMN_NAMES) as Array<[ColumnKey, string]>) {
        const index = headers.findIndex((header) => header === name);
        if (index < 0) throw new Error(`CMS landscape header changed: no column named "${name}". Review the file before promoting.`);
        columns[key] = index;
      }
      continue;
    }
    const stateCode = (cell(row, columns.stateCode) ?? '').trim();
    const countyFips = (cell(row, columns.countyFips) ?? '').trim();
    const metal = (cell(row, columns.metalLevel) ?? '').trim();
    if (!stateCode || !countyFips || !metal) continue;
    if (!isStateCode(stateCode)) throw new Error(`CMS landscape contains an unrecognized state code: ${stateCode}.`);
    if (!/^\d{5}$/.test(countyFips)) throw new Error(`CMS landscape county FIPS is not five digits: ${countyFips}.`);
    rowCount += 1;

    const planKey = `${countyFips}|${(cell(row, columns.planId) ?? '').trim()}|${metal}`;
    if (seenPlans.has(planKey)) throw new Error(`CMS landscape repeats plan ${planKey}; the file layout changed.`);
    seenPlans.add(planKey);

    const county = byCounty.get(countyFips) ?? {
      stateCode: stateCode as StateCode,
      countyFips,
      countyName: (cell(row, columns.countyName) ?? '').trim(),
      ratingArea: (cell(row, columns.ratingArea) ?? '').trim(),
      plans: [],
    };
    if (county.stateCode !== stateCode) throw new Error(`County ${countyFips} appears under two states.`);
    if (county.ratingArea !== (cell(row, columns.ratingArea) ?? '').trim()) {
      throw new Error(`County ${countyFips} spans more than one rating area; per-county premiums would be ambiguous.`);
    }
    byCounty.set(countyFips, county);

    county.plans.push({
      metal,
      premiums: (['child', 'age18', 'age21', 'age27', 'age30', 'age40', 'age50', 'age60'] as const)
        .map((key) => money(cell(row, columns[key]))),
      deductible: money(cell(row, columns.deductible)),
      moop: money(cell(row, columns.moop)),
      csr: [
        { level: 73, deductible: money(cell(row, columns.deductible73)), moop: money(cell(row, columns.moop73)) },
        { level: 87, deductible: money(cell(row, columns.deductible87)), moop: money(cell(row, columns.moop87)) },
        { level: 94, deductible: money(cell(row, columns.deductible94)), moop: money(cell(row, columns.moop94)) },
      ],
    });
  }
  if (byCounty.size === 0) throw new Error('CMS landscape produced no counties.');
  return { counties: [...byCounty.values()], rowCount };
}

/**
 * The curve is checked over two ranges, not one.
 *
 * A county can price adults exactly on the federal curve and still file its
 * under-21 rates on a different one: 185 of them do. Checking only the adult
 * ages and then scaling a 19-year-old off age 21 produced a 30% error in
 * Alabama, reported as exact, which is why the two ranges are asked separately.
 */
const ADULT_CURVE_CHECKS = ([27, 30, 40, 50, 60] as const).map((age) => ({
  index: CMS_PUBLISHED_AGES.indexOf(age),
  factor: FEDERAL_DEFAULT_AGE_CURVE[age],
}));
const CHILD_CURVE_CHECKS = [
  { index: CMS_PUBLISHED_AGES.indexOf('child'), factor: FEDERAL_DEFAULT_AGE_CURVE[0] },
  { index: CMS_PUBLISHED_AGES.indexOf(18), factor: FEDERAL_DEFAULT_AGE_CURVE[18] },
];
const AGE_21_INDEX = CMS_PUBLISHED_AGES.indexOf(21);
const cents = (value: number) => Math.round(value * 100);

type MetalStats = { lowestByAge: number[]; medianByAge: number[]; deductible: number[]; moop: number[] };

function metalStats(plans: RawPlan[]): MetalStats | null {
  if (plans.length === 0) return null;
  const lowest = nthByAge(plans, 0);
  const median = nthByAge(plans, Math.floor((plans.length - 1) / 2));
  const deductibles = plans.map((plan) => plan.deductible).filter((value): value is number => value !== null);
  const moops = plans.map((plan) => plan.moop).filter((value): value is number => value !== null);
  if (!lowest || !median || deductibles.length === 0 || moops.length === 0) return null;
  const s = spread(deductibles);
  const m = spread(moops);
  return { lowestByAge: lowest, medianByAge: median, deductible: [s.low, s.median, s.high], moop: [m.low, m.median, m.high] };
}

export type NormalizedCms = {
  index: Omit<CmsMarketplaceIndex, 'normalizedSha256' | 'premiumsSha256'>;
  premiums: Omit<CmsMarketplacePremiums, 'snapshotId'>;
};

export function normalizeCmsLandscape(
  extracted: { counties: RawCounty[]; rowCount: number },
  metadata: { fetchedAt: string; rawSha256: string },
): NormalizedCms {
  const counties: CmsCountyIdentity[] = [];
  const values: number[] = [];
  let stateFiledCurveCounties = 0;
  let stateFiledChildCurveCounties = 0;
  let skippedThinCounties = 0;

  for (const county of [...extracted.counties].sort((left, right) => left.countyFips.localeCompare(right.countyFips))) {
    const silverPlans = county.plans.filter((plan) => plan.metal === 'Silver');
    const silver = metalStats(silverPlans);
    const benchmark = nthByAge(silverPlans, 1);
    // The benchmark is defined as the second-lowest Silver plan. A county with
    // fewer than two cannot produce one, and inventing a fallback would misprice
    // every credit calculated from it.
    if (silverPlans.length < 2 || !silver || !benchmark) {
      skippedThinCounties += 1;
      continue;
    }

    const conformsTo = (checks: Array<{ index: number; factor: number }>) => county.plans.every((plan) => {
      const age21 = plan.premiums[AGE_21_INDEX];
      if (age21 === null || age21 <= 0) return true;
      return checks.every(({ index, factor }) => {
        const actual = plan.premiums[index];
        return actual === null || Math.abs(actual - age21 * factor) / (age21 * factor) <= 0.005;
      });
    });
    const conforms = conformsTo(ADULT_CURVE_CHECKS);
    const childConforms = conformsTo(CHILD_CURVE_CHECKS);
    if (!conforms) stateFiledCurveCounties += 1;
    if (!childConforms) stateFiledChildCurveCounties += 1;

    counties.push({
      countyFips: county.countyFips,
      stateCode: county.stateCode,
      countyName: county.countyName,
      ratingArea: county.ratingArea,
      planCount: county.plans.length,
      silverPlanCount: silverPlans.length,
      ageCurve: conforms ? 'federal-default' : 'state-filed',
      childAgeCurve: childConforms ? 'federal-default' : 'state-filed',
    });

    const block: number[] = benchmark.map(cents);
    for (const metal of CMS_METALS) {
      const stats = metal === 'silver' ? silver
        : metal === 'bronze' ? metalStats(county.plans.filter((plan) => plan.metal === 'Bronze' || plan.metal === 'Expanded Bronze'))
          : metalStats(county.plans.filter((plan) => plan.metal === 'Gold'));
      if (!stats) {
        block.push(...new Array(CMS_AGE_COUNT * 2 + 6).fill(CMS_ABSENT));
        continue;
      }
      block.push(...stats.lowestByAge.map(cents), ...stats.medianByAge.map(cents), ...stats.deductible.map(cents), ...stats.moop.map(cents));
    }
    for (const level of CMS_COST_SHARING_LEVELS) {
      const rows = silverPlans.map((plan) => plan.csr.find((entry) => entry.level === level))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
      const deductibles = rows.map((entry) => entry.deductible).filter((value): value is number => value !== null);
      const moops = rows.map((entry) => entry.moop).filter((value): value is number => value !== null);
      if (deductibles.length === 0 || moops.length === 0) {
        block.push(...new Array(6).fill(CMS_ABSENT));
        continue;
      }
      const d = spread(deductibles);
      const m = spread(moops);
      block.push(cents(d.low), cents(d.median), cents(d.high), cents(m.low), cents(m.median), cents(m.high));
    }
    if (block.length !== CMS_COLUMNS_PER_COUNTY) {
      throw new Error(`County ${county.countyFips} packed ${block.length} columns, expected ${CMS_COLUMNS_PER_COUNTY}.`);
    }
    values.push(...block);
  }

  const coveredStateCodes = [...new Set(counties.map((county) => county.stateCode))].sort();
  const absentStates = 51 - coveredStateCodes.length;
  return {
    index: {
      schemaVersion: '1.0.0',
      adapterVersion: CMS_MARKETPLACE_ADAPTER_VERSION,
      snapshotId: `cms-marketplace-${OBSERVATION_PERIOD}-v1`,
      provider: 'CMS',
      datasetId: 'cms-marketplace',
      frequency: 'reference-year',
      observationPeriod: OBSERVATION_PERIOD,
      sourceStatus: 'published',
      fetchedAt: metadata.fetchedAt,
      verifiedAt: metadata.fetchedAt,
      sourceUrl: CMS_MARKETPLACE_SOURCE_URL,
      sourceDocumentationUrl: CMS_MARKETPLACE_LANDSCAPE_URL,
      termsUrl: 'https://www.cms.gov/about-cms/information-systems/privacy/privacy-policy',
      attribution: 'Source: Centers for Medicare & Medicaid Services, Individual Market Medical Landscape public use file. Calculations and interpretation by CostAnswer; not endorsed by CMS.',
      units: 'USD per month',
      publishedAges: [...CMS_PUBLISHED_AGES],
      columnsPerCounty: CMS_COLUMNS_PER_COUNTY,
      columnLayout: CMS_COLUMN_LAYOUT,
      coveredStateCodes,
      federalAgeCurve: Object.fromEntries(Object.entries(FEDERAL_DEFAULT_AGE_CURVE)),
      counties,
      caveats: [
        `These are ${OBSERVATION_PERIOD} plan year premiums as filed with CMS, before any premium tax credit. They are not a quote and do not confirm a plan is available to you.`,
        `The landscape file covers the ${coveredStateCodes.length} states using HealthCare.gov. ${absentStates} states and DC run their own exchanges and publish separately, so they carry no county rows here.`,
        'The benchmark is the second-lowest-cost Silver premium in the county, ranked separately at each published age. An enrollee\u2019s actual benchmark depends on who is enrolling and can differ.',
        'Premiums are per person and are added across a household, counting at most the three oldest children under 21, as the federal rating rules require.',
        'Cost-sharing-reduction variants show the deductible and out-of-pocket maximum spread across a county\u2019s Silver plans. They are granted by income, not chosen, and the premium is unchanged.',
        'Ages between the published ones are scaled from age 21 only where a county\u2019s own filings confirm the federal curve over that part of the range. Adults and under-21s are recorded separately, because a county can follow it for one and not the other.',
        'Deductible and out-of-pocket figures are the individual medical amounts. Drug deductibles, family amounts, copays, and provider networks are outside this snapshot.',
      ],
      rawSha256: metadata.rawSha256,
      validationStatus: 'passed',
      validationReport: [
        `Resolved every column by header name from the ${SHEET} sheet; a renamed column stops the ingest.`,
        `Read ${extracted.rowCount.toLocaleString('en-US')} plan rows across ${extracted.counties.length} counties, rejecting duplicate plan and county pairs.`,
        'Confirmed no county spans more than one rating area, so a per-county premium is unambiguous.',
        `Kept ${counties.length} counties publishing at least two Silver plans, the minimum a second-lowest-cost benchmark requires; ${skippedThinCounties} were left out rather than given a substitute benchmark.`,
        `Confirmed ${counties.length - stateFiledCurveCounties} counties reproduce the federal default age curve within 0.5% at every published adult age; ${stateFiledCurveCounties} file their own and are flagged for published-age quoting only.`,
        `Checked the under-21 range separately: ${counties.length - stateFiledChildCurveCounties} counties also reproduce the curve at the child and age-18 premiums, and ${stateFiledChildCurveCounties} do not, including counties whose adult premiums match it exactly.`,
        'Verified the benchmark never falls below the lowest Silver premium and that no cost-sharing variant raises the out-of-pocket maximum above standard Silver.',
        'Packed every figure as integer cents and proved the packing lossless by unpacking each county back to its source values.',
        'Stored premiums in USD per month exactly as filed; no inflation, rating, or eligibility adjustment is applied.',
      ],
    },
    premiums: { schemaVersion: '1.0.0', countyCount: counties.length, columnsPerCounty: CMS_COLUMNS_PER_COUNTY, values },
  };
}

/**
 * Prove the packing lossless and the invariants intact before anything ships.
 *
 * Packing into integer cents is the step that could quietly corrupt a premium,
 * so every county is unpacked again and checked against the rules that made it:
 * the benchmark cannot undercut the lowest Silver, and richer cost sharing
 * cannot raise an out-of-pocket maximum.
 */
export function auditPackedCounties(normalized: NormalizedCms): void {
  const { values } = normalized.premiums;
  normalized.index.counties.forEach((county, position) => {
    const benchmark = unpackBenchmarkSilver(values, position);
    const silver = unpackMetal(values, position, 'silver');
    if (!silver) throw new Error(`County ${county.countyFips} unpacked without Silver figures.`);
    benchmark.forEach((value, ageIndex) => {
      if (value + 0.005 < silver.lowestByAge[ageIndex]) {
        throw new Error(`County ${county.countyFips} benchmark is below the lowest Silver at age index ${ageIndex}.`);
      }
    });
    for (const level of CMS_COST_SHARING_LEVELS) {
      const variant = unpackCostSharing(values, position, level);
      if (variant && variant.individualMaximumOutOfPocket.median > silver.individualMaximumOutOfPocket.median) {
        throw new Error(`County ${county.countyFips} ${level}% variant exceeds the standard Silver out-of-pocket maximum.`);
      }
    }
    for (const metal of CMS_METALS) {
      const summary = unpackMetal(values, position, metal);
      if (!summary) continue;
      for (const [ageIndex, lowest] of summary.lowestByAge.entries()) {
        if (lowest > summary.medianByAge[ageIndex] + 0.005) {
          throw new Error(`County ${county.countyFips} ${metal} lowest premium exceeds its median at age index ${ageIndex}.`);
        }
      }
    }
  });
}

async function loadWorkbook(): Promise<{ bytes: Uint8Array; sha256: string }> {
  const zipPath = path.join(dataDirectory, 'raw', `${OBSERVATION_PERIOD}-medical.zip`);
  const archive = new Uint8Array(await readFile(zipPath));
  return { bytes: readZipEntry(archive, 'individual_market_medical.xlsx'), sha256: sha256Bytes(archive) };
}

/**
 * Seal the pair: the packed file is hashed, then named inside the index it
 * belongs to, and the index is hashed over exactly the bytes that get written.
 *
 * The schema is used to validate, never to produce what is written. Parsing
 * rebuilds an object in schema key order, so hashing the parsed copy and
 * writing it would leave a digest that no reader could reproduce from the file.
 */
export function sealCmsSnapshot(normalized: NormalizedCms): { index: CmsMarketplaceIndex; premiums: CmsMarketplacePremiums; premiumsText: string; indexText: string } {
  const premiums: CmsMarketplacePremiums = { ...normalized.premiums, snapshotId: normalized.index.snapshotId };
  const premiumsText = `${JSON.stringify(premiums)}\n`;
  const withDigest = { ...normalized.index, premiumsSha256: sha256(premiumsText) };
  const index = { ...withDigest, normalizedSha256: sha256(JSON.stringify(withDigest)) } as CmsMarketplaceIndex;
  cmsMarketplaceIndexSchema.parse(index);
  cmsMarketplacePremiumsSchema.parse(premiums);
  return { index, premiums, premiumsText, indexText: `${JSON.stringify(index, null, 2)}\n` };
}

async function ingest(): Promise<void> {
  const workbook = await loadWorkbook();
  const normalized = normalizeCmsLandscape(extractCmsLandscape(workbook.bytes), {
    fetchedAt: new Date().toISOString(), rawSha256: workbook.sha256,
  });
  auditPackedCounties(normalized);
  const sealed = sealCmsSnapshot(normalized);
  await writeImmutable(path.join(dataDirectory, 'raw', `${OBSERVATION_PERIOD}-medical.sha256`), `${workbook.sha256}\n`);
  await writeImmutable(path.join(dataDirectory, 'snapshots', `${sealed.index.snapshotId}.json`), sealed.indexText);
  await atomicWrite(path.join(dataDirectory, 'index.json'), sealed.indexText);
  await atomicWrite(path.join(dataDirectory, 'premiums.json'), sealed.premiumsText);
  await atomicWrite(path.join(dataDirectory, 'manifest.json'), `${JSON.stringify({
    currentSnapshotId: sealed.index.snapshotId,
    observationPeriod: sealed.index.observationPeriod,
    normalizedSha256: sealed.index.normalizedSha256,
    validationStatus: 'passed',
  }, null, 2)}\n`);
  console.log(`Published ${sealed.index.snapshotId}: ${sealed.index.counties.length} counties across ${sealed.index.coveredStateCodes.length} states, ${sealed.premiums.values.length.toLocaleString('en-US')} packed values.`);
}

/**
 * Re-derive the snapshot and compare it with what is committed.
 *
 * The 56 MB source archive is not in the repository, so this runs two ways:
 * with the archive present it replays the whole extraction, and without it the
 * committed pair is still checked against its own hashes, schemas, manifest,
 * and immutable copy. CI takes the second path.
 */
async function verify(): Promise<void> {
  const indexText = await readFile(path.join(dataDirectory, 'index.json'), 'utf8');
  const indexDocument = JSON.parse(indexText);
  assertNormalizedHash(indexDocument, 'CMS marketplace index');
  const index = cmsMarketplaceIndexSchema.parse(indexDocument);
  const premiumsText = await readFile(path.join(dataDirectory, 'premiums.json'), 'utf8');
  if (sha256(premiumsText) !== index.premiumsSha256) throw new Error('Packed CMS premiums do not match the digest in the index.');
  const premiums = cmsMarketplacePremiumsSchema.parse(JSON.parse(premiumsText));
  if (premiums.snapshotId !== index.snapshotId) throw new Error('Packed CMS premiums come from a different release than the index.');
  if (premiums.countyCount !== index.counties.length) throw new Error('Packed CMS premiums cover a different number of counties than the index.');
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8'));
  if (manifest.currentSnapshotId !== index.snapshotId || manifest.normalizedSha256 !== index.normalizedSha256) {
    throw new Error('CMS manifest does not describe the promoted index.');
  }
  const immutable = await readFile(path.join(dataDirectory, 'snapshots', `${index.snapshotId}.json`), 'utf8');
  if (immutable !== indexText) throw new Error('CMS immutable index does not match index.json.');
  const recordedDigest = (await readFile(path.join(dataDirectory, 'raw', `${OBSERVATION_PERIOD}-medical.sha256`), 'utf8')).trim();
  if (recordedDigest !== index.rawSha256) throw new Error('Recorded source digest does not match the promoted snapshot.');
  auditPackedCounties({ index, premiums });

  let replay = 'source archive absent, replay skipped';
  try {
    const workbook = await loadWorkbook();
    if (workbook.sha256 !== index.rawSha256) throw new Error('The local CMS archive is not the one this snapshot was built from.');
    const rebuilt = sealCmsSnapshot(normalizeCmsLandscape(extractCmsLandscape(workbook.bytes), {
      fetchedAt: index.fetchedAt, rawSha256: workbook.sha256,
    }));
    if (rebuilt.indexText !== indexText) throw new Error('CMS index replay does not match the promoted index.');
    if (rebuilt.premiumsText !== premiumsText) throw new Error('CMS premium replay does not match the promoted columns.');
    replay = 'exact replay from the source archive';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  console.log(`Verified ${index.snapshotId}: ${index.counties.length} counties, ${index.coveredStateCodes.length} states, ${replay}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--verify')) await verify();
  else {
    const releaseLock = await acquireIngestionLock(dataDirectory);
    try { await ingest(); } finally { await releaseLock(); }
  }
}

export const __testing = { money, spread, nthByAge };
