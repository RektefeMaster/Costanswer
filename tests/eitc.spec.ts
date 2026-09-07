import { describe, expect, it } from 'vitest';
import { calculateEitc } from '@/lib/calculations/tax/eitc';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { EITC_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);
const eitc = snapshot.federalCredits.earnedIncomeCredit;

const run = (
  earnedIncome: number,
  extras: { agi?: number; children?: number; investment?: number; filingStatus?: 'single' | 'marriedFilingJointly' } = {},
) =>
  calculateEitc({
    earnedIncome,
    adjustedGrossIncome: extras.agi ?? earnedIncome,
    qualifyingChildren: extras.children ?? 1,
    investmentIncome: extras.investment ?? 0,
    filingStatus: extras.filingStatus ?? 'single',
    taxYear: 2026,
  });

describe('earned income credit', () => {
  it('matches Rev. Proc. 2025-32 maximum credits at the earned-income amounts', () => {
    expect(run(13_020, { children: 1 }).value.credit).toBe(4_427);
    expect(run(18_290, { children: 2 }).value.credit).toBe(7_316);
    expect(run(18_290, { children: 3 }).value.credit).toBe(8_231);
    expect(run(8_680, { children: 0 }).value.credit).toBe(664);
    expect(run(13_020).calculationVersion).toBe(EITC_ENGINE_ID);
    expect(run(13_020).datasetSnapshotIds).toEqual([snapshot.snapshotId]);
  });

  it('is zero at and above the completed phase-out', () => {
    expect(run(51_593, { children: 1 }).value.credit).toBe(0);
    expect(run(58_863, { children: 1, filingStatus: 'marriedFilingJointly' }).value.credit).toBe(0);
    expect(run(26_820, { children: 0, filingStatus: 'marriedFilingJointly' }).value.credit).toBe(0);
  });

  it('disallows the credit when investment income exceeds $12,200', () => {
    expect(eitc.investmentIncomeLimit).toBe(12_200);
    expect(run(13_020, { investment: 12_200 }).value.credit).toBe(4_427);
    expect(run(13_020, { investment: 12_201 }).value.credit).toBe(0);
    expect(run(13_020, { investment: 12_201 }).value.disallowedForInvestmentIncome).toBe(true);
  });

  it('phases in below the earned-income amount', () => {
    const { value } = run(6_510, { children: 1 });
    expect(value.phase).toBe('phase-in');
    expect(value.credit).toBe(Math.round(6_510 * (4_427 / 13_020)));
  });

  it('widens the phase-out for a joint return', () => {
    // Joint phase-out starts at $31,160; other statuses at $23,890. $25,000
    // is still the maximum on a joint return and already phasing out if single.
    const single = run(25_000, { children: 1 }).value.credit;
    const joint = run(25_000, { children: 1, filingStatus: 'marriedFilingJointly' }).value.credit;
    expect(joint).toBe(4_427);
    expect(single).toBeGreaterThan(0);
    expect(joint).toBeGreaterThan(single);
  });
});
