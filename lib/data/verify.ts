/**
 * Snapshot integrity checks.
 *
 * Hashing a snapshot and re-parsing it against its schema proves the committed
 * bytes are the reviewed ones, so it is a *publication* guarantee: it holds for
 * a given commit, not for a given request. `npm run verify:data`,
 * `npm run verify:tax`, and tests/data-and-registry.spec.ts run every check
 * here against the files on disk before anything ships.
 *
 * These used to run at module scope inside the snapshot modules themselves,
 * which meant every browser re-ran SHA-256 and zod over megabytes of JSON
 * during hydration — a third of a second of blocked main thread on a fast
 * desktop for the cost-of-living page alone, several times that on a phone.
 * Keeping them in their own module means the runtime bundle never pulls the
 * hashing or the envelope schemas in at all.
 */
import currentAcsJson from '@/data/census-acs/current.json';
import currentBeaJson from '@/data/bea-rpp/current.json';
import currentCpiJson from '@/data/bls-cpi/current.json';
import currentElectricityJson from '@/data/eia/current.json';
import currentGasolineJson from '@/data/eia-gasoline/current.json';
import currentGeographyJson from '@/data/geography/current.json';
import currentPerDiemJson from '@/data/gsa-perdiem/current.json';
import currentZctaJson from '@/data/zcta-county/current.json';
import currentGroceryJson from '@/data/bls/current.json';
import oewsIndexJson from '@/data/bls-oews/index.json';
import oewsManifestJson from '@/data/bls-oews/manifest.json';
import currentHudJson from '@/data/hud-fmr/current.json';
import currentIrsRetirementJson from '@/data/irs-retirement/current.json';
import currentMortgageRateJson from '@/data/freddie-mac/current.json';
import currentTaxJson from '@/data/tax/2026.json';
import currentUsdaJson from '@/data/usda-food/current.json';
import hudReleasesJson from '@/data/hud-fmr/releases.json';
import hudFy2026Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2026-revised-2026-05-21-v1.json';
import hudFy2027Json from '@/data/hud-fmr/snapshots/hud-fmr-fy2027-v1.json';
import { z } from 'zod';
import { assertManifestMatchesSnapshot, assertNormalizedHash, snapshotRecordFromEnvelope, type SnapshotEnvelope } from './envelope';
import { sha256 } from './sha256';
import { beaRppSnapshotSchema } from './bea-rpp';
import { blsCpiSnapshotSchema } from './bls-cpi';
import { blsGrocerySnapshotSchema } from './bls-grocery';
import { blsOewsIndexSchema, type BlsOewsIndex } from './bls-oews';
import { censusAcsSnapshotSchema } from './census-acs';
import { eiaElectricitySnapshotSchema } from './eia-electricity';
import { eiaGasolineSnapshotSchema } from './eia-gasoline';
import { freddieMacPmmsSnapshotSchema } from './freddie-mac-pmms';
import { geographySnapshotSchema } from './geography';
import { gsaPerDiemSnapshotSchema } from './gsa-perdiem';
import { zctaCountySnapshotSchema } from './zcta-county';
import { hudFmrSnapshotSchema } from './hud-fmr';
import { irsRetirementSnapshotSchema } from './irs-retirement';
import { usdaFoodSnapshotSchema } from './usda-food';
import { taxYearSnapshotSchema, type TaxYearSnapshot } from './tax/schema';

/** Manifest shape shared by every dataset; `period` narrows the cadence a feed publishes on. */
function manifestSchema(period: z.ZodType<string> = z.string()) {
  return z.object({
    currentSnapshotId: z.string(),
    observationPeriod: period,
    normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
    validationStatus: z.literal('passed'),
  }).strict();
}

const MONTHLY = z.string().regex(/^\d{4}-\d{2}$/);
const CPI_MONTHLY = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const DAILY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Every dataset stamps its own identity and hash into the snapshot body. */
type VerifiableSnapshot = { snapshotId: string; observationPeriod: string; normalizedSha256: string };

function envelopeValidator<Snapshot extends VerifiableSnapshot>(
  snapshotSchema: z.ZodType<Snapshot>,
  label: string,
  period?: z.ZodType<string>,
): (rawEnvelope: unknown) => SnapshotEnvelope<Snapshot> {
  const envelopeSchema = z.object({
    manifest: manifestSchema(period),
    snapshot: snapshotSchema,
  }).strict();
  return function validate(rawEnvelope: unknown) {
    const computed = assertNormalizedHash(
      snapshotRecordFromEnvelope(rawEnvelope, `Bundled ${label}`),
      `Bundled ${label} data`,
    );
    const envelope = envelopeSchema.parse(rawEnvelope) as SnapshotEnvelope<Snapshot>;
    assertManifestMatchesSnapshot(envelope.manifest, envelope.snapshot, computed, label);
    return envelope;
  };
}

export const validateAcsEnvelope = envelopeValidator(censusAcsSnapshotSchema, 'Census ACS');
export const validateBeaRppEnvelope = envelopeValidator(beaRppSnapshotSchema, 'BEA RPP');
export const validateCpiEnvelope = envelopeValidator(blsCpiSnapshotSchema, 'BLS CPI', CPI_MONTHLY);
export const validateElectricityEnvelope = envelopeValidator(eiaElectricitySnapshotSchema, 'EIA electricity', MONTHLY);
export const validateGasolineEnvelope = envelopeValidator(eiaGasolineSnapshotSchema, 'EIA gasoline', DAILY);
export const validateGeographyEnvelope = envelopeValidator(geographySnapshotSchema, 'Geography');
export const validateGroceryEnvelope = envelopeValidator(blsGrocerySnapshotSchema, 'BLS grocery', MONTHLY);
export const validateGsaPerDiemEnvelope = envelopeValidator(gsaPerDiemSnapshotSchema, 'GSA per diem');
export const validateZctaCountyEnvelope = envelopeValidator(zctaCountySnapshotSchema, 'Census ZCTA-county');
export const validateHudEnvelope = envelopeValidator(hudFmrSnapshotSchema, 'HUD FMR');
export const validateIrsRetirementEnvelope = envelopeValidator(irsRetirementSnapshotSchema, 'IRS retirement limits');
export const validateMortgageRateEnvelope = envelopeValidator(freddieMacPmmsSnapshotSchema, 'Freddie Mac PMMS', DAILY);
export const validateUsdaFoodEnvelope = envelopeValidator(usdaFoodSnapshotSchema, 'USDA Food Plans');

/**
 * OEWS commits an index and a manifest rather than a snapshot envelope.
 *
 * Its normalized snapshot is 12 MB and stays out of the repository, so what can
 * be checked here is that the index the application imports names the same
 * release the manifest promoted. The snapshot's own hash is proved separately,
 * by `npm run data:oews:rebuild` regenerating it from the committed archives and
 * refusing to write anything that does not hash to the manifest's value.
 */
export function validateOewsIndex(rawIndex: unknown, rawManifest: unknown): BlsOewsIndex {
  const index = blsOewsIndexSchema.parse(rawIndex);
  const manifest = manifestSchema().parse(rawManifest);
  if (
    manifest.currentSnapshotId !== index.snapshotId
    || manifest.observationPeriod !== index.observationPeriod
    || manifest.normalizedSha256 !== index.normalizedSha256
  ) {
    throw new Error('Bundled OEWS index does not describe the promoted manifest.');
  }
  return index;
}

/** HUD publishes a release calendar alongside the snapshots it selects between. */
const hudReleasesSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  releases: z.array(z.object({
    snapshotId: z.string(),
    fiscalYear: z.number().int(),
    publishedAt: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
    revisionId: z.string(),
    latestPublished: z.boolean(),
  }).strict()).min(1),
}).strict();

/** Tax years ship as a bare snapshot rather than a manifest envelope. */
export function validateTaxYearSnapshot(rawSnapshot: unknown): TaxYearSnapshot {
  if (!rawSnapshot || typeof rawSnapshot !== 'object' || !('normalizedSha256' in rawSnapshot)) {
    throw new Error('Bundled tax snapshot is missing its normalized hash.');
  }
  const { normalizedSha256: embeddedNormalizedHash, ...hashableSnapshot } = rawSnapshot as Record<string, unknown>;
  const computedNormalizedHash = sha256(JSON.stringify(hashableSnapshot));
  if (computedNormalizedHash !== embeddedNormalizedHash) {
    throw new Error('Bundled tax data failed its normalized SHA-256 integrity check.');
  }
  const snapshot = taxYearSnapshotSchema.parse(rawSnapshot);
  if (snapshot.normalizedSha256 !== computedNormalizedHash) {
    throw new Error('Tax snapshot hash does not match the parsed document.');
  }
  return snapshot;
}

/**
 * Re-verify every snapshot the app reads at runtime, in one pass.
 *
 * This is the check the runtime modules no longer perform. Tests call it so a
 * corrupted or hand-edited snapshot still fails the build rather than reaching
 * a browser.
 */
export function verifyBundledSnapshots(): void {
  validateAcsEnvelope(currentAcsJson);
  validateBeaRppEnvelope(currentBeaJson);
  validateCpiEnvelope(currentCpiJson);
  validateElectricityEnvelope(currentElectricityJson);
  validateGasolineEnvelope(currentGasolineJson);
  validateGeographyEnvelope(currentGeographyJson);
  validateGroceryEnvelope(currentGroceryJson);
  validateOewsIndex(oewsIndexJson, oewsManifestJson);
  validateGsaPerDiemEnvelope(currentPerDiemJson);
  validateZctaCountyEnvelope(currentZctaJson);
  validateHudEnvelope(currentHudJson);
  validateIrsRetirementEnvelope(currentIrsRetirementJson);
  validateMortgageRateEnvelope(currentMortgageRateJson);
  validateUsdaFoodEnvelope(currentUsdaJson);
  validateTaxYearSnapshot(currentTaxJson);
  hudFmrSnapshotSchema.parse(hudFy2026Json);
  hudFmrSnapshotSchema.parse(hudFy2027Json);
  hudReleasesSchema.parse(hudReleasesJson);
}
