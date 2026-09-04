import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import { energyCostFromKwh, fuelCostFromGallons } from './energy';
import type { ElectricityStateRate } from '@/lib/data/eia-electricity';
import { groceryItemsWithRegions, type BlsGrocerySnapshot, type GroceryItem } from '@/lib/data/bls-grocery';
import type { EiaGasolineSnapshot } from '@/lib/data/eia-gasoline';
import { CENSUS_REGION_IDS, getCensusRegion, getCensusRegionLabel } from '@/lib/location/census-regions';
import { gasolineGeographyForState } from '@/lib/location/gasoline-geography';
import { getStateName, isStateCode, STATE_CODES, type StateCode } from '@/lib/location/states';

export const WHERE_CHEAPER_VERSION = 'where-cheaper-v1.0.0';
export const BASKET_KINDS = ['electricity', 'gasoline', 'grocery', 'household'] as const;
export type BasketKind = (typeof BASKET_KINDS)[number];

export const GROCERY_SAMPLE_QUANTITIES = {
  'bananas-lb': 2,
} as const;

function grocerySampleQuantity(itemId: string): number {
  return itemId === 'bananas-lb' ? GROCERY_SAMPLE_QUANTITIES['bananas-lb'] : 1;
}

export const whereCheaperInputSchema = z.object({
  kind: z.enum(BASKET_KINDS),
  homeState: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  compareState: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  monthlyKwh: finiteNumber('Monthly electricity use', 0, 100_000),
  monthlyGallons: finiteNumber('Monthly gasoline use', 0, 2_000),
});

export type WhereCheaperInput = z.infer<typeof whereCheaperInputSchema>;

export type RankedPlace = {
  stateCode: StateCode;
  stateName: string;
  amount: number;
  unitPrice: number;
  unitLabel: string;
  geographyLabel: string;
  geographyKind: 'state' | 'padd' | 'census-region';
  rank: number;
  tiedCount: number;
};

export type GroceryStapleRow = {
  id: string;
  name: string;
  unitLabel: string;
  national: number;
  home: number | null;
  compare: number | null;
  geographyNote: string;
};

export type WhereCheaperValue = {
  kind: BasketKind;
  home: RankedPlace;
  compare: RankedPlace;
  cheaperPlace: 'home' | 'compare' | 'tie';
  savings: number;
  cheapest: RankedPlace;
  mostExpensive: RankedPlace;
  ranked: RankedPlace[];
  uniqueGeographies: Array<{ label: string; amount: number; rank: number; stateCount: number }>;
  /**
   * Where the home place sits among the *published* geographies.
   *
   * Ranking states was misleading wherever the provider does not publish by
   * state. BLS prices these staples for four census regions, so all 17 southern
   * states carry one number; saying "Texas ranks 13 of 51" implied 51
   * measurements where there are four. This ranks the geography that was
   * actually measured, and names it.
   */
  geographyRanking: {
    /** What one rank position represents, e.g. "census regions". */
    unitLabel: string;
    /** The measured geography the home state belongs to. */
    homeLabel: string;
    homeRank: number;
    total: number;
    /** True when several states share the home geography's single published figure. */
    sharedAcrossStates: boolean;
    statesSharing: number;
  };
  groceryStaples: GroceryStapleRow[];
  benchmarkLabel: string;
  benchmarkAmount: number;
};

export type WhereCheaperDatasets = {
  electricity: ElectricityStateRate[];
  electricitySnapshotId: string;
  gasoline: EiaGasolineSnapshot;
  grocery: BlsGrocerySnapshot;
};

type PlaceSeed = Omit<RankedPlace, 'rank' | 'tiedCount'>;

function rankPlaces(rows: PlaceSeed[]): RankedPlace[] {
  const sorted = [...rows].sort((left, right) => left.amount - right.amount || left.stateCode.localeCompare(right.stateCode));
  const tiedCountByAmount = new Map<number, number>();
  for (const row of sorted) tiedCountByAmount.set(row.amount, (tiedCountByAmount.get(row.amount) ?? 0) + 1);
  let rank = 1;
  return sorted.map((row, index) => {
    if (index > 0 && sorted[index - 1].amount !== row.amount) rank = index + 1;
    return { ...row, rank, tiedCount: tiedCountByAmount.get(row.amount) ?? 1 };
  });
}

const GEOGRAPHY_UNIT_LABELS: Record<RankedPlace['geographyKind'], string> = {
  state: 'states',
  padd: 'published fuel regions',
  'census-region': 'census regions',
};

function geographyRanking(
  ranked: RankedPlace[],
  home: RankedPlace,
  geographies: WhereCheaperValue['uniqueGeographies'],
): WhereCheaperValue['geographyRanking'] {
  const ordered = [...geographies].sort((left, right) => left.amount - right.amount || left.label.localeCompare(right.label));
  let position = 1;
  const positions = ordered.map((row, index) => {
    if (index > 0 && ordered[index - 1].amount !== row.amount) position = index + 1;
    return { ...row, position };
  });
  const homeRow = positions.find((row) => row.label === home.geographyLabel);
  if (!homeRow) throw new Error(`Home geography ${home.geographyLabel} is missing from the ranked set.`);
  // A mixed set (some states priced directly, some folded into a fuel region)
  // has no single honest unit, so it falls back to naming the places compared.
  const kinds = new Set(ranked.map((row) => row.geographyKind));
  const unitLabel = kinds.size === 1
    ? GEOGRAPHY_UNIT_LABELS[[...kinds][0]]
    : 'published price areas';
  return {
    unitLabel,
    homeLabel: home.geographyLabel,
    homeRank: homeRow.position,
    total: positions.length,
    sharedAcrossStates: homeRow.stateCount > 1,
    statesSharing: homeRow.stateCount,
  };
}

function uniqueGeographies(ranked: RankedPlace[]): WhereCheaperValue['uniqueGeographies'] {
  const seen = new Map<string, WhereCheaperValue['uniqueGeographies'][number]>();
  for (const row of ranked) {
    const existing = seen.get(row.geographyLabel);
    if (existing) {
      existing.stateCount += 1;
      continue;
    }
    seen.set(row.geographyLabel, {
      label: row.geographyLabel,
      amount: row.amount,
      rank: row.rank,
      stateCount: 1,
    });
  }
  return [...seen.values()].sort((left, right) => left.amount - right.amount || left.label.localeCompare(right.label));
}

function groceryBasketCost(item: GroceryItem, region: ReturnType<typeof getCensusRegion>): number | null {
  if (!item.regions) return null;
  const price = item.regions[region]?.dollars;
  if (price === undefined) return null;
  const quantity = grocerySampleQuantity(item.id);
  return price * quantity;
}

function electricityPlaces(electricity: ElectricityStateRate[], monthlyKwh: number): PlaceSeed[] {
  return electricity.map((row) => ({
    stateCode: row.stateCode,
    stateName: row.stateName,
    amount: round(energyCostFromKwh({ kwh: monthlyKwh, centsPerKwh: row.priceCentsPerKwh }).cost),
    unitPrice: row.priceCentsPerKwh,
    unitLabel: '¢/kWh',
    geographyLabel: `${row.stateName} residential average`,
    geographyKind: 'state',
  }));
}

function gasolinePlaces(gasoline: EiaGasolineSnapshot, monthlyGallons: number): PlaceSeed[] {
  const byCode = new Map(gasoline.geographies.map((row) => [row.code, row]));
  return STATE_CODES.map((stateCode) => {
    const geography = byCode.get(gasolineGeographyForState(stateCode));
    if (!geography) throw new Error(`No gasoline geography for ${stateCode}`);
    return {
      stateCode,
      stateName: getStateName(stateCode),
      amount: round(fuelCostFromGallons(monthlyGallons, geography.dollarsPerGallon)),
      unitPrice: geography.dollarsPerGallon,
      unitLabel: '$/gal',
      geographyLabel: geography.kind === 'state'
        ? `${geography.name} weekly regular`
        : `${geography.name} weekly regular`,
      geographyKind: geography.kind === 'state' ? 'state' : 'padd',
    };
  });
}

function groceryPlaces(grocery: BlsGrocerySnapshot): PlaceSeed[] {
  const regionalItems = groceryItemsWithRegions(grocery.items);
  return STATE_CODES.map((stateCode) => {
    const region = getCensusRegion(stateCode);
    const amount = round(regionalItems.reduce((total, item) => {
      const cost = groceryBasketCost(item, region);
      if (cost === null) throw new Error(`Incomplete grocery basket for ${region}`);
      return total + cost;
    }, 0));
    return {
      stateCode,
      stateName: getStateName(stateCode),
      amount,
      unitPrice: amount,
      unitLabel: 'sample basket',
      geographyLabel: `${getCensusRegionLabel(region)} census region`,
      geographyKind: 'census-region',
    };
  });
}

function householdPlaces(
  electricity: ElectricityStateRate[],
  gasoline: EiaGasolineSnapshot,
  monthlyKwh: number,
  monthlyGallons: number,
): PlaceSeed[] {
  const power = new Map(electricityPlaces(electricity, monthlyKwh).map((row) => [row.stateCode, row]));
  const fuel = new Map(gasolinePlaces(gasoline, monthlyGallons).map((row) => [row.stateCode, row]));
  return STATE_CODES.map((stateCode) => {
    const homePower = power.get(stateCode);
    const homeFuel = fuel.get(stateCode);
    if (!homePower || !homeFuel) throw new Error(`Missing household energy rows for ${stateCode}`);
    return {
      stateCode,
      stateName: getStateName(stateCode),
      amount: round(homePower.amount + homeFuel.amount),
      unitPrice: round(homePower.amount + homeFuel.amount),
      unitLabel: 'electricity + gasoline',
      geographyLabel: `${homePower.geographyLabel} · ${homeFuel.geographyLabel}`,
      geographyKind: homeFuel.geographyKind === 'state' && homePower.geographyKind === 'state' ? 'state' : 'padd',
    };
  });
}

function groceryStaples(grocery: BlsGrocerySnapshot, home: StateCode, compare: StateCode): GroceryStapleRow[] {
  const homeRegion = getCensusRegion(home);
  const compareRegion = getCensusRegion(compare);
  return grocery.items.map((item) => {
    const homePrice = item.regions?.[homeRegion]?.dollars ?? null;
    const comparePrice = item.regions?.[compareRegion]?.dollars ?? null;
    return {
      id: item.id,
      name: item.name,
      unitLabel: item.unitLabel,
      national: item.national.dollars,
      home: homePrice,
      compare: comparePrice,
      geographyNote: item.regions && CENSUS_REGION_IDS.every((region) => item.regions?.[region])
        ? 'Census-region average retail'
        : 'U.S. city average only',
    };
  });
}

function placesForKind(input: WhereCheaperInput, datasets: WhereCheaperDatasets): PlaceSeed[] {
  switch (input.kind) {
    case 'electricity':
      return electricityPlaces(datasets.electricity, input.monthlyKwh);
    case 'gasoline':
      return gasolinePlaces(datasets.gasoline, input.monthlyGallons);
    case 'grocery':
      return groceryPlaces(datasets.grocery);
    case 'household':
      return householdPlaces(datasets.electricity, datasets.gasoline, input.monthlyKwh, input.monthlyGallons);
    default: {
      const exhaustive: never = input.kind;
      throw new Error(`Unhandled basket kind: ${exhaustive}`);
    }
  }
}

function snapshotIdsForKind(kind: BasketKind, datasets: WhereCheaperDatasets): string[] {
  switch (kind) {
    case 'electricity':
      return [datasets.electricitySnapshotId];
    case 'gasoline':
      return [datasets.gasoline.snapshotId];
    case 'grocery':
      return [datasets.grocery.snapshotId];
    case 'household':
      return [datasets.electricitySnapshotId, datasets.gasoline.snapshotId];
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled basket kind: ${exhaustive}`);
    }
  }
}

function benchmark(kind: BasketKind, ranked: RankedPlace[], datasets: WhereCheaperDatasets, input: WhereCheaperInput): { label: string; amount: number } {
  switch (kind) {
    case 'electricity': {
      const sales = datasets.electricity.reduce((total, row) => total + row.salesMillionKwh, 0);
      const revenue = datasets.electricity.reduce((total, row) => total + row.revenueMillionDollars, 0);
      const cents = 100 * revenue / sales;
      return { label: 'U.S. sales-weighted residential average', amount: round(energyCostFromKwh({ kwh: input.monthlyKwh, centsPerKwh: cents }).cost) };
    }
    case 'gasoline': {
      const us = datasets.gasoline.geographies.find((row) => row.code === 'NUS');
      if (!us) throw new Error('Gasoline snapshot is missing the U.S. series.');
      return { label: 'U.S. weekly regular average', amount: round(fuelCostFromGallons(input.monthlyGallons, us.dollarsPerGallon)) };
    }
    case 'grocery': {
      const regionalItems = groceryItemsWithRegions(datasets.grocery.items);
      const amount = round(regionalItems.reduce((total, item) => {
        const quantity = grocerySampleQuantity(item.id);
        return total + item.national.dollars * quantity;
      }, 0));
      return { label: 'U.S. city-average sample basket', amount };
    }
    case 'household': {
      const power = benchmark('electricity', ranked, datasets, input);
      const fuel = benchmark('gasoline', ranked, datasets, input);
      return { label: 'U.S. electricity + gasoline benchmark', amount: round(power.amount + fuel.amount) };
    }
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled basket kind: ${exhaustive}`);
    }
  }
}

function kindAssumptions(kind: BasketKind): string[] {
  const shared = [
    'These are official averages, not a quote from a utility, gas station, or grocery chain.',
    'Walmart, Target, Aldi, Costco, Kroger, and other shelf prices are not in a public dataset we can publish.',
    'Weekly circulars, membership deals, coupons, and manufacturer promotions are not in here.',
  ];
  switch (kind) {
    case 'electricity':
      return [
        ...shared,
        'Electricity uses EIA residential state averages, not your utility rate, fixed charges, or time of use rate.',
      ];
    case 'gasoline':
      return [
        ...shared,
        'EIA publishes weekly regular prices for some states and PADD regions. Other states use the closest published PADD average.',
        'This is not a station or ZIP code price.',
      ];
    case 'grocery':
      return [
        ...shared,
        'Grocery comparison uses BLS average retail prices. Region prices show only when BLS published all four regions that month.',
        'The sample is a few staples, not a household grocery bill.',
      ];
    case 'household':
      return [
        ...shared,
        'Combined energy adds an electricity estimate to a gasoline estimate. It is not a cost of living index.',
      ];
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled basket kind: ${exhaustive}`);
    }
  }
}

export function compareWhereCheaper(rawInput: unknown, datasets: WhereCheaperDatasets): CalculationResult<WhereCheaperValue> {
  const input = whereCheaperInputSchema.parse(rawInput);
  const ranked = rankPlaces(placesForKind(input, datasets));
  const home = ranked.find((row) => row.stateCode === input.homeState);
  const compare = ranked.find((row) => row.stateCode === input.compareState);
  if (!home || !compare) throw new Error('The selected states are missing from the published snapshot.');
  const cheapest = ranked[0];
  const mostExpensive = ranked[ranked.length - 1];
  const geographies = uniqueGeographies(ranked);
  const savings = round(compare.amount - home.amount);
  const cheaperPlace = savings > 0 ? 'home' : savings < 0 ? 'compare' : 'tie';
  const comparison = benchmark(input.kind, ranked, datasets, input);

  const samePlace = home.stateCode === compare.stateCode;
  const breakdown = [
    { label: samePlace ? `${home.stateName} · you` : `${home.stateName} estimate`, value: formatMoney(home.amount), detail: home.geographyLabel },
    { label: samePlace ? `${compare.stateName} · compare` : `${compare.stateName} estimate`, value: formatMoney(compare.amount), detail: compare.geographyLabel },
    {
      label: cheaperPlace === 'tie' ? 'Difference' : cheaperPlace === 'home' ? `${home.stateName} is lower by` : `${compare.stateName} is lower by`,
      value: formatMoney(Math.abs(savings)),
      detail: cheaperPlace === 'tie' ? 'The published averages match at this precision' : 'Compare estimate minus home estimate',
    },
    { label: comparison.label, value: formatMoney(comparison.amount), detail: 'Benchmark from the same snapshot' },
  ];

  return {
    value: {
      kind: input.kind,
      home,
      compare,
      cheaperPlace,
      savings,
      cheapest,
      mostExpensive,
      ranked,
      uniqueGeographies: geographies,
      geographyRanking: geographyRanking(ranked, home, geographies),
      groceryStaples: groceryStaples(datasets.grocery, input.homeState, input.compareState),
      benchmarkLabel: comparison.label,
      benchmarkAmount: comparison.amount,
    },
    calculationVersion: WHERE_CHEAPER_VERSION,
    datasetSnapshotIds: snapshotIdsForKind(input.kind, datasets),
    breakdown,
    assumptions: kindAssumptions(input.kind),
  };
}
