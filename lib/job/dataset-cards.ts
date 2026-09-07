import { readStoreJsonSync } from '@/lib/data/store';
import type { EcecSnapshot, FemaEquipmentSnapshot, MaterialBasketSnapshot, PpiSnapshot } from './types';

export type JobDatasetCard = {
  id: string;
  title: string;
  body: string;
  observationPeriod: string;
  snapshotId: string;
  attribution: string;
  sourceUrl?: string;
};

function card(
  loaded: { observationPeriod: string; snapshotId: string; attribution: string; sourceUrl?: string } | null,
  id: string,
  title: string,
  body: string,
  sourceUrl?: string,
): JobDatasetCard {
  if (!loaded) {
    return {
      id,
      title,
      body: `${body} This copy is not on disk yet.`,
      observationPeriod: 'unavailable',
      snapshotId: 'missing',
      attribution: 'Not ingested.',
      sourceUrl,
    };
  }
  return {
    id,
    title,
    body,
    observationPeriod: loaded.observationPeriod,
    snapshotId: loaded.snapshotId,
    attribution: loaded.attribution,
    sourceUrl: loaded.sourceUrl ?? sourceUrl,
  };
}

/** Summaries for `/methodology/data`. These IDs are not in DATASET_IDS; they have no quarterly freshness SLA yet. */
export function jobCostDatasetCards(): JobDatasetCard[] {
  const ecec = readStoreJsonSync<EcecSnapshot>('bls-ecec');
  const ppi = readStoreJsonSync<PpiSnapshot>('bls-ppi');
  const fema = readStoreJsonSync<FemaEquipmentSnapshot>('fema-equipment');
  const basket = readStoreJsonSync<MaterialBasketSnapshot>('job-material-basket');
  return [
    card(
      ecec,
      'bls-ecec',
      'BLS ECEC construction labor loading',
      'National construction total compensation divided by wages and salaries. Used as a modelled burden on OEWS hourly wages, not as this city’s contractor loaded wage.',
      ecec?.sourceUrl ?? 'https://www.bls.gov/news.release/ecec.t04.htm',
    ),
    card(
      ppi ? { ...ppi, sourceUrl: ppi.sourceUrl } : null,
      'bls-ppi',
      'BLS Producer Price Index (material escalation)',
      'Commodity indexes used to move a dated national material baseline forward. Missing series freeze at 1.0 and are labelled.',
      ppi?.sourceUrl ?? 'https://www.bls.gov/ppi/',
    ),
    card(
      fema,
      'fema-equipment',
      'FEMA Schedule of Equipment Rates',
      'A public cost proxy for ownership and operating cost. Not a contractor market rental quote. Operator labor is not in the rate.',
      fema?.sourceUrl ?? 'https://www.fema.gov/assistance/public/tools-resources/schedule-equipment-rates',
    ),
    card(
      basket,
      'material-basket',
      'CostAnswer material basket',
      'Sourced national baselines for published recipe components (EIA CAC+furnace, ASHP, and gas/electric water-heater retail; NREL REMDB panel and envelope intercepts; NRMCA ready-mix; public paint and lumber procurement; manufacturer bath fixtures). An unpriced critical line still blocks a complete CostAnswer estimated range. No guessed retail prices.',
    ),
  ];
}
