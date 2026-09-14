/**
 * Observed contractor cost structure, from the 2022 Economic Census.
 *
 * What this replaces is the reason it exists. Every job recipe used to price a
 * contractor's business cost with two numbers chosen by us — 12% overhead on
 * direct cost, then 20% markup on the subtotal — applied identically to a
 * painter and a concrete crew. The Economic Census asks every construction
 * establishment in the country what it took in and what it spent, by trade, so
 * that ratio does not have to be assumed. It turns out to vary from 1.41× on
 * poured concrete to 1.65× on painting, and our flat 1.34× was below every
 * single trade.
 *
 * The arithmetic, per NAICS industry, on the *net* value of construction work
 * (RCPCWRK − CSTSCNT, which the file also publishes as RCPNCW, so work the
 * establishment subcontracted out is on neither side):
 *
 *   direct   = materials + construction-worker wages + their share of fringe
 *              + equipment rentals + fuel and power
 *   overhead = office payroll + its share of fringe + depreciation
 *              + communication, repair, advertising, professional services
 *              + taxes and licence fees + temporary staff + other operating
 *   profit   = whatever is left
 *
 * Fringe is split between construction workers and everyone else in proportion
 * to payroll, because the census reports one benefits total. `profit` is a
 * residual of a residual: it is the operating surplus after the costs this file
 * enumerates, and it absorbs anything the census does not ask about. The
 * snapshot says so, and the engine prints it as an observed residual rather
 * than as a reported margin.
 *
 * Run with `--download` to refetch from Census. The default rebuilds from the
 * retained national extract and fails if it no longer hashes to the promoted
 * value, so a test run never depends on census.gov being up.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { INGEST_USER_AGENT, sealNormalizedSnapshot, sha256 } from './ingest-io';
import { readZipEntries } from './zip';

const ROOT = process.cwd();
const EXTRACT_PATH = 'data/census-construction/raw/ec2022-sector23-national.psv';
const SNAPSHOT_PATH = 'data/census-construction/current.json';
const SOURCE_ZIP_URL = 'https://www2.census.gov/programs-surveys/economic-census/data/2022/sector23/EC2223BASIC.zip';
const SOURCE_TABLE_URL = 'https://data.census.gov/table/ECNBASIC2022.EC2223BASIC';

/** National row identifier in the Economic Census geography column. */
const NATIONAL_GEO_ID = '0100000US';

/**
 * The industries a CostAnswer job can be priced against.
 *
 * Kept explicit rather than "every NAICS in the file" so the snapshot stays a
 * few kilobytes and every industry in it is one a recipe actually names.
 */
const INDUSTRIES = [
  '236118', // Residential remodelers
  '238110', // Poured concrete foundation and structure contractors
  '238130', // Framing contractors
  '238150', // Glass and glazing contractors
  '238160', // Roofing contractors
  '238170', // Siding contractors
  '238210', // Electrical contractors and other wiring installation contractors
  '238220', // Plumbing, heating, and air-conditioning contractors
  '238310', // Drywall and insulation contractors
  '238320', // Painting and wall covering contractors
  '238350', // Finish carpentry contractors
  '238910', // Site preparation contractors
  '238990', // All other specialty trade contractors
  '238', // Specialty trade contractors, as the fallback aggregate
] as const;

/** Overhead lines the census enumerates separately from payroll and benefits. */
const OVERHEAD_FIELDS = [
  'DPRTOT', // Total depreciation during year
  'PCHCSVC', // Communication services
  'PCHRPR', // Repair and maintenance of buildings and machinery
  'PCHADVT', // Advertising and promotional services
  'PCHPRTE', // Purchased professional and technical services
  'PCHTAX', // Taxes and licence fees
  'PCHTEMP', // Temporary staff and leased employees
  'PCHOEXP', // All other operating expenses
] as const;

type Row = Record<string, string>;

function parsePipeDelimited(text: string): Row[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const header = lines[0].replace(/^#/, '').split('|');
  return lines.slice(1).map((line) => {
    const cells = line.split('|');
    const row: Row = {};
    header.forEach((name, index) => {
      row[name] = cells[index] ?? '';
    });
    return row;
  });
}

function thousands(row: Row, field: string): number {
  const raw = (row[field] ?? '').trim();
  if (raw === '') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} is not a non-negative number: ${raw}`);
  return value;
}

async function downloadNationalExtract(): Promise<string> {
  const response = await fetch(SOURCE_ZIP_URL, { headers: { 'user-agent': INGEST_USER_AGENT } });
  if (!response.ok) throw new Error(`Census returned ${response.status} for ${SOURCE_ZIP_URL}.`);
  const archive = new Uint8Array(await response.arrayBuffer());
  const entries = readZipEntries(archive);
  const dataEntry = [...entries.entries()].find(([name]) => name.toUpperCase().endsWith('BASIC.DAT'));
  if (!dataEntry) throw new Error(`No BASIC.dat inside ${SOURCE_ZIP_URL}. Archive held: ${[...entries.keys()].join(', ')}`);
  const text = new TextDecoder().decode(dataEntry[1]);
  const lines = text.split('\n');
  const header = lines[0];
  const wanted = new Set<string>(INDUSTRIES);
  const rows = parsePipeDelimited(text)
    .filter((row) => row.GEO_ID === NATIONAL_GEO_ID && wanted.has(row.NAICS2022))
    .map((row) => row);
  if (rows.length !== INDUSTRIES.length) {
    const found = new Set(rows.map((row) => row.NAICS2022));
    const missing = INDUSTRIES.filter((code) => !found.has(code));
    throw new Error(`Census file no longer carries national rows for ${missing.join(', ')}.`);
  }
  const headerNames = header.replace(/^#/, '').split('|');
  const body = rows
    .sort((left, right) => left.NAICS2022.localeCompare(right.NAICS2022))
    .map((row) => headerNames.map((name) => row[name] ?? '').join('|'))
    .join('\n');
  return `${header.trimEnd()}\n${body}\n`;
}

export type CensusConstructionIndustryRecord = {
  naics: string;
  label: string;
  establishments: number;
  netValueOfConstructionWorkThousands: number;
  materialShare: number;
  constructionWageShare: number;
  constructionFringeShare: number;
  equipmentRentalShare: number;
  fuelAndPowerShare: number;
  directShare: number;
  overheadShare: number;
  profitShare: number;
  /** Multiply a direct cost by this to reach the price this trade charges. */
  directToPriceMultiplier: number;
  /** Observed average, as a cross-check on the OEWS × ECEC loaded wage. */
  averageConstructionWorkerHourlyWage: number;
};

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function industryFrom(row: Row): CensusConstructionIndustryRecord {
  const netWork = thousands(row, 'RCPNCW');
  const valueOfWork = thousands(row, 'RCPCWRK');
  const subcontracted = thousands(row, 'CSTSCNT');
  if (netWork <= 0) throw new Error(`${row.NAICS2022} has no net value of construction work.`);
  if (Math.abs(netWork - (valueOfWork - subcontracted)) > 1) {
    throw new Error(`${row.NAICS2022}: RCPNCW ${netWork} is not RCPCWRK ${valueOfWork} less CSTSCNT ${subcontracted}.`);
  }

  const payrollTotal = thousands(row, 'PAYANN');
  const constructionWages = thousands(row, 'PAYANCW');
  const benefits = thousands(row, 'BENEFIT');
  const hours = thousands(row, 'HOURS');
  if (payrollTotal <= 0 || constructionWages <= 0 || hours <= 0) {
    throw new Error(`${row.NAICS2022} is missing payroll or hours, which the shares divide by.`);
  }
  if (constructionWages > payrollTotal) {
    throw new Error(`${row.NAICS2022}: construction wages exceed total payroll.`);
  }

  const constructionFringe = benefits * (constructionWages / payrollTotal);
  const officeFringe = benefits - constructionFringe;
  const materials = thousands(row, 'CSTMPRT');
  const rentals = thousands(row, 'RPTOT');
  const fuel = thousands(row, 'CSTEFT');

  const direct = materials + constructionWages + constructionFringe + rentals + fuel;
  const overhead = (payrollTotal - constructionWages)
    + officeFringe
    + OVERHEAD_FIELDS.reduce((total, field) => total + thousands(row, field), 0);
  const profit = netWork - direct - overhead;

  if (direct <= 0) throw new Error(`${row.NAICS2022} has no direct cost.`);
  if (direct >= netWork) throw new Error(`${row.NAICS2022} direct cost is not below the value of its work.`);
  if (overhead <= 0) throw new Error(`${row.NAICS2022} has no overhead.`);
  /*
   * A negative residual would mean the trade sold work below its enumerated
   * costs across a whole census year. That is possible in principle and would
   * be a real finding, but it is far more likely to mean a field changed
   * meaning, so it stops the ingest rather than shipping a multiplier below 1.
   */
  if (profit <= 0) throw new Error(`${row.NAICS2022} residual operating surplus is ${profit}; check the field definitions.`);

  const multiplier = netWork / direct;
  if (multiplier < 1.1 || multiplier > 2.5) {
    throw new Error(`${row.NAICS2022} direct-to-price multiplier ${multiplier.toFixed(3)} is outside 1.1–2.5.`);
  }
  const hourlyWage = constructionWages / hours;
  if (hourlyWage < 10 || hourlyWage > 80) {
    throw new Error(`${row.NAICS2022} average construction-worker wage $${hourlyWage.toFixed(2)}/hr is outside $10–$80.`);
  }

  return {
    naics: row.NAICS2022,
    label: row.NAICS2022_LABEL,
    establishments: Math.round(thousands(row, 'ESTAB')),
    netValueOfConstructionWorkThousands: netWork,
    materialShare: round(materials / netWork, 4),
    constructionWageShare: round(constructionWages / netWork, 4),
    constructionFringeShare: round(constructionFringe / netWork, 4),
    equipmentRentalShare: round(rentals / netWork, 4),
    fuelAndPowerShare: round(fuel / netWork, 4),
    directShare: round(direct / netWork, 4),
    overheadShare: round(overhead / netWork, 4),
    profitShare: round(profit / netWork, 4),
    directToPriceMultiplier: round(multiplier, 4),
    averageConstructionWorkerHourlyWage: round(hourlyWage, 2),
  };
}

export function buildCensusConstructionSnapshot(extractText: string, fetchedAt: string) {
  const rows = parsePipeDelimited(extractText).filter((row) => row.GEO_ID === NATIONAL_GEO_ID);
  const byNaics = new Map(rows.map((row) => [row.NAICS2022, row]));
  const industries = INDUSTRIES.map((code) => {
    const row = byNaics.get(code);
    if (!row) throw new Error(`Retained extract has no national row for NAICS ${code}.`);
    return industryFrom(row);
  });

  for (const industry of industries) {
    const parts = industry.directShare + industry.overheadShare + industry.profitShare;
    if (Math.abs(parts - 1) > 0.001) {
      throw new Error(`${industry.naics} shares sum to ${parts.toFixed(4)}, not 1.`);
    }
  }

  return sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'census-economic-census-construction-v1.0.0',
    snapshotId: 'census-ec2022-construction-v1',
    datasetId: 'census-economic-census-construction' as const,
    observationPeriod: '2022',
    fetchedAt,
    publishedAt: '2024-11-20T00:00:00.000Z',
    sourceUrl: SOURCE_TABLE_URL,
    sourceDocumentationUrl: SOURCE_ZIP_URL,
    attribution: 'U.S. Census Bureau, 2022 Economic Census, Construction sector (EC2223BASIC), national industry totals.',
    disclaimer:
      'Industry-wide ratios for a whole census year, not this contractor and not this job. Profit is the residual after the costs the census enumerates.',
    industries,
    rawSha256: sha256(extractText),
    validationReport: [
      `${industries.length} national industry rows read from the 2022 Economic Census construction file.`,
      'Shares are taken on the net value of construction work, so work subcontracted out is excluded from both sides.',
      'Fringe benefits are split between construction workers and other staff in proportion to payroll.',
      'Every industry sums to exactly one across direct, overhead and residual profit.',
    ],
  });
}

async function main(): Promise<void> {
  const download = process.argv.includes('--download');
  const extractPath = join(ROOT, EXTRACT_PATH);

  let extractText: string;
  if (download) {
    extractText = await downloadNationalExtract();
    mkdirSync(dirname(extractPath), { recursive: true });
    writeFileSync(extractPath, extractText);
  } else {
    extractText = readFileSync(extractPath, 'utf8');
  }

  const snapshot = buildCensusConstructionSnapshot(extractText, new Date().toISOString());
  const target = join(ROOT, SNAPSHOT_PATH);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);

  for (const industry of snapshot.industries) {
    console.log(
      `${industry.naics} ${industry.label.slice(0, 44).padEnd(44)} `
      + `direct ${(industry.directShare * 100).toFixed(1)}%  overhead ${(industry.overheadShare * 100).toFixed(1)}%  `
      + `profit ${(industry.profitShare * 100).toFixed(1)}%  ×${industry.directToPriceMultiplier.toFixed(3)}  `
      + `$${industry.averageConstructionWorkerHourlyWage.toFixed(2)}/hr`,
    );
  }
  console.log(`\nWrote ${SNAPSHOT_PATH} (${snapshot.snapshotId}).`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
