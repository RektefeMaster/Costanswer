/**
 * Build Job Cost tier-2 snapshots from retained official files.
 *
 * ECEC: BLS Table 4, private construction industry, March 2026.
 * PPI: BLS public API commodity series, 2024–2026.
 * FEMA: 2025 Schedule of Equipment Rates, transcribed subset used by V1 recipes.
 * Material basket: sourced national baselines only. Unpriced critical lines stay incomplete.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sealNormalizedSnapshot, sha256 } from './ingest-io';

const root = process.cwd();
const fetchedAt = new Date().toISOString();

function readRaw(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

function requireContains(label: string, text: string, needles: readonly string[]): void {
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${label} is missing ${JSON.stringify(needle)}.`);
  }
}

function writeSnapshot(relativePath: string, snapshot: object): void {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);
}

function ingestEcec(): void {
  const rawPath = join(root, 'data/bls-ecec/raw/ecec-t04-2026-03.html');
  const raw = readFileSync(rawPath, 'utf8');
  const rawSha256 = sha256(raw);
  const totalCompensationHourly = 51.23;
  const wagesAndSalariesHourly = 35.54;
  if (!raw.includes('Construction industry') || !raw.includes('51.23') || !raw.includes('35.54')) {
    throw new Error('ECEC Table 4 HTML no longer contains the transcribed construction row.');
  }
  const loadingFactor = Number((totalCompensationHourly / wagesAndSalariesHourly).toFixed(4));
  if (loadingFactor < 1.25 || loadingFactor > 1.65) throw new Error(`ECEC loading factor ${loadingFactor} is outside 1.25–1.65.`);
  const sealed = sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'bls-ecec-construction-v1.0.0',
    snapshotId: 'bls-ecec-2026-03-v1',
    datasetId: 'bls-ecec' as const,
    observationPeriod: '2026-03',
    fetchedAt,
    publishedAt: '2026-06-12T00:00:00.000Z',
    sourceUrl: 'https://www.bls.gov/news.release/ecec.t04.htm',
    sourceDocumentationUrl: 'https://www.bls.gov/news.release/ecec.toc.htm',
    attribution: 'U.S. Bureau of Labor Statistics, Employer Costs for Employee Compensation, private industry, construction, March 2026.',
    industry: 'construction' as const,
    totalCompensationHourly,
    wagesAndSalariesHourly,
    loadingFactor,
    rawSha256,
    validationReport: [
      'Construction industry total compensation $51.23 and wages $35.54 from Table 4 (March 2026).',
      `Loading factor ${loadingFactor} = total compensation / wages and salaries.`,
      'This loading is a national industry model, not a local contractor wage.',
    ],
  });
  writeSnapshot('data/bls-ecec/current.json', sealed);
}

function ingestPpi(): void {
  const rawPath = join(root, 'data/bls-ppi/raw/ppi-api-2022-2026.json');
  const raw = readFileSync(rawPath, 'utf8');
  const payload = JSON.parse(raw) as {
    status?: string;
    Results?: { series?: Array<{ seriesID: string; data?: Array<{ year: string; period: string; value: string }> }> };
  };
  if (payload.status !== 'REQUEST_SUCCEEDED') throw new Error('PPI API raw file did not succeed.');
  const series: Record<string, { seriesId: string; observations: Array<{ period: string; index: number }> }> = {};
  for (const row of payload.Results?.series ?? []) {
    const observations = (row.data ?? [])
      .filter((point) => point.period.startsWith('M') && point.value !== '-' && point.value !== '.')
      .map((point) => ({ period: `${point.year}-${point.period.slice(1)}`, index: Number(point.value) }))
      .filter((point) => Number.isFinite(point.index) && point.index > 0)
      .sort((left, right) => left.period.localeCompare(right.period));
    if (observations.length === 0) continue;
    series[row.seriesID] = { seriesId: row.seriesID, observations };
  }
  const latest = Object.values(series).flatMap((entry) => entry.observations.map((obs) => obs.period)).sort().at(-1);
  if (!latest) throw new Error('PPI snapshot has no observations.');
  const sealed = sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'bls-ppi-commodity-v1.0.0',
    snapshotId: `bls-ppi-${latest}-v1`,
    datasetId: 'bls-ppi' as const,
    observationPeriod: latest,
    fetchedAt,
    publishedAt: `${latest}-01T00:00:00.000Z`,
    sourceUrl: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    sourceDocumentationUrl: 'https://www.bls.gov/ppi/',
    attribution: 'U.S. Bureau of Labor Statistics, Producer Price Index commodity series.',
    series,
    rawSha256: sha256(raw),
    validationReport: [
      `${Object.keys(series).length} commodity series with positive monthly indexes.`,
      'Missing series are frozen at ratio 1.0 and labelled at estimate time.',
    ],
  });
  writeSnapshot('data/bls-ppi/current.json', sealed);
}

function ingestFema(): void {
  const rawPath = join(root, 'data/fema-equipment/raw/fema-schedule-equipment-rates-2025-page.txt');
  const raw = readFileSync(rawPath, 'utf8');
  const rates = [
    { rateId: '8201', description: 'Chipper, Brush — Vermeer BC1000XL', unit: 'hour' as const, rateCents: 2970 },
    { rateId: '8414', description: 'Truck, Concrete Mixer — Freightliner 114SD 11 CY', unit: 'hour' as const, rateCents: 8176 },
    { rateId: '8510', description: 'Saw, Concrete — 14 in', unit: 'hour' as const, rateCents: 1269 },
    { rateId: '8541', description: 'Loader, Skid Steer — Bobcat S76', unit: 'hour' as const, rateCents: 4523 },
    { rateId: '8721', description: 'Truck, Dump — 9 CY', unit: 'hour' as const, rateCents: 10063 },
    { rateId: '8801', description: 'Truck, Pickup — 4x2 1/2 ton', unit: 'hour' as const, rateCents: 1751 },
  ];
  for (const rate of rates) {
    const dollars = (rate.rateCents / 100).toFixed(2);
    if (!raw.includes(rate.rateId) || !raw.includes(dollars)) {
      throw new Error(`FEMA capture is missing rate ${rate.rateId} at $${dollars}.`);
    }
  }
  const sealed = sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'fema-equipment-v1.0.0',
    snapshotId: 'fema-equipment-2025-v1',
    datasetId: 'fema-equipment' as const,
    observationPeriod: '2025',
    fetchedAt,
    publishedAt: '2025-07-01T00:00:00.000Z',
    sourceUrl: 'https://www.fema.gov/assistance/public/tools-resources/schedule-equipment-rates',
    sourceDocumentationUrl: 'https://www.fema.gov/assistance/public/tools-resources/schedule-equipment-rates',
    attribution: 'FEMA Schedule of Equipment Rates (2025). Cost proxy for ownership and operating cost; labor of the operator is not included.',
    disclaimer: 'FEMA Schedule of Equipment Rates is a public cost proxy, not a contractor market rental price.',
    rates,
    rawSha256: sha256(raw),
    validationReport: [
      `${rates.length} rates transcribed from the 2025 schedule for recipes that name them.`,
      'Each rate is greater than zero and has a known unit.',
    ],
  });
  writeSnapshot('data/fema-equipment/current.json', sealed);
}

function ingestBasket(): void {
  const eiaCac = readRaw('data/material-basket/raw/eia-appendix-a-cac-north.txt');
  const eiaFurnace = readRaw('data/material-basket/raw/eia-appendix-a-gas-furnace-north.txt');
  const eiaAshp = readRaw('data/material-basket/raw/eia-appendix-a-ashp.txt');
  const eiaGasWh = readRaw('data/material-basket/raw/eia-appendix-a-gas-storage-wh.txt');
  const eiaElectricWh = readRaw('data/material-basket/raw/eia-appendix-a-electric-storage-wh.txt');
  const nrelPanel = readRaw('data/material-basket/raw/nrel-remdb-electric-panel-200a.txt');
  const nrelEnvelope = readRaw('data/material-basket/raw/nrel-remdb-envelope-intercepts.txt');
  const nrmca = readRaw('data/material-basket/raw/nrmca-2023-industry-snapshot.txt');
  const paint = readRaw('data/material-basket/raw/epcschools-2025-paint.txt');
  const lumber = readRaw('data/material-basket/raw/westchester-lumber-2026-pt-bom.txt');
  const tile = readRaw('data/material-basket/raw/pisd-rfp-2023-027-ceramic-tile.txt');
  const kohler = readRaw('data/material-basket/raw/kohler-highline-k3999-hadron-vanity.txt');

  requireContains('EIA CAC North extract', eiaCac, ['2,700', 'coil-only', '36 kBtu/h', 'Retail Equipment Cost (2022$)']);
  requireContains('EIA gas furnace North extract', eiaFurnace, ['Residential Gas-Fired Furnaces (North)', 'Retail Equipment Cost (2022$) 1,200', 'Typical Input Capacity (kBtu/h) 80']);
  requireContains('EIA air-source heat pump extract', eiaAshp, ['Residential Air-Source Heat Pumps', 'blower-coil', 'Retail Equipment Cost (2022$) 4,270', '36 kBtu/h']);
  requireContains('EIA gas storage water heater extract', eiaGasWh, ['Residential Gas-Fired Storage Water Heaters', 'Retail Equipment Cost', '420', '990']);
  requireContains('EIA electric storage water heater extract', eiaElectricWh, ['Residential Electric Resistance Storage Water Heaters', 'Retail Equipment Cost (2022$)', '330', '760']);
  requireContains('NREL REMDB 200A panel extract', nrelPanel, ['Electric Panel | 200A', 'coef_mid=0', 'int_mid=225.08999999999997', '2023$']);
  requireContains('NREL REMDB envelope intercepts', nrelEnvelope, [
    'int_mid=54.113275397063234',
    'int_mid=55.491',
    'int_mid=41.994230000000002',
    'int_mid=77.287499999999994',
    'int_mid=6.9767530000000004',
    'int_mid=8.1136359999999996',
    'int_mid=0.48614583333333333',
    'coef_mid=0',
    'Labor multipliers',
    'data_sources=1,4',
  ]);
  requireContains('NRMCA 2023 industry snapshot', nrmca, ['400 million cubic yards delivered in 2023', 'Average 2023 selling price:', '$160 per cubic yard']);
  requireContains('EPC 2025-26 paint pricing', paint, ['May 1 , 2025', 'Interior Latex         Flat                  1 Gallon    Pittsburg/PPG', 'Speedhide EV   $16.25']);
  requireContains('Westchester PT lumber BOM', lumber, ['$1.37', '$1.11', '$1.79', '$0.90', '$485.00 per MBF', '619 cents per sq ft', '1747 cents per linear foot']);
  requireContains('PISD ceramic tile award', tile, ['Line 9 Material Only - Ceramic Tile - Per Square Foot.', 'C&C Group, LLC $3.15 Recommended']);
  requireContains('Kohler manufacturer prices', kohler, ['Current Price $343.76', 'SKU K-3999-0', 'Current Price $1,043.39', 'SKU K-39605-ASB-0']);

  const components = [
    {
      componentId: 'split-system',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 390_000,
      baselineDate: '2022-12-01',
      baselineSource: {
        name: 'EIA Appendix A, 2022 typical retail: 3-ton coil-only CAC North $2,700 + gas furnace North $1,200',
        url: 'https://www.eia.gov/analysis/studies/buildings/equipcosts/',
      },
      ppiSeriesId: 'WPU114701',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'air-source-heat-pump',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 427_000,
      baselineDate: '2022-12-01',
      baselineSource: {
        name: 'EIA Appendix A, 2022 typical retail: 3-ton blower-coil air-source heat pump $4,270',
        url: 'https://www.eia.gov/analysis/studies/buildings/equipcosts/',
      },
      ppiSeriesId: 'WPU114701',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'tank-water-heater',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 70_500,
      baselineDate: '2022-12-01',
      baselineSource: {
        name: 'EIA Appendix A, residential gas-fired storage water heater, midpoint of 2022 typical/current-standard retail span $420–$990, 40 gal',
        url: 'https://www.eia.gov/analysis/studies/buildings/equipcosts/',
      },
      ppiSeriesId: 'WPU124',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'tank-water-heater-electric',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 54_500,
      baselineDate: '2022-12-01',
      baselineSource: {
        name: 'EIA Appendix A, residential electric resistance storage water heater, midpoint of 2022 typical/current-standard retail span $330–$760, 36 gal',
        url: 'https://www.eia.gov/analysis/studies/buildings/equipcosts/',
      },
      ppiSeriesId: 'WPU124',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'service-panel-200a',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 22_509,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Electric Panel | 200A Int-Mid $225.09 (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU107',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'vinyl-window',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 5_411,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Window | Vinyl Int-Mid $54.11/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU13',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'exterior-door-fiberglass',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 5_549,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Door | Exterior Prehung, Fiberglass Int-Mid $55.49/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU07',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'exterior-door-metal',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 4_199,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Door | Exterior Prehung, Metal Int-Mid $41.99/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU101',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'exterior-door-wood',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 7_729,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Door | Exterior Prehung, Wood Int-Mid $77.29/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU081',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'vinyl-siding',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 698,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Exterior Finish | Vinyl Int-Mid $6.98/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU07',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'wood-siding',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 811,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Exterior Finish | Wood Int-Mid $8.11/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU081',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'drywall-board',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 49,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NREL REMDB 2024 Machine Read, Wall Sheathing | Drywall Int-Mid $0.49/sf (2023$). Labor multiplier ignored',
        url: 'https://data.openei.org/submissions/8336',
      },
      ppiSeriesId: 'WPU137',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'ready-mix-concrete',
      unit: 'cubic-yard' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 16_000,
      baselineDate: '2023-12-01',
      baselineSource: {
        name: 'NRMCA / Concrete Financial Insights, average 2023 ready-mix selling price $160 per cubic yard',
        url: 'https://www.nrmca.org/wp-content/uploads/Performance_Benchmarking_Survey_and_State_of_the_Industry.pdf',
      },
      ppiSeriesId: 'WPU133',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'interior-paint',
      unit: 'gallon' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 1_625,
      baselineDate: '2025-05-01',
      baselineSource: {
        name: 'Educational Purchasing Council 2025-26 paint pricing, interior latex flat 1-gallon PPG Speedhide EV $16.25 (May 1, 2025–April 30, 2026)',
        url: 'https://epcschools.org/Programs/Paints/2025Paint.pdf',
      },
      ppiSeriesId: 'WPU062',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'pressure-treated-lumber',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 619,
      baselineDate: '2026-06-01',
      baselineSource: {
        name: 'Westchester County NY RFB-WC-26106 PT lumber award, named 10×20 deck BOM $6.1924/sf (Jun–Nov 2026)',
        url: 'https://bps.westchestercountyny.gov/images/Lumber_and_Building_Materials_.pdf',
      },
      ppiSeriesId: 'WPU081',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'wood-privacy-fence',
      unit: 'linear-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 1_747,
      baselineDate: '2026-06-01',
      baselineSource: {
        name: 'Westchester County NY RFB-WC-26106, named 6 ft wood privacy BOM $17.4685/LF (Jun–Nov 2026)',
        url: 'https://bps.westchestercountyny.gov/images/Lumber_and_Building_Materials_.pdf',
      },
      ppiSeriesId: 'WPU081',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'bath-tile',
      unit: 'sq-ft' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 315,
      baselineDate: '2023-05-09',
      baselineSource: {
        name: 'Plano ISD RFP 2023-027 Line 9 material-only ceramic tile, recommended C&C Group $3.15/sf',
        url: 'https://pisd.diligent.community/document/b3782408-0db2-455c-bc7b-77191e4b14e1/',
      },
      ppiSeriesId: 'WPU134',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'toilet',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 34_376,
      baselineDate: '2026-09-07',
      baselineSource: {
        name: 'Kohler Highline K-3999-0 manufacturer current price $343.76 (2026-09-07)',
        url: 'https://www.kohler.com/en/products/toilets/shop-toilets/highline-comfort-height-two-piece-elongated-1-28-gpf-chair-height-toilet-3999',
      },
      ppiSeriesId: 'WPU1241',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
    {
      componentId: 'vanity',
      unit: 'each' as const,
      qualityTier: 'builder' as const,
      baselinePriceCents: 104_339,
      baselineDate: '2026-09-07',
      baselineSource: {
        name: 'Kohler Hadron 36-inch K-39605-ASB-0 manufacturer current price $1,043.39 (2026-09-07)',
        url: 'https://www.kohler.com/en/products/vanities/shop-vanities/hadron-36-bathroom-vanity-cabinet-w-sink-and-quartz-top-39605-asb',
      },
      ppiSeriesId: 'WPU1241',
      regionalAdjustment: 'none' as const,
      critical: true,
    },
  ];

  const sealed = sealNormalizedSnapshot({
    schemaVersion: '1.0.0',
    adapterVersion: 'material-basket-v1.0.0',
    snapshotId: 'material-basket-sourced-v4',
    datasetId: 'material-basket' as const,
    observationPeriod: '2026-09',
    fetchedAt,
    publishedAt: fetchedAt,
    attribution:
      'Sourced national baselines: EIA Appendix A (CAC+furnace, ASHP blower-coil, gas and electric storage WH midpoints); NREL REMDB 200A panel and envelope intercepts (vinyl window, prehung doors, vinyl/wood siding, drywall board); NRMCA ready-mix; EPC interior latex; Westchester County lumber award deck/fence BOMs; Plano ISD ceramic tile materials-only; Kohler manufacturer current prices.',
    components,
    rawSha256: sha256([eiaCac, eiaFurnace, eiaAshp, eiaGasWh, eiaElectricWh, nrelPanel, nrelEnvelope, nrmca, paint, lumber, tile, kohler].join('\n')),
    validationReport: [
      'Each baseline is copied from a retained extract; missing critical recipe lines stay unpriced.',
      'NREL labor multipliers and RSMeans-tinged install adders are not used.',
      'RPP is never applied to materials. Current price is baseline × PPI ratio, or 1.0 if the series is missing.',
      'Westchester lumber is a public procurement baseline, not a local NY multiplier.',
    ],
  });
  writeSnapshot('data/material-basket/current.json', sealed);
}

ingestEcec();
ingestPpi();
ingestFema();
ingestBasket();
console.log('Wrote Job Cost store snapshots.');
