/**
 * What to tell a reader who has typed a dependent count.
 *
 * The three take-home tools all offer a dependents field, and for nine states
 * with no wage tax plus sixteen more whose snapshot carries no per-dependent
 * amount, that field changes nothing. Leaving it silent asks the reader to
 * conclude either that they entered it wrong or that their children are worth
 * nothing to their state, when the truth is narrower and is ours to say: this
 * snapshot has no per-dependent figure for that state yet.
 *
 * The note is deliberately about the snapshot rather than about the law. Some
 * of those sixteen states — California's dependent exemption credit, South
 * Carolina's dependent exemption, Alabama's tiered dependent amount — do have
 * a provision we have not modelled, and claiming the state gives nothing would
 * be a false statement about the state rather than an honest one about us.
 */
import { getStateName } from '@/lib/location/states';
import { stateUsesDependents } from './state';
import type { StateTaxPolicy } from '@/lib/data/tax/schema';

export function dependentsNote(policy: StateTaxPolicy | undefined): string | null {
  if (!policy) return null;
  if (policy.status !== 'supported') return null;
  const state = getStateName(policy.stateCode);
  if (policy.kind === 'none') {
    return `${state} has no state income tax, and federal credits for dependents are not modelled here, so this does not change the result.`;
  }
  if (stateUsesDependents(policy)) return null;
  return `This snapshot carries no per-dependent amount for ${state}, so this does not change the result. Federal credits for dependents are not modelled here either.`;
}
