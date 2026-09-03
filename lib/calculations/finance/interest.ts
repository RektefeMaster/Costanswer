export const COMPOUNDING_FREQUENCIES = ['annually', 'semiannually', 'quarterly', 'monthly', 'weekly'] as const;
export type CompoundingFrequency = (typeof COMPOUNDING_FREQUENCIES)[number];

export const PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  annually: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  weekly: 52,
};

export function simpleInterest(principal: number, annualRatePercent: number, years: number): number {
  if (![principal, annualRatePercent, years].every(Number.isFinite)) {
    throw new Error('Simple interest inputs must be finite numbers.');
  }
  if (principal < 0 || annualRatePercent < 0 || years < 0) {
    throw new Error('Simple interest inputs cannot be negative.');
  }
  return principal * (annualRatePercent / 100) * years;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

function lcm(a: number, b: number): number {
  return a / gcd(a, b) * b;
}

export type CompoundInterestGrowth = {
  endingBalance: number;
  startingPrincipal: number;
  totalContributions: number;
  totalGrowth: number;
  compoundingPeriods: number;
  contributionPeriods: number;
};

function closedFormCompound(
  principal: number,
  contribution: number,
  periodicRate: number,
  periods: number,
): { endingBalance: number; totalContributions: number } {
  const totalContributions = contribution * periods;
  if (periodicRate === 0) {
    return { endingBalance: principal + totalContributions, totalContributions };
  }
  const growth = (1 + periodicRate) ** periods;
  const annuity = contribution * (growth - 1) / periodicRate;
  return { endingBalance: principal * growth + annuity, totalContributions };
}

function simulateMismatchedFrequencies(
  principal: number,
  contribution: number,
  annualRatePercent: number,
  years: number,
  compounding: CompoundingFrequency,
  contributionFrequency: CompoundingFrequency,
): CompoundInterestGrowth {
  const compoundPerYear = PERIODS_PER_YEAR[compounding];
  const contribPerYear = PERIODS_PER_YEAR[contributionFrequency];
  const stepsPerYear = lcm(compoundPerYear, contribPerYear);
  const totalSteps = Math.round(years * stepsPerYear);
  const compoundEvery = stepsPerYear / compoundPerYear;
  const contribEvery = stepsPerYear / contribPerYear;
  const periodicRate = (annualRatePercent / 100) / compoundPerYear;

  let balance = principal;
  let totalContributions = 0;
  for (let step = 1; step <= totalSteps; step += 1) {
    if (step % compoundEvery === 0) balance += balance * periodicRate;
    if (step % contribEvery === 0) {
      balance += contribution;
      totalContributions += contribution;
    }
  }

  return {
    endingBalance: balance,
    startingPrincipal: principal,
    totalContributions,
    totalGrowth: balance - principal - totalContributions,
    compoundingPeriods: years * compoundPerYear,
    contributionPeriods: years * contribPerYear,
  };
}

export function compoundInterestGrowth(input: {
  principal: number;
  annualRatePercent: number;
  years: number;
  contribution: number;
  compounding: CompoundingFrequency;
  contributionFrequency: CompoundingFrequency;
}): CompoundInterestGrowth {
  const { principal, annualRatePercent, years, contribution, compounding, contributionFrequency } = input;
  if (![principal, annualRatePercent, years, contribution].every(Number.isFinite)) {
    throw new Error('Compound interest inputs must be finite numbers.');
  }
  if (principal < 0 || annualRatePercent < 0 || years < 0 || contribution < 0) {
    throw new Error('Compound interest inputs cannot be negative.');
  }

  const compoundPerYear = PERIODS_PER_YEAR[compounding];
  const contribPerYear = PERIODS_PER_YEAR[contributionFrequency];
  if (years === 0) {
    return {
      endingBalance: principal,
      startingPrincipal: principal,
      totalContributions: 0,
      totalGrowth: 0,
      compoundingPeriods: 0,
      contributionPeriods: 0,
    };
  }

  if (compounding === contributionFrequency) {
    const periods = years * compoundPerYear;
    const periodicRate = (annualRatePercent / 100) / compoundPerYear;
    const closed = closedFormCompound(principal, contribution, periodicRate, periods);
    return {
      endingBalance: closed.endingBalance,
      startingPrincipal: principal,
      totalContributions: closed.totalContributions,
      totalGrowth: closed.endingBalance - principal - closed.totalContributions,
      compoundingPeriods: periods,
      contributionPeriods: periods,
    };
  }

  return simulateMismatchedFrequencies(
    principal,
    contribution,
    annualRatePercent,
    years,
    compounding,
    contributionFrequency,
  );
}
