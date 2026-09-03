import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import {
  loanFromMonthlyPrincipalAndInterest,
  monthlyPaymentFactor,
  monthlyPrincipalAndInterest,
} from './finance/loan';

export { loanFromMonthlyPrincipalAndInterest, monthlyPaymentFactor, monthlyPrincipalAndInterest };

export const MORTGAGE_TERMS = [15, 30] as const;
export type MortgageTermYears = (typeof MORTGAGE_TERMS)[number];
export const ESTIMATED_PMI_ANNUAL_RATE = 0.005;

const mortgageTermSchema = z.union([z.literal(15), z.literal(30)]);

export const mortgageInputSchema = z.object({
  homePrice: finiteNumber('Home price', 1, 100_000_000),
  downPayment: finiteNumber('Down payment', 0, 100_000_000),
  termYears: mortgageTermSchema,
  annualRatePercent: finiteNumber('Interest rate', 0, 25),
  annualPropertyTax: finiteNumber('Yearly property tax', 0, 10_000_000),
  annualHomeInsurance: finiteNumber('Yearly home insurance', 0, 10_000_000),
  monthlyHoa: finiteNumber('Monthly HOA', 0, 100_000),
  includePmiEstimate: z.boolean(),
}).refine((input) => input.downPayment < input.homePrice, {
  message: 'Down payment must be less than the home price.',
});

export type MortgageInput = z.infer<typeof mortgageInputSchema>;

export type MortgageValue = {
  loanAmount: number;
  monthlyPrincipalAndInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;
  monthlyTotal: number;
  totalInterest: number;
  totalPrincipalAndInterest: number;
  downPaymentPercent: number;
  loanToValuePercent: number;
  paymentCount: number;
};

export function estimatedMonthlyPmi(loanAmount: number, homePrice: number, includePmiEstimate: boolean): number {
  if (!includePmiEstimate || homePrice <= 0) return 0;
  return 100 * loanAmount / homePrice > 80 ? loanAmount * ESTIMATED_PMI_ANNUAL_RATE / 12 : 0;
}

export function defaultRateForTerm(
  termYears: MortgageTermYears,
  rates: { thirtyYearFixedPercent: number; fifteenYearFixedPercent: number },
): number {
  switch (termYears) {
    case 15:
      return rates.fifteenYearFixedPercent;
    case 30:
      return rates.thirtyYearFixedPercent;
    default: {
      const exhaustive: never = termYears;
      throw new Error(`Unhandled mortgage term: ${exhaustive}`);
    }
  }
}

export function calculateMortgage(
  rawInput: unknown,
  datasetSnapshotId?: string,
): CalculationResult<MortgageValue> {
  const input = mortgageInputSchema.parse(rawInput);
  const loanAmount = input.homePrice - input.downPayment;
  const paymentCount = input.termYears * 12;
  const principalAndInterest = monthlyPrincipalAndInterest(loanAmount, input.annualRatePercent, paymentCount);
  const monthlyPropertyTax = input.annualPropertyTax / 12;
  const monthlyInsurance = input.annualHomeInsurance / 12;
  const loanToValuePercent = 100 * loanAmount / input.homePrice;
  const monthlyPmi = estimatedMonthlyPmi(loanAmount, input.homePrice, input.includePmiEstimate);
  const totalPrincipalAndInterest = principalAndInterest * paymentCount;
  const totalInterest = totalPrincipalAndInterest - loanAmount;
  const monthlyTotal = principalAndInterest + monthlyPropertyTax + monthlyInsurance + input.monthlyHoa + monthlyPmi;

  return {
    value: {
      loanAmount: round(loanAmount),
      monthlyPrincipalAndInterest: round(principalAndInterest),
      monthlyPropertyTax: round(monthlyPropertyTax),
      monthlyInsurance: round(monthlyInsurance),
      monthlyHoa: round(input.monthlyHoa),
      monthlyPmi: round(monthlyPmi),
      monthlyTotal: round(monthlyTotal),
      totalInterest: round(totalInterest),
      totalPrincipalAndInterest: round(totalPrincipalAndInterest),
      downPaymentPercent: round(100 * input.downPayment / input.homePrice, 1),
      loanToValuePercent: round(loanToValuePercent, 1),
      paymentCount,
    },
    calculationVersion: 'mortgage-amortization-v1.0.0',
    datasetSnapshotIds: datasetSnapshotId ? [datasetSnapshotId] : [],
    breakdown: [
      {
        label: 'Loan amount',
        value: formatMoney(loanAmount),
        detail: `${formatMoney(input.homePrice)} home − ${formatMoney(input.downPayment)} down`,
      },
      {
        label: 'Monthly principal and interest',
        value: formatMoney(principalAndInterest),
        detail: `${input.termYears}-year fixed at ${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}%`,
      },
      {
        label: 'Estimated monthly total',
        value: formatMoney(monthlyTotal),
        detail: monthlyPmi > 0 || monthlyPropertyTax > 0 || monthlyInsurance > 0 || input.monthlyHoa > 0
          ? 'P&I plus the tax, insurance, HOA, and PMI lines you included'
          : 'Principal and interest only',
      },
    ],
    assumptions: [
      'This is a fixed-rate amortizing loan estimate, not a lender quote or an offer to lend.',
      'The default interest rate is a national weekly average. Local quotes, credit, points, and fees differ.',
      'Taxes, insurance, and HOA dues are only the amounts you type. They are not looked up by ZIP or county.',
      monthlyPmi > 0
        ? `Estimated PMI uses a flat ${formatNumber(ESTIMATED_PMI_ANNUAL_RATE * 100, { maximumFractionDigits: 1 })}% of the original loan per year because the down payment is under 20%. Real PMI varies and can drop later.`
        : 'PMI is omitted. Typical conventional loans require it when the down payment is under 20%.',
      'Closing costs, discount points, and extra principal payments are left out.',
    ],
  };
}
