import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { eiaElectricitySnapshotSchema } from '../lib/data/eia-electricity';
import { validateElectricityEnvelope } from '../lib/data/electricity-snapshot';
import { eiaGasolineSnapshotSchema } from '../lib/data/eia-gasoline';
import { validateGasolineEnvelope } from '../lib/data/gasoline-snapshot';
import { blsGrocerySnapshotSchema } from '../lib/data/bls-grocery';
import { validateGroceryEnvelope } from '../lib/data/grocery-snapshot';
import { freddieMacPmmsSnapshotSchema } from '../lib/data/freddie-mac-pmms';
import { validateMortgageRateEnvelope } from '../lib/data/mortgage-rate-snapshot';
import { blsCpiSnapshotSchema } from '../lib/data/bls-cpi';
import { validateCpiEnvelope } from '../lib/data/cpi-snapshot';
import { validateTaxYearSnapshot } from '../lib/data/tax/snapshot';
import { DATASET_POLICIES } from '../lib/data/dataset-policy';
import { validateGeographyEnvelope } from '../lib/data/geography-snapshot';
import { geographySnapshotSchema } from '../lib/data/geography';
import { validateAcsEnvelope } from '../lib/data/acs-snapshot';
import { censusAcsSnapshotSchema } from '../lib/data/census-acs';
import { validateHudEnvelope, resolveHudFmrSnapshot } from '../lib/data/hud-fmr-snapshot';
import { validateBeaRppEnvelope } from '../lib/data/bea-rpp-snapshot';
import { beaRppSnapshotSchema } from '../lib/data/bea-rpp';
import { validateUsdaFoodEnvelope } from '../lib/data/usda-food-snapshot';
import { usdaFoodSnapshotSchema } from '../lib/data/usda-food';
import { geographySnapshot } from '../lib/data/geography-snapshot';
import { PUBLISHING_SNAPSHOT_DATE } from '../lib/publishing';

async function readRawMatchingHash(dataDirectory: string, period: string, expectedHash: string, extensions: string[]): Promise<void> {
  for (const extension of extensions) {
    const rawPath = path.join(dataDirectory, 'raw', `${period}${extension}`);
    try {
      await access(rawPath);
    } catch {
      continue;
    }
    const rawText = await readFile(rawPath, 'utf8');
    if (createHash('sha256').update(rawText).digest('hex') !== expectedHash) {
      throw new Error(`Raw artifact SHA-256 does not match the promoted snapshot: ${rawPath}`);
    }
    return;
  }
  throw new Error(`Missing raw artifact for ${period} in ${dataDirectory}`);
}

async function verifyElectricity(): Promise<string> {
  const dataDirectory = path.join(process.cwd(), 'data', 'eia');
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateElectricityEnvelope(currentRaw);
  await readRawMatchingHash(dataDirectory, current.snapshot.observationPeriod, current.snapshot.rawSha256, ['.json']);
  const normalized = eiaElectricitySnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'electricity-retail-sales.normalized.json'), 'utf8')));
  const versioned = eiaElectricitySnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error('Mutable normalized EIA electricity snapshot differs from current.json.');
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error('Versioned EIA electricity snapshot differs from current.json.');
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error('Legacy EIA electricity manifest differs from current.json.');
  return current.snapshot.snapshotId;
}

async function verifyGasoline(): Promise<string> {
  const dataDirectory = path.join(process.cwd(), 'data', 'eia-gasoline');
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateGasolineEnvelope(currentRaw);
  await readRawMatchingHash(dataDirectory, current.snapshot.observationPeriod, current.snapshot.rawSha256, ['.html', '.json']);
  const normalized = eiaGasolineSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'gasoline-weekly.normalized.json'), 'utf8')));
  const versioned = eiaGasolineSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error('Mutable normalized EIA gasoline snapshot differs from current.json.');
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error('Versioned EIA gasoline snapshot differs from current.json.');
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error('Legacy EIA gasoline manifest differs from current.json.');
  return current.snapshot.snapshotId;
}

async function verifyGrocery(): Promise<string> {
  const dataDirectory = path.join(process.cwd(), 'data', 'bls');
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateGroceryEnvelope(currentRaw);
  const rawText = await readFile(path.join(dataDirectory, 'raw', `${current.snapshot.snapshotId}.json`), 'utf8');
  if (createHash('sha256').update(rawText).digest('hex') !== current.snapshot.rawSha256) {
    throw new Error('Raw BLS grocery response SHA-256 does not match the promoted snapshot.');
  }
  const normalized = blsGrocerySnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'grocery-apu.normalized.json'), 'utf8')));
  const versioned = blsGrocerySnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error('Mutable normalized BLS grocery snapshot differs from current.json.');
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error('Versioned BLS grocery snapshot differs from current.json.');
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error('Legacy BLS grocery manifest differs from current.json.');
  return current.snapshot.snapshotId;
}

async function verifyMortgageRates(): Promise<string> {
  const dataDirectory = path.join(process.cwd(), 'data', 'freddie-mac');
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateMortgageRateEnvelope(currentRaw);
  await readRawMatchingHash(dataDirectory, current.snapshot.observationPeriod, current.snapshot.rawSha256, ['.html']);
  const normalized = freddieMacPmmsSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'pmms.normalized.json'), 'utf8')));
  const versioned = freddieMacPmmsSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error('Mutable normalized PMMS snapshot differs from current.json.');
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error('Versioned PMMS snapshot differs from current.json.');
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error('Legacy PMMS manifest differs from current.json.');
  return current.snapshot.snapshotId;
}

async function verifyCpi(): Promise<string> {
  const dataDirectory = path.join(process.cwd(), 'data', 'bls-cpi');
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateCpiEnvelope(currentRaw);
  await readRawMatchingHash(dataDirectory, current.snapshot.observationPeriod, current.snapshot.rawSha256, ['.json']);
  const normalized = blsCpiSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'cpi-u-nsa.normalized.json'), 'utf8')));
  const versioned = blsCpiSnapshotSchema.parse(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error('Mutable normalized CPI snapshot differs from current.json.');
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error('Versioned CPI snapshot differs from current.json.');
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error('Legacy CPI manifest differs from current.json.');
  return current.snapshot.snapshotId;
}

async function verifyLocationRaw(dataDirectory: string, fileName: string, expectedHash: string): Promise<void> {
  const rawPath = path.join(dataDirectory, 'raw', fileName);
  const rawText = await readFile(rawPath, 'utf8');
  const parsed = JSON.parse(rawText) as { sourceHash?: string };
  if (parsed.sourceHash) {
    if (parsed.sourceHash !== expectedHash) throw new Error(`Recorded source hash does not match ${rawPath}.`);
    return;
  }
  if (createHash('sha256').update(rawText).digest('hex') !== expectedHash) {
    throw new Error(`Raw artifact SHA-256 does not match the promoted snapshot: ${rawPath}`);
  }
}

async function verifyEnvelope<T extends { snapshotId: string; observationPeriod: string; normalizedSha256: string; rawSha256: string }>(
  dataDirectory: string,
  normalizedFileName: string,
  validate: (raw: unknown) => { snapshot: T; manifest: unknown },
  parseSnapshot: (raw: unknown) => T,
  rawFileName: string,
): Promise<string> {
  const currentRaw = JSON.parse(await readFile(path.join(dataDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validate(currentRaw);
  await verifyLocationRaw(dataDirectory, rawFileName, current.snapshot.rawSha256);
  const normalized = parseSnapshot(JSON.parse(await readFile(path.join(dataDirectory, normalizedFileName), 'utf8')));
  const versioned = parseSnapshot(JSON.parse(await readFile(path.join(dataDirectory, 'snapshots', `${current.snapshot.snapshotId}.json`), 'utf8')));
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as unknown;
  if (JSON.stringify(normalized) !== JSON.stringify(current.snapshot)) throw new Error(`Mutable normalized snapshot differs from current.json in ${dataDirectory}.`);
  if (JSON.stringify(versioned) !== JSON.stringify(current.snapshot)) throw new Error(`Versioned snapshot differs from current.json in ${dataDirectory}.`);
  if (JSON.stringify(manifest) !== JSON.stringify(current.manifest)) throw new Error(`Manifest differs from current.json in ${dataDirectory}.`);
  return current.snapshot.snapshotId;
}

async function verifyLocationDatasets(): Promise<string[]> {
  const geography = await verifyEnvelope(path.join(process.cwd(), 'data', 'geography'), 'geography.normalized.json', validateGeographyEnvelope, geographySnapshotSchema.parse, 'census-omb-2024.json');
  const acs = await verifyEnvelope(path.join(process.cwd(), 'data', 'census-acs'), 'acs5.normalized.json', validateAcsEnvelope, censusAcsSnapshotSchema.parse, '2024.json');
  const bea = await verifyEnvelope(path.join(process.cwd(), 'data', 'bea-rpp'), 'rpp.normalized.json', validateBeaRppEnvelope, beaRppSnapshotSchema.parse, '2024.json');
  const usda = await verifyEnvelope(path.join(process.cwd(), 'data', 'usda-food'), 'food-plans.normalized.json', validateUsdaFoodEnvelope, usdaFoodSnapshotSchema.parse, '2026-07.json');

  const hudDirectory = path.join(process.cwd(), 'data', 'hud-fmr');
  const currentRaw = JSON.parse(await readFile(path.join(hudDirectory, 'current.json'), 'utf8')) as unknown;
  const current = validateHudEnvelope(currentRaw);
  if (current.snapshot.fiscalYear !== 2027) throw new Error('HUD current.json must point at the latest published FY2027 snapshot.');
  const fy2026Hash = createHash('sha256').update(await readFile(path.join(hudDirectory, 'raw', 'fy2026.xlsx'))).digest('hex');
  const fy2027Hash = createHash('sha256').update(await readFile(path.join(hudDirectory, 'raw', 'fy2027.xlsx'))).digest('hex');
  const fy2026 = JSON.parse(await readFile(path.join(hudDirectory, 'snapshots', 'hud-fmr-fy2026-revised-2026-05-21-v1.json'), 'utf8')) as { rawSha256: string };
  if (fy2026.rawSha256 !== fy2026Hash) throw new Error('FY2026 HUD workbook hash does not match the snapshot.');
  if (current.snapshot.rawSha256 !== fy2027Hash) throw new Error('FY2027 HUD workbook hash does not match current.json.');
  const effective = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);
  if (effective.fiscalYear !== 2026) throw new Error(`HUD currently-effective snapshot on ${PUBLISHING_SNAPSHOT_DATE} must be FY2026, got FY${effective.fiscalYear}.`);
  if (DATASET_POLICIES['hud-fmr'].freshnessAnchor !== 'published-at' || DATASET_POLICIES['census-acs5'].staleAfterDays < 400) {
    throw new Error('Annual location datasets must not use the 45-day monthly stale threshold.');
  }
  const gazetteerCounties = new Set(geographySnapshot.counties.map((row) => row.geoid));
  const extraHudCounties = [...new Set(effective.countyMaps.map((row) => row.countyGeoid).filter((geoid) => !gazetteerCounties.has(geoid)))];
  const unexpectedHudCounties = extraHudCounties.filter((geoid) => geoid !== '29056');
  if (unexpectedHudCounties.length > 0) {
    throw new Error(`HUD county maps contain GEOIDs missing from Census 2024 gazetteer: ${unexpectedHudCounties.join(', ')}`);
  }
  return [geography, acs, bea, usda, current.snapshot.snapshotId, effective.snapshotId];
}

async function verifyTax(): Promise<string> {
  const snapshot = validateTaxYearSnapshot(JSON.parse(await readFile(path.join(process.cwd(), 'data', 'tax', '2026.json'), 'utf8')) as unknown);
  if (snapshot.taxYear !== 2026) throw new Error('Expected the published tax snapshot to be tax year 2026.');
  if (DATASET_POLICIES['us-tax'].refreshMode !== 'manual' || DATASET_POLICIES['us-tax'].expectedCadence !== 'yearly') {
    throw new Error('Tax dataset policy must remain yearly and manual.');
  }
  return snapshot.snapshotId;
}

const ids = [
  await verifyElectricity(),
  await verifyGasoline(),
  await verifyGrocery(),
  await verifyMortgageRates(),
  await verifyCpi(),
  await verifyTax(),
  ...(await verifyLocationDatasets()),
];
console.log(`Verified ${ids.join(', ')}: raw hash, normalized hash, semantics and promotion envelope passed.`);
