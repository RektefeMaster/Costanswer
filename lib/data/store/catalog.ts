/**
 * Which snapshots belong in Worker static assets rather than the JS bundle.
 *
 * Tax tables, geography and recipe *metadata* stay as bundled JSON (tier 1).
 * Packed wage/premium columns, job labor/material tables and medical procedure
 * tables are tier 2: Cloudflare serves them as assets, and request-time code
 * reads them through `readStoreJson`. A static `import` of those files is how
 * they drift into the Worker budget and, if a client island reaches them, onto
 * somebody's phone.
 *
 * Source of truth remains under `data/`. Promotion copies bytes to `/store/`
 * for the Worker; tests and Node scripts may read `sourcePath` directly.
 */
export type StoreObject = {
  readonly sourcePath: string;
  readonly assetPath: string;
  readonly reason: string;
  /** When true, `store:promote` skips a missing file instead of failing. */
  readonly optional?: boolean;
};

export const STORE_CATALOG = {
  'store-probe': {
    sourcePath: 'data/store/probe.json',
    assetPath: '/store/store-probe.json',
    reason: 'Boundary probe. This file is never statically imported, so a unique token in Worker JS would mean the store leaked into the bundle.',
  },
  'bls-oews-wages': {
    sourcePath: 'data/bls-oews/wages.json',
    assetPath: '/store/bls-oews-wages.json',
    reason: 'Packed OEWS wage columns. MASTER_PLAN §B.3 lists them as tier 2.',
  },
  'cms-marketplace-premiums': {
    sourcePath: 'data/cms-marketplace/premiums.json',
    assetPath: '/store/cms-marketplace-premiums.json',
    reason: 'Packed CMS premium columns. MASTER_PLAN §B.3 lists them as tier 2.',
  },
  'job-material-basket': {
    sourcePath: 'data/material-basket/current.json',
    assetPath: '/store/job-material-basket.json',
    reason: 'Job Cost material baselines. Must not enter the JS bundle.',
    optional: true,
  },
  'bls-ecec': {
    sourcePath: 'data/bls-ecec/current.json',
    assetPath: '/store/bls-ecec.json',
    reason: 'ECEC labor-burden factors for Job Cost. Tier 2.',
    optional: true,
  },
  'bls-ppi': {
    sourcePath: 'data/bls-ppi/current.json',
    assetPath: '/store/bls-ppi.json',
    reason: 'PPI series for material escalation. Tier 2.',
    optional: true,
  },
  'fema-equipment': {
    sourcePath: 'data/fema-equipment/current.json',
    assetPath: '/store/fema-equipment.json',
    reason: 'FEMA equipment cost-proxy schedule. Tier 2.',
    optional: true,
  },
} as const satisfies Record<string, StoreObject>;

export type StoreObjectId = keyof typeof STORE_CATALOG;

export const STORE_OBJECT_IDS = Object.keys(STORE_CATALOG) as StoreObjectId[];

export function storeObject(id: StoreObjectId): StoreObject {
  return STORE_CATALOG[id];
}
