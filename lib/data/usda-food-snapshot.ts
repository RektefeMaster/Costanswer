import currentUsdaJson from '@/data/usda-food/current.json';
import type { UsdaFoodSnapshot } from './usda-food';
import { readVerifiedEnvelope } from './envelope';

const envelope = readVerifiedEnvelope<UsdaFoodSnapshot>(currentUsdaJson);
export const usdaFoodSnapshot = envelope.snapshot;
export const usdaFoodManifest = envelope.manifest;
