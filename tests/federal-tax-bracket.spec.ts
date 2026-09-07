import { describe, expect, it } from 'vitest';
import { calculateFederalBracket } from '@/lib/calculations/tax/federal-bracket';
import { calculateFederalIncomeTax } from '@/lib/calculations/tax/federal';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { FEDERAL_BRACKET_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);
const run = (income: number, incomeBasis: 'gross' | 'taxable' = 'gross', filingStatus = 'single' as const) =>
  calculateFederalBracket({ income, filingStatus, taxYear: 2026, incomeBasis });

describe('federal tax bracket', () => {
  it('splits income across the bands and the parts sum to the tax', () => {
    const { value } = run(100_000);
    expect(value.taxableIncome).toBe(83_900);
    const summed = value.bands.reduce((total, band) => total + band.taxInBand, 0);
    expect(summed).toBeCloseTo(value.federalIncomeTax, 2);
    // 10% on 12,400 · 12% to 50,400 · 22% on the rest.
    expect(value.federalIncomeTax).toBeCloseTo(13_170, 2);
  });

  it('agrees with the federal engine it is explaining', () => {
    for (const gross of [0, 20_000, 100_000, 260_000, 900_000]) {
      const { value } = run(gross);
      const federal = calculateFederalIncomeTax({
        taxYear: 2026, filingStatus: 'single', grossIncome: gross, federal: snapshot.federal,
      });
      expect(value.federalIncomeTax, `${gross}`).toBeCloseTo(federal.tax, 2);
    }
  });

  it('puts income exactly at a threshold in the lower band, not the next one', () => {
    // $50,400 is the top of the 12% band. Someone at exactly that figure has
    // not reached 22% — saying they had would put them in a bracket that
    // charges them nothing.
    const { value } = run(50_400, 'taxable');
    expect(value.currentBracketRate).toBe(12);
    expect(value.roomInCurrentBracket).toBe(0);
    expect(value.nextBracketRate).toBe(22);
  });

  it('reports the room left before the next band', () => {
    const { value } = run(100_000);
    // The 22% band runs to $105,700 of taxable income.
    expect(value.roomInCurrentBracket).toBe(105_700 - 83_900);
    expect(value.nextBracketRate).toBe(24);
  });

  it('has no next bracket and no room in the top band', () => {
    const { value } = run(900_000);
    expect(value.currentBracketRate).toBe(37);
    expect(value.roomInCurrentBracket).toBeNull();
    expect(value.nextBracketRate).toBeNull();
  });

  it('takes taxable income as given and applies no deduction to it', () => {
    const asTaxable = run(83_900, 'taxable').value;
    const asGross = run(100_000, 'gross').value;
    expect(asTaxable.taxableIncome).toBe(83_900);
    expect(asTaxable.grossIncome).toBeNull();
    expect(asTaxable.federalIncomeTax).toBeCloseTo(asGross.federalIncomeTax, 2);
  });

  it('charges nothing on income the deduction covers', () => {
    const { value } = run(snapshot.federal.standardDeductionByFilingStatus.single);
    expect(value.taxableIncome).toBe(0);
    expect(value.federalIncomeTax).toBe(0);
    expect(value.effectiveFederalRate).toBe(0);
    expect(value.bands.every((band) => band.incomeInBand === 0)).toBe(true);
  });

  it('widens the bands for a joint return', () => {
    const single = run(200_000, 'taxable').value;
    const joint = calculateFederalBracket({
      income: 200_000, filingStatus: 'marriedFilingJointly', taxYear: 2026, incomeBasis: 'taxable',
    }).value;
    expect(joint.currentBracketRate).toBeLessThan(single.currentBracketRate);
    expect(joint.federalIncomeTax).toBeLessThan(single.federalIncomeTax);
  });

  it('marks exactly one band as the current one whenever there is taxable income', () => {
    for (const taxable of [1, 12_400, 12_401, 83_900, 640_600, 2_000_000]) {
      const { value } = run(taxable, 'taxable');
      expect(value.bands.filter((band) => band.isCurrent), `${taxable}`).toHaveLength(1);
    }
    // At zero there is no band in play at all, and none is claimed.
    expect(run(0, 'taxable').value.bands.filter((band) => band.isCurrent)).toHaveLength(0);
  });

  it('never reports a band holding more income than it spans', () => {
    const { value } = run(2_000_000, 'taxable');
    for (const band of value.bands) {
      if (band.to === null) continue;
      expect(band.incomeInBand, `${band.rate}%`).toBeLessThanOrEqual(band.to - band.from);
    }
  });

  it('carries its version, the snapshot, and says what it leaves out', () => {
    const result = run(100_000);
    expect(result.calculationVersion).toBe(FEDERAL_BRACKET_ENGINE_ID);
    expect(result.datasetSnapshotIds).toContain(snapshot.snapshotId);
    expect(result.assumptions.some((line) => /Social Security, Medicare and state/i.test(line))).toBe(true);
    expect(result.assumptions.some((line) => /never lowers take-home/i.test(line))).toBe(true);
  });

  it('refuses input it cannot compute', () => {
    expect(() => calculateFederalBracket({ income: -1, filingStatus: 'single', taxYear: 2026 })).toThrow();
    expect(() => calculateFederalBracket({ income: 50_000, filingStatus: 'nope', taxYear: 2026 })).toThrow();
    expect(() => calculateFederalBracket({ income: 50_000, filingStatus: 'single' })).toThrow();
  });
});
