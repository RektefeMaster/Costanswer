import { describe, expect, it } from 'vitest';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax/annual';
import { stateUsesDependents } from '@/lib/calculations/tax/state';
import { dependentsNote } from '@/lib/calculations/tax/dependents';

const snapshot = getTaxYearSnapshot(2026);
const wageTaxing = snapshot.states.filter((policy) => policy.status === 'supported' && policy.kind !== 'none');

/** Does a dependent count actually move this state's figure anywhere? */
function dependentsMoveTheAnswer(state: string): boolean {
  for (const filingStatus of ['single', 'marriedFilingJointly', 'headOfHousehold'] as const) {
    for (const annualGrossSalary of [30_000, 45_000, 90_000, 200_000, 500_000]) {
      const base = { annualGrossSalary, filingStatus, state, taxYear: 2026 };
      const without = estimateAnnualTaxLiability({ ...base, dependents: 0 }).stateTax.tax;
      const with3 = estimateAnnualTaxLiability({ ...base, dependents: 3 }).stateTax.tax;
      if (without > 0 && Math.abs(without - with3) >= 0.005) return true;
    }
  }
  return false;
}

describe('the dependents note', () => {
  it('claims a state ignores dependents only when it really does', () => {
    // The hint is the only thing standing between a reader and a box that
    // silently does nothing, so it has to track the engine rather than a
    // hand-kept list. A state that gains a per-dependent amount later must
    // lose its note in the same commit, and this is what forces that.
    for (const policy of wageTaxing) {
      expect(stateUsesDependents(policy), policy.stateCode)
        .toBe(dependentsMoveTheAnswer(policy.stateCode));
    }
  });

  it('says nothing where the number does change the answer', () => {
    for (const policy of wageTaxing) {
      if (!stateUsesDependents(policy)) continue;
      expect(dependentsNote(policy), policy.stateCode).toBeNull();
    }
  });

  it('explains the silence everywhere the number does nothing', () => {
    /*
     * Either explanation will do — our gap or the state's own absence — but
     * there must be one. A silent box is the thing this exists to prevent, and
     * the two wordings are checked separately below.
     */
    for (const policy of wageTaxing) {
      if (stateUsesDependents(policy)) continue;
      expect(dependentsNote(policy), policy.stateCode)
        .toMatch(/no per-dependent amount|does not give a per-dependent allowance/i);
    }
  });

  it('gives a state with no wage tax its own reason rather than the snapshot one', () => {
    const texas = snapshot.states.find((policy) => policy.stateCode === 'TX');
    expect(dependentsNote(texas)).toMatch(/no state income tax/i);
    expect(dependentsNote(texas)).not.toMatch(/no per-dependent amount/i);
  });

  it('never blames the state for a gap that is ours', () => {
    // South Carolina's dependent exemption under S.C. Code 12-6-1140 exists in
    // law and is not modelled here. The note must describe what this snapshot
    // carries, not assert that the state gives nothing. Alabama and California
    // were on this list until their figures were transcribed, which is the
    // point: a state leaves it by being modelled, not by being re-described.
    for (const code of ['SC']) {
      const note = dependentsNote(snapshot.states.find((policy) => policy.stateCode === code));
      expect(note, code).toMatch(/this snapshot carries no per-dependent amount/i);
    }
  });

  it('says nothing for the states whose dependent figures are transcribed', () => {
    for (const code of ['AL', 'NC', 'CA']) {
      const policy = snapshot.states.find((row) => row.stateCode === code);
      expect(stateUsesDependents(policy!), code).toBe(true);
      expect(dependentsNote(policy), code).toBeNull();
    }
  });

  it('says the state gives nothing where that has been checked, not that we are missing it', () => {
    // Idaho's child tax credit sunset rather than going unread. Telling an
    // Idaho reader that this snapshot lacks a figure would invent a gap on our
    // side, and would go on being wrong every year the credit stays expired.
    const idaho = snapshot.states.find((policy) => policy.stateCode === 'ID');
    const note = dependentsNote(idaho);
    expect(note).toMatch(/sunset|does not give a per-dependent allowance/i);
    expect(note).not.toMatch(/this snapshot carries no per-dependent amount/i);
  });

  it('falls back to describing our own gap when nobody has checked the state', () => {
    const carolina = snapshot.states.find((policy) => policy.stateCode === 'SC');
    expect(dependentsNote(carolina)).toMatch(/this snapshot carries no per-dependent amount/i);
  });

  it('stays quiet when there is no policy to describe', () => {
    expect(dependentsNote(undefined)).toBeNull();
  });
});
