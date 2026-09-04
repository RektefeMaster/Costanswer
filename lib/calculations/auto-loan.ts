import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { AUTO_LOAN_ENGINE_ID } from './finance/version';
import { composeVehiclePurchase, financeVehicle } from './vehicle/financing';

export const autoLoanInputSchema = z.object({
  mode: z.enum(['purchase', 'financed']),
  vehiclePrice: finiteNumber('Vehicle price', 0, 10_000_000),
  downPayment: finiteNumber('Down payment', 0, 10_000_000),
  tradeInValue: finiteNumber('Trade-in value', 0, 10_000_000),
  taxesAndFees: finiteNumber('Taxes and fees', 0, 1_000_000),
  financedAmount: finiteNumber('Amount financed', 1, 10_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  termMonths: finiteNumber('Term', 1, 96).refine(Number.isInteger, 'Term must be a whole number of months.'),
}).superRefine((input, context) => {
  if (input.mode === 'purchase' && input.downPayment + input.tradeInValue > input.vehiclePrice + input.taxesAndFees) {
    context.addIssue({ code: 'custom', message: 'Down payment and trade-in cannot exceed price plus taxes and fees.' });
  }
});

export function calculateAutoLoan(rawInput: unknown): CalculationResult<{
  amountFinanced: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  termMonths: number;
}> {
  const input = autoLoanInputSchema.parse(rawInput);
  const purchase = input.mode === 'financed'
    ? composeVehiclePurchase({
      vehiclePrice: input.financedAmount,
      salesTaxAndFees: 0,
      downPayment: 0,
      tradeInValue: 0,
    })
    : composeVehiclePurchase({
      vehiclePrice: input.vehiclePrice,
      salesTaxAndFees: input.taxesAndFees,
      downPayment: input.downPayment,
      tradeInValue: input.tradeInValue,
    });
  if (!purchase.financed) {
    throw new Error('There is nothing left to finance after down payment and trade-in.');
  }
  const financing = financeVehicle({
    purchase,
    annualRatePercent: input.annualRatePercent,
    termMonths: input.termMonths,
  });
  return {
    value: {
      amountFinanced: round(purchase.amountFinanced),
      monthlyPayment: round(financing.monthlyPayment),
      totalInterest: round(financing.totalInterest),
      totalRepayment: round(financing.totalOfPayments),
      termMonths: input.termMonths,
    },
    calculationVersion: AUTO_LOAN_ENGINE_ID,
    datasetSnapshotIds: [],
    breakdown: [
      { label: 'Amount financed', value: formatMoney(purchase.amountFinanced) },
      { label: 'Monthly payment', value: formatMoney(financing.monthlyPayment), detail: `${input.termMonths} months at ${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}% nominal annual interest rate` },
      { label: 'Total interest', value: formatMoney(financing.totalInterest) },
    ],
    assumptions: [
      'This is a fixed-rate amortizing auto loan estimate, not a dealer or lender quote.',
      'The rate is a nominal annual interest rate compounded monthly. It is not a full APR with fees.',
      'Operating cost, insurance, fuel, and maintenance are not included. Use Car Affordability for that.',
      input.mode === 'purchase'
        ? 'Amount financed is price plus taxes/fees, minus down payment and trade-in.'
        : 'You entered the financed amount directly.',
    ],
  };
}
