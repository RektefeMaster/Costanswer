import { describe, expect, it } from 'vitest';
import { calculateChildTaxCredit } from '@/lib/calculations/tax/child-tax-credit';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { CHILD_TAX_CREDIT_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);
const ctc = snapshot.federalCredits.childTaxCredit;

const run = (extras: Partial<{
  magi: number;
  children: number;
  other: number;
  earned: number;
  tax: number;
  filingStatus: 'single' | 'marriedFilingJointly';
}> = {}) =>
  calculateChildTaxCredit({
    modifiedAgi: extras.magi ?? 50_000,
    qualifyingChildren: extras.children ?? 1,
    otherDependents: extras.other ?? 0,
    earnedIncome: extras.earned ?? 50_000,
    taxBeforeThisCredit: extras.tax ?? 5_000,
    filingStatus: extras.filingStatus ?? 'single',
    taxYear: 2026,
  });

describe('child tax credit', () => {
  it('matches the 2026 $2,200 maximum on a filer below the phase-out with enough tax', () => {
    expect(ctc.maxPerQualifyingChild).toBe(2_200);
    expect(ctc.refundablePerQualifyingChild).toBe(1_700);
    const { value, calculationVersion } = run();
    expect(calculationVersion).toBe(CHILD_TAX_CREDIT_ENGINE_ID);
    expect(value.nonrefundableCredit).toBe(2_200);
    expect(value.additionalChildTaxCredit).toBe(0);
    expect(value.totalCredit).toBe(2_200);
  });

  it('pays the additional child tax credit when there is no tax to offset', () => {
    const { value } = run({ tax: 0 });
    expect(value.nonrefundableCredit).toBe(0);
    expect(value.additionalChildTaxCredit).toBe(1_700);
    expect(value.totalCredit).toBe(1_700);
  });

  it('phases out $50 for each $1,000 of MAGI over $200,000 for a single filer', () => {
    // Schedule 8812: $201,000 − $200,000 = $1,000, times 5% = $50.
    const { value } = run({ magi: 201_000 });
    expect(value.phaseOutReduction).toBe(50);
    expect(value.creditAfterPhaseOut).toBe(2_150);
  });

  it('rounds a $425 excess up to $1,000 before applying 5%', () => {
    const { value } = run({ magi: 200_425 });
    expect(value.phaseOutReduction).toBe(50);
  });

  it('does not refund the credit for other dependents', () => {
    const { value } = run({ children: 0, other: 1, tax: 0 });
    expect(value.creditBeforePhaseOut).toBe(500);
    expect(value.nonrefundableCredit).toBe(0);
    expect(value.additionalChildTaxCredit).toBe(0);
  });

  it('uses the $400,000 joint phase-out threshold', () => {
    const joint = run({ magi: 201_000, filingStatus: 'marriedFilingJointly' });
    expect(joint.value.phaseOutReduction).toBe(0);
    expect(joint.value.creditAfterPhaseOut).toBe(2_200);
  });
});
