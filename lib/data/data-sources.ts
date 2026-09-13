/**
 * Every source a shipped answer is allowed to name, and the role it plays.
 *
 * `dataset-policy.ts` answers "when is this copy due to be replaced". This file
 * answers the question that comes before it: *what kind of claim* is a figure
 * from this source, and may a calculator's result depend on it at all.
 *
 * The distinction matters because the same page prints numbers of four
 * different kinds next to each other. A 2026 federal bracket is a rule that
 * the IRS fixed and we reproduce. A Freddie Mac average is a measurement of
 * last week's market. A contractor's overhead rate is a CostAnswer assumption.
 * A 6.5% the reader typed is none of those. Printing all four in one font, with
 * one "estimate" disclaimer under them, is how a page ends up looking equally
 * confident about a statute and a guess.
 *
 * Tiers, from the role the number plays and not from who is famous:
 *
 * - **A — calculation source of truth.** The publisher *sets* the number or the
 *   rule. Reproducing it correctly is the whole job; there is nothing to
 *   estimate. IRS brackets, IRS retirement limits, CMS Medicare amounts, GSA
 *   per-diem ceilings, OPM's holiday list.
 * - **B — official observed data.** The publisher *measures* something and we
 *   use the measurement as a default, a benchmark or an input. BLS wages, BEA
 *   parities, Census housing, EIA prices, Freddie Mac's survey.
 * - **C — model calibration.** Real observations that cannot be quoted as a
 *   price on their own, and exist to calibrate or sanity-check a model. FEMA's
 *   reimbursement schedule, NREL's retrofit measure prices, municipal permit
 *   valuations.
 * - **D — CostAnswer model or reader input.** Anything whose value we chose, or
 *   the reader typed. Contractor overhead, waste percentages, a future rate of
 *   return, the mortgage rate somebody pasted from their own quote.
 *
 * Two deliberate departures from the tiering that was proposed for this file:
 * GSA per diem is tier A rather than B, because GSA does not observe lodging
 * prices and report them — it *sets* the maximum a federal traveller may claim,
 * and that ceiling is the answer the per-diem page exists to give. CMS
 * marketplace premiums stay tier B, because the landscape file is a record of
 * what issuers filed rather than a rule, and the premium a given household is
 * actually offered can differ.
 */
import { DATASET_IDS, type DatasetId } from './dataset-policy';

export const DATA_SOURCE_TIERS = ['A', 'B', 'C', 'D'] as const;
export type DataSourceTier = (typeof DATA_SOURCE_TIERS)[number];

/**
 * What a printed figure is, in the reader's terms.
 *
 * `user-entered` is never authored here — it is produced at request time when
 * somebody overrides a default, because no registry can know that in advance.
 */
export const PROVENANCE_CLASSES = ['verified', 'observed', 'modeled', 'user-entered'] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export const PROVENANCE_CLASS_WORDS: Record<ProvenanceClass, string> = {
  verified: 'VERIFIED',
  observed: 'OBSERVED',
  modeled: 'MODELED',
  'user-entered': 'USER ENTERED',
};

export const PROVENANCE_CLASS_MEANING: Record<ProvenanceClass, string> = {
  verified: 'Reproduced from the publication that sets this figure.',
  observed: 'Measured and published by an official statistical agency.',
  modeled: 'A CostAnswer assumption or a figure derived from calibration data, not a published price.',
  'user-entered': 'A figure you typed. It replaces our default and is used exactly as given.',
};

const CLASS_BY_TIER: Record<DataSourceTier, Exclude<ProvenanceClass, 'user-entered'>> = {
  A: 'verified',
  B: 'observed',
  C: 'modeled',
  D: 'modeled',
};

export function provenanceClassForTier(tier: DataSourceTier): ProvenanceClass {
  return CLASS_BY_TIER[tier];
}

/**
 * Sources that carry a release cadence are named by their `DatasetId`, so a
 * manifest entry and a freshness policy cannot drift to different spellings.
 * The rest are pinned documents with no cadence to miss: a tax year's rules do
 * not get re-published weekly, and a manufacturer's yield table changes when
 * the product changes.
 */
export const PINNED_SOURCE_IDS = [
  'aca-subsidy-rules',
  'medicare-rules',
  'va-funding-fee',
  'irs-rmd-tables',
  'opm-federal-holidays',
  'quikrete-concrete-yields',
  'bls-ecec',
  'bls-ppi',
  'census-economic-census-construction',
  'fema-equipment',
  'nrel-remdb',
  'eia-equipment-costs',
  'costanswer-material-basket',
  'costanswer-job-recipes',
] as const;
export type PinnedSourceId = (typeof PINNED_SOURCE_IDS)[number];

export type DataSourceId = DatasetId | PinnedSourceId;

export const DATA_SOURCE_IDS: DataSourceId[] = [...DATASET_IDS, ...PINNED_SOURCE_IDS];

export type DataSourceDefinition = {
  id: DataSourceId;
  tier: DataSourceTier;
  /** Short reader label, printed after the class word: "VERIFIED — IRS 2026". */
  label: string;
  /** The row in `data/source-registry.json` that carries licence and limitations. */
  registryId: string;
  /** The freshness policy, when this source has a release cadence we track. */
  policyId: DatasetId | null;
  /** The specific wrong answer this source produces when used the obvious way. */
  misuse: string;
};

function policyIdOf(id: DataSourceId): DatasetId | null {
  return (DATASET_IDS as readonly string[]).includes(id) ? (id as DatasetId) : null;
}

const DEFINITIONS: Array<Omit<DataSourceDefinition, 'policyId'>> = [
  // Tier A — the publisher sets the number.
  {
    id: 'us-tax',
    tier: 'A',
    label: 'IRS and state revenue departments',
    registryId: 'irs-federal-tax',
    misuse: 'Reproducing a prior year’s bracket for a current-year paycheck.',
  },
  {
    id: 'irs-retirement-limits',
    tier: 'A',
    label: 'IRS retirement contribution limits',
    registryId: 'irs-retirement-limits',
    misuse: 'Applying the elective-deferral limit to employer contributions, which have their own cap.',
  },
  {
    id: 'aca-subsidy-rules',
    tier: 'A',
    label: 'IRS applicable percentages and HHS poverty guidelines',
    registryId: 'aca-subsidy-rules',
    misuse: 'Using the coverage year’s poverty guidelines instead of the prior year’s, which is what the credit actually uses.',
  },
  {
    id: 'medicare-rules',
    tier: 'A',
    label: 'CMS Medicare premiums and IRMAA brackets',
    registryId: 'medicare-rules',
    misuse: 'Reading IRMAA from current income rather than the tax year CMS actually looks back to.',
  },
  {
    id: 'gsa-perdiem',
    tier: 'A',
    label: 'GSA per diem',
    registryId: 'gsa-perdiem',
    misuse: 'Treating the published next-fiscal-year file as effective before 1 October.',
  },
  {
    id: 'opm-federal-holidays',
    tier: 'A',
    label: 'OPM federal holidays',
    registryId: 'opm-federal-holidays',
    misuse: 'Presenting federal holidays as a private employer’s paid-day list.',
  },
  {
    id: 'quikrete-concrete-yields',
    tier: 'A',
    label: 'Manufacturer bag yields',
    registryId: 'quikrete-concrete-yields',
    misuse: 'Applying a bagged-mix yield to ready-mix delivered by the cubic yard.',
  },

  {
    id: 'fhfa-loan-limits',
    tier: 'A',
    label: 'FHFA conforming loan limit values',
    registryId: 'fhfa-loan-limits',
    misuse: 'Treating a November announcement as effective before 1 January, or reading a county limit as a loan approval.',
  },
  {
    id: 'irs-hsa-limits',
    tier: 'A',
    label: 'IRS HSA and HDHP dollar limits',
    registryId: 'irs-hsa-limits',
    misuse: 'Treating a bronze Marketplace plan as an HDHP without checking the deductible and out-of-pocket tests, or putting a spouse’s catch-up in the same HSA.',
  },
  {
    id: 'va-funding-fee',
    tier: 'A',
    label: 'VA funding fee rate charts',
    registryId: 'va-funding-fee',
    misuse: 'Reading the chart as a Certificate of Eligibility, or applying the percentage to the purchase price instead of the loan amount.',
  },
  {
    id: 'irs-rmd-tables',
    tier: 'A',
    label: 'IRS Uniform Lifetime Table',
    registryId: 'irs-rmd-tables',
    misuse: 'Using Table III when the sole beneficiary is a spouse more than 10 years younger, or printing a lifetime RMD for a Roth IRA the owner still holds.',
  },

  // Tier B — the publisher measures the world.
  {
    id: 'bls-cpi',
    tier: 'B',
    label: 'BLS CPI-U',
    registryId: 'bls-cpi',
    misuse: 'Using an all-items index to escalate a single construction material.',
  },
  {
    id: 'bls-oews',
    tier: 'B',
    label: 'BLS OEWS',
    registryId: 'bls-oews',
    misuse: 'Reading an employee wage percentile as what a contractor charges per hour.',
  },
  {
    id: 'bls-grocery',
    tier: 'B',
    label: 'BLS average prices',
    registryId: 'bls-grocery',
    misuse: 'Treating a national average item price as this store’s shelf price.',
  },
  {
    id: 'bls-ppi',
    tier: 'B',
    label: 'BLS Producer Price Index',
    registryId: 'bls-ppi',
    misuse: 'Reading an index level as a dollar price. PPI gives movement, never an absolute.',
  },
  {
    id: 'bls-ecec',
    tier: 'B',
    label: 'BLS Employer Costs for Employee Compensation',
    registryId: 'bls-ecec',
    misuse: 'Presenting a national construction-industry burden as this contractor’s loaded wage.',
  },
  {
    id: 'census-economic-census-construction',
    tier: 'B',
    label: 'Census Economic Census, construction',
    registryId: 'census-economic-census-construction',
    misuse: 'Reading an industry-wide annual ratio as one contractor’s markup on one job, or the residual surplus as a reported profit line.',
  },
  {
    id: 'bea-rpp',
    tier: 'B',
    label: 'BEA Regional Price Parities',
    registryId: 'bea-rpp',
    misuse: 'Applying a whole-basket parity to a nationally traded material.',
  },
  {
    id: 'census-acs5',
    tier: 'B',
    label: 'Census ACS 5-year',
    registryId: 'census-acs5',
    misuse: 'Reading a median as one household’s bill; ACS medians carry margins of error.',
  },
  {
    id: 'census-omb-geography',
    tier: 'B',
    label: 'Census and OMB geography',
    registryId: 'census-omb-geography',
    misuse: 'Treating a ZCTA as a postal ZIP code; they are approximations of each other.',
  },
  {
    id: 'hud-fmr',
    tier: 'B',
    label: 'HUD Fair Market Rents',
    registryId: 'hud-fmr',
    misuse: 'Quoting an FMR as market asking rent. It is a payment-standard percentile, set for a programme.',
  },
  {
    id: 'eia-electricity',
    tier: 'B',
    label: 'EIA retail electricity',
    registryId: 'eia-electricity',
    misuse: 'Using a state average rate in place of a tariff with tiers and fixed charges.',
  },
  {
    id: 'eia-gasoline',
    tier: 'B',
    label: 'EIA weekly gasoline',
    registryId: 'eia-gasoline',
    misuse: 'Applying a regional average to a single station on a single day.',
  },
  {
    id: 'freddie-mac-pmms',
    tier: 'B',
    label: 'Freddie Mac PMMS',
    registryId: 'freddie-mac-pmms',
    misuse: 'Presenting a survey average as a rate a particular borrower is offered.',
  },
  {
    id: 'usda-food-plans',
    tier: 'B',
    label: 'USDA Food Plans',
    registryId: 'usda-food-plans',
    misuse: 'Reading a food-plan cost as observed household spending rather than a normative plan.',
  },
  {
    id: 'naic-insurance',
    tier: 'B',
    label: 'NAIC insurance database',
    registryId: 'naic-insurance',
    misuse: 'Quoting a two-to-three-year-old statewide average as a current premium.',
  },
  {
    id: 'cms-marketplace',
    tier: 'B',
    label: 'CMS marketplace landscape',
    registryId: 'cms-marketplace',
    misuse: 'Treating a filed rating-area premium as the price a specific household is shown.',
  },

  // Tier C — real observations that calibrate a model rather than price a job.
  {
    id: 'fema-equipment',
    tier: 'C',
    label: 'FEMA Schedule of Equipment Rates',
    registryId: 'fema-equipment-rates',
    misuse: 'Quoting a disaster-reimbursement ownership-and-operating rate as a rental market price. Operator labour is not in it.',
  },
  {
    id: 'nrel-remdb',
    tier: 'C',
    label: 'NREL REMDB 2024',
    registryId: 'nrel-remdb',
    misuse: 'Using REMDB’s labour multipliers as installed cost; only its material intercepts are taken.',
  },
  {
    id: 'eia-equipment-costs',
    tier: 'C',
    label: 'EIA residential equipment costs, Appendix A',
    registryId: 'eia-equipment-costs',
    misuse: 'Reading a 2022 typical retail equipment price as today’s price without escalating it.',
  },
  // Tier D — the value is ours, or the reader's.
  {
    id: 'costanswer-material-basket',
    tier: 'D',
    label: 'CostAnswer material basket',
    registryId: 'costanswer-material-basket',
    misuse: 'Reading a national baseline escalated by PPI as a local supplier quote.',
  },
  {
    id: 'costanswer-job-recipes',
    tier: 'D',
    label: 'CostAnswer job recipes',
    registryId: 'costanswer-job-recipes',
    misuse: 'Reading crew size, productivity and markup as measured values rather than reviewed assumptions.',
  },
];

export const DATA_SOURCES: Record<DataSourceId, DataSourceDefinition> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, { ...definition, policyId: policyIdOf(definition.id) }]),
) as Record<DataSourceId, DataSourceDefinition>;

export function isDataSourceId(value: string): value is DataSourceId {
  return Object.prototype.hasOwnProperty.call(DATA_SOURCES, value);
}

export function getDataSource(id: DataSourceId): DataSourceDefinition {
  const source = DATA_SOURCES[id];
  if (!source) throw new Error(`Unknown data source: ${id}`);
  return source;
}

export function provenanceClassOf(id: DataSourceId): ProvenanceClass {
  return provenanceClassForTier(getDataSource(id).tier);
}

/** One line of a calculation receipt: what the figure is, and where it came from. */
export type ProvenanceLine = {
  /** What this figure is used for, in the reader's words. */
  label: string;
  provenanceClass: ProvenanceClass;
  /** Source label, or the reader's own value description for `user-entered`. */
  source: string;
  /** The observation period or effective version, when the source has one. */
  period?: string;
};

export function provenanceLine(input: {
  label: string;
  sourceId: DataSourceId;
  period?: string;
}): ProvenanceLine {
  const source = getDataSource(input.sourceId);
  return {
    label: input.label,
    provenanceClass: provenanceClassForTier(source.tier),
    source: source.label,
    period: input.period,
  };
}

export function userEnteredLine(label: string, value: string): ProvenanceLine {
  return { label, provenanceClass: 'user-entered', source: value };
}

/** "VERIFIED — IRS and state DOR, tax year 2026". */
export function formatProvenanceLine(line: ProvenanceLine): string {
  const head = `${PROVENANCE_CLASS_WORDS[line.provenanceClass]} — ${line.source}`;
  return line.period ? `${head} (${line.period})` : head;
}

export function assertDataSourceIntegrity(): void {
  const seen = new Set<string>();
  for (const definition of DEFINITIONS) {
    if (seen.has(definition.id)) throw new Error(`Duplicate data source ${definition.id}.`);
    seen.add(definition.id);
    if (!definition.label.trim()) throw new Error(`${definition.id} has no reader label.`);
    if (!definition.registryId.trim()) throw new Error(`${definition.id} names no source-registry row.`);
    if (!definition.misuse.trim()) throw new Error(`${definition.id} records no misuse.`);
  }
  for (const datasetId of DATASET_IDS) {
    if (!seen.has(datasetId)) throw new Error(`Dataset ${datasetId} has a freshness policy but no tier.`);
  }
  for (const pinned of PINNED_SOURCE_IDS) {
    if (!seen.has(pinned)) throw new Error(`Pinned source ${pinned} is declared but not defined.`);
  }
}

assertDataSourceIntegrity();
