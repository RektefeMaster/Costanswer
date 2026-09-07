import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateProgressiveTax } from './brackets';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { CAPITAL_GAINS_ENGINE_ID } from './version';

export const capitalGainsInputSchema = z.object({
  /** Taxable income that is not long-term capital gain or qualified dividends. */
  otherTaxableIncome: finiteNumber('Other taxable income', 0, 100_000_000),
  longTermGains: finiteNumber('Long-term capital gains', 0, 100_000_000),
  /** Defaults to other taxable income plus the gains, which understates MAGI when wages were reduced by the standard deduction. */
  modifiedAgi: finiteNumber('Modified adjusted gross income', 0, 100_000_000).optional(),
  /** Defaults to the long-term gains. Interest, dividends and rental income that are NII should be added. */
  netInvestmentIncome: finiteNumber('Net investment income', 0, 100_000_000).optional(),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type CapitalGainsInput = z.infer<typeof capitalGainsInputSchema>;

export type CapitalGainsValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  otherTaxableIncome: number;
  longTermGains: number;
  taxableIncome: number;
  amountAtZero: number;
  amountAtFifteen: number;
  amountAtTwenty: number;
  ordinaryTax: number;
  capitalGainsTax: number;
  incomeTax: number;
  netInvestmentIncomeTax: number;
  totalTax: number;
};

/**
 * Preferential long-term capital gains rates stacked on ordinary taxable income,
 * plus the 3.8% Net Investment Income Tax.
 *
 * Collectibles (28%), unrecaptured §1250 gain (25%), qualified dividends mixed
 * with ordinary dividends, and the §121 home-sale exclusion are not modelled.
 */
export function calculateCapitalGains(rawInput: unknown): CalculationResult<CapitalGainsValue> {
  const input = capitalGainsInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const zeroMax = snapshot.federalCredits.longTermCapitalGains.zeroRateMaxByFilingStatus[input.filingStatus];
  const fifteenMax = snapshot.federalCredits.longTermCapitalGains.fifteenRateMaxByFilingStatus[input.filingStatus];
  const { zeroRate, fifteenRate, twentyRate } = snapshot.federalCredits.longTermCapitalGains;
  const taxableIncome = input.otherTaxableIncome + input.longTermGains;
  const ordinaryTax = calculateProgressiveTax(
    input.otherTaxableIncome,
    snapshot.federal.bracketsByFilingStatus[input.filingStatus],
  );

  const zeroRoom = Math.max(0, zeroMax - input.otherTaxableIncome);
  const amountAtZero = Math.min(input.longTermGains, zeroRoom);
  const fifteenRoom = Math.max(0, fifteenMax - input.otherTaxableIncome - amountAtZero);
  const amountAtFifteen = Math.min(input.longTermGains - amountAtZero, fifteenRoom);
  const amountAtTwenty = input.longTermGains - amountAtZero - amountAtFifteen;
  const capitalGainsTax = amountAtFifteen * fifteenRate + amountAtTwenty * twentyRate;

  const magi = input.modifiedAgi ?? taxableIncome;
  const nii = input.netInvestmentIncome ?? input.longTermGains;
  const niitThreshold = snapshot.federalCredits.netInvestmentIncomeTax.thresholdByFilingStatus[input.filingStatus];
  const niitBase = Math.min(nii, Math.max(0, magi - niitThreshold));
  const netInvestmentIncomeTax = niitBase * snapshot.federalCredits.netInvestmentIncomeTax.rate;

  const value: CapitalGainsValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    otherTaxableIncome: round(input.otherTaxableIncome),
    longTermGains: round(input.longTermGains),
    taxableIncome: round(taxableIncome),
    amountAtZero: round(amountAtZero),
    amountAtFifteen: round(amountAtFifteen),
    amountAtTwenty: round(amountAtTwenty),
    ordinaryTax: round(ordinaryTax),
    capitalGainsTax: round(capitalGainsTax),
    incomeTax: round(ordinaryTax + capitalGainsTax),
    netInvestmentIncomeTax: round(netInvestmentIncomeTax),
    totalTax: round(ordinaryTax + capitalGainsTax + netInvestmentIncomeTax),
  };

  const percent = (rate: number) => `${formatNumber(rate * 100, { maximumFractionDigits: 1 })}%`;

  return {
    value,
    calculationVersion: CAPITAL_GAINS_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      { label: 'Ordinary taxable income', value: formatMoney(input.otherTaxableIncome), detail: 'Taxed at ordinary brackets' },
      { label: 'Ordinary income tax', value: formatMoney(ordinaryTax) },
      ...(amountAtZero > 0
        ? [{ label: `${percent(zeroRate)} long-term gains`, value: formatMoney(0), detail: formatMoney(amountAtZero) }]
        : []),
      ...(amountAtFifteen > 0
        ? [{ label: `${percent(fifteenRate)} long-term gains`, value: formatMoney(amountAtFifteen * fifteenRate), detail: formatMoney(amountAtFifteen) }]
        : []),
      ...(amountAtTwenty > 0
        ? [{ label: `${percent(twentyRate)} long-term gains`, value: formatMoney(amountAtTwenty * twentyRate), detail: formatMoney(amountAtTwenty) }]
        : []),
      {
        label: 'Net Investment Income Tax',
        value: formatMoney(netInvestmentIncomeTax),
        detail: netInvestmentIncomeTax === 0
          ? `MAGI is not over the ${formatMoney(niitThreshold)} threshold for ${FILING_STATUS_LABELS[input.filingStatus]}`
          : `${percent(snapshot.federalCredits.netInvestmentIncomeTax.rate)} of ${formatMoney(niitBase)}`,
      },
    ],
    assumptions: [
      `Tax year ${input.taxYear}. The 0% and 15% long-term capital gains ceilings are from ${snapshot.federalCredits.sourceName} §4.03. Amounts above the 15% ceiling are taxed at 20%.`,
      'Long-term means a holding period of more than one year. Short-term gains are ordinary income and should be entered there, not here.',
      'Qualified dividends use the same 0%/15%/20% schedule. They are not a separate input; include them in the long-term gain figure only if they are actually qualified.',
      'Collectibles (28%), unrecaptured section 1250 gain (25%), the net investment income of a trade or business, and the section 121 exclusion on a main home are not modelled.',
      input.modifiedAgi === undefined
        ? `MAGI for the NIIT was taken as other taxable income plus the gains (${formatMoney(magi)}). That understates MAGI when the standard deduction or adjustments came off before taxable income, so the NIIT can be too low.`
        : `NIIT uses MAGI of ${formatMoney(magi)} and net investment income of ${formatMoney(nii)}. The tax is 3.8% of the smaller of those two figures once MAGI exceeds ${formatMoney(niitThreshold)}.`,
      `NIIT thresholds are statutory under IRC 1411 and are not inflation-indexed. Source: ${snapshot.federalCredits.netInvestmentIncomeTax.sourceName}.`,
      'This is federal tax only, not a filed return, and not tax advice.',
    ],
  };
}
