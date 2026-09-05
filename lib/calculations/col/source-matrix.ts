/**
 * Cost-of-living source matrix (Phase 7).
 *
 * DIRECT_LOCAL_OFFICIAL — an official value already stated for the used geography.
 * NATIONAL_OFFICIAL_BASELINE — official national (or AK/HI TFP-only) planning value.
 * ENGINE_DERIVED_LOCAL — existing engine math using an official local rate.
 * MANUAL — user-entered, comparable semantics.
 * CONTEXT — not added into the monthly total.
 * EXCLUDED — omitted from this model on purpose.
 */
export const COL_SOURCE_TYPES = [
  'DIRECT_LOCAL_OFFICIAL',
  'NATIONAL_OFFICIAL_BASELINE',
  'ENGINE_DERIVED_LOCAL',
  'MANUAL',
  'CONTEXT',
  'EXCLUDED',
] as const;

export type ColSourceType = (typeof COL_SOURCE_TYPES)[number];

export const COL_SOURCE_MATRIX = {
  housing: {
    category: 'housing',
    defaultSource: 'HUD Fair Market Rent gross-rent benchmark',
    sourceType: 'DIRECT_LOCAL_OFFICIAL',
    sourceGeography: 'HUD FMR area (not city limits)',
    fallback: 'Unavailable until the user enters housing, including tenant-paid utilities covered by FMR',
    manualOverride: 'Monthly housing cost including those same tenant-paid utilities',
    regionalAdjustment: 'none',
    alreadyLocationSpecific: true,
    rppApplied: false,
    containsUtilities: true,
  },
  food: {
    category: 'food',
    defaultSource: 'USDA Moderate-Cost Food Plan, food at home',
    sourceType: 'NATIONAL_OFFICIAL_BASELINE',
    sourceGeography: 'United States; Thrifty AK/HI reference-family adjustment only when that plan is selected',
    fallback: 'National USDA Food Plan',
    manualOverride: 'Monthly food-at-home amount',
    regionalAdjustment: 'none: BLS grocery staples are item prices without household quantities',
    alreadyLocationSpecific: false,
    rppApplied: false,
    containsUtilities: false,
  },
  transportation: {
    category: 'transportation',
    defaultSource: 'Energy/Vehicle primitives using EIA gasoline or electricity, or a manual amount',
    sourceType: 'ENGINE_DERIVED_LOCAL',
    sourceGeography: 'EIA state or PADD for fuel; EIA state for EV charging',
    fallback: 'Manual monthly transportation; no-car is not modeled as $0',
    manualOverride: 'Monthly transportation amount, replacing vehicle energy',
    regionalAdjustment: 'none',
    alreadyLocationSpecific: true,
    rppApplied: false,
    containsUtilities: false,
  },
  otherEssentials: {
    category: 'otherEssentials',
    defaultSource: 'None',
    sourceType: 'MANUAL',
    sourceGeography: 'User',
    fallback: 'Omitted',
    manualOverride: 'Optional monthly amount for phone, internet, or other essentials',
    regionalAdjustment: 'none',
    alreadyLocationSpecific: false,
    rppApplied: false,
    containsUtilities: false,
  },
  income: {
    category: 'income',
    defaultSource: 'Manual monthly take-home, or Tax Engine from gross salary',
    sourceType: 'MANUAL',
    sourceGeography: 'Residential state when gross salary is converted',
    fallback: 'Income optional; remaining-cash figures omitted without valid take-home',
    manualOverride: 'Take-home preferred',
    regionalAdjustment: 'none',
    alreadyLocationSpecific: false,
    rppApplied: false,
    containsUtilities: false,
  },
  regionalPriceContext: {
    category: 'regionalPriceContext',
    defaultSource: 'BEA Regional Price Parities, all-items',
    sourceType: 'CONTEXT',
    sourceGeography: 'BEA metro, else BEA state',
    fallback: 'stateFallback when the metro is missing from BEA RPP',
    manualOverride: 'none',
    regionalAdjustment: 'not applied to HUD, EIA, or USDA dollars',
    alreadyLocationSpecific: true,
    rppApplied: false,
    containsUtilities: false,
  },
  incomeContext: {
    category: 'incomeContext',
    defaultSource: 'Census ACS 5-Year median household income',
    sourceType: 'CONTEXT',
    sourceGeography: 'Selected Census place, county, metro, or state',
    fallback: 'Omitted when the exact Census geography has no ACS row; no silent broader-geo fill-in',
    manualOverride: 'none: not the user\'s income',
    regionalAdjustment: 'none',
    alreadyLocationSpecific: true,
    rppApplied: false,
    containsUtilities: false,
  },
} as const;
