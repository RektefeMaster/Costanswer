import currentGroceryJson from '@/data/bls/current.json';
import { groceryItemsWithRegions, type BlsGrocerySnapshot, type GroceryItem, type GroceryRegionalItemId } from './bls-grocery';
import { readVerifiedEnvelope } from './envelope';
import { type CensusRegionId } from '@/lib/location/census-regions';

const currentGroceryEnvelope = readVerifiedEnvelope<BlsGrocerySnapshot>(currentGroceryJson);
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
