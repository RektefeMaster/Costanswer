import { assertFiniteNonNegative } from '@/lib/calculations/energy/finite';
import { loanFromMonthlyPrincipalAndInterest } from '@/lib/calculations/finance/loan';
import { composeVehiclePurchase, financeVehicle } from './financing';

/**
 * Product thresholds, not universal financial law. They are caps on take-home pay, so they
 * are stricter than the common gross-pay rules of thumb. `maxTotalShare` covers the whole
 * vehicle (payment, fuel, insurance, upkeep, registration); `maxPaymentShare` covers the
 * loan payment alone, so a cheap payment cannot hide an expensive car.
 */
export const VEHICLE_AFFORDABILITY_BANDS = {
  comfortable: { maxTotalShare: 0.15, maxPaymentShare: 0.10 },
  reasonable: { maxTotalShare: 0.20, maxPaymentShare: 0.15 },
  aggressive: { maxTotalShare: 0.25, maxPaymentShare: 0.20 },
} as const;

export const VEHICLE_AFFORDABILITY_BAND_IDS = ['comfortable', 'reasonable', 'aggressive'] as const;

export type VehicleAffordabilityBandId = (typeof VEHICLE_AFFORDABILITY_BAND_IDS)[number];
export type VehicleAffordabilityVerdict = 'comfortable' | 'stretch' | 'risky';

const PRICE_SEARCH_STEPS = 4;
const BUDGET_EPSILON = 1e-9;

export type VehicleBurden = {
  monthlyTakeHome: number;
  monthlyTotal: number;
  monthlyLoanPayment: number;
  totalShare: number;
  paymentShare: number;
  leftoverMonthly: number;
  verdict: VehicleAffordabilityVerdict;
};

export type VehicleBudget = {
  band: VehicleAffordabilityBandId;
  monthlyTotalBudget: number;
  monthlyPaymentBudget: number;
  maxVehiclePrice: number;
};

export function vehicleVerdictLabel(verdict: VehicleAffordabilityVerdict): string {
  switch (verdict) {
    case 'comfortable':
      return 'Comfortable';
    case 'stretch':
      return 'Stretch';
    case 'risky':
      return 'Risky';
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled vehicle affordability verdict: ${exhaustive}`);
    }
  }
}

export function vehicleBandLabel(band: VehicleAffordabilityBandId): string {
  switch (band) {
    case 'comfortable':
      return 'Comfortable';
    case 'reasonable':
      return 'Reasonable';
    case 'aggressive':
      return 'Aggressive';
    default: {
      const exhaustive: never = band;
      throw new Error(`Unhandled vehicle affordability band: ${exhaustive}`);
    }
  }
}

function assertTakeHome(monthlyTakeHome: number): void {
  if (!Number.isFinite(monthlyTakeHome) || monthlyTakeHome <= 0) {
    throw new Error('Monthly take-home pay must be greater than zero.');
  }
}

export function vehicleVerdict(totalShare: number, paymentShare: number): VehicleAffordabilityVerdict {
  const comfortable = VEHICLE_AFFORDABILITY_BANDS.comfortable;
  const reasonable = VEHICLE_AFFORDABILITY_BANDS.reasonable;
  if (totalShare > reasonable.maxTotalShare || paymentShare > reasonable.maxPaymentShare) return 'risky';
  if (totalShare > comfortable.maxTotalShare || paymentShare > comfortable.maxPaymentShare) return 'stretch';
  return 'comfortable';
}

export function vehicleBurden(input: {
  monthlyTakeHome: number;
  monthlyTotal: number;
  monthlyLoanPayment: number;
}): VehicleBurden {
  assertTakeHome(input.monthlyTakeHome);
  assertFiniteNonNegative(input.monthlyTotal, 'Monthly vehicle cost');
  assertFiniteNonNegative(input.monthlyLoanPayment, 'Monthly loan payment');

  const totalShare = input.monthlyTotal / input.monthlyTakeHome;
  const paymentShare = input.monthlyLoanPayment / input.monthlyTakeHome;

  return {
    monthlyTakeHome: input.monthlyTakeHome,
    monthlyTotal: input.monthlyTotal,
    monthlyLoanPayment: input.monthlyLoanPayment,
    totalShare,
    paymentShare,
    leftoverMonthly: input.monthlyTakeHome - input.monthlyTotal,
    verdict: vehicleVerdict(totalShare, paymentShare),
  };
}

/**
 * The inverse of the forward model: the largest sticker price whose payment plus the
 * operating costs the user already described still fits one band. Operating cost does not
 * depend on price, so the search is a straight inversion of the Finance Engine payment
 * factor, confirmed against the forward model before it is returned.
 */
export function maxVehiclePriceForBand(input: {
  monthlyTakeHome: number;
  monthlyOperatingCost: number;
  annualRatePercent: number;
  termMonths: number;
  downPayment: number;
  tradeInValue: number;
  salesTaxAndFees: number;
  band: VehicleAffordabilityBandId;
}): VehicleBudget {
  assertTakeHome(input.monthlyTakeHome);
  assertFiniteNonNegative(input.monthlyOperatingCost, 'Monthly operating cost');
  assertFiniteNonNegative(input.annualRatePercent, 'Interest rate');
  assertFiniteNonNegative(input.termMonths, 'Loan term');

  const caps = VEHICLE_AFFORDABILITY_BANDS[input.band];
  const monthlyTotalBudget = input.monthlyTakeHome * caps.maxTotalShare;
  const paymentCap = input.monthlyTakeHome * caps.maxPaymentShare;
  const monthlyPaymentBudget = Math.max(0, Math.min(monthlyTotalBudget - input.monthlyOperatingCost, paymentCap));

  const fits = (vehiclePrice: number): boolean => {
    if (vehiclePrice <= 0) return false;
    try {
      const financing = financeVehicle({
        purchase: composeVehiclePurchase({
          vehiclePrice,
          salesTaxAndFees: input.salesTaxAndFees,
          downPayment: input.downPayment,
          tradeInValue: input.tradeInValue,
        }),
        annualRatePercent: input.annualRatePercent,
        termMonths: input.termMonths,
      });
      const monthlyTotal = financing.monthlyPayment + input.monthlyOperatingCost;
      return monthlyTotal <= monthlyTotalBudget + BUDGET_EPSILON
        && financing.monthlyPayment <= paymentCap + BUDGET_EPSILON;
    } catch {
      return false;
    }
  };

  const financeable = monthlyPaymentBudget > 0 && input.termMonths >= 1
    ? loanFromMonthlyPrincipalAndInterest(monthlyPaymentBudget, input.annualRatePercent, input.termMonths)
    : 0;
  const rawPrice = financeable + input.downPayment + input.tradeInValue - input.salesTaxAndFees;

  let maxVehiclePrice = 0;
  if (rawPrice > 0) {
    let candidate = Math.floor(rawPrice);
    for (let step = 0; step < PRICE_SEARCH_STEPS && candidate > 0 && !fits(candidate); step += 1) {
      candidate -= 1;
    }
    if (candidate > 0 && fits(candidate)) maxVehiclePrice = candidate;
  }

  return {
    band: input.band,
    monthlyTotalBudget,
    monthlyPaymentBudget,
    maxVehiclePrice,
  };
}
