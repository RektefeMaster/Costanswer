import { assertFiniteNonNegative } from '@/lib/calculations/energy/finite';
import { summarizeAmortization } from '@/lib/calculations/finance/loan';

/**
 * How a purchase is paid for. `amountDue` is what the dealer is owed, credits are the
 * down payment plus any trade-in, and whatever is left over is financed.
 */
export type VehiclePurchase = {
  vehiclePrice: number;
  salesTaxAndFees: number;
  downPayment: number;
  tradeInValue: number;
  amountDue: number;
  creditsApplied: number;
  amountFinanced: number;
  upfrontCash: number;
  financed: boolean;
};

export type VehicleFinancing = {
  purchase: VehiclePurchase;
  annualRatePercent: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalOfPayments: number;
};

export function composeVehiclePurchase(input: {
  vehiclePrice: number;
  salesTaxAndFees: number;
  downPayment: number;
  tradeInValue: number;
}): VehiclePurchase {
  assertFiniteNonNegative(input.vehiclePrice, 'Vehicle price');
  assertFiniteNonNegative(input.salesTaxAndFees, 'Taxes and fees');
  assertFiniteNonNegative(input.downPayment, 'Down payment');
  assertFiniteNonNegative(input.tradeInValue, 'Trade-in value');

  const amountDue = input.vehiclePrice + input.salesTaxAndFees;
  const creditsApplied = input.downPayment + input.tradeInValue;
  if (creditsApplied > amountDue) {
    throw new Error('Down payment and trade-in cannot be more than the price plus taxes and fees.');
  }
  const amountFinanced = amountDue - creditsApplied;

  return {
    vehiclePrice: input.vehiclePrice,
    salesTaxAndFees: input.salesTaxAndFees,
    downPayment: input.downPayment,
    tradeInValue: input.tradeInValue,
    amountDue,
    creditsApplied,
    amountFinanced,
    upfrontCash: input.downPayment,
    financed: amountFinanced > 0,
  };
}

/**
 * Payment math is delegated to the Finance Engine. A purchase with nothing left to
 * finance is a cash purchase: no payment, no interest, and the term is not used.
 */
export function financeVehicle(input: {
  purchase: VehiclePurchase;
  annualRatePercent: number;
  termMonths: number;
}): VehicleFinancing {
  assertFiniteNonNegative(input.annualRatePercent, 'Interest rate');
  assertFiniteNonNegative(input.termMonths, 'Loan term');

  if (!input.purchase.financed) {
    return {
      purchase: input.purchase,
      annualRatePercent: input.annualRatePercent,
      termMonths: input.termMonths,
      monthlyPayment: 0,
      totalInterest: 0,
      totalOfPayments: 0,
    };
  }

  const summary = summarizeAmortization(
    input.purchase.amountFinanced,
    input.annualRatePercent,
    input.termMonths,
  );

  return {
    purchase: input.purchase,
    annualRatePercent: input.annualRatePercent,
    termMonths: input.termMonths,
    monthlyPayment: summary.scheduledMonthlyPayment,
    totalInterest: summary.totalInterest,
    totalOfPayments: summary.totalPaid,
  };
}
