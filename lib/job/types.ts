import type { ConfidenceLevel } from '@/lib/calculators/depth';
import type { StateCode } from '@/lib/location/states';
import type { JobId } from './catalog';

export type { ConfidenceLevel };

export type SourcedValue<T> = {
  value: T;
  sourceId: string;
};

export type RecipeSource =
  | { kind: 'official_data'; provider: string; url: string; retrievedAt: string }
  | { kind: 'published_specification'; publisher: string; document: string; retrievedAt: string }
  | {
      kind: 'observed_market';
      dataset: string;
      observations: number;
      window: string;
    }
  | {
      kind: 'model_transformation';
      inputs: string[];
      method: string;
      rationale: string;
      confidenceImpact: 'none' | 'lowers_to_medium' | 'lowers_to_low';
      reviewedBy: string;
      reviewedAt: string;
    }
  | {
      kind: 'model_assumption';
      rationale: string;
      confidenceImpact: 'none' | 'lowers_to_medium' | 'lowers_to_low';
      reviewedBy: string;
      reviewedAt: string;
    };

export type JobUnit = 'roof-square' | 'each' | 'sq-ft' | 'linear-ft';

export type TradeId =
  | 'roofing'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'tree'
  | 'carpentry'
  | 'glazing'
  | 'drywall'
  | 'fencing'
  | 'concrete'
  | 'painting'
  | 'multi';

export type MaterialUnit = 'each' | 'sq-ft' | 'sq-yd' | 'linear-ft' | 'cubic-yard' | 'roof-square' | 'gallon' | 'hour';

export type QualityTier = 'builder' | 'mid' | 'premium';

export type CrewMember = {
  socCode: string;
  role: string;
  count: SourcedValue<number>;
};

export type MaterialLine = {
  componentId: string;
  quantityPerUnit: SourcedValue<number>;
  wastePercent: SourcedValue<number>;
  critical: boolean;
};

export type EquipmentLine = {
  rateId: string;
  hoursPerUnit: SourcedValue<number>;
  label: string;
};

export type PermitRule =
  | { kind: 'excluded'; note: string }
  | { kind: 'flat'; amountCents: SourcedValue<number> }
  | { kind: 'percent_of_direct'; rate: SourcedValue<number> };

export type DisposalRule =
  | { kind: 'excluded'; note: string }
  | { kind: 'flat'; amountCents: SourcedValue<number> };

export type ModifierOption = {
  id: string;
  label: string;
  factor: SourcedValue<number>;
  addCents: SourcedValue<number>;
  extreme: boolean;
};

export type ModifierSpec = {
  id: string;
  label: string;
  options: ModifierOption[];
  defaultOptionId: string;
};

export type JobRecipe = {
  jobId: JobId;
  version: string;
  unit: JobUnit;
  trade: TradeId;
  crew: CrewMember[];
  laborHoursPerUnit: SourcedValue<number>;
  materials: MaterialLine[];
  equipment: EquipmentLine[];
  permit: PermitRule;
  disposal: DisposalRule;
  modifiers: ModifierSpec[];
  overheadRate: SourcedValue<number>;
  profitMarkupRate: SourcedValue<number>;
  contingencyRate: SourcedValue<number>;
  baseConfidence: ConfidenceLevel;
  sources: Record<string, RecipeSource>;
};

export type JobLocation = {
  zip: string;
  provenance: 'approximate-zip-zcta';
  provenanceLabel: string;
  countyGeoid: string;
  countyName: string;
  state: StateCode;
  stateName: string;
  additionalCountyCount: number;
};

export type OewsWageInput = {
  socCode: string;
  hourlyMedian: number | null;
  area: 'US' | StateCode;
  usedNationalFallback: boolean;
  snapshotId: string;
  occupationTitle: string;
};

export type EcecSnapshot = {
  snapshotId: string;
  datasetId: 'bls-ecec';
  observationPeriod: string;
  fetchedAt: string;
  publishedAt: string;
  sourceUrl: string;
  attribution: string;
  industry: 'construction';
  totalCompensationHourly: number;
  wagesAndSalariesHourly: number;
  loadingFactor: number;
  normalizedSha256: string;
};

export type PpiSeries = {
  seriesId: string;
  observations: Array<{ period: string; index: number }>;
};

export type PpiSnapshot = {
  snapshotId: string;
  datasetId: 'bls-ppi';
  observationPeriod: string;
  fetchedAt: string;
  publishedAt: string;
  sourceUrl: string;
  attribution: string;
  series: Record<string, PpiSeries>;
  normalizedSha256: string;
};

export type FemaEquipmentRate = {
  rateId: string;
  description: string;
  unit: 'hour' | 'mile';
  rateCents: number;
};

export type FemaEquipmentSnapshot = {
  snapshotId: string;
  datasetId: 'fema-equipment';
  observationPeriod: string;
  fetchedAt: string;
  publishedAt: string;
  sourceUrl: string;
  attribution: string;
  disclaimer: string;
  rates: FemaEquipmentRate[];
  normalizedSha256: string;
};

export type MaterialComponent = {
  componentId: string;
  unit: MaterialUnit;
  qualityTier: QualityTier;
  baselinePriceCents: number;
  baselineDate: string;
  baselineSource: { name: string; url: string };
  ppiSeriesId: string;
  regionalAdjustment: 'none';
  critical: boolean;
};

export type MaterialBasketSnapshot = {
  snapshotId: string;
  datasetId: 'material-basket';
  observationPeriod: string;
  fetchedAt: string;
  publishedAt: string;
  attribution: string;
  components: MaterialComponent[];
  normalizedSha256: string;
};

export type JobDatasets = {
  ecec: EcecSnapshot | null;
  ppi: PpiSnapshot | null;
  fema: FemaEquipmentSnapshot | null;
  basket: MaterialBasketSnapshot | null;
  wages: OewsWageInput[];
  rppAllItems: number | null;
};

export type JobEstimateInput = {
  jobId: JobId;
  zip: string;
  units: number;
  modifiers: Record<string, string>;
  /** Per-component quantity multipliers (tonnage, slab thickness). Default 1. */
  materialFactors?: Record<string, number>;
};

export type NamedMoneyStep = {
  id: string;
  label: string;
  cents: number;
  detail?: string;
};

export type QuoteVerdict =
  | 'below our estimated range'
  | 'at the low end'
  | 'within our estimated range'
  | 'at the high end'
  | 'above our estimated range'
  | 'outside what we can assess';

export type JobEstimate = {
  jobId: JobId;
  jobTitle: string;
  status: 'complete' | 'incomplete';
  completenessReasons: string[];
  unit: JobUnit;
  units: number;
  location: JobLocation;
  range: { lowCents: number; expectedCents: number; highCents: number } | null;
  rangeLabel: 'CostAnswer estimated range';
  confidence: ConfidenceLevel | null;
  confidenceReasons: string[];
  labor: NamedMoneyStep[];
  materials: NamedMoneyStep[];
  equipment: NamedMoneyStep[];
  permit: NamedMoneyStep | null;
  disposal: NamedMoneyStep | null;
  overhead: NamedMoneyStep;
  profitMarkup: NamedMoneyStep;
  contingency: NamedMoneyStep;
  modifiers: NamedMoneyStep[];
  unpricedCritical: string[];
  unpricedNonCritical: string[];
  femaProxyNote: string;
  geographyNote: string;
  snapshotIds: string[];
};

export type QuoteCheckInput = JobEstimateInput & {
  contractorQuoteCents: number;
};

export type QuoteCheckResult = {
  estimate: JobEstimate;
  contractorQuoteCents: number;
  verdict: QuoteVerdict;
  reasonsAHigherQuoteCanBeCorrect: string[];
};
