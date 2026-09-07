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
    for (const policy of wageTaxing) {
      if (stateUsesDependents(policy)) continue;
      expect(dependentsNote(policy), policy.stateCode).toMatch(/no per-dependent amount/i);
    }
  });

  it('gives a state with no wage tax its own reason rather than the snapshot one', () => {
    const texas = snapshot.states.find((policy) => policy.stateCode === 'TX');
    expect(dependentsNote(texas)).toMatch(/no state income tax/i);
    expect(dependentsNote(texas)).not.toMatch(/no per-dependent amount/i);
  });

  it('never blames the state for a gap that is ours', () => {
    // California's dependent exemption credit and South Carolina's exemption
    // under S.C. Code 12-6-1140 both exist in law and are not modelled here.
    // The note must describe what this snapshot carries, not assert that the
    // state gives nothing. Alabama was on this list until its chart was
    // transcribed, which is the point: a state leaves it by being modelled.
    for (const code of ['CA', 'SC']) {
      const note = dependentsNote(snapshot.states.find((policy) => policy.stateCode === code));
      expect(note, code).toMatch(/this snapshot carries no per-dependent amount/i);
    }
  });

  it('says nothing for the two states whose dependent charts are transcribed', () => {
    for (const code of ['AL', 'NC']) {
      const policy = snapshot.states.find((row) => row.stateCode === code);
      expect(stateUsesDependents(policy!), code).toBe(true);
      expect(dependentsNote(policy), code).toBeNull();
    }
  });

  it('stays quiet when there is no policy to describe', () => {
    expect(dependentsNote(undefined)).toBeNull();
  });
});
