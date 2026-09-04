import currentIrsRetirementJson from '@/data/irs-retirement/current.json';
import type { IrsRetirementSnapshot } from './irs-retirement';
import { readVerifiedEnvelope } from './envelope';
import { formatPublishingDateLong } from '@/lib/publishing';

const envelope = readVerifiedEnvelope<IrsRetirementSnapshot>(currentIrsRetirementJson);
export const irsRetirementSnapshot = envelope.snapshot;
export const irsRetirementManifest = envelope.manifest;
export const irsRetirementLimits = irsRetirementSnapshot.limits;

export function irsRetirementPublishedLabel(snapshot = irsRetirementSnapshot): string {
  return formatPublishingDateLong(snapshot.publishedAt.slice(0, 10));
}
