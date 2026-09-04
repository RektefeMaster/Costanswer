import {
  composeCostOfLivingFromCoverage,
  type ColValue,
} from '@/lib/calculations/cost-of-living';
import { costOfLivingInputSchema } from '@/lib/calculations/cost-of-living';
import type { CalculationResult } from '@/lib/calculations/contracts';
import { resolveLocationCoverage, type LocationCoverage } from '@/lib/location/resolve';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

/**
 * The location-resolving half of the cost-of-living engine.
 *
 * It reads the national geography, HUD FMR, Census ACS, and BEA RPP tables —
 * about 4 MB of JSON. It lives in its own module so importing the arithmetic
 * half (`@/lib/calculations/cost-of-living`) never drags those tables into a
 * client bundle. Server code and tests import from here; the browser gets the
 * resolved `LocationCoverage` over `/api/location/coverage` instead.
 */
export function resolveCostOfLivingCoverage(input: {
  locationId: string;
  residentialState?: string;
  countyGeoid?: string;
  asOf?: string;
}): LocationCoverage {
  return resolveLocationCoverage({
    locationId: input.locationId,
    residentialState: input.residentialState,
    countyGeoid: input.countyGeoid,
    asOf: input.asOf ?? PUBLISHING_SNAPSHOT_DATE,
  });
}

export function composeCostOfLiving(rawInput: unknown): CalculationResult<ColValue> {
  const input = costOfLivingInputSchema.parse(rawInput);
  return composeCostOfLivingFromCoverage(rawInput, resolveCostOfLivingCoverage(input));
}

export function calculateCostOfLiving(rawInput: unknown): CalculationResult<ColValue> {
  return composeCostOfLiving(rawInput);
}
