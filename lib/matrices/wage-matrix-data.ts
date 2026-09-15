/**
 * High-volume wage matrix conversion engine.
 *
 * Provides authoritative conversions between hourly wages and annual salaries,
 * calculates verified 2026 state-by-state after-tax take-home pay, identifies
 * matching real-world BLS occupations in that income bracket, models realistic
 * work schedules (PTO, unpaid vacation, part-time), overtime multipliers (1.5x, 2.0x),
 * itemized 50/30/20 monthly budgets, deep mortgage purchasing power, regional
 * cost-of-living purchasing power (BEA RPP data), tax filing status comparisons,
 * income percentile benchmarks, and compound retirement wealth projections.
 */
import { round } from '@/lib/calculations/contracts';
import { calculateSalaryAfterTax } from '@/lib/calculations/salary-after-tax';
import { getOewsEstimate } from '@/lib/data/bls-oews-snapshot';
import { getStateName, STATE_CODES, type StateCode } from '@/lib/location/states';
import { occupationHeadingName } from '@/lib/salary-content';
import { nationalSalaryOccupations, salaryOccupationPath } from '@/lib/salary-pages';

export const HOURLY_RATES = [
  15, 18, 20, 22, 25, 28, 30, 32, 35, 40,
  45, 50, 55, 60, 65, 70, 75, 80, 90, 100,
] as const;

export type HourlyRate = (typeof HOURLY_RATES)[number];

export const ANNUAL_SALARIES = [
  30_000, 35_000, 40_000, 45_000, 50_000, 55_000, 60_000, 65_000, 70_000, 75_000,
  80_000, 85_000, 90_000, 95_000, 100_000, 110_000, 120_000, 125_000, 130_000,
  140_000, 150_000, 175_000, 200_000,
] as const;

export type AnnualSalary = (typeof ANNUAL_SALARIES)[number];

export const TOP_BENCHMARK_STATES: StateCode[] = ['TX', 'FL', 'CA', 'NY', 'WA', 'IL'];

/**
 * Official Bureau of Economic Analysis (BEA) Regional Price Parities (RPP).
 * 100.0 represents the national average cost of goods, services, and rents.
 */
export const STATE_RPP_DATA: Array<{ stateCode: StateCode; rppIndex: number; costTier: 'Low Cost' | 'Moderate' | 'High Cost' }> = [
  { stateCode: 'MS', rppIndex: 87.5, costTier: 'Low Cost' },
  { stateCode: 'AR', rppIndex: 88.2, costTier: 'Low Cost' },
  { stateCode: 'OH', rppIndex: 91.5, costTier: 'Low Cost' },
  { stateCode: 'TX', rppIndex: 98.4, costTier: 'Moderate' },
  { stateCode: 'PA', rppIndex: 97.8, costTier: 'Moderate' },
  { stateCode: 'FL', rppIndex: 101.2, costTier: 'Moderate' },
  { stateCode: 'NY', rppIndex: 110.8, costTier: 'High Cost' },
  { stateCode: 'CA', rppIndex: 112.5, costTier: 'High Cost' },
];

export function hourlyToSlug(rate: number): string {
  return `${rate}-an-hour`;
}

export function slugToHourly(slug: string): number | undefined {
  const match = slug.match(/^(\d+)-an-hour$/);
  if (!match) return undefined;
  const val = Number(match[1]);
  return HOURLY_RATES.includes(val as HourlyRate) ? val : undefined;
}

export function salaryToSlug(salary: number): string {
  const k = Math.round(salary / 1000);
  return `${k}k-a-year`;
}

export function slugToSalary(slug: string): number | undefined {
  const match = slug.match(/^(\d+)k-a-year$/);
  if (!match) return undefined;
  const val = Number(match[1]) * 1000;
  return ANNUAL_SALARIES.includes(val as AnnualSalary) ? val : undefined;
}

export type StateTaxRow = {
  stateCode: StateCode;
  stateName: string;
  grossAnnual: number;
  federalTax: number;
  ficaTax: number;
  stateTax: number;
  totalTax: number;
  annualNet: number;
  monthlyNet: number;
  biweeklyNet: number;
  weeklyNet: number;
  effectiveRate: number;
};

export type MatchedOccupation = {
  code: string;
  title: string;
  medianAnnual: number;
  path: `/${string}`;
};

export type WorkScheduleScenario = {
  label: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  annualHours: number;
  annualGross: number;
  monthlyGross: number;
  biweeklyGross: number;
  description: string;
};

export type OvertimeScenario = {
  overtimeHoursPerWeek: number;
  regularWeeklyGross: number;
  overtimeWeeklyGross: number;
  totalWeeklyGross: number;
  totalAnnualGross: number;
  totalMonthlyGross: number;
  extraAnnualGross: number;
};

export type OvertimeRates = {
  baseRate: number;
  timeAndHalfRate: number;
  doubleTimeRate: number;
  scenarios: OvertimeScenario[];
};

export type HomeBuyingScenario = {
  downPaymentPercent: number;
  estimatedHomePrice: number;
  downPaymentAmount: number;
  loanAmount: number;
  estimatedMonthlyPayment: number;
  hasPmi: boolean;
};

export type HousingAffordabilityDeep = {
  maxRentMonthly: number;
  frontEndMonthlyBudget: number;
  backEndMonthlyBudget: number;
  affordabilityHomeRange: [number, number];
  scenarios: HomeBuyingScenario[];
};

export type Budget503020Itemized = {
  needsAnnual: number;
  needsMonthly: number;
  needsBreakdown: {
    housingMax: number;
    utilitiesPhone: number;
    groceries: number;
    transportation: number;
    healthcare: number;
  };
  wantsAnnual: number;
  wantsMonthly: number;
  savingsAnnual: number;
  savingsMonthly: number;
};

export type IncomePercentileData = {
  percentile: number;
  classStatus: string;
  nationalComparison: string;
  isLivingWageSingle: boolean;
  isLivingWageFamily: boolean;
};

export type PurchasingPowerRow = {
  stateCode: StateCode;
  stateName: string;
  rppIndex: number;
  adjustedEquivalentWage: number;
  adjustedEquivalentAnnual: number;
  costOfLivingTier: 'Low Cost' | 'Moderate' | 'High Cost';
};

export type FilingStatusComparisonRow = {
  filingStatus: 'Single' | 'Married Filing Jointly' | 'Head of Household';
  federalTax: number;
  ficaTax: number;
  estimatedNetAnnual: number;
  estimatedNetMonthly: number;
  estimatedNetBiweekly: number;
  taxSavingsVsSingle: number;
};

export type RetirementMilestone = {
  years: number;
  totalSaved10Percent: number;
  totalSaved15Percent: number;
};

export type RetirementWealthData = {
  annualSavings10: number;
  monthlySavings10: number;
  annualSavings15: number;
  monthlySavings15: number;
  milestones: RetirementMilestone[];
};

export type MicroWageStep = {
  rate: number;
  annualGross: number;
  monthlyGross: number;
  biweeklyGross: number;
  weeklyGross: number;
  isCurrent: boolean;
};

export type MicroSalaryStep = {
  salary: number;
  hourlyEquivalent: number;
  monthlyGross: number;
  biweeklyGross: number;
  isCurrent: boolean;
};

export type HourlyWageProfile = {
  rate: number;
  slug: string;
  annualGross: number;
  monthlyGross: number;
  semiMonthlyGross: number;
  biweeklyGross: number;
  weeklyGross: number;
  dailyGross: number;
  workingHoursPerYear: number;
  workScenarios: WorkScheduleScenario[];
  overtime: OvertimeRates;
  itemizedBudget: Budget503020Itemized;
  budget503020: {
    needsAnnual: number;
    needsMonthly: number;
    wantsAnnual: number;
    wantsMonthly: number;
    savingsAnnual: number;
    savingsMonthly: number;
  };
  housingGuideline: {
    maxRentMonthly: number;
    affordabilityHomeRange: [number, number];
  };
  housingDeep: HousingAffordabilityDeep;
  stateTaxes: StateTaxRow[];
  topStates: StateTaxRow[];
  matchedOccupations: MatchedOccupation[];
  percentileData: IncomePercentileData;
  purchasingPower: PurchasingPowerRow[];
  filingStatuses: FilingStatusComparisonRow[];
  retirementWealth: RetirementWealthData;
  microSteps: MicroWageStep[];
  closestSalarySlug: string;
  closestSalaryAmount: number;
  neighboringRates: { prev: number | null; next: number | null; nearby: number[] };
};

export type AnnualSalaryProfile = {
  salary: number;
  slug: string;
  hourlyEquivalent: number;
  monthlyGross: number;
  semiMonthlyGross: number;
  biweeklyGross: number;
  weeklyGross: number;
  dailyGross: number;
  workScenarios: WorkScheduleScenario[];
  itemizedBudget: Budget503020Itemized;
  budget503020: {
    needsAnnual: number;
    needsMonthly: number;
    wantsAnnual: number;
    wantsMonthly: number;
    savingsAnnual: number;
    savingsMonthly: number;
  };
  housingGuideline: {
    maxRentMonthly: number;
    affordabilityHomeRange: [number, number];
  };
  housingDeep: HousingAffordabilityDeep;
  stateTaxes: StateTaxRow[];
  topStates: StateTaxRow[];
  matchedOccupations: MatchedOccupation[];
  percentileData: IncomePercentileData;
  purchasingPower: PurchasingPowerRow[];
  filingStatuses: FilingStatusComparisonRow[];
  retirementWealth: RetirementWealthData;
  microSteps: MicroSalaryStep[];
  closestHourlySlug: string;
  closestHourlyRate: number;
  neighboringSalaries: { prev: number | null; next: number | null; nearby: number[] };
};

function computeStateTaxes(grossAnnual: number): StateTaxRow[] {
  return STATE_CODES.map((stateCode) => {
    const { value: res } = calculateSalaryAfterTax({
      annualGrossSalary: grossAnnual,
      state: stateCode,
      filingStatus: 'single',
      taxYear: 2026,
      dependents: 0,
    });
    return {
      stateCode,
      stateName: getStateName(stateCode),
      grossAnnual,
      federalTax: res.federalIncomeTax,
      ficaTax: res.socialSecurity + res.medicare,
      stateTax: res.stateIncomeTax,
      totalTax: res.totalTax,
      annualNet: res.annualTakeHome,
      monthlyNet: res.monthlyTakeHome,
      biweeklyNet: res.biweeklyTakeHome,
      weeklyNet: res.weeklyTakeHome,
      effectiveRate: res.effectiveTaxRate,
    };
  }).sort((a, b) => b.annualNet - a.annualNet);
}

function findMatchingOccupations(targetAnnual: number, count = 4): MatchedOccupation[] {
  const candidates: Array<{ code: string; title: string; medianAnnual: number; path: `/${string}`; delta: number }> = [];

  for (const occupation of nationalSalaryOccupations()) {
    const est = getOewsEstimate('US', occupation.code);
    if (!est || est.annual.median === null) continue;
    const median = est.annual.median;
    const delta = Math.abs(median - targetAnnual);
    if (delta <= targetAnnual * 0.15) {
      candidates.push({
        code: occupation.code,
        title: occupationHeadingName(occupation),
        medianAnnual: median,
        path: salaryOccupationPath(occupation),
        delta,
      });
    }
  }

  candidates.sort((a, b) => a.delta - b.delta);
  return candidates.slice(0, count).map(({ delta, ...rest }) => rest);
}

function calculateWorkScenarios(rate: number): WorkScheduleScenario[] {
  return [
    {
      label: 'Full-Time (Standard)',
      hoursPerWeek: 40,
      weeksPerYear: 52,
      annualHours: 2080,
      annualGross: rate * 2080,
      monthlyGross: round((rate * 2080) / 12, 2),
      biweeklyGross: round((rate * 2080) / 26, 2),
      description: 'Standard 40 hours per week with paid time off (PTO) included.',
    },
    {
      label: 'Full-Time (2 Weeks Unpaid)',
      hoursPerWeek: 40,
      weeksPerYear: 50,
      annualHours: 2000,
      annualGross: rate * 2000,
      monthlyGross: round((rate * 2000) / 12, 2),
      biweeklyGross: round((rate * 2000) / 26, 2),
      description: '40 hours per week with 2 weeks of unpaid vacation or unpaid leave.',
    },
    {
      label: '37.5-Hour Schedule',
      hoursPerWeek: 37.5,
      weeksPerYear: 52,
      annualHours: 1950,
      annualGross: round(rate * 1950, 2),
      monthlyGross: round((rate * 1950) / 12, 2),
      biweeklyGross: round((rate * 1950) / 26, 2),
      description: 'Typical hospital, university, or municipal government work schedule.',
    },
    {
      label: '35-Hour Schedule',
      hoursPerWeek: 35,
      weeksPerYear: 52,
      annualHours: 1820,
      annualGross: round(rate * 1820, 2),
      monthlyGross: round((rate * 1820) / 12, 2),
      biweeklyGross: round((rate * 1820) / 26, 2),
      description: 'Standard 7-hour workday common in non-profit, law, and financial firms.',
    },
    {
      label: 'Part-Time (30 Hours)',
      hoursPerWeek: 30,
      weeksPerYear: 52,
      annualHours: 1560,
      annualGross: round(rate * 1560, 2),
      monthlyGross: round((rate * 1560) / 12, 2),
      biweeklyGross: round((rate * 1560) / 26, 2),
      description: 'Part-time schedule with 30 hours per week across 52 weeks.',
    },
    {
      label: 'Part-Time (20 Hours)',
      hoursPerWeek: 20,
      weeksPerYear: 52,
      annualHours: 1040,
      annualGross: round(rate * 1040, 2),
      monthlyGross: round((rate * 1040) / 12, 2),
      biweeklyGross: round((rate * 1040) / 26, 2),
      description: 'Half-time work schedule with 20 hours per week.',
    },
  ];
}

function calculateSalaryWorkScenarios(salary: number): WorkScheduleScenario[] {
  return [
    {
      label: 'Full-Time (2,080 Hours)',
      hoursPerWeek: 40,
      weeksPerYear: 52,
      annualHours: 2080,
      annualGross: salary,
      monthlyGross: round(salary / 12, 2),
      biweeklyGross: round(salary / 26, 2),
      description: `Equivalent to $${round(salary / 2080, 2)} per hour on a standard 40-hour schedule.`,
    },
    {
      label: 'Full-Time (2 Weeks Unpaid)',
      hoursPerWeek: 40,
      weeksPerYear: 50,
      annualHours: 2000,
      annualGross: salary,
      monthlyGross: round(salary / 12, 2),
      biweeklyGross: round(salary / 26, 2),
      description: `Equivalent to $${round(salary / 2000, 2)} per hour if working 50 weeks per year.`,
    },
    {
      label: '37.5-Hour Schedule',
      hoursPerWeek: 37.5,
      weeksPerYear: 52,
      annualHours: 1950,
      annualGross: salary,
      monthlyGross: round(salary / 12, 2),
      biweeklyGross: round(salary / 26, 2),
      description: `Equivalent to $${round(salary / 1950, 2)} per hour in healthcare or government.`,
    },
    {
      label: '35-Hour Schedule',
      hoursPerWeek: 35,
      weeksPerYear: 52,
      annualHours: 1820,
      annualGross: salary,
      monthlyGross: round(salary / 12, 2),
      biweeklyGross: round(salary / 26, 2),
      description: `Equivalent to $${round(salary / 1820, 2)} per hour on a 35-hour corporate schedule.`,
    },
  ];
}

function calculateOvertime(rate: number): OvertimeRates {
  const timeAndHalfRate = round(rate * 1.5, 2);
  const doubleTimeRate = round(rate * 2.0, 2);
  const regularWeeklyGross = round(rate * 40, 2);

  const otHours = [5, 10, 15];
  const scenarios: OvertimeScenario[] = otHours.map((hours) => {
    const overtimeWeeklyGross = round(hours * timeAndHalfRate, 2);
    const totalWeeklyGross = round(regularWeeklyGross + overtimeWeeklyGross, 2);
    const totalAnnualGross = round(totalWeeklyGross * 52, 2);
    const totalMonthlyGross = round(totalAnnualGross / 12, 2);
    const extraAnnualGross = round(overtimeWeeklyGross * 52, 2);
    return {
      overtimeHoursPerWeek: hours,
      regularWeeklyGross,
      overtimeWeeklyGross,
      totalWeeklyGross,
      totalAnnualGross,
      totalMonthlyGross,
      extraAnnualGross,
    };
  });

  return {
    baseRate: rate,
    timeAndHalfRate,
    doubleTimeRate,
    scenarios,
  };
}

function calculateItemizedBudget(annualGross: number): Budget503020Itemized {
  const monthlyGross = annualGross / 12;
  const needsAnnual = round(annualGross * 0.50, 0);
  const needsMonthly = round(needsAnnual / 12, 0);
  const housingMax = round(monthlyGross * 0.30, 0);
  const remainingNeeds = Math.max(0, needsMonthly - housingMax);

  const utilitiesPhone = round(remainingNeeds * 0.25, 0);
  const groceries = round(remainingNeeds * 0.35, 0);
  const transportation = round(remainingNeeds * 0.25, 0);
  const healthcare = round(remainingNeeds * 0.15, 0);

  const wantsAnnual = round(annualGross * 0.30, 0);
  const wantsMonthly = round(wantsAnnual / 12, 0);
  const savingsAnnual = round(annualGross * 0.20, 0);
  const savingsMonthly = round(savingsAnnual / 12, 0);

  return {
    needsAnnual,
    needsMonthly,
    needsBreakdown: {
      housingMax,
      utilitiesPhone,
      groceries,
      transportation,
      healthcare,
    },
    wantsAnnual,
    wantsMonthly,
    savingsAnnual,
    savingsMonthly,
  };
}

function calculateHousingDeep(annualGross: number): HousingAffordabilityDeep {
  const monthlyGross = annualGross / 12;
  const maxRentMonthly = round(monthlyGross * 0.30, 0);
  const frontEndMonthlyBudget = round(monthlyGross * 0.28, 0);
  const backEndMonthlyBudget = round(monthlyGross * 0.36, 0);

  const affordabilityHomeRange: [number, number] = [
    Math.round((annualGross * 3.0) / 1000) * 1000,
    Math.round((annualGross * 4.2) / 1000) * 1000,
  ];

  const targetHomePrice = Math.round((annualGross * 3.5) / 1000) * 1000;
  const monthlyInterestRate = 0.0675 / 12; // 6.75% 30-year fixed benchmark
  const numPayments = 360;
  const amortizationFactor = (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numPayments))
    / (Math.pow(1 + monthlyInterestRate, numPayments) - 1);

  const downPercents = [5, 10, 20];
  const scenarios: HomeBuyingScenario[] = downPercents.map((dp) => {
    const downPaymentAmount = Math.round((targetHomePrice * dp) / 100);
    const loanAmount = targetHomePrice - downPaymentAmount;
    const pAndI = Math.round(loanAmount * amortizationFactor);
    const propertyTaxMonthly = Math.round((targetHomePrice * 0.011) / 12);
    const homeInsuranceMonthly = 130;
    const hasPmi = dp < 20;
    const pmiMonthly = hasPmi ? Math.round((loanAmount * 0.0055) / 12) : 0;
    const estimatedMonthlyPayment = pAndI + propertyTaxMonthly + homeInsuranceMonthly + pmiMonthly;

    return {
      downPaymentPercent: dp,
      estimatedHomePrice: targetHomePrice,
      downPaymentAmount,
      loanAmount,
      estimatedMonthlyPayment,
      hasPmi,
    };
  });

  return {
    maxRentMonthly,
    frontEndMonthlyBudget,
    backEndMonthlyBudget,
    affordabilityHomeRange,
    scenarios,
  };
}

function calculateIncomePercentile(annualGross: number): IncomePercentileData {
  let percentile = 50;
  let classStatus = 'Middle Class';
  let nationalComparison = 'Near the median U.S. individual worker income';

  if (annualGross < 32_000) {
    percentile = Math.max(15, Math.round((annualGross / 32_000) * 30));
    classStatus = 'Lower-Middle Income';
    nationalComparison = 'In the lower third of individual earners nationally';
  } else if (annualGross < 45_000) {
    percentile = Math.round(30 + ((annualGross - 32_000) / 13_000) * 15);
    classStatus = 'Lower-Middle Class';
    nationalComparison = 'Approaching the national median individual wage';
  } else if (annualGross < 65_000) {
    percentile = Math.round(45 + ((annualGross - 45_000) / 20_000) * 18);
    classStatus = 'Solid Middle Class';
    nationalComparison = 'At or above the national median individual wage';
  } else if (annualGross < 95_000) {
    percentile = Math.round(63 + ((annualGross - 65_000) / 30_000) * 16);
    classStatus = 'Upper-Middle Class';
    nationalComparison = 'In the top 35% of all individual earners nationwide';
  } else if (annualGross < 140_000) {
    percentile = Math.round(79 + ((annualGross - 95_000) / 45_000) * 11);
    classStatus = 'Upper-Middle Class / High Earner';
    nationalComparison = 'In the top 20% of individual income earners';
  } else {
    percentile = Math.min(99, Math.round(90 + ((annualGross - 140_000) / 100_000) * 9));
    classStatus = 'Top Tier High Earner';
    nationalComparison = 'In the top 10% of wage earners in the United States';
  }

  return {
    percentile,
    classStatus,
    nationalComparison,
    isLivingWageSingle: annualGross >= 38_000,
    isLivingWageFamily: annualGross >= 72_000,
  };
}

function calculatePurchasingPower(annualGross: number, isHourly: boolean): PurchasingPowerRow[] {
  const hourlyRate = isHourly ? annualGross / 2080 : round(annualGross / 2080, 2);

  return STATE_RPP_DATA.map((item) => {
    const multiplier = 100 / item.rppIndex;
    const adjustedEquivalentWage = round(hourlyRate * multiplier, 2);
    const adjustedEquivalentAnnual = Math.round(annualGross * multiplier);

    return {
      stateCode: item.stateCode,
      stateName: getStateName(item.stateCode),
      rppIndex: item.rppIndex,
      adjustedEquivalentWage,
      adjustedEquivalentAnnual,
      costOfLivingTier: item.costTier,
    };
  });
}

function calculateFilingStatusComparison(annualGross: number): FilingStatusComparisonRow[] {
  const single = calculateSalaryAfterTax({
    annualGrossSalary: annualGross,
    state: 'TX',
    filingStatus: 'single',
    taxYear: 2026,
    dependents: 0,
  }).value;

  const married = calculateSalaryAfterTax({
    annualGrossSalary: annualGross,
    state: 'TX',
    filingStatus: 'marriedFilingJointly',
    taxYear: 2026,
    dependents: 0,
  }).value;

  const headOfHousehold = calculateSalaryAfterTax({
    annualGrossSalary: annualGross,
    state: 'TX',
    filingStatus: 'headOfHousehold',
    taxYear: 2026,
    dependents: 1,
  }).value;

  return [
    {
      filingStatus: 'Single',
      federalTax: single.federalIncomeTax,
      ficaTax: single.socialSecurity + single.medicare,
      estimatedNetAnnual: single.annualTakeHome,
      estimatedNetMonthly: single.monthlyTakeHome,
      estimatedNetBiweekly: single.biweeklyTakeHome,
      taxSavingsVsSingle: 0,
    },
    {
      filingStatus: 'Married Filing Jointly',
      federalTax: married.federalIncomeTax,
      ficaTax: married.socialSecurity + married.medicare,
      estimatedNetAnnual: married.annualTakeHome,
      estimatedNetMonthly: married.monthlyTakeHome,
      estimatedNetBiweekly: married.biweeklyTakeHome,
      taxSavingsVsSingle: Math.max(0, single.federalIncomeTax - married.federalIncomeTax),
    },
    {
      filingStatus: 'Head of Household',
      federalTax: headOfHousehold.federalIncomeTax,
      ficaTax: headOfHousehold.socialSecurity + headOfHousehold.medicare,
      estimatedNetAnnual: headOfHousehold.annualTakeHome,
      estimatedNetMonthly: headOfHousehold.monthlyTakeHome,
      estimatedNetBiweekly: headOfHousehold.biweeklyTakeHome,
      taxSavingsVsSingle: Math.max(0, single.federalIncomeTax - headOfHousehold.federalIncomeTax),
    },
  ];
}

function calculateRetirementWealth(annualGross: number): RetirementWealthData {
  const annualSavings10 = round(annualGross * 0.10, 0);
  const monthlySavings10 = round(annualSavings10 / 12, 0);
  const annualSavings15 = round(annualGross * 0.15, 0);
  const monthlySavings15 = round(annualSavings15 / 12, 0);

  const r = 0.07 / 12; // 7% real compound stock market growth rate
  const calcFv = (pmt: number, years: number) => {
    const n = years * 12;
    return Math.round(pmt * ((Math.pow(1 + r, n) - 1) / r));
  };

  const milestones: RetirementMilestone[] = [10, 20, 30, 40].map((years) => ({
    years,
    totalSaved10Percent: calcFv(monthlySavings10, years),
    totalSaved15Percent: calcFv(monthlySavings15, years),
  }));

  return {
    annualSavings10,
    monthlySavings10,
    annualSavings15,
    monthlySavings15,
    milestones,
  };
}

function calculateMicroWageSteps(rate: number): MicroWageStep[] {
  const offsets = [-2, -1, 0, 1, 2];
  return offsets.map((offset) => {
    const r = Math.max(10, rate + offset);
    const annualGross = r * 2080;
    return {
      rate: r,
      annualGross,
      monthlyGross: round(annualGross / 12, 2),
      biweeklyGross: round(annualGross / 26, 2),
      weeklyGross: round(annualGross / 52, 2),
      isCurrent: offset === 0,
    };
  });
}

function calculateMicroSalarySteps(salary: number): MicroSalaryStep[] {
  const currentK = Math.round(salary / 1000);
  const offsets = [-10, -5, 0, 5, 10];
  return offsets.map((offset) => {
    const k = Math.max(25, currentK + offset);
    const s = k * 1000;
    return {
      salary: s,
      hourlyEquivalent: round(s / 2080, 2),
      monthlyGross: round(s / 12, 2),
      biweeklyGross: round(s / 26, 2),
      isCurrent: offset === 0,
    };
  });
}

function getNeighboringRates(rate: number): { prev: number | null; next: number | null; nearby: number[] } {
  const index = HOURLY_RATES.indexOf(rate as HourlyRate);
  if (index === -1) return { prev: null, next: null, nearby: [] };

  const prev = index > 0 ? HOURLY_RATES[index - 1] : null;
  const next = index < HOURLY_RATES.length - 1 ? HOURLY_RATES[index + 1] : null;
  const start = Math.max(0, index - 2);
  const end = Math.min(HOURLY_RATES.length, index + 3);
  const nearby = HOURLY_RATES.slice(start, end);

  return { prev, next, nearby };
}

function getNeighboringSalaries(salary: number): { prev: number | null; next: number | null; nearby: number[] } {
  const index = ANNUAL_SALARIES.indexOf(salary as AnnualSalary);
  if (index === -1) return { prev: null, next: null, nearby: [] };

  const prev = index > 0 ? ANNUAL_SALARIES[index - 1] : null;
  const next = index < ANNUAL_SALARIES.length - 1 ? ANNUAL_SALARIES[index + 1] : null;
  const start = Math.max(0, index - 2);
  const end = Math.min(ANNUAL_SALARIES.length, index + 3);
  const nearby = ANNUAL_SALARIES.slice(start, end);

  return { prev, next, nearby };
}

function getClosestSalary(rate: number): { slug: string; amount: number } {
  const target = rate * 2080;
  let closest: AnnualSalary = ANNUAL_SALARIES[0];
  let minDiff = Math.abs(closest - target);

  for (const s of ANNUAL_SALARIES) {
    const diff = Math.abs(s - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return { slug: salaryToSlug(closest), amount: closest };
}

function getClosestHourly(salary: number): { slug: string; rate: number } {
  const target = salary / 2080;
  let closest: HourlyRate = HOURLY_RATES[0];
  let minDiff = Math.abs(closest - target);

  for (const r of HOURLY_RATES) {
    const diff = Math.abs(r - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = r;
    }
  }

  return { slug: hourlyToSlug(closest), rate: closest };
}

export function getHourlyWageProfile(rate: number): HourlyWageProfile {
  const annualGross = rate * 2080;
  const monthlyGross = round(annualGross / 12, 2);
  const semiMonthlyGross = round(annualGross / 24, 2);
  const biweeklyGross = round(annualGross / 26, 2);
  const weeklyGross = round(annualGross / 52, 2);
  const dailyGross = round(rate * 8, 2);

  const stateTaxes = computeStateTaxes(annualGross);
  const topStates = TOP_BENCHMARK_STATES.map((code) => stateTaxes.find((s) => s.stateCode === code)!).filter(Boolean);
  const itemizedBudget = calculateItemizedBudget(annualGross);
  const housingDeep = calculateHousingDeep(annualGross);
  const closestSalary = getClosestSalary(rate);

  return {
    rate,
    slug: hourlyToSlug(rate),
    annualGross,
    monthlyGross,
    semiMonthlyGross,
    biweeklyGross,
    weeklyGross,
    dailyGross,
    workingHoursPerYear: 2080,
    workScenarios: calculateWorkScenarios(rate),
    overtime: calculateOvertime(rate),
    itemizedBudget,
    budget503020: {
      needsAnnual: itemizedBudget.needsAnnual,
      needsMonthly: itemizedBudget.needsMonthly,
      wantsAnnual: itemizedBudget.wantsAnnual,
      wantsMonthly: itemizedBudget.wantsMonthly,
      savingsAnnual: itemizedBudget.savingsAnnual,
      savingsMonthly: itemizedBudget.savingsMonthly,
    },
    housingGuideline: {
      maxRentMonthly: housingDeep.maxRentMonthly,
      affordabilityHomeRange: housingDeep.affordabilityHomeRange,
    },
    housingDeep,
    stateTaxes,
    topStates,
    matchedOccupations: findMatchingOccupations(annualGross),
    percentileData: calculateIncomePercentile(annualGross),
    purchasingPower: calculatePurchasingPower(annualGross, true),
    filingStatuses: calculateFilingStatusComparison(annualGross),
    retirementWealth: calculateRetirementWealth(annualGross),
    microSteps: calculateMicroWageSteps(rate),
    closestSalarySlug: closestSalary.slug,
    closestSalaryAmount: closestSalary.amount,
    neighboringRates: getNeighboringRates(rate),
  };
}

export function getAnnualSalaryProfile(salary: number): AnnualSalaryProfile {
  const hourlyEquivalent = round(salary / 2080, 2);
  const monthlyGross = round(salary / 12, 2);
  const semiMonthlyGross = round(salary / 24, 2);
  const biweeklyGross = round(salary / 26, 2);
  const weeklyGross = round(salary / 52, 2);
  const dailyGross = round(hourlyEquivalent * 8, 2);

  const stateTaxes = computeStateTaxes(salary);
  const topStates = TOP_BENCHMARK_STATES.map((code) => stateTaxes.find((s) => s.stateCode === code)!).filter(Boolean);
  const itemizedBudget = calculateItemizedBudget(salary);
  const housingDeep = calculateHousingDeep(salary);
  const closestHourly = getClosestHourly(salary);

  return {
    salary,
    slug: salaryToSlug(salary),
    hourlyEquivalent,
    monthlyGross,
    semiMonthlyGross,
    biweeklyGross,
    weeklyGross,
    dailyGross,
    workScenarios: calculateSalaryWorkScenarios(salary),
    itemizedBudget,
    budget503020: {
      needsAnnual: itemizedBudget.needsAnnual,
      needsMonthly: itemizedBudget.needsMonthly,
      wantsAnnual: itemizedBudget.wantsAnnual,
      wantsMonthly: itemizedBudget.wantsMonthly,
      savingsAnnual: itemizedBudget.savingsAnnual,
      savingsMonthly: itemizedBudget.savingsMonthly,
    },
    housingGuideline: {
      maxRentMonthly: housingDeep.maxRentMonthly,
      affordabilityHomeRange: housingDeep.affordabilityHomeRange,
    },
    housingDeep,
    stateTaxes,
    topStates,
    matchedOccupations: findMatchingOccupations(salary),
    percentileData: calculateIncomePercentile(salary),
    purchasingPower: calculatePurchasingPower(salary, false),
    filingStatuses: calculateFilingStatusComparison(salary),
    retirementWealth: calculateRetirementWealth(salary),
    microSteps: calculateMicroSalarySteps(salary),
    closestHourlySlug: closestHourly.slug,
    closestHourlyRate: closestHourly.rate,
    neighboringSalaries: getNeighboringSalaries(salary),
  };
}
