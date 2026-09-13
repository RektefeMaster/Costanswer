import { describe, expect, it } from 'vitest';
import snapshotJson from '@/data/irs-hsa/2026.json';
import { calculateHsaContribution } from '@/lib/calculations/hsa';
import { irsHsaLimits } from '@/lib/data/irs-hsa';
import { validateIrsHsaSnapshot } from '@/lib/data/verify';

describe('2026 HSA limits', () => {
  it('prints Rev. Proc. 2025-19 exactly', () => {
    expect(irsHsaLimits.selfOnlyContribution).toBe(4_400);
    expect(irsHsaLimits.familyContribution).toBe(8_750);
    expect(irsHsaLimits.catchUpAge55).toBe(1_000);
    expect(irsHsaLimits.hdhpMinDeductibleSelfOnly).toBe(1_700);
    expect(irsHsaLimits.hdhpMinDeductibleFamily).toBe(3_400);
    expect(irsHsaLimits.hdhpMaxOutOfPocketSelfOnly).toBe(8_500);
    expect(irsHsaLimits.hdhpMaxOutOfPocketFamily).toBe(17_000);
  });

  it('adds catch-up at 55 and prorates by eligible months', () => {
    const full = calculateHsaContribution({
      coverage: 'self-only', age: 55, monthsEligible: 12, enrolledInMedicare: false, lastMonthRule: false, alreadyContributed: 0,
    });
    expect(full.value.annualLimit).toBe(5_400);
    const half = calculateHsaContribution({
      coverage: 'self-only', age: 40, monthsEligible: 6, enrolledInMedicare: false, lastMonthRule: false, alreadyContributed: 0,
    });
    expect(half.value.annualLimit).toBe(2_200);
  });

  it('uses the last-month rule as a full year, and prorates Medicare months instead of zeroing the year', () => {
    const lastMonth = calculateHsaContribution({
      coverage: 'family', age: 40, monthsEligible: 1, enrolledInMedicare: false, lastMonthRule: true, alreadyContributed: 1_000,
    });
    expect(lastMonth.value.annualLimit).toBe(8_750);
    expect(lastMonth.value.remaining).toBe(7_750);
    const medicareMidYear = calculateHsaContribution({
      coverage: 'self-only', age: 40, monthsEligible: 6, enrolledInMedicare: true, lastMonthRule: false, alreadyContributed: 0,
    });
    expect(medicareMidYear.value.annualLimit).toBe(2_200);
    const medicareBlocksLastMonth = calculateHsaContribution({
      coverage: 'family', age: 40, monthsEligible: 1, enrolledInMedicare: true, lastMonthRule: true, alreadyContributed: 0,
    });
    expect(medicareBlocksLastMonth.value.annualLimit).toBe(729);
    const medicareNone = calculateHsaContribution({
      coverage: 'family', age: 66, monthsEligible: 0, enrolledInMedicare: true, lastMonthRule: false, alreadyContributed: 0,
    });
    expect(medicareNone.value.annualLimit).toBe(0);
  });

  it('zeros the cap when the plan fails the HDHP test', () => {
    const lowDeductible = calculateHsaContribution({
      coverage: 'self-only', age: 40, monthsEligible: 12, enrolledInMedicare: false, lastMonthRule: false, alreadyContributed: 0,
      planDeductible: 1_500, planOutOfPocketMax: 6_000,
    });
    expect(lowDeductible.value.qualifiesAsHdhp).toBe(false);
    expect(lowDeductible.value.annualLimit).toBe(0);
    const ok = calculateHsaContribution({
      coverage: 'self-only', age: 40, monthsEligible: 12, enrolledInMedicare: false, lastMonthRule: false, alreadyContributed: 0,
      planDeductible: 1_700, planOutOfPocketMax: 8_500,
    });
    expect(ok.value.qualifiesAsHdhp).toBe(true);
    expect(ok.value.annualLimit).toBe(4_400);
    const deductibleOnly = calculateHsaContribution({
      coverage: 'self-only', age: 40, monthsEligible: 12, enrolledInMedicare: false, lastMonthRule: false, alreadyContributed: 0,
      planDeductible: 1_700,
    });
    expect(deductibleOnly.value.qualifiesAsHdhp).toBeNull();
    expect(deductibleOnly.value.annualLimit).toBe(4_400);
  });

  it('fails the build on a mistyped contribution limit', () => {
    expect(() => validateIrsHsaSnapshot(snapshotJson)).not.toThrow();
    const mistyped = structuredClone(snapshotJson);
    mistyped.limits.selfOnlyContribution = 4_300;
    expect(() => validateIrsHsaSnapshot(mistyped)).toThrow(/integrity check/);
  });
});
