import currentAcsJson from '@/data/census-acs/current.json';
import type { CensusAcsRow, CensusAcsSnapshot } from './census-acs';
import { readVerifiedEnvelope } from './envelope';

const envelope = readVerifiedEnvelope<CensusAcsSnapshot>(currentAcsJson);
export const acsSnapshot = envelope.snapshot;
export const acsManifest = envelope.manifest;
export type { CensusAcsRow } from './census-acs';

const rowsByGeoId = new Map(acsSnapshot.rows.map((row) => [row.geoId, row]));

export function getAcsRow(geoId: string): CensusAcsRow | undefined {
  return rowsByGeoId.get(geoId);
}
