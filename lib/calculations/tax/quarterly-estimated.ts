import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { QUARTERLY_ESTIMATED_TAX_ENGINE_ID } from './version';

export const quarterlyEstimatedTaxInputSchema = z.object({
  expectedCurrentYearTax: finiteNumber('Expected current-year tax', 0, 100_000_000),
  priorYearTax: finiteNumber('Prior-year tax', 0, 100_000_000),
  priorYearAgi: finiteNumber('Prior-year adjusted gross income', 0, 100_000_000),
  expectedWithholdingAndRefundableCredits: finiteNumber('Expected withholding and refundable credits', 0, 100_000_000),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type QuarterlyEstimatedTaxInput = z.infer<typeof quarterlyEstimatedTaxInputSchema>;

export type QuarterlyInstallment = {
  installment: number;
  dueOn: string;
  amount: number;
};

export type QuarterlyEstimatedTaxValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  expectedCurrentYearTax: number;
  priorYearTax: number;
  requiredAnnualPayment: number;
  amountStillToPay: number;
  paymentsRequired: boolean;
  usedHighIncomeSafeHarbor: boolean;
  owedAfterWithholding: number;
  quarterlyPayment: number;
  installments: QuarterlyInstallment[];
};

/**
 * Form 1040-ES required annual payment and four equal installments.
 *
 * This is not Form 2210. It does not compute an underpayment penalty, does not
 * apply the annualized income installment method, and does not substitute 66⅔%
 * for farming or fishing income.
 */
export function calculateQuarterlyEstimatedTax(rawInput: unknown): CalculationResult<QuarterlyEstimatedTaxValue> {
  const input = quarterlyEstimatedTaxInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const rules = snapshot.estimatedTax;
  const highIncomeThreshold = input.filingStatus === 'marriedFilingSeparately'
    ? rules.highIncomePriorYearAgiMarriedFilingSeparately
    : rules.highIncomePriorYearAgi;
  const usedHighIncomeSafeHarbor = input.priorYearAgi > highIncomeThreshold;
  const priorYearRate = usedHighIncomeSafeHarbor
    ? rules.highIncomePriorYearSafeHarborRate
    : rules.priorYearSafeHarborRate;
  const currentYearSafeHarbor = input.expectedCurrentYearTax * rules.currentYearSafeHarborRate;
  const priorYearSafeHarbor = input.priorYearTax * priorYearRate;
  // A $0 prior-year tax cannot be a safe harbor floor — that would zero out
  // estimated payments for filers who owed nothing last year but owe this year.
  const requiredAnnualPayment = input.priorYearTax <= 0
    ? currentYearSafeHarbor
    : Math.min(currentYearSafeHarbor, priorYearSafeHarbor);
  const owedAfterWithholding = Math.max(0, input.expectedCurrentYearTax - input.expectedWithholdingAndRefundableCredits);
  const paymentsRequired = owedAfterWithholding >= rules.minimumTaxToOwe
    && input.expectedWithholdingAndRefundableCredits < requiredAnnualPayment;
  const amountStillToPay = round(paymentsRequired
    ? Math.max(0, requiredAnnualPayment - input.expectedWithholdingAndRefundableCredits)
    : 0);
  const quarterlyPayment = rules.installmentCount === 0 ? 0 : amountStillToPay / rules.installmentCount;
  const roundedQuarterly = round(quarterlyPayment);
  const installments: QuarterlyInstallment[] = rules.dueDates.map((row, index) => {
    const isLast = index === rules.dueDates.length - 1;
    return {
      installment: row.installment,
      dueOn: row.dueOn,
      amount: isLast
        ? round(Math.max(0, amountStillToPay - roundedQuarterly * (rules.dueDates.length - 1)))
        : roundedQuarterly,
    };
  });

  const value: QuarterlyEstimatedTaxValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    expectedCurrentYearTax: round(input.expectedCurrentYearTax),
    priorYearTax: round(input.priorYearTax),
    requiredAnnualPayment: round(requiredAnnualPayment),
    amountStillToPay: round(amountStillToPay),
    paymentsRequired,
    usedHighIncomeSafeHarbor,
    owedAfterWithholding: round(owedAfterWithholding),
    quarterlyPayment: round(quarterlyPayment),
    installments,
  };

  return {
    value,
    calculationVersion: QUARTERLY_ESTIMATED_TAX_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      {
        label: `${formatNumber(rules.currentYearSafeHarborRate * 100, { maximumFractionDigits: 4 })}% of ${input.taxYear} tax`,
        value: formatMoney(currentYearSafeHarbor),
      },
      {
        label: `${formatNumber(priorYearRate * 100, { maximumFractionDigits: 4 })}% of ${input.taxYear - 1} tax`,
        value: formatMoney(priorYearSafeHarbor),
        detail: usedHighIncomeSafeHarbor
          ? `Prior-year AGI is over ${formatMoney(highIncomeThreshold)} for ${FILING_STATUS_LABELS[input.filingStatus]}, so the 110% rule applies`
          : 'Regular 100% prior-year safe harbor',
      },
      {
        label: 'Required annual payment',
        value: formatMoney(requiredAnnualPayment),
        detail: input.priorYearTax <= 0
          ? 'Prior-year tax was $0, so only the current-year safe harbor applies'
          : 'The smaller of those two figures',
      },
      {
        label: 'Withholding and refundable credits',
        value: formatMoney(input.expectedWithholdingAndRefundableCredits),
      },
      {
        label: paymentsRequired ? 'Each quarterly payment' : 'Estimated payments required',
        value: paymentsRequired ? formatMoney(quarterlyPayment) : 'None',
        detail: paymentsRequired
          ? `Four equal installments totalling ${formatMoney(amountStillToPay)}`
          : owedAfterWithholding < rules.minimumTaxToOwe
            ? `You expect to owe less than ${formatMoney(rules.minimumTaxToOwe)} after withholding and refundable credits`
            : 'Withholding and refundable credits already cover the required annual payment',
      },
    ],
    assumptions: [
      `Tax year ${input.taxYear}. Safe-harbor percentages, the ${formatMoney(rules.minimumTaxToOwe)} owed threshold, and the due dates are from ${rules.sourceName}.`,
      'Expected current-year tax is the figure you enter. This page does not compute income tax, self-employment tax or credits from a return.',
      'Payments are split into four equal installments. Uneven income, the annualized income installment method, and amended estimates after a mid-year change are not modelled — if income is front-loaded, equal installments can leave a penalty even when the annual total is enough.',
      'Farming and fishing income may use 66⅔% instead of 90%. That substitution is not applied, so this required payment can be too high for those filers.',
      'The January 15 payment is not required if you file the return by February 1 and pay the balance with it. This page still shows that installment.',
      'This is not Form 2210 and not a penalty calculation.',
    ],
  };
}
