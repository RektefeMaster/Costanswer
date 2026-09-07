import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { SELF_EMPLOYMENT_TAX_ENGINE_ID } from './version';

export const selfEmploymentTaxInputSchema = z.object({
  /** Combined net profit from Schedule C / farm, Schedule SE line 3. Losses are allowed; they produce $0 SE tax. */
  netProfit: finiteNumber('Net self-employment profit', -10_000_000, 100_000_000),
  /** Form W-2 box 3 social security wages, Schedule SE line 8a. */
  socialSecurityWages: finiteNumber('Social Security wages from Form W-2', 0, 100_000_000).default(0),
  /**
   * Form W-2 box 5 Medicare wages, used only for Form 8959 Additional Medicare Tax.
   * When omitted, Social Security wages are used, which understates Additional Medicare
   * once wages have passed the Social Security wage base.
   */
  medicareWages: finiteNumber('Medicare wages from Form W-2', 0, 100_000_000).optional(),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type SelfEmploymentTaxInput = z.infer<typeof selfEmploymentTaxInputSchema>;

export type SelfEmploymentTaxValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  netProfit: number;
  netEarnings: number;
  belowFilingThreshold: boolean;
  socialSecurityWagesUsed: number;
  remainingSocialSecurityBase: number;
  socialSecurityTax: number;
  medicareTax: number;
  scheduleSeTax: number;
  deductibleHalf: number;
  additionalMedicare: number;
  totalPayrollTax: number;
};

/**
 * Schedule SE (Form 1040) self-employment tax, plus Form 8959 Additional
 * Medicare Tax on the combined wages and net earnings.
 *
 * This is not a doubled employee FICA line. Schedule SE charges 12.4% Social
 * Security and 2.9% Medicare on net earnings after the 92.35% factor, and only
 * the Social Security piece shares the wage base with W-2 box 3. Additional
 * Medicare is a separate 0.9% on Form 8959; it is not on Schedule SE and it is
 * not deductible.
 */
export function calculateSelfEmploymentTax(rawInput: unknown): CalculationResult<SelfEmploymentTaxValue> {
  const input = selfEmploymentTaxInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const { fica } = snapshot;
  const socialSecurityRate = fica.socialSecurityRate * 2;
  const medicareRate = fica.medicareRate * 2;
  const ssWages = Math.min(input.socialSecurityWages, fica.socialSecurityWageBase);
  const medicareWages = input.medicareWages ?? input.socialSecurityWages;

  const multiplied = input.netProfit > 0
    ? input.netProfit * fica.selfEmploymentNetEarningsFactor
    : input.netProfit;
  const belowFilingThreshold = multiplied < fica.selfEmploymentMinimumNetEarnings;
  const netEarnings = belowFilingThreshold ? 0 : multiplied;
  const remainingSocialSecurityBase = Math.max(0, fica.socialSecurityWageBase - ssWages);
  const socialSecurityBase = Math.min(netEarnings, remainingSocialSecurityBase);
  const socialSecurityTax = socialSecurityBase * socialSecurityRate;
  const medicareTax = netEarnings * medicareRate;
  const scheduleSeTax = socialSecurityTax + medicareTax;
  const deductibleHalf = scheduleSeTax * 0.5;
  const additionalThreshold = fica.additionalMedicareThresholdByFilingStatus[input.filingStatus];
  const additionalMedicare = Math.max(0, medicareWages + netEarnings - additionalThreshold) * fica.additionalMedicareRate;

  const value: SelfEmploymentTaxValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    netProfit: round(input.netProfit),
    netEarnings: round(netEarnings),
    belowFilingThreshold,
    socialSecurityWagesUsed: round(ssWages),
    remainingSocialSecurityBase: round(remainingSocialSecurityBase),
    socialSecurityTax: round(socialSecurityTax),
    medicareTax: round(medicareTax),
    scheduleSeTax: round(scheduleSeTax),
    deductibleHalf: round(deductibleHalf),
    additionalMedicare: round(additionalMedicare),
    totalPayrollTax: round(round(scheduleSeTax) + round(additionalMedicare)),
  };

  const percent = (rate: number) => `${formatNumber(rate * 100, { maximumFractionDigits: 2 })}%`;

  return {
    value,
    calculationVersion: SELF_EMPLOYMENT_TAX_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: belowFilingThreshold
      ? [
        { label: 'Net profit', value: formatMoney(input.netProfit) },
        {
          label: 'Net earnings after 92.35%',
          value: formatMoney(multiplied),
          detail: `Below the ${formatMoney(fica.selfEmploymentMinimumNetEarnings)} Schedule SE filing threshold`,
        },
        { label: 'Self-employment tax', value: formatMoney(0) },
      ]
      : [
        { label: 'Net profit', value: formatMoney(input.netProfit) },
        {
          label: 'Net earnings from self-employment',
          value: formatMoney(netEarnings),
          detail: input.netProfit > 0
            ? `Schedule SE line 4a: profit × ${formatNumber(fica.selfEmploymentNetEarningsFactor, { maximumFractionDigits: 4 })}`
            : 'Profit was not positive, so the 92.35% factor is not applied',
        },
        {
          label: `Social Security ${percent(socialSecurityRate)}`,
          value: formatMoney(socialSecurityTax),
          detail: remainingSocialSecurityBase === 0
            ? `W-2 Social Security wages already used the ${formatMoney(fica.socialSecurityWageBase)} wage base`
            : `On ${formatMoney(socialSecurityBase)} of the ${formatMoney(fica.socialSecurityWageBase)} wage base`,
        },
        {
          label: `Medicare ${percent(medicareRate)}`,
          value: formatMoney(medicareTax),
          detail: 'No wage-base cap',
        },
        { label: 'Schedule SE tax', value: formatMoney(scheduleSeTax) },
        {
          label: 'Deductible one-half',
          value: formatMoney(deductibleHalf),
          detail: 'Schedule SE line 13. Additional Medicare Tax is not deductible',
        },
        {
          label: 'Additional Medicare Tax (Form 8959)',
          value: formatMoney(additionalMedicare),
          detail: additionalMedicare === 0
            ? `Combined Medicare wages and net earnings are not over the ${formatMoney(additionalThreshold)} threshold for ${FILING_STATUS_LABELS[input.filingStatus]}`
            : `${percent(fica.additionalMedicareRate)} of the amount over ${formatMoney(additionalThreshold)}`,
        },
      ],
    assumptions: [
      `Tax year ${input.taxYear}. Schedule SE Social Security ${percent(socialSecurityRate)} and Medicare ${percent(medicareRate)} are twice the employee FICA rates in the snapshot, which is how the form is written.`,
      belowFilingThreshold
        ? `Net earnings are under ${formatMoney(fica.selfEmploymentMinimumNetEarnings)}, so Schedule SE is not filed and SE tax is $0.`
        : `Net profit above $0 is multiplied by ${formatNumber(fica.selfEmploymentNetEarningsFactor, { maximumFractionDigits: 4 })} before the tax. That is Schedule SE line 4a, not a rounded estimate.`,
      input.socialSecurityWages > fica.socialSecurityWageBase
        ? `W-2 Social Security wages were capped at the ${formatMoney(fica.socialSecurityWageBase)} wage base for Schedule SE line 8a. Box 3 cannot be higher than that.`
        : `W-2 Social Security wages of ${formatMoney(ssWages)} reduce the remaining Social Security wage base. They do not reduce Medicare.`,
      input.medicareWages === undefined && input.socialSecurityWages > 0
        ? 'Medicare wages were not entered, so Social Security wages were used for Form 8959. Additional Medicare Tax is understated once wages have passed the Social Security wage base.'
        : `Form 8959 Additional Medicare Tax uses combined Medicare wages and net SE earnings over the ${FILING_STATUS_LABELS[input.filingStatus]} threshold. It is not part of Schedule SE and is not included in the deductible half.`,
      'A filed Schedule SE rounds each line to whole dollars, so this estimate can differ by up to $0.50 per line.',
      'Church employee income, the farm and nonfarm optional methods, ministers and Form 4361, Conservation Reserve Program payments, and QBI are not modelled. Omitting an optional method can understate Social Security credits; it does not invent extra tax here.',
      'This is self-employment tax only — not income tax on the profit, and not state tax.',
      `Sources: ${fica.selfEmploymentSourceName}; ${fica.sourceName}; Additional Medicare Tax from the IRS Q&A.`,
    ],
  };
}
