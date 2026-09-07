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

  it('says nothing where the number changes the answer on no special terms', () => {
    for (const policy of wageTaxing) {
      if (!stateUsesDependents(policy)) continue;
      const status = 'dependentAllowanceStatus' in policy ? policy.dependentAllowanceStatus : undefined;
      if (status?.kind === 'assumption') continue;
      expect(dependentsNote(policy), policy.stateCode).toBeNull();
    }
  });

  it('states the terms where a modelled figure rests on an assumption', () => {
    /*
     * Silence is not neutral here. Arizona pays $125 for a dependent under 17
     * and $25 for an older one, and there is no age input, so a reader with
     * grown dependents is being shown too little tax. Saying nothing would let
     * them take that number as if it were unconditional.
     */
    for (const code of ['AZ', 'SC', 'ME', 'NC']) {
      const policy = snapshot.states.find((row) => row.stateCode === code)!;
      expect(stateUsesDependents(policy), code).toBe(true);
      const note = dependentsNote(policy);
      expect(note, code).toBeTruthy();
      // Every one of them says which way the estimate is wrong, not just that
      // it is approximate.
      expect(note, code).toMatch(/less tax than they owe|more tax than/i);
    }
  });

  it('explains the silence everywhere the number does nothing', () => {
    for (const policy of wageTaxing) {
      if (stateUsesDependents(policy)) continue;
      expect(dependentsNote(policy), policy.stateCode).toBeTruthy();
    }
  });

  it('has a checked reason for every silent state, not the generic fallback', () => {
    /*
     * Every one of the ten has been looked at, so none should be reaching the
     * "this snapshot carries no per-dependent amount" wording any more. That
     * sentence is still there and still correct for a state nobody has checked
     * — it is just that there are none left. A new state arriving without a
     * determination fails here rather than shipping a shrug.
     */
    for (const policy of wageTaxing) {
      if (stateUsesDependents(policy)) continue;
      expect(dependentsNote(policy), policy.stateCode)
        .not.toMatch(/this snapshot carries no per-dependent amount/i);
      expect('dependentAllowanceStatus' in policy && policy.dependentAllowanceStatus, policy.stateCode).toBeTruthy();
    }
  });

  it('keeps "the state gives nothing" apart from "we have not modelled it"', () => {
    const kindOf = (code: string) => {
      const policy = snapshot.states.find((row) => row.stateCode === code);
      return policy && 'dependentAllowanceStatus' in policy ? policy.dependentAllowanceStatus?.kind : undefined;
    };
    // Idaho's credit sunset; Montana repealed its exemptions.
    expect(kindOf('ID')).toBe('none');
    expect(kindOf('MT')).toBe('none');
    // Pennsylvania and Colorado do give something, through a mechanism this
    // engine has no input for. Calling that "none" would be false.
    expect(kindOf('PA')).toBe('not-modelled');
    expect(kindOf('CO')).toBe('not-modelled');
    // Arizona is modelled; what it carries is a caveat, not an absence.
    expect(kindOf('AZ')).toBe('assumption');
  });

  it('gives a state with no wage tax its own reason rather than the snapshot one', () => {
    const texas = snapshot.states.find((policy) => policy.stateCode === 'TX');
    expect(dependentsNote(texas)).toMatch(/no state income tax/i);
    expect(dependentsNote(texas)).not.toMatch(/no per-dependent amount/i);
  });

  it('never claims a state gives nothing when it gives something', () => {
    /*
     * Pennsylvania's Tax Forgiveness really does move with dependents — each
     * one raises the eligibility income by $9,500 — so its note has to say the
     * limit is ours. Saying Pennsylvania gives nothing would be a false
     * statement about Pennsylvania.
     */
    const note = dependentsNote(snapshot.states.find((policy) => policy.stateCode === 'PA'));
    expect(note).toMatch(/does depend on dependents|not model/i);
    expect(note).not.toMatch(/does not give a per-dependent allowance/i);
  });

  it('says nothing for the states whose dependent figures are transcribed', () => {
    for (const code of ['AL', 'CA']) {
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

  it('still has the generic fallback for a state nobody has checked', () => {
    // No state reaches it today. It has to keep working, because the next
    // state added will reach it before anyone has looked at its dependents.
    const carolina = snapshot.states.find((policy) => policy.stateCode === 'SC')!;
    const { perDependentExemption, dependentAllowanceStatus, ...unchecked } =
      carolina as typeof carolina & { perDependentExemption?: number; dependentAllowanceStatus?: unknown };
    expect(perDependentExemption).toBeDefined();
    expect(dependentsNote(unchecked as typeof carolina))
      .toMatch(/this snapshot carries no per-dependent amount/i);
  });

  it('stays quiet when there is no policy to describe', () => {
    expect(dependentsNote(undefined)).toBeNull();
  });
});
