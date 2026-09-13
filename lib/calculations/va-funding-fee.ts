/**
 * VA funding fee from the published rate charts.
 *
 * The fee is a percentage of the loan amount, not of the purchase price. A
 * larger down payment only changes the purchase-loan rate, and only at the 5%
 * and 10% steps VA prints. Financing the fee raises the loan; the percentage
 * then applies to that larger amount, which is why the two answers differ.
 *
 * This page does not decide eligibility, entitlement, or whether a borrower is
 * exempt. Those are VA determinations.
 */
import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from './contracts';
import {
  VA_LOAN_TYPES,
  vaFundingFeeRatePercent,
  vaFundingFeeSnapshot,
  type VaLoanType,
} from '@/lib/data/va-funding-fee';

export const VA_FUNDING_FEE_ENGINE_ID = 'va-funding-fee-v1.1.0';

export const VA_LOAN_TYPE_LABELS: Record<VaLoanType, string> = {
  purchase: 'Purchase or construction',
  'cash-out': 'Cash-out refinance',
  irrrl: 'Interest Rate Reduction Refinance (IRRRL)',
  'nadl-purchase': 'Native American Direct Loan, purchase',
  'nadl-refinance': 'Native American Direct Loan, refinance',
  'manufactured-not-affixed': 'Manufactured home, not permanently affixed',
  assumption: 'Loan assumption',
  vendee: 'Vendee loan on VA-acquired property',
};

export const vaFundingFeeInputSchema = z.object({
  loanType: z.enum(VA_LOAN_TYPES),
  loanAmount: finiteNumber('Loan amount', 1, 20_000_000),
  firstUse: z.boolean(),
  downPaymentPercent: finiteNumber('Down payment', 0, 100),
  exempt: z.boolean(),
  financeFee: z.boolean(),
});

export type VaFundingFeeInput = z.infer<typeof vaFundingFeeInputSchema>;

export type VaFundingFeeValue = {
  loanType: VaLoanType;
  ratePercent: number;
  fee: number;
  loanAmountBeforeFee: number;
  loanAmountAfterFee: number;
  financed: boolean;
  exempt: boolean;
};

export function calculateVaFundingFee(rawInput: unknown): CalculationResult<VaFundingFeeValue> {
  const input = vaFundingFeeInputSchema.parse(rawInput);
  const ratePercent = vaFundingFeeRatePercent({
    loanType: input.loanType,
    firstUse: input.firstUse,
    downPaymentPercent: input.downPaymentPercent,
    exempt: input.exempt,
  });
  const rate = ratePercent / 100;
  const usesDownPayment = input.loanType === 'purchase';

  let fee: number;
  let loanAmountAfterFee: number;
  if (input.exempt || rate === 0) {
    fee = 0;
    loanAmountAfterFee = input.loanAmount;
  } else {
    /*
     * VA Pamphlet 26-7 ch. 8: apply the chart percentage to the loan without the
     * funding fee added. Financing then adds that same dollar fee to the note.
     * Compounding the fee onto itself is not the handbook method.
     */
    fee = round(input.loanAmount * rate, 2);
    loanAmountAfterFee = input.financeFee ? round(input.loanAmount + fee, 2) : input.loanAmount;
  }

  const breakdown = [
    {
      label: 'Loan type',
      value: VA_LOAN_TYPE_LABELS[input.loanType],
      detail: usesDownPayment
        ? (input.firstUse ? 'First use of a VA-backed or VA direct home loan' : 'After first use')
        : 'Down payment does not change this rate',
    },
    {
      label: 'Published funding-fee rate',
      value: input.exempt ? 'Exempt' : `${ratePercent}%`,
      detail: input.exempt
        ? 'You marked an exemption. VA still has to agree that it applies.'
        : `Effective ${vaFundingFeeSnapshot.effectiveFrom}. Applied to the loan amount, not the purchase price.`,
    },
    {
      label: 'Funding fee',
      value: formatMoney(fee),
      detail: `${formatMoney(input.loanAmount, 0)} × ${ratePercent}%`,
    },
    {
      label: input.financeFee && fee > 0 ? 'Loan amount with the fee financed' : 'Loan amount',
      value: formatMoney(loanAmountAfterFee, 0),
      detail: input.financeFee && fee > 0
        ? 'The same fee is added to the note. VA does not recalculate the percentage on the larger amount. Other closing costs cannot be financed on a purchase.'
        : 'Paid in cash at closing, so the loan itself does not grow.',
    },
  ];

  return {
    value: {
      loanType: input.loanType,
      ratePercent,
      fee,
      loanAmountBeforeFee: round(input.loanAmount, 2),
      loanAmountAfterFee,
      financed: input.financeFee && fee > 0,
      exempt: input.exempt,
    },
    calculationVersion: VA_FUNDING_FEE_ENGINE_ID,
    datasetSnapshotIds: [vaFundingFeeSnapshot.snapshotId],
    breakdown,
    assumptions: [
      'The limit here is the VA funding fee chart, not an entitlement, occupancy, or credit decision.',
      'A prior VA loan used only to buy a manufactured home still counts as first use for these rates.',
      'If the fee is financed, VA still computes it on the loan without the fee included, then adds that dollar amount to the note.',
      'An IRRRL’s exact financed amount can also go through VA Form 26-8923. This page applies the published 0.5% chart rate to the loan you type.',
      'FHA mortgage insurance and conventional PMI are different products and are not this fee.',
      'Seller credits and other closing costs are negotiated with the lender. They are not in this number.',
    ],
  };
}

export { VA_LOAN_TYPES };
export type { VaLoanType };
