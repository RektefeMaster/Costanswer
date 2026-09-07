import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import recorded from '@/data/naic-insurance/raw/2023.json';
import current from '@/data/naic-insurance/current.json';
import { assertManifestMatchesSnapshot, assertNormalizedHash } from '@/lib/data/envelope';
import { getInsuranceStateRate, insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { naicInsuranceSnapshotSchema, normalizeNaicInsuranceRecorded } from '@/lib/data/naic-insurance';
import { STATE_CODES } from '@/lib/location/states';
import { sealNormalizedSnapshot, sha256 } from '../scripts/ingest-io';

const normalize = (value: unknown = recorded) => sealNormalizedSnapshot(normalizeNaicInsuranceRecorded(value, { rawSha256: current.snapshot.rawSha256 }));

describe('NAIC published insurance data', () => {
  it('rebuilds exactly from recorded factual cells without live provider requests', async () => {
    const rawText = await readFile(path.join(process.cwd(), 'data/naic-insurance/raw/2023.json'), 'utf8');
    expect(sha256(rawText)).toBe(current.snapshot.rawSha256);
    expect(normalize()).toEqual(current.snapshot);
    expect(naicInsuranceSnapshotSchema.parse(current.snapshot)).toEqual(current.snapshot);
    const hash = assertNormalizedHash(current.snapshot, 'NAIC');
    expect(() => assertManifestMatchesSnapshot(current.manifest, current.snapshot, hash, 'NAIC')).not.toThrow();
    const immutable = JSON.parse(await readFile(path.join(process.cwd(), `data/naic-insurance/snapshots/${current.snapshot.snapshotId}.json`), 'utf8'));
    expect(immutable).toEqual(current.snapshot);
  });

  it('covers 50 states and DC with published observations, and never silently falls back nationally', () => {
    expect(insuranceSnapshot.states.map((row) => row.stateCode).sort()).toEqual([...STATE_CODES].sort());
    for (const stateCode of STATE_CODES) {
      expect(getInsuranceStateRate(stateCode).stateCode).toBe(stateCode);
    }
    expect(() => getInsuranceStateRate('XX' as never)).toThrow(/No published/);
    expect(insuranceSnapshot.national).toMatchObject({ homeownersAnnualPremium: 1737, rentersAnnualPremium: 173,
      autoAnnualExpenditure: 1281.92, autoCombinedAnnualPremium: 1438.6 });
    expect(getInsuranceStateRate('CA')).toMatchObject({ homeownersAnnualPremium: 1655, autoAnnualExpenditure: 1225.02 });
    expect(getInsuranceStateRate('TX')).toMatchObject({ rentersAnnualPremium: 201, autoAnnualExpenditure: 1428.94 });
    expect(getInsuranceStateRate('FL')).toMatchObject({ homeownersAnnualPremium: 2779, autoAnnualExpenditure: 1864.63 });
  });

  it('preserves observation year, publication date precision, units and material state notes', () => {
    expect(insuranceSnapshot.observationPeriod).toBe('2023');
    expect(insuranceSnapshot.sources.homeowners).toMatchObject({ publishedAt: null, publicationPeriod: '2026-07', publicationPrecision: 'month' });
    expect(insuranceSnapshot.sources.auto).toMatchObject({ publishedAt: '2026-02-13T00:00:00.000Z', publicationPrecision: 'day' });
    expect(insuranceSnapshot.autoExpenditureDenominator).toBe('liability-insured car-years');
    expect(getInsuranceStateRate('CA').caveats.join(' ')).toContain('preliminary');
    expect(getInsuranceStateRate('TX').caveats.join(' ')).toContain('not average expenditure');
    expect(insuranceSnapshot.caveats.join(' ')).toContain('not current prices');
    expect(recorded.homeowners[0]).toMatchObject({ geography: 'Countrywide', pdfPage: 34, printedPage: 31 });
    expect(recorded.auto.expenditure).toMatchObject({ table: '4', pdfPage: 29, printedPage: 24 });
  });

  it('rejects missing or duplicate source geographies before promotion', () => {
    const missing = structuredClone(recorded);
    missing.renters.pop();
    expect(() => normalize(missing)).toThrow();
    const duplicate = structuredClone(recorded);
    duplicate.homeowners[1] = { ...duplicate.homeowners[0] };
    expect(() => normalize(duplicate)).toThrow(/exactly once/);
    const wrongName = structuredClone(recorded);
    wrongName.auto.liability.rows[0].geography = 'Puerto Rico';
    expect(() => normalize(wrongName)).toThrow(/exactly once/);
  });

  it('rejects invalid units, nonfinite values and tampered source arithmetic', () => {
    const invalid = structuredClone(recorded);
    invalid.homeowners[0].annualPremium = Infinity;
    expect(() => normalize(invalid)).toThrow();
    const monthlyMistake = structuredClone(recorded);
    monthlyMistake.renters[0].annualPremium /= 12;
    expect(() => normalize(monthlyMistake)).toThrow(/does not reconcile/);
    const combined = structuredClone(current.snapshot);
    combined.national.autoCombinedAnnualPremium += 10;
    expect(() => naicInsuranceSnapshotSchema.parse(combined)).toThrow(/reconcile/);
    expect(() => naicInsuranceSnapshotSchema.parse({ ...current.snapshot, units: 'USD per month' })).toThrow();
  });

  it('requires review of abnormal prior-year movement and mismatched source years', () => {
    const jump = structuredClone(recorded);
    jump.auto.liability.rows[0].annualValue *= 3;
    expect(() => normalize(jump)).toThrow(/review threshold/);
    const period = structuredClone(current.snapshot);
    period.sources.auto.observationPeriod = '2022';
    expect(() => naicInsuranceSnapshotSchema.parse(period)).toThrow(/periods must agree/);
    const duplicate = structuredClone(current.snapshot);
    duplicate.states[1] = { ...duplicate.states[0] };
    expect(() => naicInsuranceSnapshotSchema.parse(duplicate)).toThrow(/exactly once/);
  });
});
