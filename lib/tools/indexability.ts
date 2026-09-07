/**
 * The indexability evidence every launch tool carries.
 *
 * Shared by the registry fragments. The hard gates are all true here because a
 * tool that fails one does not get a fragment at all — it does not ship.
 */
import type { IndexabilityEvidence } from './types';

export function launchIndexability(
  scores: IndexabilityEvidence['scores'],
  provenanceStatus: IndexabilityEvidence['provenanceStatus'],
): IndexabilityEvidence {
  return {
    scores,
    hardGates: {
      realFunction: true,
      distinctIntent: true,
      methodologyVisible: true,
      sourceRequirementsMet: true,
      ymylOrSafetyReviewed: true,
      canonicalReady: true,
      crawlableInboundLinks: true,
    },
    provenanceStatus,
    reviewedAt: '2026-09-01',
    reviewValidUntil: '2027-09-01',
  };
}
