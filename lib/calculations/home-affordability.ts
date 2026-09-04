import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  ESTIMATED_PMI_ANNUAL_RATE,
  estimatedMonthlyPmi,
  monthlyPaymentFactor,
  monthlyPrincipalAndInterest,
  type MortgageTermYears,
} from './mortgage';

export const HOME_AFFORDABILITY_VERSION = 'home-affordability-v1.0.0';
export const DEFAULT_MAINTENANCE_ANNUAL_PERCENT = 1;
export const DEFAULT_CLOSING_COST_PERCENT = 3;
export const EMERGENCY_FUND_MONTHS = 6;
export const STRESS_RATE_INCREASE_POINTS = 1;
export const STRESS_TAX_INCREASE_RATE = 0.15;
export const STRESS_REPAIR_DOLLARS = 8_000;
export const STRESS_INCOME_DROP_RATE = 0.20;

export const AFFORDABILITY_BANDS = {
  comfortable: { maxHousingShare: 0.25, maxBackEndShare: 0.33, minLeftoverShare: 0.20 },
  reasonable: { maxHousingShare: 0.32, maxBackEndShare: 0.40, minLeftoverShare: 0.12 },
  aggressive: { maxHousingShare: 0.38, maxBackEndShare: 0.48, minLeftoverShare: 0.05 },
} as const;

export type AffordabilityBandId = keyof typeof AFFORDABILITY_BANDS;
export type AffordabilityVerdict = 'comfortable' | 'stretch' | 'risky';
export type HomeAffordabilityMode = 'this-house' | 'how-much-house';

const mortgageTermSchema = z.union([z.literal(15), z.literal(30)]);

const sharedAffordabilityFields = {
  monthlyNetIncome: finiteNumber('Monthly take-home pay', 1, 10_000_000),
  monthlyExistingDebt: finiteNumber('Monthly debt payments', 0, 10_000_000),
  monthlyOtherExpenses: finiteNumber('Other monthly expenses', 0, 10_000_000),
  downPayment: finiteNumber('Down payment', 0, 100_000_000),
  termYears: mortgageTermSchema,
  annualRatePercent: finiteNumber('Interest rate', 0, 25),
  annualPropertyTax: finiteNumber('Yearly property tax', 0, 10_000_000),
  annualHomeInsurance: finiteNumber('Yearly home insurance', 0, 10_000_000),
  monthlyHoa: finiteNumber('Monthly HOA', 0, 100_000),
  includePmiEstimate: z.boolean(),
  maintenanceAnnualPercent: finiteNumber('Yearly maintenance rate', 0, 5),
  closingCostPercent: finiteNumber('Closing-cost rate', 0, 10),
};

export const homeAffordabilityInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('this-house'),
    homePrice: finiteNumber('Home price', 1, 100_000_000),
    ...sharedAffordabilityFields,
  }).refine((input) => input.downPayment < input.homePrice, {
    message: 'Down payment must be less than the home price.',
  }),
  z.object({
    mode: z.literal('how-much-house'),
    ...sharedAffordabilityFields,
  }),
]);

export type HomeAffordabilityInput = z.infer<typeof homeAffordabilityInputSchema>;

export type HousingCostParts = {
  loanAmount: number;
  monthlyPrincipalAndInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;
  monthlyMaintenance: number;
  monthlyHousingTotal: number;
  loanToValuePercent: number;
};

export type AffordabilityStress = {
  rateBumpMonthly: number;
  taxBumpMonthly: number;
  repairMonthsRemaining: number;
  incomeDropHousingShare: number;
};

export type PathToComfortable = {
  extraDownPayment: number | null;
  priceCut: number | null;
};

export type HomeAffordabilityValue = {
  mode: HomeAffordabilityMode;
  verdict: AffordabilityVerdict | null;
  monthlyHousingTotal: number;
  housingShare: number;
  backEndShare: number;
  leftoverMonthly: number;
  leftoverShare: number;
  emergencyFundSixMonths: number;
  homePrice: number | null;
  comfortableHomePrice: number;
  reasonableHomePrice: number;
  aggressiveHomePrice: number;
  priceGap: number | null;
  cashToClose: number | null;
  pathToComfortable: PathToComfortable | null;
  stress: AffordabilityStress | null;
  housing: HousingCostParts | null;
};

type AffordabilityProfile = Omit<Extract<HomeAffordabilityInput, { mode: 'how-much-house' }>, 'mode'>;
type ThisHouseInput = Extract<HomeAffordabilityInput, { mode: 'this-house' }>;

function paymentCountFor(termYears: MortgageTermYears): number {
  return termYears * 12;
}

function share(part: number, whole: number): number {
  if (whole <= 0) throw new Error('Take-home pay must be greater than zero.');
  return part / whole;
}

export function verdictLabel(verdict: AffordabilityVerdict): string {
  switch (verdict) {
    case 'comfortable':
      return 'Comfortable';
    case 'stretch':
      return 'Stretch';
    case 'risky':
      return 'Risky';
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled affordability verdict: ${exhaustive}`);
    }
  }
}

function bandLabel(band: AffordabilityBandId): string {
  switch (band) {
    case 'comfortable':
      return 'Comfortable';
    case 'reasonable':
      return 'Reasonable';
    case 'aggressive':
      return 'Aggressive';
    default: {
      const exhaustive: never = band;
      throw new Error(`Unhandled affordability band: ${exhaustive}`);
    }
  }
}

export function monthlyHousingCost(
  homePrice: number,
  input: Pick<
    AffordabilityProfile,
    | 'downPayment'
    | 'termYears'
    | 'annualRatePercent'
    | 'annualPropertyTax'
    | 'annualHomeInsurance'
    | 'monthlyHoa'
    | 'includePmiEstimate'
    | 'maintenanceAnnualPercent'
  >,
): HousingCostParts {
  if (homePrice <= input.downPayment) {
    throw new Error('Down payment must be less than the home price.');
  }
  const loanAmount = homePrice - input.downPayment;
  const paymentCount = paymentCountFor(input.termYears);
  const monthlyPi = monthlyPrincipalAndInterest(loanAmount, input.annualRatePercent, paymentCount);
  const monthlyPropertyTax = input.annualPropertyTax / 12;
  const monthlyInsurance = input.annualHomeInsurance / 12;
  const monthlyPmi = estimatedMonthlyPmi(loanAmount, homePrice, input.includePmiEstimate);
  const monthlyMaintenance = homePrice * (input.maintenanceAnnualPercent / 100) / 12;
  const monthlyHousingTotal = monthlyPi + monthlyPropertyTax + monthlyInsurance + input.monthlyHoa + monthlyPmi + monthlyMaintenance;
  return {
    loanAmount,
    monthlyPrincipalAndInterest: monthlyPi,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa: input.monthlyHoa,
    monthlyPmi,
    monthlyMaintenance,
    monthlyHousingTotal,
    loanToValuePercent: 100 * loanAmount / homePrice,
  };
}

export function maxHousingBudget(
  input: Pick<AffordabilityProfile, 'monthlyNetIncome' | 'monthlyExistingDebt' | 'monthlyOtherExpenses'>,
  band: AffordabilityBandId,
): number {
  const caps = AFFORDABILITY_BANDS[band];
  const fromHousing = input.monthlyNetIncome * caps.maxHousingShare;
  const fromBackEnd = input.monthlyNetIncome * caps.maxBackEndShare - input.monthlyExistingDebt;
  const fromLeftover = input.monthlyNetIncome
    - input.monthlyExistingDebt
    - input.monthlyOtherExpenses
    - input.monthlyNetIncome * caps.minLeftoverShare;
  return Math.min(fromHousing, fromBackEnd, fromLeftover);
}

export function verdictForHousing(
  housingTotal: number,
  input: Pick<AffordabilityProfile, 'monthlyNetIncome' | 'monthlyExistingDebt' | 'monthlyOtherExpenses'>,
): AffordabilityVerdict {
  const leftoverMonthly = input.monthlyNetIncome - housingTotal - input.monthlyExistingDebt - input.monthlyOtherExpenses;
  const housingShare = share(housingTotal, input.monthlyNetIncome);
  const backEndShare = share(housingTotal + input.monthlyExistingDebt, input.monthlyNetIncome);
  const leftoverShare = share(leftoverMonthly, input.monthlyNetIncome);
  const reasonable = AFFORDABILITY_BANDS.reasonable;
  const comfortable = AFFORDABILITY_BANDS.comfortable;

  if (
    leftoverMonthly < 0
    || housingShare > reasonable.maxHousingShare
    || backEndShare > reasonable.maxBackEndShare
    || leftoverShare < reasonable.minLeftoverShare
  ) {
    return 'risky';
  }
  if (
    housingShare > comfortable.maxHousingShare
    || backEndShare > comfortable.maxBackEndShare
    || leftoverShare < comfortable.minLeftoverShare
  ) {
    return 'stretch';
  }
  return 'comfortable';
}

function homePriceFromHousingBudget(
  budget: number,
  input: AffordabilityProfile,
  includePmi: boolean,
): number {
  const paymentCount = paymentCountFor(input.termYears);
  const factor = monthlyPaymentFactor(input.annualRatePercent, paymentCount);
  const maintenanceMonthlyRate = input.maintenanceAnnualPercent / 100 / 12;
  const fixedMonthly = input.annualPropertyTax / 12 + input.annualHomeInsurance / 12 + input.monthlyHoa;
  const down = input.downPayment;

  const solve = (pmiMonthlyRate: number): number => {
    const paymentRate = factor + pmiMonthlyRate;
    const denominator = paymentRate + maintenanceMonthlyRate;
    if (denominator <= 0) return 0;
    return (budget + paymentRate * down - fixedMonthly) / denominator;
  };

  const fits = (homePrice: number, withPmi: boolean): boolean => {
    if (!(homePrice > down)) return false;
    const cost = monthlyHousingCost(homePrice, { ...input, includePmiEstimate: withPmi });
    return cost.monthlyHousingTotal <= budget + 1e-9;
  };

  const noPmiPrice = solve(0);
  if (!includePmi) {
    return fits(noPmiPrice, false) ? noPmiPrice : 0;
  }

  if (noPmiPrice > down && 100 * (noPmiPrice - down) / noPmiPrice <= 80 && fits(noPmiPrice, true)) {
    return noPmiPrice;
  }

  const pmiRate = ESTIMATED_PMI_ANNUAL_RATE / 12;
  const withPmiPrice = solve(pmiRate);
  if (withPmiPrice > down && 100 * (withPmiPrice - down) / withPmiPrice > 80 && fits(withPmiPrice, true)) {
    return withPmiPrice;
  }

  if (down > 0) {
    const twentyPercentPrice = 5 * down;
    if (fits(twentyPercentPrice, true)) return twentyPercentPrice;
  }
  return 0;
}

export function maxHomePriceForBand(input: AffordabilityProfile, band: AffordabilityBandId): number {
  const budget = maxHousingBudget(input, band);
  if (budget <= 0) return 0;
  const raw = homePriceFromHousingBudget(budget, input, input.includePmiEstimate);
  if (!(raw > input.downPayment)) return 0;

  let price = Math.floor(raw);
  while (price > input.downPayment) {
    const cost = monthlyHousingCost(price, input);
    if (cost.monthlyHousingTotal <= budget + 1e-9) {
      const verdict = verdictForHousing(cost.monthlyHousingTotal, input);
      const acceptable = band === 'comfortable'
        ? verdict === 'comfortable'
        : band === 'reasonable'
          ? verdict === 'comfortable' || verdict === 'stretch'
          : true;
      if (acceptable) return price;
    }
    price -= 1;
  }
  return 0;
}

function extraDownPaymentToComfortable(input: ThisHouseInput): number | null {
  if (verdictForHousing(monthlyHousingCost(input.homePrice, input).monthlyHousingTotal, input) === 'comfortable') {
    return 0;
  }
  const maxDown = input.homePrice - 1;
  if (maxDown <= input.downPayment) return null;
  const comfortableAtMaxDown = verdictForHousing(
    monthlyHousingCost(input.homePrice, { ...input, downPayment: maxDown }).monthlyHousingTotal,
    input,
  );
  if (comfortableAtMaxDown !== 'comfortable') return null;

  let low = input.downPayment;
  let high = maxDown;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const verdict = verdictForHousing(
      monthlyHousingCost(input.homePrice, { ...input, downPayment: mid }).monthlyHousingTotal,
      input,
    );
    if (verdict === 'comfortable') high = mid;
    else low = mid;
  }
  const extra = high - input.downPayment;
  return extra > 0 ? extra : 0;
}

function metricsFromHousing(housingTotal: number, input: AffordabilityProfile) {
  const leftoverMonthly = input.monthlyNetIncome - housingTotal - input.monthlyExistingDebt - input.monthlyOtherExpenses;
  return {
    leftoverMonthly,
    housingShare: share(housingTotal, input.monthlyNetIncome),
    backEndShare: share(housingTotal + input.monthlyExistingDebt, input.monthlyNetIncome),
    leftoverShare: share(leftoverMonthly, input.monthlyNetIncome),
    emergencyFundSixMonths: EMERGENCY_FUND_MONTHS * (housingTotal + input.monthlyExistingDebt + input.monthlyOtherExpenses),
  };
}

function stressForThisHouse(input: ThisHouseInput, housing: HousingCostParts): AffordabilityStress {
  const paymentCount = paymentCountFor(input.termYears);
  const stressedRate = Math.min(25, input.annualRatePercent + STRESS_RATE_INCREASE_POINTS);
  const rateBumpMonthly = Math.max(0, monthlyPrincipalAndInterest(housing.loanAmount, stressedRate, paymentCount) - housing.monthlyPrincipalAndInterest);
  const taxBumpMonthly = housing.monthlyPropertyTax * STRESS_TAX_INCREASE_RATE;
  const essentials = housing.monthlyHousingTotal + input.monthlyExistingDebt + input.monthlyOtherExpenses;
  const funded = EMERGENCY_FUND_MONTHS * essentials;
  const repairMonthsRemaining = essentials > 0 ? Math.max(0, (funded - STRESS_REPAIR_DOLLARS) / essentials) : EMERGENCY_FUND_MONTHS;
  const reducedIncome = input.monthlyNetIncome * (1 - STRESS_INCOME_DROP_RATE);
  const incomeDropHousingShare = share(housing.monthlyHousingTotal, reducedIncome);
  return {
    rateBumpMonthly,
    taxBumpMonthly,
    repairMonthsRemaining,
    incomeDropHousingShare,
  };
}

function roundHousing(housing: HousingCostParts): HousingCostParts {
  return {
    loanAmount: round(housing.loanAmount),
    monthlyPrincipalAndInterest: round(housing.monthlyPrincipalAndInterest),
    monthlyPropertyTax: round(housing.monthlyPropertyTax),
    monthlyInsurance: round(housing.monthlyInsurance),
    monthlyHoa: round(housing.monthlyHoa),
    monthlyPmi: round(housing.monthlyPmi),
    monthlyMaintenance: round(housing.monthlyMaintenance),
    monthlyHousingTotal: round(housing.monthlyHousingTotal),
    loanToValuePercent: round(housing.loanToValuePercent, 1),
  };
}

function assumptions(input: HomeAffordabilityInput, usedPmi: boolean): string[] {
  return [
    'This is a planning screen, not a lender approval, a quote, or advice to buy or not buy.',
    'Take-home pay is used on purpose. The classic 28/36 mortgage rules are based on gross pay and would look looser.',
    'Comfortable means housing stays at or under 25% of take-home, housing plus listed debts at or under 33%, and at least 20% left after housing, debts, and the other expenses you typed.',
    'Stretch is still inside 32% housing and 40% debts. Above that, or if the leftover is too thin, the screen is Risky.',
    'The default interest rate is a national weekly average. Local quotes, credit, points, and fees differ.',
    'Taxes, insurance, and HOA dues are only the amounts you type. They are not looked up by ZIP or county.',
    usedPmi
      ? `Estimated PMI uses a flat ${formatNumber(ESTIMATED_PMI_ANNUAL_RATE * 100, { maximumFractionDigits: 1 })}% of the original loan per year because the down payment is under 20%. Real PMI varies and can drop later.`
      : 'PMI is omitted. Typical conventional loans require it when the down payment is under 20%.',
    `Repairs use ${formatNumber(input.maintenanceAnnualPercent, { maximumFractionDigits: 2 })}% of the home price per year. That is a planning default, not a contractor bid.`,
    `Closing costs use ${formatNumber(input.closingCostPercent, { maximumFractionDigits: 2 })}% of the price plus the down payment. Shop a loan estimate for the real cash to close.`,
    'The stress cases are hypothetical: rate +1 point, property tax +15%, an $8,000 repair against a 6-month essential-cost reserve, and take-home pay −20%.',
  ];
}

function thisHouseBreakdown(value: HomeAffordabilityValue, input: ThisHouseInput, housing: HousingCostParts): CalculationResult<HomeAffordabilityValue>['breakdown'] {
  if (!value.verdict || !value.housing || value.homePrice === null || value.priceGap === null) {
    throw new Error('This-house results are incomplete.');
  }
  const path = value.pathToComfortable;
  const pathDetail = path?.priceCut && path.priceCut > 0
    ? path.extraDownPayment && path.extraDownPayment > 0
      ? `Cut the price by ${formatMoney(path.priceCut, 0)} or raise the down payment by ${formatMoney(path.extraDownPayment, 0)}.`
      : `Cut the price by ${formatMoney(path.priceCut, 0)}.`
    : path?.extraDownPayment && path.extraDownPayment > 0
      ? `Raise the down payment by ${formatMoney(path.extraDownPayment, 0)}.`
      : 'The house already fits the comfortable band.';
  return [
    {
      label: 'Modeled monthly housing cost',
      value: formatMoney(housing.monthlyHousingTotal),
      detail: `${formatMoney(housing.monthlyPrincipalAndInterest)} P&I + tax, insurance, HOA, PMI, and repairs`,
    },
    {
      label: 'Share of take-home',
      value: `${formatNumber(round(value.housingShare * 100, 1), { maximumFractionDigits: 1 })}%`,
      detail: `${formatMoney(input.monthlyNetIncome)} take-home this month`,
    },
    {
      label: 'Comfortable home price',
      value: formatMoney(value.comfortableHomePrice, 0),
      detail: pathDetail,
    },
    {
      label: 'This house vs comfortable',
      value: formatMoney(Math.abs(value.priceGap), 0),
      detail: value.priceGap > 0 ? 'Above the comfortable price' : value.priceGap < 0 ? 'Below the comfortable price' : 'At the comfortable price',
    },
  ];
}

function howMuchBreakdown(value: HomeAffordabilityValue): CalculationResult<HomeAffordabilityValue>['breakdown'] {
  return [
    {
      label: `${bandLabel('comfortable')} price`,
      value: value.comfortableHomePrice > 0 ? formatMoney(value.comfortableHomePrice, 0) : 'None',
      detail: '≤ 25% of take-home on housing, with debts and leftover still inside the comfortable caps',
    },
    {
      label: `${bandLabel('reasonable')} price`,
      value: value.reasonableHomePrice > 0 ? formatMoney(value.reasonableHomePrice, 0) : 'None',
      detail: '≤ 32% of take-home on housing',
    },
    {
      label: `${bandLabel('aggressive')} price`,
      value: value.aggressiveHomePrice > 0 ? formatMoney(value.aggressiveHomePrice, 0) : 'None',
      detail: '≤ 38% of take-home on housing. This band is the risky side of the screen.',
    },
  ];
}

export function calculateHomeAffordability(
  rawInput: unknown,
  datasetSnapshotId?: string,
): CalculationResult<HomeAffordabilityValue> {
  const input = homeAffordabilityInputSchema.parse(rawInput);
  const datasetSnapshotIds = datasetSnapshotId ? [datasetSnapshotId] : [];
  const comfortableHomePrice = maxHomePriceForBand(input, 'comfortable');
  const reasonableHomePrice = maxHomePriceForBand(input, 'reasonable');
  const aggressiveHomePrice = maxHomePriceForBand(input, 'aggressive');

  if (input.mode === 'how-much-house') {
    const value: HomeAffordabilityValue = {
      mode: 'how-much-house',
      verdict: null,
      monthlyHousingTotal: 0,
      housingShare: 0,
      backEndShare: 0,
      leftoverMonthly: 0,
      leftoverShare: 0,
      emergencyFundSixMonths: 0,
      homePrice: null,
      comfortableHomePrice,
      reasonableHomePrice,
      aggressiveHomePrice,
      priceGap: null,
      cashToClose: comfortableHomePrice > 0
        ? round(input.downPayment + comfortableHomePrice * input.closingCostPercent / 100)
        : null,
      pathToComfortable: null,
      stress: null,
      housing: null,
    };
    return {
      value,
      calculationVersion: HOME_AFFORDABILITY_VERSION,
      datasetSnapshotIds,
      breakdown: howMuchBreakdown(value),
      assumptions: assumptions(input, false),
    };
  }

  const housing = monthlyHousingCost(input.homePrice, input);
  const metrics = metricsFromHousing(housing.monthlyHousingTotal, input);
  const verdict = verdictForHousing(housing.monthlyHousingTotal, input);
  const extraDownPayment = extraDownPaymentToComfortable(input);
  const priceCut = verdict === 'comfortable'
    ? 0
    : comfortableHomePrice > 0 ? Math.max(0, Math.round(input.homePrice) - comfortableHomePrice) : null;
  const roundedHousing = roundHousing(housing);
  const stress = stressForThisHouse(input, housing);
  const value: HomeAffordabilityValue = {
    mode: 'this-house',
    verdict,
    monthlyHousingTotal: roundedHousing.monthlyHousingTotal,
    housingShare: metrics.housingShare,
    backEndShare: metrics.backEndShare,
    leftoverMonthly: round(metrics.leftoverMonthly),
    leftoverShare: metrics.leftoverShare,
    emergencyFundSixMonths: round(metrics.emergencyFundSixMonths),
    homePrice: round(input.homePrice, 0),
    comfortableHomePrice,
    reasonableHomePrice,
    aggressiveHomePrice,
    priceGap: round(input.homePrice - comfortableHomePrice, 0),
    cashToClose: round(input.downPayment + input.homePrice * input.closingCostPercent / 100),
    pathToComfortable: {
      extraDownPayment,
      priceCut,
    },
    stress: {
      rateBumpMonthly: round(stress.rateBumpMonthly),
      taxBumpMonthly: round(stress.taxBumpMonthly),
      repairMonthsRemaining: round(stress.repairMonthsRemaining, 1),
      incomeDropHousingShare: stress.incomeDropHousingShare,
    },
    housing: roundedHousing,
  };

  return {
    value,
    calculationVersion: HOME_AFFORDABILITY_VERSION,
    datasetSnapshotIds,
    breakdown: thisHouseBreakdown(value, input, housing),
    assumptions: assumptions(input, housing.monthlyPmi > 0),
  };
}
