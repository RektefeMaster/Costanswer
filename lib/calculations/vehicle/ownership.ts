import type { VehicleFinancing } from './financing';
import type { VehicleOperatingCost } from './operating';

/**
 * Cash out of pocket while you own the car: the loan payment plus everything recurring.
 * Depreciation and resale value are deliberately not modeled.
 */
export type VehicleOwnershipCost = {
  financing: VehicleFinancing;
  operating: VehicleOperatingCost;
  monthlyLoanPayment: number;
  monthlyOperatingCost: number;
  monthlyTotal: number;
  annualTotal: number;
  upfrontCash: number;
  costPerMile: number;
};

export function composeVehicleOwnershipCost(input: {
  financing: VehicleFinancing;
  operating: VehicleOperatingCost;
}): VehicleOwnershipCost {
  const monthlyLoanPayment = input.financing.monthlyPayment;
  const monthlyOperatingCost = input.operating.monthlyOperatingTotal;
  const monthlyTotal = monthlyLoanPayment + monthlyOperatingCost;
  const annualTotal = monthlyTotal * 12;
  const annualMiles = input.operating.energy.annualMiles;

  return {
    financing: input.financing,
    operating: input.operating,
    monthlyLoanPayment,
    monthlyOperatingCost,
    monthlyTotal,
    annualTotal,
    upfrontCash: input.financing.purchase.upfrontCash,
    costPerMile: annualMiles === 0 ? 0 : annualTotal / annualMiles,
  };
}
