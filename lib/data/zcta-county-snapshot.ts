import currentZctaJson from '@/data/zcta-county/current.json';
import type { ZctaCountySnapshot } from './zcta-county';
import { readVerifiedEnvelope } from './envelope';

const envelope = readVerifiedEnvelope<ZctaCountySnapshot>(currentZctaJson);
export const zctaCountySnapshot = envelope.snapshot;

const byZcta = new Map(zctaCountySnapshot.areas.map((row) => [row.zcta, row.countyGeoids]));

/** Counties a ZIP covers, largest land share first, or undefined if it is not a ZCTA. */
export function countiesForZip(zip: string): string[] | undefined {
  return byZcta.get(zip);
}
