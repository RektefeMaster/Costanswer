import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { geographySnapshotSchema } from '../lib/data/geography';
import { censusAcsSnapshotSchema } from '../lib/data/census-acs';
import { hudFmrSnapshotSchema, type HudRelease } from '../lib/data/hud-fmr';
import { beaRppSnapshotSchema } from '../lib/data/bea-rpp';
import { usdaFoodSnapshotSchema } from '../lib/data/usda-food';
import {
  atomicWrite,
  currentEnvelopeTextFor,
  manifestTextFor,
  promoteSnapshotFiles,
  sealNormalizedSnapshot,
  sha256,
  writeImmutable,
} from './ingest-io';

const root = process.cwd();
const cache = '/tmp/costanswer-phase7';
const fetchedAt = '2026-09-03T00:00:00.000Z';

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
}

async function fileSha(filePath: string): Promise<string> {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function promoteStandard(input: {
  dataDirectory: string;
  snapshot: { snapshotId: string; observationPeriod: string; normalizedSha256: string };
  normalizedFileName: string;
  rawRelativePath: string;
  rawContents: string;
}): Promise<void> {
  await promoteSnapshotFiles(input);
}

async function main(): Promise<void> {
  const geographyRaw = await readJson(path.join(cache, 'normalized/geography.json'));
  const acsRaw = await readJson(path.join(cache, 'normalized/acs.json'));
  const beaRaw = await readJson(path.join(cache, 'normalized/bea-rpp.json'));
  const usdaRaw = await readJson(path.join(cache, 'normalized/usda-food.json'));
  const hud2026Raw = await readJson(path.join(cache, 'normalized/hud-fmr-fy2026.json'));
  const hud2027Raw = await readJson(path.join(cache, 'normalized/hud-fmr-fy2027.json'));

  const geographySourceHash = sha256(JSON.stringify({
    counties: await fileSha(path.join(cache, '2024_Gaz_counties_national.zip')),
    places: await fileSha(path.join(cache, '2024_Gaz_place_national.zip')),
    cbsas: await fileSha(path.join(cache, '2024_Gaz_cbsa_national.zip')),
    list1: await fileSha(path.join(cache, 'list1_2023.xlsx')),
    list2: await fileSha(path.join(cache, 'list2_2023.xlsx')),
  }));
  const acsSourceHash = sha256(JSON.stringify({
    b19013: await fileSha(path.join(cache, 'acsdt5y2024-b19013.dat')),
    b01003: await fileSha(path.join(cache, 'acsdt5y2024-b01003.dat')),
  }));
  const beaSourceHash = sha256(JSON.stringify({
    sarpp: await fileSha(path.join(cache, 'SARPP.zip')),
    marpp: await fileSha(path.join(cache, 'MARPP.zip')),
  }));
  const usdaSourceHash = sha256(JSON.stringify(usdaRaw));
  const hud2026Hash = await fileSha(path.join(cache, 'FY26_FMRs_revised.xlsx'));
  const hud2027Hash = await fileSha(path.join(cache, 'FY27_FMRs.xlsx'));

  const counties = (geographyRaw.counties as Array<Record<string, unknown>>).map((row) => ({
    id: row.id,
    kind: 'county' as const,
    geoid: row.geoid,
    stateFips: row.stateFips,
    countyFips: row.countyFips,
    state: row.state,
    name: row.name,
    geographyVintage: '2024' as const,
  }));
  const places = (geographyRaw.places as Array<Record<string, unknown>>).map((row) => ({
    id: row.id,
    kind: 'place' as const,
    geoid: row.geoid,
    stateFips: row.stateFips,
    placeCode: row.placeCode,
    state: row.state,
    name: row.name,
    lsad: row.lsad ?? '',
    geographyVintage: '2024' as const,
    principalOfCbsa: row.principalOfCbsa,
  }));
  const principalCities = (geographyRaw.principalCities as Array<Record<string, unknown>>)
    .filter((row) => row.metroKind === 'metro')
    .map((row) => ({
      placeGeoid: row.placeGeoid,
      cbsaCode: row.cbsaCode,
      principalCityName: row.principalCityName,
      state: row.state,
      metroKind: 'metro' as const,
      gazetteerMatch: row.gazetteerMatch ?? null,
    }));

  const geography = sealNormalizedSnapshot({
    schemaVersion: '1.0.0' as const,
    adapterVersion: 'census-omb-geography-v1.0.0' as const,
    snapshotId: 'census-omb-geography-2024-v1',
    provider: 'U.S. Census Bureau / OMB',
    datasetId: 'census-omb-geography' as const,
    observationPeriod: '2024' as const,
    censusGeographyVintage: '2024' as const,
    ombDelineation: '2023-07-21' as const,
    ombBulletin: '23-01' as const,
    sourceStatus: 'verified' as const,
    fetchedAt,
    verifiedAt: fetchedAt,
    publishedAt: '2023-07-21T00:00:00.000Z',
    sourceUrl: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html',
    attribution: 'Census 2024 Gazetteer files and OMB Bulletin No. 23-01 CBSA delineations.',
    rawSha256: geographySourceHash,
    validationStatus: 'passed' as const,
    validationReport: [
      'Canonical IDs are namespaced and unique.',
      'Places in v1 are OMB principal cities of metropolitan CBSAs.',
      'County-equivalent GEOIDs use Census 2024 geography, including Connecticut planning regions.',
    ],
    states: geographyRaw.states,
    counties,
    cbsas: geographyRaw.cbsas,
    places,
    countyToCbsa: geographyRaw.countyToCbsa,
    principalCities,
  });
  geographySnapshotSchema.parse(geography);

  const acs = sealNormalizedSnapshot({
    schemaVersion: '1.0.0' as const,
    adapterVersion: 'census-acs5-table-based-v1.0.0' as const,
    snapshotId: 'census-acs5-2024-v1',
    provider: 'U.S. Census Bureau' as const,
    datasetId: 'census-acs5' as const,
    observationPeriod: '2024' as const,
    release: 'ACS 5-Year 2024' as const,
    surveyYears: '2020-2024' as const,
    sourceStatus: 'final' as const,
    fetchedAt,
    verifiedAt: fetchedAt,
    publishedAt: '2025-12-11T00:00:00.000Z',
    sourceUrl: 'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/',
    attribution: 'ACS 5-Year 2024 table-based summary file. Estimates, not live counts. Median household income is context, not the user’s salary.',
    variables: acsRaw.variables,
    rawSha256: acsSourceHash,
    validationStatus: 'passed' as const,
    validationReport: [
      'Census sentinel values were stored as null, not zero.',
      'Ingested B01003_001 (population) and B19013_001 (median household income) only.',
      'MOE preserved when the Census file supplies a non-sentinel margin.',
    ],
    rows: acsRaw.rows,
  });
  censusAcsSnapshotSchema.parse(acs);

  const bea = sealNormalizedSnapshot({
    schemaVersion: '1.0.0' as const,
    adapterVersion: 'bea-rpp-v1.0.0' as const,
    snapshotId: 'bea-rpp-2024-v1',
    provider: 'U.S. Bureau of Economic Analysis' as const,
    datasetId: 'bea-rpp' as const,
    observationPeriod: '2024' as const,
    referenceYear: 2024 as const,
    sourceStatus: 'final' as const,
    fetchedAt,
    verifiedAt: fetchedAt,
    publishedAt: '2026-02-19T00:00:00.000Z',
    sourceUrl: 'https://apps.bea.gov/regional/zip/SARPP.zip',
    metroSourceUrl: 'https://apps.bea.gov/regional/zip/MARPP.zip',
    attribution: 'BEA Regional Price Parities for 2024. 100 = U.S. average price level that year. RPP is a spatial index, not a household budget and not an inflation time series.',
    national: 100 as const,
    notInflation: true as const,
    categories: ['allItems', 'goods', 'housingRents', 'utilities', 'otherServices'] as const,
    rawSha256: beaSourceHash,
    validationStatus: 'passed' as const,
    validationReport: [
      'National all-items RPP is 100.',
      'State and metro rows use official GeoFIPS codes, not names.',
      'RPP is not treated as a year-over-year inflation series.',
    ],
    states: beaRaw.states,
    metros: beaRaw.metros,
    nonmetroUs: beaRaw.nonmetroUs,
  });
  beaRppSnapshotSchema.parse(bea);

  const usda = sealNormalizedSnapshot({
    schemaVersion: '1.0.0' as const,
    adapterVersion: 'usda-food-plans-v1.0.0' as const,
    snapshotId: 'usda-food-plans-2026-07-v1',
    provider: 'U.S. Department of Agriculture' as const,
    datasetId: 'usda-food-plans' as const,
    observationPeriod: '2026-07',
    reportMonth: '2026-07',
    sourceStatus: 'final' as const,
    fetchedAt,
    verifiedAt: fetchedAt,
    publishedAt: '2026-08-01T00:00:00.000Z',
    sourceUrl: 'https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-monthly-reports',
    attribution: 'USDA Food Plans: Cost of Food Report, July 2026. Food prepared and consumed at home. Not restaurant spending.',
    unit: 'monthly-usd' as const,
    defaultPlan: 'moderate-cost' as const,
    rawSha256: usdaSourceHash,
    validationStatus: 'passed' as const,
    validationReport: [
      'Official household-size multipliers are encoded (1 person +20% through 7+ −10%).',
      'Alaska/Hawaii official extras are Thrifty reference-family only.',
      'Costs are monthly USD for people in four-person households before the size adjustment.',
    ],
    plans: usdaRaw.plans,
    householdSizeAdjustment: usdaRaw.householdSizeAdjustment,
    alaskaHawaii: usdaRaw.alaskaHawaii,
  });
  usdaFoodSnapshotSchema.parse(usda);

  function hudSnapshot(
    payload: Record<string, unknown>,
    snapshotId: string,
    sourceStatus: 'revised' | 'final',
    rawSha: string,
  ) {
    const sealed = sealNormalizedSnapshot({
      schemaVersion: '1.0.0' as const,
      adapterVersion: 'hud-fmr-county-v1.0.0' as const,
      snapshotId,
      provider: 'U.S. Department of Housing and Urban Development' as const,
      datasetId: 'hud-fmr' as const,
      observationPeriod: String(payload.fiscalYear),
      fiscalYear: payload.fiscalYear as number,
      sourceStatus,
      fetchedAt,
      verifiedAt: fetchedAt,
      publishedAt: payload.publishedAt as string,
      effectiveFrom: payload.effectiveFrom as string,
      effectiveTo: payload.effectiveTo as string,
      revisionId: payload.revisionId as string,
      sourceUrl: payload.sourceUrl as string,
      sourceDocumentationUrl: 'https://www.huduser.gov/portal/datasets/fmr.html',
      attribution: 'HUD Fair Market Rents from the official county-level FMR workbook. Gross rent, 40th percentile, including most tenant-paid utilities.',
      semantics: payload.semantics as string,
      rawSha256: rawSha,
      validationStatus: 'passed' as const,
      validationReport: [
        'HUD area identity uses official hud_area_code, not city names.',
        'County maps are unique where HUD assigns one FMR area; split counties remain explicit.',
        'Bedroom values are monthly gross-rent benchmarks, not asking rents.',
      ],
      areas: payload.areas,
      countyMaps: payload.countyMaps,
      ambiguousCounties: payload.ambiguousCounties,
    });
    return hudFmrSnapshotSchema.parse(sealed);
  }

  const hud2026 = hudSnapshot(hud2026Raw, 'hud-fmr-fy2026-revised-2026-05-21-v1', 'revised', hud2026Hash);
  const hud2027 = hudSnapshot(hud2027Raw, 'hud-fmr-fy2027-v1', 'final', hud2027Hash);

  await promoteStandard({
    dataDirectory: path.join(root, 'data/geography'),
    snapshot: geography,
    normalizedFileName: 'geography.normalized.json',
    rawRelativePath: path.join('raw', 'census-omb-2024.json'),
    rawContents: `${JSON.stringify({ sourceHash: geographySourceHash, files: ['2024 Gazetteer', 'OMB Bulletin 23-01'] }, null, 2)}\n`,
  });
  await promoteStandard({
    dataDirectory: path.join(root, 'data/census-acs'),
    snapshot: acs,
    normalizedFileName: 'acs5.normalized.json',
    rawRelativePath: path.join('raw', '2024.json'),
    rawContents: `${JSON.stringify({ sourceHash: acsSourceHash, tables: ['B01003', 'B19013'] }, null, 2)}\n`,
  });
  await promoteStandard({
    dataDirectory: path.join(root, 'data/bea-rpp'),
    snapshot: bea,
    normalizedFileName: 'rpp.normalized.json',
    rawRelativePath: path.join('raw', '2024.json'),
    rawContents: `${JSON.stringify({ sourceHash: beaSourceHash, files: ['SARPP.zip', 'MARPP.zip'] }, null, 2)}\n`,
  });
  await promoteStandard({
    dataDirectory: path.join(root, 'data/usda-food'),
    snapshot: usda,
    normalizedFileName: 'food-plans.normalized.json',
    rawRelativePath: path.join('raw', '2026-07.json'),
    rawContents: `${JSON.stringify({ sourceHash: usdaSourceHash, table: usdaRaw }, null, 2)}\n`,
  });

  const hudDir = path.join(root, 'data/hud-fmr');
  await mkdir(path.join(hudDir, 'raw'), { recursive: true });
  await mkdir(path.join(hudDir, 'snapshots'), { recursive: true });
  await copyFile(path.join(cache, 'FY26_FMRs_revised.xlsx'), path.join(hudDir, 'raw', 'fy2026.xlsx'));
  await copyFile(path.join(cache, 'FY27_FMRs.xlsx'), path.join(hudDir, 'raw', 'fy2027.xlsx'));
  await writeImmutable(path.join(hudDir, 'snapshots', `${hud2026.snapshotId}.json`), `${JSON.stringify(hud2026, null, 2)}\n`);
  await writeImmutable(path.join(hudDir, 'snapshots', `${hud2027.snapshotId}.json`), `${JSON.stringify(hud2027, null, 2)}\n`);
  await atomicWrite(path.join(hudDir, 'fy2026.normalized.json'), `${JSON.stringify(hud2026, null, 2)}\n`);
  await atomicWrite(path.join(hudDir, 'fmr.normalized.json'), `${JSON.stringify(hud2027, null, 2)}\n`);
  await atomicWrite(path.join(hudDir, 'manifest.json'), manifestTextFor(hud2027));
  await atomicWrite(path.join(hudDir, 'current.json'), currentEnvelopeTextFor(hud2027));
  const releases: HudRelease[] = [
    {
      snapshotId: hud2026.snapshotId,
      fiscalYear: hud2026.fiscalYear,
      publishedAt: hud2026.publishedAt,
      effectiveFrom: hud2026.effectiveFrom,
      effectiveTo: hud2026.effectiveTo,
      revisionId: hud2026.revisionId,
      latestPublished: false,
    },
    {
      snapshotId: hud2027.snapshotId,
      fiscalYear: hud2027.fiscalYear,
      publishedAt: hud2027.publishedAt,
      effectiveFrom: hud2027.effectiveFrom,
      effectiveTo: hud2027.effectiveTo,
      revisionId: hud2027.revisionId,
      latestPublished: true,
    },
  ];
  await atomicWrite(path.join(hudDir, 'releases.json'), `${JSON.stringify({ schemaVersion: '1.0.0', releases }, null, 2)}\n`);

  console.log(`Promoted ${geography.snapshotId}, ${acs.snapshotId}, ${bea.snapshotId}, ${usda.snapshotId}, ${hud2026.snapshotId}, ${hud2027.snapshotId}.`);
}

await main();
