import { z } from 'zod';
import { STATE_CODES, US_STATES, isStateCode, type StateCode } from '@/lib/location/states';

export const NAIC_INSURANCE_ADAPTER_VERSION = 'naic-insurance-v1.0.0';
export const NAIC_HOMEOWNERS_SOURCE_URL = 'https://content.naic.org/sites/default/files/publication-hmr-zu-homeowners-report.pdf';
export const NAIC_AUTO_SOURCE_URL = 'https://content.naic.org/sites/default/files/publication-aut-pb-auto-insurance-database.pdf';

const amount = z.number().finite().positive().max(100_000);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const code = z.string().refine(isStateCode, 'Expected one of the 50 states or DC.').transform((value) => value as StateCode);
const metricsSchema = z.object({
  homeownersAnnualPremium: amount,
  rentersAnnualPremium: amount,
  autoAnnualExpenditure: amount,
  autoLiabilityAnnualPremium: amount,
  autoCollisionAnnualPremium: amount,
  autoComprehensiveAnnualPremium: amount,
  autoCombinedAnnualPremium: amount,
});
export const insuranceStateRateSchema = metricsSchema.extend({
  stateCode: code,
  stateName: z.string().min(1),
  caveats: z.array(z.string().min(1)),
}).strict();
export type InsuranceStateRate = z.infer<typeof insuranceStateRateSchema>;

const sourceSchema = z.object({
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  observationPeriod: z.string().regex(/^\d{4}$/),
  publicationLabel: z.string().min(1),
  // A month-only date on a report cover is never converted to an invented day.
  publishedAt: z.string().datetime().nullable(),
  publicationPeriod: z.string().regex(/^\d{4}-\d{2}(?:-\d{2})?$/),
  publicationPrecision: z.enum(['month', 'day']),
  pdfSha256: sha,
  tables: z.array(z.string().min(1)).min(1),
}).strict();

export const naicInsuranceSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  adapterVersion: z.literal(NAIC_INSURANCE_ADAPTER_VERSION),
  snapshotId: z.string().min(1),
  provider: z.literal('NAIC'),
  datasetId: z.literal('naic-insurance'),
  frequency: z.literal('reference-year'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  sourceStatus: z.literal('published'),
  fetchedAt: z.string().datetime(),
  verifiedAt: z.string().datetime(),
  sourceUrl: z.literal('https://content.naic.org/publications'),
  sourceDocumentationUrl: z.literal(NAIC_HOMEOWNERS_SOURCE_URL),
  termsUrl: z.literal('https://content.naic.org/terms-and-conditions'),
  attribution: z.string().min(1),
  units: z.literal('USD per year'),
  homeownersPolicyForm: z.literal('HO-3'),
  rentersPolicyForm: z.literal('HO-4'),
  autoExpenditureDenominator: z.literal('liability-insured car-years'),
  sources: z.object({ homeowners: sourceSchema, auto: sourceSchema }).strict(),
  caveats: z.array(z.string()).min(1),
  states: z.array(insuranceStateRateSchema).length(51),
  national: metricsSchema.strict(),
  rawSha256: sha,
  normalizedSha256: sha,
  validationStatus: z.literal('passed'),
  validationReport: z.array(z.string()).min(1),
}).strict().superRefine((snapshot, ctx) => {
  const codes = snapshot.states.map((row) => row.stateCode);
  if (new Set(codes).size !== 51 || STATE_CODES.some((state) => !codes.includes(state))) {
    ctx.addIssue({ code: 'custom', path: ['states'], message: 'Expected every state and DC exactly once.' });
  }
  for (const row of snapshot.states) {
    if (US_STATES[row.stateCode] !== row.stateName) {
      ctx.addIssue({ code: 'custom', message: `State name mismatch: ${row.stateCode}.` });
    }
  }
  for (const row of [...snapshot.states, snapshot.national]) {
    const combined = row.autoLiabilityAnnualPremium + row.autoCollisionAnnualPremium + row.autoComprehensiveAnnualPremium;
    if (Math.abs(combined - row.autoCombinedAnnualPremium) > 0.021) {
      ctx.addIssue({ code: 'custom', message: 'Combined auto premium does not reconcile to its three coverage averages.' });
    }
  }
  if (snapshot.snapshotId !== `naic-insurance-${snapshot.observationPeriod}-v1`
    || Object.values(snapshot.sources).some((source) => source.observationPeriod !== snapshot.observationPeriod)) {
    ctx.addIssue({ code: 'custom', message: 'Snapshot and source observation periods must agree.' });
  }
});
export type NaicInsuranceSnapshot = z.infer<typeof naicInsuranceSnapshotSchema>;

const propertyTotalSchema = z.object({
  geography: z.string().min(1),
  pdfPage: z.number().int().positive(),
  printedPage: z.number().int().positive(),
  writtenPremium: z.number().finite().positive(),
  writtenHouseYears: z.number().finite().positive(),
  annualPremium: amount,
}).strict();
const autoRowSchema = z.object({
  geography: z.string().min(1),
  annualValue: amount,
  previousAnnualValue: amount,
}).strict();
const autoTableSchema = z.object({
  table: z.string(), pdfPage: z.number().int().positive(), printedPage: z.number().int().positive(),
  rows: z.array(autoRowSchema).length(52),
}).strict();
export const naicInsuranceRecordedSchema = z.object({
  schemaVersion: z.literal('naic-insurance-recorded-v1'),
  observationPeriod: z.string().regex(/^\d{4}$/),
  fetchedAt: z.string().datetime(),
  sources: z.object({ homeowners: sourceSchema, auto: sourceSchema }).strict(),
  homeowners: z.array(propertyTotalSchema).length(52),
  renters: z.array(propertyTotalSchema).length(52),
  auto: z.object({ expenditure: autoTableSchema, liability: autoTableSchema, collision: autoTableSchema,
    comprehensive: autoTableSchema, combined: autoTableSchema }).strict(),
}).strict();
export type NaicInsuranceRecorded = z.infer<typeof naicInsuranceRecordedSchema>;

const stateCaveats: Partial<Record<StateCode, string[]>> = {
  CA: ['California auto figures are preliminary in the NAIC report and may be revised.'],
  DC: ['DC is entirely urban; its average is not a like-for-like comparison with states containing rural areas.'],
  MA: ['Massachusetts auto figures include Safe Driver Plan credits and surcharges.'],
  MD: ['Maryland auto figures include the Maryland Automobile Insurance Fund.'],
  NJ: ['New Jersey is predominantly urban. Policyholder dividends are excluded from the reported premiums.'],
  RI: ['Rhode Island is predominantly urban; comparisons with states containing large rural areas require care.'],
  TX: ['Some Texas homeowners forms are similar to, but not identical with, the national policy forms.',
    'Texas auto exposures are approximated from quarterly vehicle counts. Estimated comprehensive exposures affect the combined average, but not average expenditure.'],
};

export function normalizeNaicInsuranceRecorded(raw: unknown, metadata: { rawSha256: string }): Omit<NaicInsuranceSnapshot, 'normalizedSha256'> {
  const recorded = naicInsuranceRecordedSchema.parse(raw);
  const geographies = ['Countrywide', ...STATE_CODES.map((state) => US_STATES[state])];
  for (const rows of [recorded.homeowners, recorded.renters, ...Object.values(recorded.auto).map((table) => table.rows)]) {
    const names = rows.map((row) => row.geography);
    if (new Set(names).size !== 52 || geographies.some((name) => !names.includes(name))) {
      throw new Error('NAIC source table must contain all 50 states, DC and Countrywide exactly once.');
    }
  }
  for (const row of [...recorded.homeowners, ...recorded.renters]) {
    if (Math.abs(row.writtenPremium / row.writtenHouseYears - row.annualPremium) > 0.51) {
      throw new Error(`NAIC property average does not reconcile to written premium / exposure for ${row.geography}.`);
    }
  }
  for (const table of Object.values(recorded.auto)) {
    for (const row of table.rows) {
      if (Math.abs(row.annualValue / row.previousAnnualValue - 1) > 0.8) {
        throw new Error(`NAIC ${table.table} year-over-year change exceeds the review threshold for ${row.geography}.`);
      }
    }
  }
  const metrics = (geography: string) => ({
    homeownersAnnualPremium: recorded.homeowners.find((row) => row.geography === geography)!.annualPremium,
    rentersAnnualPremium: recorded.renters.find((row) => row.geography === geography)!.annualPremium,
    autoAnnualExpenditure: recorded.auto.expenditure.rows.find((row) => row.geography === geography)!.annualValue,
    autoLiabilityAnnualPremium: recorded.auto.liability.rows.find((row) => row.geography === geography)!.annualValue,
    autoCollisionAnnualPremium: recorded.auto.collision.rows.find((row) => row.geography === geography)!.annualValue,
    autoComprehensiveAnnualPremium: recorded.auto.comprehensive.rows.find((row) => row.geography === geography)!.annualValue,
    autoCombinedAnnualPremium: recorded.auto.combined.rows.find((row) => row.geography === geography)!.annualValue,
  });
  return {
    schemaVersion: '1.0.0', adapterVersion: NAIC_INSURANCE_ADAPTER_VERSION,
    snapshotId: `naic-insurance-${recorded.observationPeriod}-v1`, provider: 'NAIC', datasetId: 'naic-insurance',
    frequency: 'reference-year', observationPeriod: recorded.observationPeriod, sourceStatus: 'published',
    fetchedAt: recorded.fetchedAt, verifiedAt: recorded.fetchedAt,
    sourceUrl: 'https://content.naic.org/publications', sourceDocumentationUrl: NAIC_HOMEOWNERS_SOURCE_URL,
    termsUrl: 'https://content.naic.org/terms-and-conditions',
    attribution: 'Source: National Association of Insurance Commissioners. Calculations and interpretation by CostAnswer; not endorsed by NAIC.',
    units: 'USD per year', homeownersPolicyForm: 'HO-3', rentersPolicyForm: 'HO-4',
    autoExpenditureDenominator: 'liability-insured car-years', sources: recorded.sources,
    caveats: [
      'These are observed 2023 annual averages, not current prices or personalized insurance quotes. No inflation or individual risk multiplier is applied.',
      'Homeowners HO-3 and renters HO-4 figures average different limits, deductibles, properties and policyholders. They are not standardized coverage quotes.',
      'Auto average expenditure divides total liability, collision and comprehensive written premium by liability-insured car-years; some vehicles do not carry all three coverages.',
      'Combined auto premium adds three separately averaged coverage premiums. It is not a guaranteed full-coverage quote or a minimum-liability quote.',
      'State averages are not like-for-like comparisons. The source does not publish a personalized prediction interval.',
    ],
    states: STATE_CODES.map((stateCode) => ({ stateCode, stateName: US_STATES[stateCode], ...metrics(US_STATES[stateCode]), caveats: stateCaveats[stateCode] ?? [] })),
    national: metrics('Countrywide'), rawSha256: metadata.rawSha256, validationStatus: 'passed',
    validationReport: ['Validated source schema and USD/year units.', 'Every source table includes all 50 states, DC and Countrywide exactly once.',
      'HO-3 and HO-4 published averages reconcile to written premium divided by house-years, allowing reported rounding.',
      'Auto component means reconcile to combined means within two cents.', 'Auto previous-year changes pass an 80% review threshold.',
      'Source PDF hashes, source table/page references and exact date precision retained.', 'No credentials or provider secrets are stored.'],
  };
}
