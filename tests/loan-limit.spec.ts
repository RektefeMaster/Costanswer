import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateLoanLimit } from '@/lib/calculations/loan-limit';
import {
  fhfaLoanLimitSnapshot,
  getCountyLoanLimit,
} from '@/lib/data/fhfa-loan-limits-snapshot';
import { resolveZipToLoanLimitCounties } from '@/lib/data/loan-limit-lookup';
import { validateFhfaLoanLimitSnapshot } from '@/lib/data/verify';
import { buildFhfaLoanLimitSnapshot } from '../scripts/ingest-fhfa-loan-limits';
import currentJson from '@/data/fhfa-loan-limits/current.json';

const baseline = [
  fhfaLoanLimitSnapshot.baseline.oneUnit,
  fhfaLoanLimitSnapshot.baseline.twoUnit,
  fhfaLoanLimitSnapshot.baseline.threeUnit,
  fhfaLoanLimitSnapshot.baseline.fourUnit,
] as const;

describe('FHFA 2026 conforming loan limits', () => {
  it('seals the bundled file so an edited county fails the build', () => {
    expect(() => validateFhfaLoanLimitSnapshot(currentJson)).not.toThrow();
    const mistyped = structuredClone(currentJson);
    mistyped.baseline.oneUnit = 800_000;
    expect(() => validateFhfaLoanLimitSnapshot(mistyped)).toThrow(/integrity check/);
  });

  it('rebuilds the promoted hash from the retained CSV', () => {
    const csv = readFileSync('data/fhfa-loan-limits/raw/fullcountyloanlimitlist2026_hera-based_final_flat.csv', 'utf8');
    const rebuilt = buildFhfaLoanLimitSnapshot(csv, fhfaLoanLimitSnapshot.fetchedAt);
    expect(rebuilt.normalizedSha256).toBe(fhfaLoanLimitSnapshot.normalizedSha256);
    expect(rebuilt.countyFips).toHaveLength(3235);
  });

  it('puts Autauga County, Alabama at the national baseline', () => {
    const county = getCountyLoanLimit('01001');
    expect(county).toBeDefined();
    expect(county!.limits[0]).toBe(832_750);
    expect(county!.isHighCost).toBe(false);
    expect(county!.limits[0]).toBeLessThan(county!.limits[1]);
    expect(county!.limits[1]).toBeLessThan(county!.limits[2]);
    expect(county!.limits[2]).toBeLessThan(county!.limits[3]);
  });

  it('lets Maui exceed the national ceiling because Hawaii is a statutory special area', () => {
    const maui = getCountyLoanLimit('15009');
    expect(maui).toBeDefined();
    expect(maui!.limits[0]).toBe(1_299_500);
    expect(maui!.isSpecialStatutoryArea).toBe(true);
    expect(maui!.limits[0]).toBeGreaterThan(fhfaLoanLimitSnapshot.ceiling.oneUnit);
    expect(fhfaLoanLimitSnapshot.aboveCeilingCountyFips).toContain('15009');
  });
});

describe('loan-limit classification', () => {
  const autauga = getCountyLoanLimit('01001')!;

  it('calls a $900,000 loan jumbo in a baseline county and names the extra cash to conform', () => {
    const result = calculateLoanLimit(
      { loanAmount: 900_000, units: 1 },
      autauga,
      baseline,
      fhfaLoanLimitSnapshot.snapshotId,
      fhfaLoanLimitSnapshot.loanYear,
    );
    expect(result.value.band).toBe('jumbo');
    expect(result.value.additionalDownPaymentToConform).toBe(900_000 - 832_750);
    expect(result.value.headroom).toBe(832_750 - 900_000);
  });

  it('calls a $900,000 loan high-balance in a mainland ceiling county', () => {
    const ceilingCounty = getCountyLoanLimit('06037') ?? getCountyLoanLimit('15003');
    expect(ceilingCounty).toBeDefined();
    expect(ceilingCounty!.limits[0]).toBeGreaterThan(baseline[0]);
    const result = calculateLoanLimit(
      { loanAmount: 900_000, units: 1, downPaymentPercent: 20 },
      ceilingCounty!,
      baseline,
      fhfaLoanLimitSnapshot.snapshotId,
      fhfaLoanLimitSnapshot.loanYear,
    );
    expect(result.value.band).toBe('high-balance-conforming');
    expect(result.value.additionalDownPaymentToConform).toBe(0);
    expect(result.value.maximumConformingPrice).toBeCloseTo(ceilingCounty!.limits[0] / 0.8, 2);
  });

  it('treats a $900,000 loan in Honolulu as ordinary conforming, not high-balance', () => {
    const honolulu = getCountyLoanLimit('15003')!;
    expect(honolulu.isSpecialStatutoryArea).toBe(true);
    expect(honolulu.limits[0]).toBe(1_249_125);
    const result = calculateLoanLimit(
      { loanAmount: 900_000, units: 1 },
      honolulu,
      baseline,
      fhfaLoanLimitSnapshot.snapshotId,
      fhfaLoanLimitSnapshot.loanYear,
    );
    expect(result.value.band).toBe('baseline-conforming');
    expect(result.value.areaBaselineLimit).toBe(1_249_125);
    expect(result.value.baselineLimit).toBe(832_750);
  });

  it('opens a high-balance band in Maui only above the statutory Hawaiian baseline', () => {
    const maui = getCountyLoanLimit('15009')!;
    const underLocalBaseline = calculateLoanLimit(
      { loanAmount: 1_200_000, units: 1 },
      maui,
      baseline,
      fhfaLoanLimitSnapshot.snapshotId,
      fhfaLoanLimitSnapshot.loanYear,
    );
    const highBalance = calculateLoanLimit(
      { loanAmount: 1_260_000, units: 1 },
      maui,
      baseline,
      fhfaLoanLimitSnapshot.snapshotId,
      fhfaLoanLimitSnapshot.loanYear,
    );
    expect(underLocalBaseline.value.band).toBe('baseline-conforming');
    expect(highBalance.value.band).toBe('high-balance-conforming');
  });

  it('maps Dallas ZIP 75201 to Dallas County', () => {
    const resolution = resolveZipToLoanLimitCounties('75201');
    expect(resolution.status).toBe('resolved');
    if (resolution.status !== 'resolved') return;
    expect(resolution.counties[0].fips).toBe('48113');
  });
});
