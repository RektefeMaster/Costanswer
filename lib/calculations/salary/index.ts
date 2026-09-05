/**
 * What one occupation pays in one place, and what that pay is actually worth.
 *
 * OEWS answers the first half — a published median for an occupation in a state
 * — and every competitor stops there. The half that makes the answer useful is
 * what the wage leaves after that state's taxes, what it buys at that state's
 * price level, and how it sits against what households there actually earn.
 * Each of those already had an engine or a dataset in this project, so this is
 * composition rather than new arithmetic.
 *
 * Nothing here substitutes a figure the source withheld. A suppressed wage, an
 * occupation BLS publishes only by the hour, a state without a supported tax
 * schedule — each returns absence, so the page can say what is missing instead
 * of quietly showing a number from somewhere else.
 */
import { formatMoney, formatNumber, round, type BreakdownStep, type CalculationResult } from '@/lib/calculations/contracts';
import { estimateAnnualTaxLiability } from '@/lib/calculations/tax';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';
import type { FilingStatus } from '@/lib/calculations/tax/types';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { acsManifest, acsSnapshot, getAcsRow } from '@/lib/data/acs-snapshot';
import { beaRppManifest, getBeaStateRpp } from '@/lib/data/bea-rpp-snapshot';
import { getOewsEstimate, getOewsOccupation, oewsIndex, oewsManifest } from '@/lib/data/bls-oews-snapshot';
import {
  OEWS_ANNUAL_HOURS,
  type OewsAreaId,
  type OewsEstimate,
  type OewsOccupation,
  type OewsWageBasis,
  type OewsWagePercentiles,
} from '@/lib/data/bls-oews';
import { getGeographyState } from '@/lib/location/search';
import { getStateName, isStateCode, type StateCode } from '@/lib/location/states';
import { OCCUPATION_WAGE_ENGINE_ID } from './version';

/** Take-home is shown for one household shape; the page links to the calculator for the rest. */
export const WAGE_PROFILE_FILING_STATUS: FilingStatus = 'single';

export type OccupationWageProfile = {
  area: OewsAreaId;
  areaLabel: string;
  occupation: Pick<OewsOccupation, 'code' | 'title' | 'displayTitle' | 'slug' | 'majorCode'>;
  referenceLabel: string;
  wage: {
    basis: OewsWageBasis;
    /** True when a figure was published only as "at or above the survey's top code". */
    atOrAboveWageCap: boolean;
    annualMean: number | null;
    annualMedian: number | null;
    annual: OewsWagePercentiles;
    hourlyMean: number | null;
    hourlyMedian: number | null;
    hourly: OewsWagePercentiles;
  };
  employment: {
    total: number | null;
    perThousandJobs: number | null;
    locationQuotient: number | null;
    /** Percent more (or less) concentrated here than nationally. */
    concentrationVsNationPercent: number | null;
  };
  takeHome: {
    grossAnnual: number;
    annual: number;
    monthly: number;
    federalIncomeTax: number;
    stateIncomeTax: number;
    fica: number;
    effectiveTaxRate: number;
    stateTaxStatus: 'supported' | 'unsupported';
    filingStatus: FilingStatus;
    taxYear: number;
  } | null;
  costAdjusted: {
    allItemsRpp: number;
    housingRentsRpp: number | null;
    /** The median wage restated at national average prices. */
    adjustedAnnualMedian: number;
    referenceYear: number;
  } | null;
  versusNation: {
    nationalAnnualMedian: number;
    differencePercent: number;
  } | null;
  versusHousehold: {
    medianHouseholdIncome: number;
    /** The occupation's median wage as a multiple of the median household's income. */
    ratio: number;
    surveyYears: string;
  } | null;
};

function areaLabel(area: OewsAreaId): string {
  return area === 'US' ? 'the United States' : getStateName(area);
}

function takeHomeFor(state: StateCode, grossAnnual: number, taxYear: number): OccupationWageProfile['takeHome'] {
  const liability = estimateAnnualTaxLiability({
    annualGrossSalary: grossAnnual,
    state,
    filingStatus: WAGE_PROFILE_FILING_STATUS,
    taxYear,
  });
  return {
    grossAnnual,
    annual: round(liability.takeHome, 2),
    monthly: round(liability.takeHome / 12, 2),
    federalIncomeTax: round(liability.federal.tax, 2),
    stateIncomeTax: round(liability.stateTax.tax, 2),
    fica: round(liability.fica.total, 2),
    effectiveTaxRate: round(grossAnnual === 0 ? 0 : liability.totalTax / grossAnnual, 4),
    stateTaxStatus: liability.stateTax.status,
    filingStatus: WAGE_PROFILE_FILING_STATUS,
    taxYear,
  };
}

function costAdjustedFor(state: StateCode, annualMedian: number): OccupationWageProfile['costAdjusted'] {
  const geography = getGeographyState(state);
  if (!geography) return null;
  const allItems = getBeaStateRpp(state, geography.stateFips, 'allItems');
  if (!allItems || allItems.value <= 0) return null;
  const housing = getBeaStateRpp(state, geography.stateFips, 'housingRents');
  return {
    allItemsRpp: allItems.value,
    housingRentsRpp: housing?.value ?? null,
    adjustedAnnualMedian: round(annualMedian / (allItems.value / 100), 0),
    referenceYear: allItems.year,
  };
}

function versusHouseholdFor(state: StateCode, annualMedian: number): OccupationWageProfile['versusHousehold'] {
  const geography = getGeographyState(state);
  if (!geography) return null;
  const acs = getAcsRow(`0400000US${geography.stateFips}`);
  if (!acs?.medianHouseholdIncome) return null;
  return {
    medianHouseholdIncome: acs.medianHouseholdIncome,
    ratio: round(annualMedian / acs.medianHouseholdIncome, 3),
    surveyYears: acsSnapshot.surveyYears,
  };
}

/** Uses `taxesOnWagesLabel`, declared below and hoisted. */
function buildBreakdown(profile: OccupationWageProfile): BreakdownStep[] {
  const steps: BreakdownStep[] = [];
  if (profile.wage.annualMedian !== null) {
    steps.push({
      label: `Median wage in ${profile.areaLabel}`,
      value: formatMoney(profile.wage.annualMedian, 0),
      detail: `BLS OEWS ${profile.referenceLabel}. Half of ${profile.occupation.displayTitle.toLowerCase()} earned more than this, half less.`,
    });
  }
  if (profile.wage.hourlyMedian !== null) {
    steps.push({
      label: 'Median hourly wage',
      value: formatMoney(profile.wage.hourlyMedian),
      detail: `Published separately by BLS, not divided out of the annual figure.`,
    });
  }
  if (profile.takeHome) {
    steps.push({
      label: `Take-home after ${taxesOnWagesLabel(profile.takeHome)}`,
      value: `${formatMoney(profile.takeHome.annual, 0)} a year`,
      detail: `${formatMoney(profile.takeHome.monthly, 0)} a month at an effective rate of ${formatNumber(profile.takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}.`,
    });
  }
  if (profile.costAdjusted && profile.wage.annualMedian !== null) {
    steps.push({
      label: 'Worth at national average prices',
      value: formatMoney(profile.costAdjusted.adjustedAnnualMedian, 0),
      detail: `Prices in ${profile.areaLabel} sit at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against a national 100 (BEA, ${profile.costAdjusted.referenceYear}).`,
    });
  }
  if (profile.versusNation) {
    const direction = profile.versusNation.differencePercent >= 0 ? 'above' : 'below';
    steps.push({
      label: 'Against the national median',
      value: `${formatNumber(Math.abs(profile.versusNation.differencePercent), { maximumFractionDigits: 1 })}% ${direction}`,
      detail: `The national median is ${formatMoney(profile.versusNation.nationalAnnualMedian, 0)}.`,
    });
  }
  if (profile.employment.total !== null) {
    steps.push({
      label: 'Jobs counted',
      value: formatNumber(profile.employment.total),
      detail: profile.employment.locationQuotient === null
        ? 'Wage and salary jobs; the self-employed are not surveyed.'
        : `A concentration of ${formatNumber(profile.employment.locationQuotient, { maximumFractionDigits: 2 })} against the nation's 1.00.`,
    });
  }
  return steps;
}

function buildAssumptions(profile: OccupationWageProfile): string[] {
  const assumptions: string[] = [
    `Wages are BLS OEWS survey estimates for ${profile.referenceLabel}, not job postings or offers.`,
    'OEWS surveys wage and salary workers. The self-employed and business owners are outside it.',
  ];
  if (profile.takeHome) {
    assumptions.push(
      `Take-home assumes one ${profile.takeHome.taxYear} filer, filing single, taking the standard deduction, with no dependents, pre-tax retirement contributions or local income tax.`,
    );
    if (profile.takeHome.stateTaxStatus === 'unsupported') {
      assumptions.push(`${profile.areaLabel} state income tax is not modelled, so the take-home figure covers federal and FICA only.`);
    }
  }
  if (profile.wage.basis === 'annual-only') {
    assumptions.push('BLS publishes only an annual wage for this occupation, because a standard 2,080-hour year would misdescribe it.');
  }
  if (profile.wage.basis === 'hourly-only') {
    assumptions.push(`BLS publishes only an hourly wage for this occupation, so no annual figure — and no take-home — is shown. Multiplying by ${formatNumber(OEWS_ANNUAL_HOURS)} hours would invent a year BLS declined to assume.`);
  }
  if (profile.wage.atOrAboveWageCap) {
    assumptions.push(`At least one figure was published only as "at or above ${formatMoney(oewsIndex.annualWageCap, 0)} a year", which is the survey's top code rather than the real wage.`);
  }
  if (profile.costAdjusted) {
    assumptions.push('Regional price parities compare price levels between places in one year. They are not inflation, and they do not adjust for what a household actually buys.');
  }
  return assumptions;
}

/**
 * The taxes actually charged on this wage, in this state.
 *
 * Nine states levy no income tax on wages, and several more exempt an income
 * this size. Saying "after federal, state and FICA tax" where no state tax was
 * charged names a deduction that never happened, in the same sentence as the
 * figure the reader came to check.
 */
export function taxesOnWagesLabel(takeHome: OccupationWageProfile['takeHome']): string {
  if (!takeHome) return 'tax';
  if (takeHome.stateTaxStatus === 'unsupported') return 'federal and FICA tax';
  return takeHome.stateIncomeTax > 0 ? 'federal, state and FICA tax' : 'federal and FICA tax';
}

export function occupationWageProfile(input: {
  area: OewsAreaId;
  occupationCode: string;
  taxYear?: number;
}): CalculationResult<OccupationWageProfile> | null {
  const { area, occupationCode } = input;
  if (area !== 'US' && !isStateCode(area)) return null;
  const occupation = getOewsOccupation(occupationCode);
  if (!occupation) return null;
  const estimate: OewsEstimate | undefined = getOewsEstimate(area, occupationCode);
  if (!estimate) return null;

  const taxYear = input.taxYear ?? DEFAULT_TAX_YEAR;
  const annualMedian = estimate.annual.median;
  const national = area === 'US' ? undefined : getOewsEstimate('US', occupationCode);

  const profile: OccupationWageProfile = {
    area,
    areaLabel: areaLabel(area),
    occupation: {
      code: occupation.code,
      title: occupation.title,
      displayTitle: occupation.displayTitle,
      slug: occupation.slug,
      majorCode: occupation.majorCode,
    },
    referenceLabel: oewsIndex.referenceLabel,
    wage: {
      basis: estimate.wageBasis,
      atOrAboveWageCap: estimate.atOrAboveWageCap,
      annualMean: estimate.annualMean,
      annualMedian,
      annual: estimate.annual,
      hourlyMean: estimate.hourlyMean,
      hourlyMedian: estimate.hourly.median,
      hourly: estimate.hourly,
    },
    employment: {
      total: estimate.employment,
      perThousandJobs: estimate.jobsPer1000,
      locationQuotient: estimate.locationQuotient,
      concentrationVsNationPercent: estimate.locationQuotient === null
        ? null
        : round((estimate.locationQuotient - 1) * 100, 1),
    },
    takeHome: area !== 'US' && annualMedian !== null ? takeHomeFor(area, annualMedian, taxYear) : null,
    costAdjusted: area !== 'US' && annualMedian !== null ? costAdjustedFor(area, annualMedian) : null,
    versusNation: national?.annual.median != null && annualMedian !== null
      ? {
        nationalAnnualMedian: national.annual.median,
        differencePercent: round(((annualMedian - national.annual.median) / national.annual.median) * 100, 1),
      }
      : null,
    versusHousehold: area !== 'US' && annualMedian !== null ? versusHouseholdFor(area, annualMedian) : null,
  };

  const datasetSnapshotIds = [oewsManifest.currentSnapshotId];
  if (profile.takeHome) datasetSnapshotIds.push(getTaxYearSnapshot(taxYear).snapshotId);
  if (profile.costAdjusted) datasetSnapshotIds.push(beaRppManifest.currentSnapshotId);
  if (profile.versusHousehold) datasetSnapshotIds.push(acsManifest.currentSnapshotId);

  return {
    value: profile,
    calculationVersion: OCCUPATION_WAGE_ENGINE_ID,
    datasetSnapshotIds,
    breakdown: buildBreakdown(profile),
    assumptions: buildAssumptions(profile),
  };
}
