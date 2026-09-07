/**
 * What to tell a reader who has typed a dependent count.
 *
 * The three take-home tools all offer a dependents field, and for nine states
 * with no wage tax plus ten more, that field changes nothing. Leaving it
 * silent asks the reader to conclude either that they entered it wrong or that
 * their children are worth nothing to their state, when neither is true.
 *
 * Each of those ten has been looked at, and they do not all mean the same
 * thing. Idaho, Montana, Connecticut, Louisiana, Missouri and North Dakota
 * give nothing per dependent — a credit that sunset, exemptions that were
 * repealed, a structure that never had one. Pennsylvania, Colorado, the
 * District of Columbia and Kentucky do give something, through a mechanism
 * this engine has no input for: an income-tested forgiveness schedule, a
 * credit gated on a child's age. Telling a Pennsylvanian their state gives
 * nothing would be false about Pennsylvania; telling an Idahoan our snapshot
 * is missing a figure would invent a gap on our side. So the reason comes from
 * `dependentAllowanceStatus` and the note repeats it.
 *
 * The generic wording below is what a state gets before anyone has checked it.
 * No state reaches it today, and the next one added will.
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
  const status = 'dependentAllowanceStatus' in policy ? policy.dependentAllowanceStatus : undefined;
  if (status) {
    return `${status.reason} Federal credits for dependents are not modelled here either.`;
  }
  return `This snapshot carries no per-dependent amount for ${state}, so this does not change the result. Federal credits for dependents are not modelled here either.`;
}
