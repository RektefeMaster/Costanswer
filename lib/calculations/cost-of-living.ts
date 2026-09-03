import { z } from 'zod';
import { finiteNumber, formatMoney, round, type BreakdownStep, type CalculationResult } from '@/lib/calculations/contracts';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax/annual';
import { FILING_STATUSES } from '@/lib/calculations/tax/types';
import { COST_OF_LIVING_ENGINE_ID } from './col/version';
import { COL_SOURCE_MATRIX, type ColSourceType } from './col/source-matrix';
import { defaultFoodMembers, usdaFoodPlanMonthlyCost } from './col/food';
import { assertNoRppOnLocalRate, composeColTransport } from './col/transport';
import { USDA_FOOD_PLANS, type UsdaFoodPlan } from '@/lib/data/usda-food';
import { usdaFoodSnapshot } from '@/lib/data/usda-food-snapshot';
import { resolveHudFmrSnapshot } from '@/lib/data/hud-fmr-snapshot';
import { getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { getElectricityRate } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { acsSnapshot } from '@/lib/data/acs-snapshot';
import { beaRppSnapshot } from '@/lib/data/bea-rpp-snapshot';
import { resolveLocationCoverage, type LocationCoverage } from '@/lib/location/resolve';
import { isStateCode } from '@/lib/location/states';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';

export { COST_OF_LIVING_ENGINE_ID };

export const COL_BEDROOMS = ['studio', 'br1', 'br2', 'br3', 'br4'] as const;
export type ColBedroom = (typeof COL_BEDROOMS)[number];

const incomeSchema = z.discriminatedUnion('incomeMode', [
  z.object({ incomeMode: z.literal('none') }),
  z.object({
    incomeMode: z.literal('take-home'),
    monthlyTakeHome: finiteNumber('Monthly take-home pay', 0, 10_000_000),
  }),
  z.object({
    incomeMode: z.literal('gross-salary'),
    annualGrossSalary: finiteNumber('Annual gross salary', 0, 100_000_000),
    filingStatus: z.enum(FILING_STATUSES),
    taxYear: z.number().int().optional(),
  }),
]);

const transportSchema = z.discriminatedUnion('transportMode', [
  z.object({
    transportMode: z.literal('none'),
    manualTransport: finiteNumber('Monthly transportation', 0, 100_000).optional(),
  }),
  z.object({
    transportMode: z.literal('manual'),
    manualTransport: finiteNumber('Monthly transportation', 0, 100_000),
  }),
  z.object({
    transportMode: z.literal('gas'),
    annualMiles: finiteNumber('Annual miles', 0, 250_000),
    mpg: finiteNumber('Miles per gallon', 1, 200),
    monthlyInsurance: finiteNumber('Insurance', 0, 100_000),
    monthlyMaintenance: finiteNumber('Maintenance', 0, 100_000),
    annualRegistration: finiteNumber('Registration', 0, 100_000),
  }),
  z.object({
    transportMode: z.literal('ev'),
    annualMiles: finiteNumber('Annual miles', 0, 250_000),
    kwhPer100Miles: finiteNumber('EV efficiency', 5, 100),
    chargingLossPercent: finiteNumber('Charging loss', 0, 30),
    monthlyInsurance: finiteNumber('Insurance', 0, 100_000),
    monthlyMaintenance: finiteNumber('Maintenance', 0, 100_000),
    annualRegistration: finiteNumber('Registration', 0, 100_000),
  }),
]);

export const costOfLivingInputSchema = z.object({
  locationId: z.string().min(1, 'Choose a location.'),
  residentialState: z.string().refine((value) => value === '' || isStateCode(value), 'Choose a U.S. state or D.C.').optional(),
  countyGeoid: z.string().regex(/^\d{5}$/).optional(),
  bedrooms: z.enum(COL_BEDROOMS),
  adults: finiteNumber('Adults', 0, 12).refine(Number.isInteger, 'Adults must be a whole number.'),
  children: finiteNumber('Children', 0, 12).refine(Number.isInteger, 'Children must be a whole number.'),
  foodPlan: z.enum(USDA_FOOD_PLANS),
  housingMode: z.enum(['hud', 'manual']),
  manualHousing: finiteNumber('Monthly housing cost', 0, 100_000).optional(),
  manualFood: finiteNumber('Monthly food cost', 0, 100_000).optional(),
  otherEssentials: finiteNumber('Other monthly essentials', 0, 100_000).optional(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).and(incomeSchema).and(transportSchema).superRefine((input, context) => {
  if (input.adults + input.children < 1) {
    context.addIssue({ code: 'custom', path: ['adults'], message: 'Household must include at least one person.' });
  }
  if (input.housingMode === 'manual' && input.manualHousing == null) {
    context.addIssue({ code: 'custom', path: ['manualHousing'], message: 'Enter a monthly housing cost that includes tenant-paid utilities.' });
  }
});

export type CostOfLivingInput = z.infer<typeof costOfLivingInputSchema>;

export type ColCategoryResult = {
  category: 'housing' | 'food' | 'transportation' | 'otherEssentials';
  amount: number | null;
  included: boolean;
  sourceType: ColSourceType;
  sourceLabel: string;
  sourceGeography: string;
  calculationSource: 'official' | 'manual' | 'excluded' | 'unavailable';
  contextOfficialAmount: number | null;
  assumptions: string[];
  alreadyLocationSpecific: boolean;
  rppApplied: false;
  containsDefaultHouseholdElectricity: false;
};

export type ColValue = {
  totalModeledMonthlyCost: number;
  incomplete: boolean;
  incompleteReasons: string[];
  housing: ColCategoryResult;
  food: ColCategoryResult;
  transportation: ColCategoryResult;
  otherEssentials: ColCategoryResult;
  income: {
    monthlyTakeHome: number | null;
    incomeShare: number | null;
    remainingAfterModeledCosts: number | null;
    completeness: 'complete' | 'provisional' | 'omitted';
    stateTaxStatus: 'supported' | 'unsupported' | 'not-used';
    sourceLabel: string;
  };
  regionalPriceContext: {
    allItems: number | null;
    national: 100;
    geographyLabel: string;
    fallback: 'exactMetro' | 'stateFallback' | 'unavailable';
    notInflation: true;
    notAppliedToTotal: true;
  };
  incomeContext: {
    medianHouseholdIncome: number | null;
    geographyLabel: string;
    vintage: string;
  };
  coverage: LocationCoverage;
  comparison: {
    housing: number | null;
    food: number | null;
    transportation: number | null;
    otherEssentials: number | null;
    total: number | null;
    comparable: boolean;
  };
};

function dollars(value: number): number {
  return round(value, 2);
}

function bedroomLabel(bedrooms: ColBedroom): string {
  switch (bedrooms) {
    case 'studio': return 'efficiency/studio';
    case 'br1': return '1 bedroom';
    case 'br2': return '2 bedroom';
    case 'br3': return '3 bedroom';
    case 'br4': return '4 bedroom';
    default: {
      const exhaustive: never = bedrooms;
      throw new Error(`Unhandled bedroom size: ${exhaustive}`);
    }
  }
}

export function composeCostOfLiving(rawInput: unknown): CalculationResult<ColValue> {
  const input = costOfLivingInputSchema.parse(rawInput);
  const asOf = input.asOf ?? PUBLISHING_SNAPSHOT_DATE;
  const coverage = resolveLocationCoverage({
    locationId: input.locationId,
    residentialState: input.residentialState,
    countyGeoid: input.countyGeoid,
    asOf,
  });
  const hudSnapshot = resolveHudFmrSnapshot(asOf);
  const snapshotIds: string[] = [
    hudSnapshot.snapshotId,
    usdaFoodSnapshot.snapshotId,
    beaRppSnapshot.snapshotId,
    acsSnapshot.snapshotId,
  ];

  const hudAmount = coverage.hud.status === 'exact' || coverage.hud.status === 'uniqueDerived'
    ? coverage.hud.area.bedrooms[input.bedrooms]
    : null;
  let housing: ColCategoryResult;
  if (input.housingMode === 'manual' && input.manualHousing != null) {
    housing = {
      category: 'housing',
      amount: dollars(input.manualHousing),
      included: true,
      sourceType: 'MANUAL',
      sourceLabel: 'Manual monthly housing cost, including tenant-paid utilities covered by this model',
      sourceGeography: 'User',
      calculationSource: 'manual',
      contextOfficialAmount: hudAmount,
      assumptions: [
        COL_SOURCE_MATRIX.housing.manualOverride,
        'HUD Fair Market Rent is shown only as context when a manual housing cost is used.',
      ],
      alreadyLocationSpecific: true,
      rppApplied: false,
      containsDefaultHouseholdElectricity: false,
    };
  } else if (hudAmount != null && (coverage.hud.status === 'exact' || coverage.hud.status === 'uniqueDerived')) {
    housing = {
      category: 'housing',
      amount: dollars(hudAmount),
      included: true,
      sourceType: 'DIRECT_LOCAL_OFFICIAL',
      sourceLabel: `HUD Fair Market Rent ${bedroomLabel(input.bedrooms)} benchmark`,
      sourceGeography: coverage.hud.area.officialName,
      calculationSource: 'official',
      contextOfficialAmount: hudAmount,
      assumptions: [
        'HUD FMR is a 40th-percentile gross-rent benchmark, not average asking rent.',
        'The benchmark includes shelter rent and most tenant-paid utilities. A separate household electric bill is not added.',
        'BEA housing or all-items RPP is not applied to HUD FMR.',
      ],
      alreadyLocationSpecific: true,
      rppApplied: false,
      containsDefaultHouseholdElectricity: false,
    };
  } else {
    housing = {
      category: 'housing',
      amount: null,
      included: false,
      sourceType: 'EXCLUDED',
      sourceLabel: coverage.hud.status === 'ambiguous' || coverage.hud.status === 'unavailable' ? coverage.hud.message : 'Housing benchmark unavailable',
      sourceGeography: 'Unavailable',
      calculationSource: 'unavailable',
      contextOfficialAmount: null,
      assumptions: ['Enter a monthly housing cost that includes tenant-paid utilities to complete this model.'],
      alreadyLocationSpecific: false,
      rppApplied: false,
      containsDefaultHouseholdElectricity: false,
    };
  }

  const foodMembers = defaultFoodMembers(input.adults, input.children);
  const foodCost = usdaFoodPlanMonthlyCost({
    snapshot: usdaFoodSnapshot,
    plan: input.foodPlan,
    members: foodMembers,
    state: coverage.state,
  });
  const food: ColCategoryResult = input.manualFood != null
    ? {
        category: 'food',
        amount: dollars(input.manualFood),
        included: true,
        sourceType: 'MANUAL',
        sourceLabel: 'Manual monthly food-at-home cost',
        sourceGeography: 'User',
        calculationSource: 'manual',
        contextOfficialAmount: dollars(foodCost.monthly),
        assumptions: ['The USDA Food Plan is context only because a manual food amount was entered.'],
        alreadyLocationSpecific: false,
        rppApplied: false,
        containsDefaultHouseholdElectricity: false,
      }
    : {
    category: 'food',
    amount: dollars(foodCost.monthly),
    included: true,
    sourceType: 'NATIONAL_OFFICIAL_BASELINE',
    sourceLabel: `USDA ${input.foodPlan} Food Plan`,
    sourceGeography: foodCost.geographyLabel,
    calculationSource: 'official',
    contextOfficialAmount: dollars(foodCost.monthly),
    assumptions: [
      'USDA Food Plans are food prepared and consumed at home, not restaurants or all food spending.',
      'Adults are modeled as ages 20–50, alternating male then female. Children use the official 6–8 age group.',
      'BEA all-items RPP is not applied to USDA food costs.',
      'BLS grocery staple prices are not used here; they lack household quantities.',
    ],
    alreadyLocationSpecific: foodCost.adjustmentApplied != null,
    rppApplied: false,
    containsDefaultHouseholdElectricity: false,
  };

  let transport;
  if (input.transportMode === 'none') {
    transport = composeColTransport({ mode: 'none', manualMonthly: input.manualTransport });
  } else if (input.transportMode === 'manual') {
    transport = composeColTransport({ mode: 'manual', monthly: input.manualTransport });
  } else if (input.transportMode === 'gas') {
    if (!coverage.state) {
      transport = {
        amount: null,
        included: false,
        sourceLabel: 'Gasoline cost needs a residential state for this metro.',
        usesEiaGasoline: false,
        usesEiaElectricity: false,
        rppApplied: false as const,
      };
    } else {
      const gas = getGasolinePriceForState(coverage.state);
      snapshotIds.push(gasolineSnapshot.snapshotId);
      transport = composeColTransport({
        mode: 'gas',
        annualMiles: input.annualMiles,
        mpg: input.mpg,
        dollarsPerGallon: gas.dollarsPerGallon,
        monthlyInsurance: input.monthlyInsurance,
        monthlyMaintenance: input.monthlyMaintenance,
        annualRegistration: input.annualRegistration,
      });
    }
  } else {
    if (!coverage.state) {
      transport = {
        amount: null,
        included: false,
        sourceLabel: 'EV charging cost needs a residential state for this metro.',
        usesEiaGasoline: false,
        usesEiaElectricity: false,
        rppApplied: false as const,
      };
    } else {
      const electricity = getElectricityRate(coverage.state);
      snapshotIds.push(electricitySnapshot.snapshotId);
      transport = composeColTransport({
        mode: 'ev',
        annualMiles: input.annualMiles,
        kwhPer100Miles: input.kwhPer100Miles,
        electricityCentsPerKwh: electricity.priceCentsPerKwh,
        chargingLossPercent: input.chargingLossPercent,
        monthlyInsurance: input.monthlyInsurance,
        monthlyMaintenance: input.monthlyMaintenance,
        annualRegistration: input.annualRegistration,
      });
    }
  }

  const transportation: ColCategoryResult = {
    category: 'transportation',
    amount: transport.amount == null ? null : dollars(transport.amount),
    included: transport.included,
    sourceType: transport.included ? (input.transportMode === 'manual' || (input.transportMode === 'none' && input.manualTransport != null) ? 'MANUAL' : 'ENGINE_DERIVED_LOCAL') : 'EXCLUDED',
    sourceLabel: transport.sourceLabel,
    sourceGeography: input.transportMode === 'gas'
      ? coverage.eiaGasoline.label
      : input.transportMode === 'ev'
        ? coverage.eiaElectricity.label
        : 'User',
    calculationSource: transport.included ? (input.transportMode === 'gas' || input.transportMode === 'ev' ? 'official' : 'manual') : 'excluded',
    contextOfficialAmount: null,
    assumptions: [
      'EIA fuel and electricity prices are not multiplied by BEA RPP.',
      'HUD gross rent already includes most tenant-paid utilities, so a household electric bill is not added on top.',
    ],
    alreadyLocationSpecific: input.transportMode === 'gas' || input.transportMode === 'ev',
    rppApplied: false,
    containsDefaultHouseholdElectricity: false,
  };

  const otherEssentials: ColCategoryResult = input.otherEssentials == null
    ? {
        category: 'otherEssentials',
        amount: null,
        included: false,
        sourceType: 'EXCLUDED',
        sourceLabel: 'Optional essentials omitted',
        sourceGeography: 'User',
        calculationSource: 'excluded',
        contextOfficialAmount: null,
        assumptions: ['Phone, internet, and similar costs are omitted unless entered.'],
        alreadyLocationSpecific: false,
        rppApplied: false,
        containsDefaultHouseholdElectricity: false,
      }
    : {
        category: 'otherEssentials',
        amount: dollars(input.otherEssentials),
        included: true,
        sourceType: 'MANUAL',
        sourceLabel: 'Manual other essentials',
        sourceGeography: 'User',
        calculationSource: 'manual',
        contextOfficialAmount: null,
        assumptions: ['This optional amount is whatever you typed, not an official local price.'],
        alreadyLocationSpecific: false,
        rppApplied: false,
        containsDefaultHouseholdElectricity: false,
      };

  const included = [housing, food, transportation, otherEssentials].filter((row) => row.included && row.amount != null);
  const totalExact = included.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const totalModeledMonthlyCost = round(totalExact, 0);
  const incompleteReasons: string[] = [];
  if (!housing.included) incompleteReasons.push(housing.sourceLabel);
  if (coverage.stateAmbiguous) incompleteReasons.push('This metro crosses state lines. State tax, electricity, and fuel need a residential state.');
  if (input.transportMode !== 'none' && input.transportMode !== 'manual' && !coverage.state) {
    incompleteReasons.push('Transportation defaults need a residential state for this metro.');
  }

  let monthlyTakeHome: number | null = null;
  let stateTaxStatus: 'supported' | 'unsupported' | 'not-used' = 'not-used';
  let incomeLabel = 'Income not entered';
  let completeness: 'complete' | 'provisional' | 'omitted' = 'omitted';
  if (input.incomeMode === 'take-home') {
    monthlyTakeHome = dollars(input.monthlyTakeHome);
    incomeLabel = 'Manual monthly take-home';
    completeness = 'complete';
  } else if (input.incomeMode === 'gross-salary') {
    if (!coverage.state) {
      incompleteReasons.push('Gross salary conversion needs a residential state.');
    } else {
      const taxYear = input.taxYear ?? DEFAULT_TAX_YEAR;
      const liability = estimateAnnualTaxLiability({
        annualGrossSalary: input.annualGrossSalary,
        state: coverage.state,
        filingStatus: input.filingStatus,
        taxYear,
      });
      snapshotIds.push(getTaxYearSnapshot(taxYear).snapshotId);
      monthlyTakeHome = dollars(liability.takeHome / 12);
      stateTaxStatus = liability.stateTax.status;
      incomeLabel = liability.stateTax.status === 'unsupported'
        ? 'Gross salary converted with federal and FICA only; state income tax omitted'
        : 'Gross salary converted with the Tax Engine';
      completeness = liability.stateTax.status === 'unsupported' ? 'provisional' : 'complete';
      if (liability.stateTax.status === 'unsupported') {
        incompleteReasons.push(`${coverage.state} state income tax is omitted. Remaining-income figures are provisional. Enter take-home pay for a complete result.`);
      }
    }
  }

  const incomeShare = housing.included && monthlyTakeHome != null && monthlyTakeHome > 0
    ? totalModeledMonthlyCost / monthlyTakeHome
    : null;
  const remaining = housing.included && monthlyTakeHome != null
    ? round(monthlyTakeHome - totalModeledMonthlyCost, 0)
    : null;
  if (housing.included === false && monthlyTakeHome != null && completeness === 'complete') {
    completeness = 'provisional';
  }

  const value: ColValue = {
    totalModeledMonthlyCost,
    incomplete: incompleteReasons.length > 0,
    incompleteReasons,
    housing,
    food,
    transportation,
    otherEssentials,
    income: {
      monthlyTakeHome,
      incomeShare,
      remainingAfterModeledCosts: remaining,
      completeness,
      stateTaxStatus,
      sourceLabel: incomeLabel,
    },
    regionalPriceContext: {
      allItems: coverage.bea.allItems,
      national: 100,
      geographyLabel: coverage.bea.label,
      fallback: coverage.bea.fallback,
      notInflation: true,
      notAppliedToTotal: true,
    },
    incomeContext: {
      medianHouseholdIncome: coverage.census.row?.medianHouseholdIncome ?? null,
      geographyLabel: coverage.census.label,
      vintage: acsSnapshot.surveyYears,
    },
    coverage,
    comparison: {
      housing: housing.amount,
      food: food.amount,
      transportation: transportation.amount,
      otherEssentials: otherEssentials.amount,
      total: housing.included ? totalModeledMonthlyCost : null,
      comparable: housing.included,
    },
  };

  if (housing.rppApplied || food.rppApplied || transportation.rppApplied) {
    throw new Error('RPP must never adjust HUD, USDA, or EIA dollar categories.');
  }
  if (housing.amount != null) assertNoRppOnLocalRate(housing.amount, coverage.bea.allItems, 'housing');
  if (food.amount != null) assertNoRppOnLocalRate(food.amount, coverage.bea.allItems, 'food');
  if (transportation.amount != null) assertNoRppOnLocalRate(transportation.amount, coverage.bea.allItems, 'transportation');
  if (housing.containsDefaultHouseholdElectricity) {
    throw new Error('HUD gross rent must not receive an extra default electricity bill.');
  }

  const breakdown: BreakdownStep[] = [
    { label: 'Housing', value: housing.amount == null ? 'Not modeled' : formatMoney(round(housing.amount, 0), 0), detail: `${housing.sourceLabel} · ${housing.sourceGeography}` },
    { label: 'Food at home', value: formatMoney(round(food.amount ?? 0, 0), 0), detail: `${food.sourceLabel} · ${food.sourceGeography}` },
    { label: 'Transportation', value: transportation.amount == null ? 'Not modeled' : formatMoney(round(transportation.amount, 0), 0), detail: `${transportation.sourceLabel} · ${transportation.sourceGeography}` },
    { label: 'Other essentials', value: otherEssentials.amount == null ? 'Omitted' : formatMoney(round(otherEssentials.amount, 0), 0), detail: otherEssentials.sourceLabel },
    {
      label: 'Modeled monthly total',
      value: housing.included ? formatMoney(totalModeledMonthlyCost, 0) : 'Not comparable',
      detail: housing.included
        ? 'Sum of included categories, not everything it costs to live here'
        : 'Housing is not mapped. A food-only sum is not a cost of living and must not be compared across places.',
    },
  ];
  if (housing.included && monthlyTakeHome != null) {
    breakdown.push({
      label: 'Share of take-home',
      value: `${round((incomeShare ?? 0) * 100, 1)}%`,
      detail: completeness === 'provisional' ? 'Provisional because state income tax is omitted' : incomeLabel,
    });
    breakdown.push({
      label: 'Remaining after modeled costs',
      value: formatMoney(remaining ?? 0, 0),
      detail: completeness === 'provisional' ? 'Incomplete: missing state income tax' : 'Take-home minus modeled costs. Tax is not added again as an expense.',
    });
  }
  if (value.regionalPriceContext.allItems != null) {
    breakdown.push({
      label: 'Regional price level (BEA RPP)',
      value: round(value.regionalPriceContext.allItems, 1).toFixed(1),
      detail: `${value.regionalPriceContext.geographyLabel}. U.S. = 100. This is not applied to the dollar total and is not inflation.`,
    });
  }

  const usedSnapshotIds = [...new Set(
    snapshotIds.filter((id) => {
      if (housing.calculationSource !== 'official' && id.startsWith('hud-fmr')) return false;
      if (food.calculationSource !== 'official' && id.startsWith('usda-food')) return false;
      if (transportation.calculationSource !== 'official' && (id.startsWith('eia-gasoline') || id.startsWith('eia-electricity'))) return false;
      if (input.incomeMode !== 'gross-salary' && id.startsWith('us-tax')) return false;
      return true;
    }),
  )];

  return {
    value,
    calculationVersion: COST_OF_LIVING_ENGINE_ID,
    datasetSnapshotIds: usedSnapshotIds,
    breakdown,
    assumptions: [
      ...housing.assumptions,
      ...food.assumptions,
      ...transportation.assumptions,
      ...otherEssentials.assumptions,
      'This is an estimated modeled monthly living cost, not everything it costs to live here.',
      'Healthcare, childcare, debt, restaurants, and most discretionary spending are omitted.',
      'Income tax is not added as a living-cost category after take-home is known.',
      value.regionalPriceContext.notInflation ? 'BEA RPP compares regional price levels in 2024. It is not a measure of inflation over time.' : '',
    ].filter(Boolean),
  };
}

export function calculateCostOfLiving(rawInput: unknown): CalculationResult<ColValue> {
  return composeCostOfLiving(rawInput);
}
