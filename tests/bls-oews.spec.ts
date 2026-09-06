import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATE_CODES, type StateCode } from '@/lib/location/states';
// Declared `unknown` so the compiler does not infer a literal type for 582 KB
// on every run; parsed through the schema here, which is what the assertions
// are actually about.
import oewsIndexRaw from '@/data/bls-oews/index.json';
import oewsManifestFixture from '@/data/bls-oews/manifest.json';
import {
  blsOewsIndexSchema,
  isResidualOccupationTitle,
  oewsDisplayTitle,
  blsOewsWagesSchema,
  deriveOewsIndex,
  deriveOewsWages,
  findOewsRow,
  verifyOewsWagesRoundTrip,
  isPageWorthyEstimate,
  normalizeOewsWorkbooks,
  oewsOccupationSlug,
  oewsReferenceLabel,
  type BlsOewsSnapshot,
  type OewsTable,
} from '@/lib/data/bls-oews';
import { validateOewsIndex } from '@/lib/data/verify';
import {
  getOewsEstimate,
  getOewsEstimatesForArea,
  getOewsOccupationBySlug,
  oewsOccupationsForArea,
  oewsPageWorthyPairs,
  oewsPublishesWage,
  oewsStatesForOccupation,
} from '@/lib/data/bls-oews-snapshot';
import { readWorkbook } from '../scripts/xlsx';
import { readZipEntries } from '../scripts/zip';

const HEADER = [
  'AREA', 'AREA_TITLE', 'AREA_TYPE', 'PRIM_STATE', 'NAICS', 'NAICS_TITLE', 'I_GROUP', 'OWN_CODE',
  'OCC_CODE', 'OCC_TITLE', 'O_GROUP', 'TOT_EMP', 'EMP_PRSE', 'JOBS_1000', 'LOC_QUOTIENT',
  'PCT_TOTAL', 'PCT_RPT', 'H_MEAN', 'A_MEAN', 'MEAN_PRSE',
  'H_PCT10', 'H_PCT25', 'H_MEDIAN', 'H_PCT75', 'H_PCT90',
  'A_PCT10', 'A_PCT25', 'A_MEDIAN', 'A_PCT75', 'A_PCT90', 'ANNUAL', 'HOURLY',
];

type RowOverrides = Partial<Record<(typeof HEADER)[number], string | null>>;

function row(overrides: RowOverrides): (string | null)[] {
  const base: Record<string, string | null> = {
    AREA: '48', AREA_TITLE: 'Texas', AREA_TYPE: '2', PRIM_STATE: 'TX',
    NAICS: '000000', NAICS_TITLE: 'Cross-industry', I_GROUP: 'cross-industry', OWN_CODE: '1235',
    OCC_CODE: '29-1141', OCC_TITLE: 'Registered Nurses', O_GROUP: 'detailed',
    TOT_EMP: '271380', EMP_PRSE: '1.2', JOBS_1000: '19.287', LOC_QUOTIENT: '0.89',
    PCT_TOTAL: null, PCT_RPT: null, H_MEAN: '45.86', A_MEAN: '95380', MEAN_PRSE: '0.4',
    H_PCT10: '32.27', H_PCT25: '38.06', H_MEDIAN: '46.14', H_PCT75: '50.53', H_PCT90: '61.51',
    A_PCT10: '67120', A_PCT25: '79170', A_MEDIAN: '95970', A_PCT75: '105100', A_PCT90: '127950',
    ANNUAL: '', HOURLY: '',
  };
  return HEADER.map((column) => (column in overrides ? overrides[column] ?? null : base[column]));
}

/**
 * Enough national occupations to clear the completeness gate.
 *
 * The normalizer refuses a release carrying fewer than 700 detailed
 * occupations, which is what would catch a truncated download. Padding the
 * fixture to a realistic size keeps that check doing its job in production
 * rather than weakening it so a test can stay small.
 */
function fillerNationalRows(count = 750): (string | null)[][] {
  return Array.from({ length: count }, (_unused, offset) => row({
    AREA: '99', AREA_TITLE: 'U.S.', AREA_TYPE: '1', PRIM_STATE: 'US',
    OCC_CODE: `19-${String(1000 + offset).padStart(4, '0')}`,
    OCC_TITLE: `Filler Occupation ${offset}`,
  }));
}

/**
 * Every state's all-occupations row, which a release has to carry before any
 * check about one occupation can be reached.
 */
function stateTotals(except?: StateCode): (string | null)[][] {
  return STATE_CODES.filter((state) => state !== except).map((state) => row({
    AREA_TITLE: state, PRIM_STATE: state,
    OCC_CODE: '00-0000', OCC_TITLE: 'All Occupations', O_GROUP: 'total',
  }));
}

/** A complete synthetic release, with `stateRows` layered on top of the totals. */
function tables(stateRows: (string | null)[][]): { national: OewsTable; state: OewsTable } {
  const nationalTotal = row({ AREA: '99', AREA_TITLE: 'U.S.', AREA_TYPE: '1', PRIM_STATE: 'US', OCC_CODE: '00-0000', OCC_TITLE: 'All Occupations', O_GROUP: 'total' });
  const nationalDetail = row({ AREA: '99', AREA_TITLE: 'U.S.', AREA_TYPE: '1', PRIM_STATE: 'US' });
  const nationalPractitioner = row({ AREA: '99', AREA_TITLE: 'U.S.', AREA_TYPE: '1', PRIM_STATE: 'US', OCC_CODE: '29-1171', OCC_TITLE: 'Nurse Practitioners' });
  return {
    national: { header: HEADER, rows: [nationalTotal, nationalDetail, nationalPractitioner, ...fillerNationalRows()] },
    state: { header: HEADER, rows: [...stateTotals(), ...stateRows] },
  };
}

const NORMALIZE_INPUT = {
  observationPeriod: '2025-05',
  fetchedAt: '2026-09-04T00:00:00.000Z',
  publishedAt: '2026-05-15T13:19:24.000Z',
  rawSha256: 'a'.repeat(64),
  sourceUrl: 'https://www.bls.gov/oes/special-requests/oesm25st.zip',
  nationalSourceUrl: 'https://www.bls.gov/oes/special-requests/oesm25nat.zip',
};

const oewsIndexFixture = oewsIndexRaw as {
  nationalCoverage: number[];
  occupations: Array<{ code: string; residual: boolean; group: string }>;
  coverageByState: Record<string, number[]>;
};

describe('OEWS occupation slugs', () => {
  it('turns punctuation into single hyphens and keeps the ampersand readable', () => {
    expect(oewsOccupationSlug('Registered Nurses')).toBe('registered-nurses');
    expect(oewsOccupationSlug('Elementary School Teachers, Except Special Education'))
      .toBe('elementary-school-teachers-except-special-education');
    expect(oewsOccupationSlug('Sales & Related')).toBe('sales-and-related');
    expect(oewsOccupationSlug('First-Line Supervisors of Retail Sales Workers'))
      .toBe('first-line-supervisors-of-retail-sales-workers');
  });

  it('spells the ampersand out, the way a reader would type it', () => {
    expect(oewsOccupationSlug('Sales & Related')).toBe(oewsOccupationSlug('Sales and Related'));
  });

  it('fails the release rather than letting two occupations share a URL', () => {
    expect(() => normalizeOewsWorkbooks({
      ...tables([
        row({ OCC_CODE: '41-3091', OCC_TITLE: 'Sales & Related' }),
        row({ OCC_CODE: '41-3099', OCC_TITLE: 'Sales and Related' }),
      ]),
      ...NORMALIZE_INPUT,
    })).toThrow(/both slug to "sales-and-related"/);
  });
});

describe('OEWS reference labels', () => {
  it('names the survey month', () => {
    expect(oewsReferenceLabel('2025-05')).toBe('May 2025');
  });

  it('rejects a period that is not a month', () => {
    expect(() => oewsReferenceLabel('2025')).toThrow(/Invalid OEWS observation period/);
  });
});

describe('OEWS normalization', () => {
  it('reads a published row into wages, employment and concentration', () => {
    const snapshot = normalizeOewsWorkbooks({ ...tables([row({})]), ...NORMALIZE_INPUT });
    const texas = snapshot.estimates.find((estimate) => estimate.area === 'TX' && estimate.occCode === '29-1141');
    expect(texas).toMatchObject({
      occCode: '29-1141',
      employment: 271_380,
      annualMean: 95_380,
      hourlyMean: 45.86,
      locationQuotient: 0.89,
      wageBasis: 'both',
      atOrAboveWageCap: false,
    });
    expect(texas?.annual.median).toBe(95_970);
    expect(snapshot.snapshotId).toBe('bls-oews-2025-05-v1');
  });

  it('stores a suppressed wage as absent rather than zero', () => {
    const snapshot = normalizeOewsWorkbooks({
      ...tables([row({ A_MEDIAN: '*', H_MEDIAN: '*', TOT_EMP: '**' })]),
      ...NORMALIZE_INPUT,
    });
    const texas = snapshot.estimates.find((estimate) => estimate.area === 'TX' && estimate.occCode === '29-1141');
    expect(texas?.annual.median).toBeNull();
    expect(texas?.employment).toBeNull();
    expect(texas?.atOrAboveWageCap).toBe(false);
  });

  it('flags a top-coded wage instead of writing the cap in as the estimate', () => {
    const snapshot = normalizeOewsWorkbooks({
      ...tables([row({ A_MEAN: '#', H_MEAN: '#', A_PCT90: '#', H_PCT90: '#' })]),
      ...NORMALIZE_INPUT,
    });
    const texas = snapshot.estimates.find((estimate) => estimate.area === 'TX' && estimate.occCode === '29-1141');
    expect(texas?.annualMean).toBeNull();
    expect(texas?.annual.p90).toBeNull();
    expect(texas?.atOrAboveWageCap).toBe(true);
  });

  it('records an annual-only occupation without inventing an hourly wage', () => {
    const snapshot = normalizeOewsWorkbooks({
      ...tables([row({
        ANNUAL: 'TRUE', H_MEAN: '', H_PCT10: '', H_PCT25: '', H_MEDIAN: '', H_PCT75: '', H_PCT90: '',
      })]),
      ...NORMALIZE_INPUT,
    });
    const texas = snapshot.estimates.find((estimate) => estimate.area === 'TX' && estimate.occCode === '29-1141');
    expect(texas?.wageBasis).toBe('annual-only');
    expect(texas?.hourly.median).toBeNull();
    expect(texas?.annual.median).toBe(95_970);
  });

  it('refuses percentiles that do not ascend', () => {
    expect(() => normalizeOewsWorkbooks({
      ...tables([row({ A_PCT75: '60000' })]),
      ...NORMALIZE_INPUT,
    })).toThrow(/percentiles are not in ascending order/);
  });

  it('refuses a release whose annual and hourly wages stop agreeing on a 2,080-hour year', () => {
    expect(() => normalizeOewsWorkbooks({
      ...tables([row({ A_MEAN: '190760' })]),
      ...NORMALIZE_INPUT,
    })).toThrow(/hour year/);
  });

  it('refuses a wage outside the plausible range', () => {
    expect(() => normalizeOewsWorkbooks({
      ...tables([row({ A_MEAN: '4000000', H_MEAN: '1923.08' })]),
      ...NORMALIZE_INPUT,
    })).toThrow(/outside the plausible range/);
  });

  it('refuses a release that drops a state', () => {
    expect(() => normalizeOewsWorkbooks({
      national: tables([]).national,
      state: { header: HEADER, rows: stateTotals('CA') },
      ...NORMALIZE_INPUT,
    })).toThrow(/missing every estimate for CA/);
  });

  it('refuses a workbook that has lost a column', () => {
    const truncated = HEADER.slice(0, 10);
    expect(() => normalizeOewsWorkbooks({
      national: { header: truncated, rows: [] },
      state: { header: HEADER, rows: [] },
      ...NORMALIZE_INPUT,
    })).toThrow(/missing columns/);
  });

  it('ignores industry detail so occupations cannot be double counted', () => {
    const snapshot = normalizeOewsWorkbooks({
      ...tables([row({}), row({ I_GROUP: 'sector', NAICS: '620000', TOT_EMP: '9999' })]),
      ...NORMALIZE_INPUT,
    });
    expect(snapshot.estimates.filter((estimate) => estimate.area === 'TX' && estimate.occCode === '29-1141')).toHaveLength(1);
  });
});

describe('OEWS page index', () => {
  it('covers only occupations with both a wage and an employment count', () => {
    const snapshot = normalizeOewsWorkbooks({
      ...tables([
        row({}),
        row({ OCC_CODE: '29-1171', OCC_TITLE: 'Nurse Practitioners', A_MEDIAN: '*', H_MEDIAN: '*', A_MEAN: '*', H_MEAN: '*', A_PCT10: '*', A_PCT25: '*', A_PCT75: '*', A_PCT90: '*', H_PCT10: '*', H_PCT25: '*', H_PCT75: '*', H_PCT90: '*' }),
      ]),
      ...NORMALIZE_INPUT,
    });
    const index = deriveOewsIndex({ ...snapshot, normalizedSha256: 'b'.repeat(64) } as BlsOewsSnapshot);
    const covered = index.coverageByState.TX.map((position) => index.occupations[position].code);
    expect(covered).toEqual(['29-1141']);
  });

  it('never treats a major group or the all-occupations total as its own page', () => {
    const occupation = {
      code: '29-0000',
      title: 'Healthcare Practitioners',
      displayTitle: 'Healthcare Practitioners',
      slug: 'healthcare-practitioners',
      residual: false,
      group: 'major' as const,
      majorCode: '29-0000',
    };
    const estimate = {
      area: 'TX' as const, occCode: '29-0000', employment: 100, jobsPer1000: null, locationQuotient: null,
      hourlyMean: 40, annualMean: 83_200,
      hourly: { p10: 20, p25: 30, median: 40, p75: 50, p90: 60 },
      annual: { p10: 41_600, p25: 62_400, median: 83_200, p75: 104_000, p90: 124_800 },
      wageBasis: 'both' as const, atOrAboveWageCap: false,
    };
    expect(isPageWorthyEstimate(estimate, occupation)).toBe(false);
    expect(isPageWorthyEstimate(estimate, { ...occupation, group: 'detailed' })).toBe(true);
    // A residual bucket has real figures and still gets no page of its own.
    expect(isPageWorthyEstimate(estimate, { ...occupation, group: 'detailed', residual: true })).toBe(false);
  });
});

describe('the promoted OEWS release', () => {
  it('ships an index that describes the promoted manifest', () => {
    expect(() => validateOewsIndex(oewsIndexFixture, oewsManifestFixture)).not.toThrow();
    const index = blsOewsIndexSchema.parse(oewsIndexFixture);
    expect(index.observationPeriod).toBe('2025-05');
    expect(index.referenceLabel).toBe('May 2025');
  });

  it('resolves an occupation by the slug its page URL will use', () => {
    const nurses = getOewsOccupationBySlug('registered-nurses');
    expect(nurses?.code).toBe('29-1141');
    expect(getOewsOccupationBySlug('not-an-occupation')).toBeUndefined();
  });

  it('agrees with itself about which pairs are publishable', () => {
    expect(oewsPublishesWage('TX', '29-1141')).toBe(true);
    expect(oewsPublishesWage('TX', '00-0000')).toBe(false);
    expect(oewsStatesForOccupation('29-1141')).toContain('TX');
    const texas = oewsOccupationsForArea('TX');
    expect(texas.every((occupation) => occupation.group === 'detailed')).toBe(true);
    expect(oewsPageWorthyPairs().length).toBe(
      Object.values(blsOewsIndexSchema.parse(oewsIndexFixture).coverageByState)
        .reduce((total, indexes) => total + indexes.length, 0),
    );
  });
});

describe('the archive and workbook readers', () => {
  const archive = new Uint8Array(readFileSync(path.join(process.cwd(), 'data', 'bls-oews', 'raw', 'oesm25nat.zip')));

  it('reads the one workbook out of the official archive', () => {
    const entries = [...readZipEntries(archive)];
    expect(entries.map(([name]) => name)).toEqual(['oesm25nat/national_M2025_dl.xlsx']);
  });

  it('reads the official workbook back into the columns OEWS documents', () => {
    const workbook = readWorkbook(readZipEntries(archive).get('oesm25nat/national_M2025_dl.xlsx')!);
    expect(workbook.sheetNames).toContain('national_M2025_dl');
    const iterator = workbook.rows('national_M2025_dl');
    expect(iterator.next().value).toEqual(HEADER);
    const first = iterator.next().value as string[];
    expect(first[HEADER.indexOf('OCC_TITLE')]).toBe('All Occupations');
    expect(first[HEADER.indexOf('PRIM_STATE')]).toBe('US');
  });

  it('rejects bytes that are not an archive', () => {
    expect(() => readZipEntries(new Uint8Array([1, 2, 3, 4]))).toThrow(/Not a ZIP archive/);
  });

  it('rejects an archive whose compressed bytes have been altered', () => {
    const tampered = archive.slice();
    tampered[Math.floor(tampered.length / 2)] ^= 0xff;
    expect(() => readZipEntries(tampered)).toThrow();
  });
});

describe('packed OEWS wage columns', () => {
  const snapshot = {
    ...normalizeOewsWorkbooks({ ...tables([row({})]), ...NORMALIZE_INPUT }),
    normalizedSha256: 'c'.repeat(64),
  } as BlsOewsSnapshot;

  it('reproduces every value of the release it was packed from', () => {
    const wages = blsOewsWagesSchema.parse(deriveOewsWages(snapshot));
    expect(() => verifyOewsWagesRoundTrip(snapshot, wages)).not.toThrow();
    expect(wages.rowCount).toBe(snapshot.estimates.length);
    expect(wages.areas[0]).toBe('US');
    expect(wages.areaOffsets.at(-1)).toBe(wages.rowCount);
  });

  it('refuses to pack a wage that would not survive the scaling', () => {
    const finerThanCents = normalizeOewsWorkbooks({
      ...tables([row({ H_MEAN: '45.865' })]),
      ...NORMALIZE_INPUT,
    });
    expect(() => deriveOewsWages({ ...finerThanCents, normalizedSha256: 'c'.repeat(64) } as BlsOewsSnapshot))
      .toThrow(/does not survive packing/);
  });

  it('reports a pair the release never published', () => {
    const wages = deriveOewsWages(snapshot);
    const nurses = snapshot.occupations.findIndex((occupation) => occupation.code === '29-1141');
    expect(findOewsRow(wages, 'TX', nurses)).toBeGreaterThanOrEqual(0);
    expect(findOewsRow(wages, 'ZZ', nurses)).toBe(-1);
    expect(findOewsRow(wages, 'TX', snapshot.occupations.length + 5)).toBe(-1);
  });
});

describe('wages read back out of the promoted release', () => {
  it('returns the figures BLS published for Texas registered nurses', () => {
    const nurses = getOewsEstimate('TX', '29-1141');
    expect(nurses).toMatchObject({
      area: 'TX',
      occCode: '29-1141',
      employment: 271_380,
      annualMean: 95_380,
      hourlyMean: 45.86,
      jobsPer1000: 19.287,
      locationQuotient: 0.89,
      wageBasis: 'both',
      atOrAboveWageCap: false,
    });
    expect(nurses?.annual).toEqual({ p10: 67_120, p25: 79_170, median: 95_970, p75: 105_100, p90: 127_950 });
    expect(nurses?.hourly).toEqual({ p10: 32.27, p25: 38.06, median: 46.14, p75: 50.53, p90: 61.51 });
  });

  it('has a national estimate to compare a state against', () => {
    const national = getOewsEstimate('US', '29-1141');
    expect(national?.area).toBe('US');
    expect(national?.annual.median).toBeGreaterThan(0);
  });

  it('answers nothing for an occupation that does not exist', () => {
    expect(getOewsEstimate('TX', '99-9999')).toBeUndefined();
  });

  it('returns the whole published set for an area, in the order the index promises', () => {
    const wyoming = getOewsEstimatesForArea('WY');
    expect(wyoming.length).toBeGreaterThan(300);
    expect(wyoming.every((estimate) => estimate.area === 'WY')).toBe(true);
    const codes = wyoming.map((estimate) => estimate.occCode);
    expect([...codes].sort((left, right) => left.localeCompare(right))).toEqual(codes);
  });

  it('reads every covered pair the index advertises', () => {
    for (const { state, occupation } of oewsPageWorthyPairs().slice(0, 500)) {
      const estimate = getOewsEstimate(state, occupation.code);
      expect(estimate, `${state} ${occupation.code}`).toBeDefined();
      expect(estimate?.employment).not.toBeNull();
    }
  });
});

describe('occupation titles for headings and URLs', () => {
  it('drops the classification clause and keeps the job', () => {
    expect(oewsDisplayTitle('Elementary School Teachers, Except Special Education')).toBe('Elementary School Teachers');
    expect(oewsDisplayTitle('Secretaries and Administrative Assistants, Except Legal, Medical, and Executive'))
      .toBe('Secretaries and Administrative Assistants');
    expect(oewsDisplayTitle('Electronics Engineers, Except Computer')).toBe('Electronics Engineers');
  });

  it('leaves a compound title that genuinely names several jobs', () => {
    const compound = 'Grinding, Lapping, Polishing, and Buffing Machine Tool Setters, Operators, and Tenders, Metal and Plastic';
    expect(oewsDisplayTitle(compound)).toBe(compound);
    expect(oewsDisplayTitle('Registered Nurses')).toBe('Registered Nurses');
  });

  it('recognises a residual bucket by its suffix, not by a substring', () => {
    expect(isResidualOccupationTitle('Sales and Related Workers, All Other')).toBe(true);
    expect(isResidualOccupationTitle('Engineering Technologists and Technicians, Except Drafters, All Other')).toBe(true);
    expect(isResidualOccupationTitle('Registered Nurses')).toBe(false);
  });

  it('never gives a residual bucket a page in the promoted release', () => {
    const covered = new Set(oewsIndexFixture.nationalCoverage);
    const residuals = oewsIndexFixture.occupations
      .map((occupation, position) => ({ occupation, position }))
      .filter(({ occupation }) => occupation.residual);
    expect(residuals.length).toBeGreaterThan(50);
    expect(residuals.some(({ position }) => covered.has(position))).toBe(false);
  });
});
