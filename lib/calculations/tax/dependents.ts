/**
 * What to tell a reader who has typed a dependent count.
 *
 * The three take-home tools all offer a dependents field, and for nine states
 * with no wage tax plus six more, that field changes nothing. Leaving it
 * silent asks the reader to conclude either that they entered it wrong or that
 * their children are worth nothing to their state, when neither is true.
 *
 * Each of those six has been looked at, and they do not all mean the same
 * thing. Idaho, Montana, Connecticut, Louisiana, Missouri and North Dakota
 * give nothing per dependent — a credit that sunset, exemptions that were
 * repealed, a structure that never had one. Telling an Idahoan our snapshot
 * is missing a figure would invent a gap on our side. So the reason comes from
 * `dependentAllowanceStatus` and the note repeats it.
 *
 * A modelled figure can still need a sentence. Arizona pays $125 under 17 and
 * $25 otherwise; Pennsylvania Tax Forgiveness, Colorado's child tax credit,
 * the District's child tax credit and Kentucky's family-size credit all rest
 * on terms this estimate does not ask about. Those rows carry `assumption`
 * and the note states which way the figure is wrong.
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
  const status = 'dependentAllowanceStatus' in policy ? policy.dependentAllowanceStatus : undefined;
  if (stateUsesDependents(policy)) {
    /*
     * Modelled, but on terms worth stating. Silence here is not neutral: a
     * reader whose dependents are grown would take Arizona's $125 figure and
     * never learn the state pays $25 for them.
     */
    return status?.kind === 'assumption' ? status.reason : null;
  }
  if (status) {
    return `${status.reason} Federal credits for dependents are not modelled here either.`;
  }
  return `This snapshot carries no per-dependent amount for ${state}, so this does not change the result. Federal credits for dependents are not modelled here either.`;
}
