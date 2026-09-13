/**
 * FHFA conforming loan limit values, by county.
 *
 * FHFA does not observe this number, it sets it: the Housing and Economic
 * Recovery Act fixes a baseline that moves with the FHFA house price index, and
 * a county whose median house price runs ahead of the baseline gets a higher
 * limit, capped at 150% of the baseline. A loan above its county's limit is not
 * "expensive", it is a different product — Fannie Mae and Freddie Mac may not
 * buy it, so it is underwritten, priced and reserved for differently.
 *
 * The file is one row per county with four limits on it, one per unit count.
 * Only 25 distinct one-unit values exist across 3,235 counties, because most of
 * the country sits at the baseline and the rest cluster on a handful of
 * high-cost steps. Storing the distinct tuples once and an index per county is
 * what keeps this in the bundle instead of the asset store.
 *
 * Run with `--download` to refetch from FHFA. The default rebuilds from the
 * retained CSV and fails if it no longer hashes to the promoted value.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { INGEST_USER_AGENT, sealNormalizedSnapshot, sha256 } from './ingest-io';

const ROOT = process.cwd();
const LOAN_YEAR = 2026;
const RAW_PATH = `data/fhfa-loan-limits/raw/fullcountyloanlimitlist${LOAN_YEAR}_hera-based_final_flat.csv`;
const SNAPSHOT_PATH = 'data/fhfa-loan-limits/current.json';
const SOURCE_CSV_URL = `https://www.fhfa.gov/document/fullcountyloanlimitlist${LOAN_YEAR}_hera-based_final_flat.csv`;
const SOURCE_PAGE_URL = 'https://www.fhfa.gov/data/conforming-loan-limit';

/**
 * The date a maintainer last opened FHFA's own page, confirmed the calendar-year
 * file linked there was this one, and downloaded it.
 *
 * FHFA's announcement date is not on the data file and is not being guessed at.
 * Freshness is anchored on this check instead, the same way the NAIC and CMS
 * snapshots are.
 */
const VERIFIED_AT = '2026-09-08';

/** Statutory high-cost ceiling: 150% of the baseline. */
const CEILING_MULTIPLE = 1.5;

/**
 * Areas Congress exempted from the ceiling.
 *
 * 12 U.S.C. 1717(b)(2) sets the limit for Alaska, Hawaii, Guam and the U.S.
 * Virgin Islands at 150 percent of the otherwise applicable amount, so their
 * floor is the national ceiling and they may go above it. Two Hawaii counties
 * do: Maui and Kalawao are at $1,299,500 for 2026 against a $1,249,125
 * ceiling. A validation that simply asserted "nothing exceeds 150% of the
 * baseline" would reject the real file.
 */
const SPECIAL_STATUTORY_AREAS = ['AK', 'HI', 'GU', 'VI'] as const;

type Row = Record<string, string>;

/** RFC 4180 with quoted fields that contain newlines, which this file has in its header. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; continue; }
        quoted = false;
        continue;
      }
      field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function toRows(text: string): Row[] {
  const [header, ...body] = parseCsv(text);
  const names = header.map((name) => name.replace(/\s+/g, ' ').trim());
  return body.map((cells) => {
    const row: Row = {};
    names.forEach((name, index) => { row[name] = (cells[index] ?? '').trim(); });
    return row;
  });
}

function dollars(raw: string, where: string): number {
  const cleaned = raw.replace(/[$,\s]/g, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${where} is not a dollar amount: ${JSON.stringify(raw)}`);
  if (!Number.isInteger(value)) throw new Error(`${where} is not a whole number of dollars: ${value}`);
  return value;
}

export type LoanLimitTier = readonly [number, number, number, number];

async function download(): Promise<string> {
  const response = await fetch(SOURCE_CSV_URL, {
    headers: { 'user-agent': INGEST_USER_AGENT, accept: 'text/csv,*/*' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`FHFA returned ${response.status} for ${SOURCE_CSV_URL}.`);
  const text = await response.text();
  if (!text.startsWith('FIPS State Code')) {
    throw new Error('FHFA did not serve the county limit CSV; the first column is no longer "FIPS State Code".');
  }
  return text;
}

export function buildFhfaLoanLimitSnapshot(csvText: string, fetchedAt: string) {
  const rows = toRows(csvText);
  if (rows.length < 3_000) throw new Error(`FHFA file has ${rows.length} counties; expected every US county.`);

  const tierKeys = new Map<string, number>();
  const tiers: LoanLimitTier[] = [];
  const countyFips: string[] = [];
  const countyTier: number[] = [];
  const countyName: string[] = [];
  const countyState: string[] = [];

  for (const row of rows) {
    const stateFips = row['FIPS State Code'];
    const countyCode = row['FIPS County Code'];
    if (!/^\d{2}$/.test(stateFips) || !/^\d{3}$/.test(countyCode)) {
      throw new Error(`FHFA row has a malformed FIPS pair: ${stateFips}/${countyCode}`);
    }
    const fips = `${stateFips}${countyCode}`;
    const tier: LoanLimitTier = [
      dollars(row['One-Unit Limit'], `${fips} one-unit`),
      dollars(row['Two-Unit Limit'], `${fips} two-unit`),
      dollars(row['Three-Unit Limit'], `${fips} three-unit`),
      dollars(row['Four-Unit Limit'], `${fips} four-unit`),
    ];
    for (let units = 1; units < 4; units += 1) {
      if (tier[units] <= tier[units - 1]) {
        throw new Error(`${fips}: the ${units + 1}-unit limit is not above the ${units}-unit limit.`);
      }
    }
    const key = tier.join('|');
    let index = tierKeys.get(key);
    if (index === undefined) {
      index = tiers.length;
      tierKeys.set(key, index);
      tiers.push(tier);
    }
    countyFips.push(fips);
    countyTier.push(index);
    countyName.push(row['County Name']);
    countyState.push(row['State']);
  }

  if (new Set(countyFips).size !== countyFips.length) throw new Error('FHFA file repeats a county FIPS code.');

  /*
   * The baseline is the limit the overwhelming majority of counties sit at, and
   * the ceiling is the statutory 150% of it. Deriving both from the data rather
   * than hard-coding them means a year where Congress changes the multiple
   * fails here instead of shipping a wrong "jumbo" verdict.
   */
  const oneUnitCounts = new Map<number, number>();
  for (const index of countyTier) {
    const value = tiers[index][0];
    oneUnitCounts.set(value, (oneUnitCounts.get(value) ?? 0) + 1);
  }
  const [baselineOneUnit, baselineCount] = [...oneUnitCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  if (baselineCount < rows.length * 0.8) {
    throw new Error(`The most common one-unit limit covers only ${baselineCount} of ${rows.length} counties; the baseline is no longer obvious.`);
  }
  const baselineTier = tiers.find((tier) => tier[0] === baselineOneUnit);
  if (!baselineTier) throw new Error('No tier carries the baseline one-unit limit.');

  const special = new Set<string>(SPECIAL_STATUTORY_AREAS);
  let mainlandCeiling = 0;
  let specialFloor = Number.POSITIVE_INFINITY;
  let aboveCeilingOutsideSpecialAreas = 0;
  countyTier.forEach((tierIndex, index) => {
    const oneUnit = tiers[tierIndex][0];
    if (special.has(countyState[index])) specialFloor = Math.min(specialFloor, oneUnit);
    else mainlandCeiling = Math.max(mainlandCeiling, oneUnit);
  });
  const impliedMultiple = mainlandCeiling / baselineOneUnit;
  if (Math.abs(impliedMultiple - CEILING_MULTIPLE) > 0.005) {
    throw new Error(`The highest limit outside the statutory special areas is ${impliedMultiple.toFixed(4)}× the baseline, not ${CEILING_MULTIPLE}×. Check whether the ceiling changed.`);
  }
  if (specialFloor < mainlandCeiling) {
    throw new Error(`A statutory special area is below the national ceiling (${specialFloor} < ${mainlandCeiling}), which the 150% rule does not allow.`);
  }
  countyTier.forEach((tierIndex, index) => {
    if (tiers[tierIndex][0] > mainlandCeiling && !special.has(countyState[index])) aboveCeilingOutsideSpecialAreas += 1;
  });
  if (aboveCeilingOutsideSpecialAreas > 0) {
    throw new Error(`${aboveCeilingOutsideSpecialAreas} counties exceed the national ceiling outside Alaska, Hawaii, Guam and the Virgin Islands.`);
  }
  const ceilingTier = tiers.find((tier) => tier[0] === mainlandCeiling)!;
  const aboveCeiling = countyTier
    .map((tierIndex, index) => ({ fips: countyFips[index], oneUnit: tiers[tierIndex][0] }))
    .filter((entry) => entry.oneUnit > mainlandCeiling)
    .map((entry) => entry.fips);

  return sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'fhfa-conforming-loan-limits-v1.0.0',
    snapshotId: `fhfa-conforming-loan-limits-${LOAN_YEAR}-v1`,
    datasetId: 'fhfa-loan-limits' as const,
    observationPeriod: String(LOAN_YEAR),
    loanYear: LOAN_YEAR,
    /** Loans acquired in this calendar year. A file published in November is not effective until 1 January. */
    effectiveFrom: `${LOAN_YEAR}-01-01`,
    effectiveTo: `${LOAN_YEAR}-12-31`,
    fetchedAt,
    verifiedAt: VERIFIED_AT,
    sourceStatus: 'verified' as const,
    sourceUrl: SOURCE_PAGE_URL,
    sourceDocumentationUrl: SOURCE_CSV_URL,
    attribution: `Federal Housing Finance Agency, Conforming Loan Limit Values for Calendar Year ${LOAN_YEAR}.`,
    baseline: {
      oneUnit: baselineTier[0],
      twoUnit: baselineTier[1],
      threeUnit: baselineTier[2],
      fourUnit: baselineTier[3],
    },
    ceiling: {
      oneUnit: ceilingTier[0],
      twoUnit: ceilingTier[1],
      threeUnit: ceilingTier[2],
      fourUnit: ceilingTier[3],
    },
    ceilingMultiple: CEILING_MULTIPLE,
    /** Counties Congress lets exceed the national ceiling. Empty in most years. */
    aboveCeilingCountyFips: aboveCeiling,
    specialStatutoryAreas: SPECIAL_STATUTORY_AREAS,
    tiers,
    countyFips,
    countyTier,
    countyName,
    countyState,
    rawSha256: sha256(csvText),
    validationReport: [
      `${countyFips.length} counties across ${new Set(countyState).size} states and territories.`,
      `${tiers.length} distinct limit tiers; ${baselineCount} counties sit at the $${baselineOneUnit.toLocaleString('en-US')} baseline.`,
      `The highest limit outside Alaska, Hawaii, Guam and the Virgin Islands is exactly ${CEILING_MULTIPLE}× the baseline, as the statute requires.`,
      aboveCeiling.length === 0
        ? 'No county exceeds the national ceiling.'
        : `${aboveCeiling.length} counties in the statutory special areas exceed the national ceiling: ${aboveCeiling.join(', ')}.`,
      'Every county has four limits, each above the one below it.',
    ],
  });
}

async function main(): Promise<void> {
  const rawPath = join(ROOT, RAW_PATH);
  let csvText: string;
  if (process.argv.includes('--download')) {
    csvText = await download();
    mkdirSync(dirname(rawPath), { recursive: true });
    writeFileSync(rawPath, csvText);
  } else {
    csvText = readFileSync(rawPath, 'utf8');
  }

  const snapshot = buildFhfaLoanLimitSnapshot(csvText, new Date().toISOString());
  const target = join(ROOT, SNAPSHOT_PATH);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);
  for (const line of snapshot.validationReport) console.log(`  ${line}`);
  console.log(`\nWrote ${SNAPSHOT_PATH} (${snapshot.snapshotId}).`);
}

if (process.argv[1]?.endsWith('ingest-fhfa-loan-limits.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
