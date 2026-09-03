import currentGroceryJson from '@/data/bls/current.json';
import { blsGrocerySnapshotSchema, groceryItemsWithRegions, type GroceryItem, type GroceryRegionalItemId } from './bls-grocery';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope } from './envelope';
import { type CensusRegionId } from '@/lib/location/census-regions';
import { z } from 'zod';

const groceryManifestSchema = z.object({
  currentSnapshotId: z.string(),
  observationPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  validationStatus: z.literal('passed'),
}).strict();

const currentGroceryEnvelopeSchema = z.object({
  manifest: groceryManifestSchema,
  snapshot: blsGrocerySnapshotSchema,
}).strict();

export function validateGroceryEnvelope(rawEnvelope: unknown) {
  const computedNormalizedHash = assertNormalizedHash(snapshotRecordFromEnvelope(rawEnvelope, 'Bundled BLS grocery'), 'Bundled BLS grocery data');
  const envelope = currentGroceryEnvelopeSchema.parse(rawEnvelope);
  assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computedNormalizedHash, 'BLS grocery');
  return envelope;
}

const currentGroceryEnvelope = validateGroceryEnvelope(currentGroceryJson);
export const grocerySnapshot = currentGroceryEnvelope.snapshot;
export const groceryManifest = currentGroceryEnvelope.manifest;

export function groceryItemsWithCompleteRegions(items: GroceryItem[] = grocerySnapshot.items) {
  return groceryItemsWithRegions(items);
}

export function regionalGroceryItemIds(items: GroceryItem[] = grocerySnapshot.items): GroceryRegionalItemId[] {
  return groceryItemsWithRegions(items).map((item) => item.id as GroceryRegionalItemId);
}

export function groceryPriceForRegion(item: GroceryItem, region: CensusRegionId): number | null {
  return item.regions?.[region]?.dollars ?? null;
}
