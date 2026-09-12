import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateFederalIncomeTax } from './federal';
import { calculateChildTaxCredit } from './child-tax-credit';
import { calculateEitc } from './eitc';
import { calculateSelfEmploymentTax } from './self-employment';
import { FILING_STATUSES, type FilingStatus } from './types';
import { TAX_REFUND_ENGINE_ID } from './version';

export const taxRefundInputSchema = z.object({
  grossIncome: finiteNumber('Gross income', 0, 100_000_000),
  netSelfEmploymentProfit: finiteNumber('Net self-employment profit', -10_000_000, 100_000_000).default(0),
  qualifyingChildren: z.number().int({ error: 'Qualifying children must be a whole number.' }).min(0).max(20).default(0),
  otherDependents: z.number().int({ error: 'Other dependents must be a whole number.' }).min(0).max(20).default(0),
  federalWithholding: finiteNumber('Federal income tax withheld', 0, 100_000_000),
  estimatedTaxPayments: finiteNumber('Estimated tax payments already made', 0, 100_000_000).default(0),
  investmentIncome: finiteNumber('Investment income', 0, 100_000_000).default(0),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type TaxRefundInput = z.infer<typeof taxRefundInputSchema>;

export type TaxRefundValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  adjustedGrossIncome: number;
  federalIncomeTax: number;
  selfEmploymentTax: number;
  additionalMedicare: number;
  nonrefundableCredits: number;
  taxAfterNonrefundableCredits: number;
  refundableCredits: number;
  totalTax: number;
  totalPayments: number;
  refund: number;
  amountOwed: number;
};

/**
 * Estimated federal refund or amount owed: published 2026 income tax, Schedule
 * SE, EITC and child tax credit, minus withholding and estimated payments the
 * filer enters.
 *
 * This is not a W-4 withholding estimate. Pub 15-T percentage-method tables
 * are not in the snapshot, so employer withholding is taken as given.
 */
export function calculateTaxRefund(rawInput: unknown): CalculationResult<TaxRefundValue> {
  const input = taxRefundInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  // Treat entered gross income as W-2 wages for Schedule SE wage-base sharing
  // and Form 8959 Additional Medicare Tax (boxes 3 / 5 are not separate inputs).
  const se = calculateSelfEmploymentTax({
    netProfit: input.netSelfEmploymentProfit,
    socialSecurityWages: input.grossIncome,
    medicareWages: input.grossIncome,
    filingStatus: input.filingStatus,
    taxYear: input.taxYear,
  });
  const totalIncome = input.grossIncome + input.netSelfEmploymentProfit;
  const adjustedGrossIncome = Math.max(0, totalIncome - se.value.deductibleHalf);
  const federal = calculateFederalIncomeTax({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: adjustedGrossIncome,
    federal: snapshot.federal,
  });
  // EITC earned income includes net earnings even when they are under $400 and
  // Schedule SE is not filed. A Schedule C loss reduces earned income.
  const selfEmploymentEarned = input.netSelfEmploymentProfit > 0
    ? input.netSelfEmploymentProfit * snapshot.fica.selfEmploymentNetEarningsFactor
    : input.netSelfEmploymentProfit;
  const earnedIncome = Math.max(0, input.grossIncome + selfEmploymentEarned);
  const childCredit = calculateChildTaxCredit({
    modifiedAgi: adjustedGrossIncome,
    qualifyingChildren: input.qualifyingChildren,
    otherDependents: input.otherDependents,
    earnedIncome,
    taxBeforeThisCredit: federal.tax,
    filingStatus: input.filingStatus,
    taxYear: input.taxYear,
  });
  const eitc = calculateEitc({
    earnedIncome,
    adjustedGrossIncome,
    qualifyingChildren: Math.min(input.qualifyingChildren, 3),
    investmentIncome: input.investmentIncome,
    filingStatus: input.filingStatus,
    taxYear: input.taxYear,
  });

  const taxAfterNonrefundableCredits = Math.max(0, federal.tax - childCredit.value.nonrefundableCredit);
  const totalTax = taxAfterNonrefundableCredits + se.value.scheduleSeTax + se.value.additionalMedicare;
  const refundableCredits = childCredit.value.additionalChildTaxCredit + eitc.value.credit;
  const totalPayments = input.federalWithholding + input.estimatedTaxPayments + refundableCredits;
  const balance = totalPayments - totalTax;

  const value: TaxRefundValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    adjustedGrossIncome: round(adjustedGrossIncome),
    federalIncomeTax: round(federal.tax),
    selfEmploymentTax: se.value.scheduleSeTax,
    additionalMedicare: se.value.additionalMedicare,
    nonrefundableCredits: childCredit.value.nonrefundableCredit,
    taxAfterNonrefundableCredits: round(taxAfterNonrefundableCredits),
    refundableCredits: round(refundableCredits),
    totalTax: round(totalTax),
    totalPayments: round(totalPayments),
    refund: round(Math.max(0, balance)),
    amountOwed: round(Math.max(0, -balance)),
  };

  return {
    value,
    calculationVersion: TAX_REFUND_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      { label: 'Federal income tax', value: formatMoney(federal.tax), detail: `${formatMoney(federal.taxableIncome)} of taxable income after the standard deduction` },
      ...(childCredit.value.nonrefundableCredit > 0
        ? [{ label: 'Child tax credit (nonrefundable)', value: `−${formatMoney(childCredit.value.nonrefundableCredit)}` }]
        : []),
      { label: 'Tax after nonrefundable credits', value: formatMoney(taxAfterNonrefundableCredits) },
      ...(se.value.scheduleSeTax > 0
        ? [{ label: 'Self-employment tax', value: formatMoney(se.value.scheduleSeTax) }]
        : []),
      ...(se.value.additionalMedicare > 0
        ? [{ label: 'Additional Medicare Tax', value: formatMoney(se.value.additionalMedicare), detail: 'Form 8959 on W-2 Medicare wages (entered gross income) plus net SE earnings' }]
        : []),
      ...(totalTax !== taxAfterNonrefundableCredits
        ? [{ label: 'Total tax', value: formatMoney(totalTax) }]
        : []),
      { label: 'Federal withholding', value: formatMoney(input.federalWithholding) },
      ...(input.estimatedTaxPayments > 0
        ? [{ label: 'Estimated tax payments', value: formatMoney(input.estimatedTaxPayments) }]
        : []),
      ...(eitc.value.credit > 0
        ? [{ label: 'Earned income credit', value: formatMoney(eitc.value.credit) }]
        : []),
      ...(childCredit.value.additionalChildTaxCredit > 0
        ? [{ label: 'Additional child tax credit', value: formatMoney(childCredit.value.additionalChildTaxCredit) }]
        : []),
      {
        label: balance >= 0 ? 'Estimated refund' : 'Estimated amount owed',
        value: formatMoney(Math.abs(balance)),
      },
    ],
    assumptions: [
      `Tax year ${input.taxYear}. Federal income tax uses the standard deduction and ordinary brackets from ${snapshot.federal.sourceName}. Itemised deductions, IRA/401(k) adjustments, AMT and other credits are not modelled, so tax can be too high.`,
      'Withholding is the amount you enter from Form W-2 box 2 (and 1099 withholding). This page does not apply Publication 15-T tables or a Form W-4, because those tables are not in the snapshot.',
      input.netSelfEmploymentProfit !== 0
        ? `Self-employment profit is added to wages, then the deductible one-half of Schedule SE tax (${formatMoney(se.value.deductibleHalf)}) comes off as an AGI adjustment. W-2 Social Security wages were taken as $0, so the Social Security wage base is treated as fully available to the profit — if you also have W-2 wages, SE tax here can be too high.`
        : 'No self-employment profit was entered, so Schedule SE tax is $0 and AGI is the gross income you typed.',
      'EITC earned income is wages plus 92.35% of a positive SE profit, even when that figure is under $400 and Schedule SE is not filed. A Schedule C loss reduces earned income. Other adjustments are not subtracted, which can mis-time a credit phase-out.',
      'Additional Medicare Tax is included only on net SE earnings from this page. W-2 Medicare wages are not an input, so Additional Medicare on a high-wage job is omitted and tax can be too low. NIIT, state tax and local tax are not modelled.',
      'This is not a filed return and not tax advice. A real refund also depends on credits and income this page does not ask for.',
    ],
  };
}
