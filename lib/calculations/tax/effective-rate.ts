import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getStateName, isStateCode } from '@/lib/location/states';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { estimateAnnualTaxLiability, sharedAssumptions } from './annual';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { EFFECTIVE_TAX_RATE_ENGINE_ID } from './version';

export const effectiveTaxRateInputSchema = z.object({
  annualGrossSalary: finiteNumber('Annual gross salary', 0, 100_000_000),
  state: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
  dependents: finiteNumber('Dependents', 0, 20).optional(),
});

export type EffectiveTaxRateInput = z.infer<typeof effectiveTaxRateInputSchema>;

export type EffectiveTaxRateValue = {
  taxYear: number;
  state: EffectiveTaxRateInput['state'];
  filingStatus: FilingStatus;
  grossAnnual: number;
  federalIncomeTax: number;
  fica: number;
  stateIncomeTax: number;
  totalTax: number;
  takeHome: number;
  /** Share of gross income taken by each layer. */
  effectiveFederalRate: number;
  effectiveFicaRate: number;
  effectiveStateRate: number;
  effectiveTotalRate: number;
  /** The federal bracket the last dollar of taxable income falls in. */
  statutoryFederalBracket: number;
  /** What is actually kept from the next $1,000 of gross pay. */
  nextThousandTax: number;
  nextThousandRate: number;
  /** How far the headline bracket sits above the real federal share. */
  bracketMinusEffectiveFederal: number;
  stateTaxStatus: 'supported' | 'unsupported';
};

/**
 * The federal bracket the last taxable dollar lands in.
 *
 * This is the number people mean when they say "I'm in the 22% bracket", and it
 * is read from the schedule rather than inferred from the tax paid — dividing
 * tax by income gives the effective rate, which is the thing this tool exists
 * to distinguish it from.
 */
function statutoryBracketRate(taxYear: number, filingStatus: FilingStatus, taxableIncome: number): number {
  const brackets = getTaxYearSnapshot(taxYear).federal.bracketsByFilingStatus[filingStatus];
  for (const bracket of brackets) {
    if (bracket.notOver === null || taxableIncome <= bracket.notOver) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
}

/**
 * What share of a salary actually goes to tax, and why it is not the bracket.
 *
 * Someone in the 22% bracket rarely pays 22% of anything: the standard
 * deduction comes off first, and the brackets below 22% are charged at their
 * own rates. The gap between the two numbers is the single most common
 * misunderstanding about US income tax, so it is computed and stated rather
 * than left for the reader to notice.
 *
 * The third figure is the one that answers what people are usually really
 * asking. A raise is not taxed at the effective rate or at the federal bracket
 * — it is taxed at the bracket *plus* FICA *plus* whatever the state takes, and
 * that combined number is what changes when the offer letter changes.
 */
export function calculateEffectiveTaxRate(rawInput: unknown): CalculationResult<EffectiveTaxRateValue> {
  const input = effectiveTaxRateInputSchema.parse(rawInput);
  const liability = estimateAnnualTaxLiability(input);

  const gross = liability.grossIncome;
  const fica = liability.fica.total;
  const share = (amount: number) => (gross === 0 ? 0 : amount / gross);

  /*
   * The marginal figure is measured, not derived from a rate table, because the
   * state layer is not always a bracket: Utah phases a credit out, Oregon
   * subtracts federal tax, Arkansas switches schedules entirely. Running the
   * whole stack a thousand dollars higher is the only way to get a number that
   * is right for every one of them.
   */
  const step = 1_000;
  const higher = estimateAnnualTaxLiability({ ...input, annualGrossSalary: gross + step });
  const nextThousandTax = higher.totalTax - liability.totalTax;

  const statutoryFederalBracket = statutoryBracketRate(liability.taxYear, liability.filingStatus, liability.federal.taxableIncome);
  const effectiveFederalRate = share(liability.federal.tax);

  const value: EffectiveTaxRateValue = {
    taxYear: liability.taxYear,
    state: liability.state,
    filingStatus: liability.filingStatus,
    grossAnnual: round(gross),
    federalIncomeTax: round(liability.federal.tax),
    fica: round(fica),
    stateIncomeTax: round(liability.stateTax.tax),
    totalTax: round(liability.totalTax),
    takeHome: round(liability.takeHome),
    effectiveFederalRate: round(effectiveFederalRate * 100, 2),
    effectiveFicaRate: round(share(fica) * 100, 2),
    effectiveStateRate: round(share(liability.stateTax.tax) * 100, 2),
    effectiveTotalRate: round(liability.effectiveRate * 100, 2),
    statutoryFederalBracket: round(statutoryFederalBracket * 100, 2),
    nextThousandTax: round(nextThousandTax),
    nextThousandRate: round((nextThousandTax / step) * 100, 2),
    bracketMinusEffectiveFederal: round((statutoryFederalBracket - effectiveFederalRate) * 100, 2),
    stateTaxStatus: liability.stateTax.status,
  };

  const stateName = getStateName(liability.state);
  const percent = (rate: number) => `${formatNumber(rate, { maximumFractionDigits: 2 })}%`;

  return {
    value,
    calculationVersion: EFFECTIVE_TAX_RATE_ENGINE_ID,
    datasetSnapshotIds: [liability.snapshotId],
    breakdown: [
      { label: 'Gross annual', value: formatMoney(gross) },
      {
        label: 'Federal income tax',
        value: formatMoney(liability.federal.tax),
        detail: `${percent(value.effectiveFederalRate)} of gross, on ${formatMoney(liability.federal.taxableIncome)} of taxable income`,
      },
      {
        label: 'Social Security and Medicare',
        value: formatMoney(fica),
        detail: `${percent(value.effectiveFicaRate)} of gross. Charged from the first dollar, with no deduction`,
      },
      {
        label: `${stateName} income tax`,
        value: liability.stateTax.status === 'unsupported' ? 'Omitted (unsupported state)' : formatMoney(liability.stateTax.tax),
        detail: liability.stateTax.status === 'unsupported'
          ? 'Federal-only result'
          : `${percent(value.effectiveStateRate)} of gross`,
      },
      { label: 'Total tax', value: formatMoney(liability.totalTax), detail: `${percent(value.effectiveTotalRate)} of gross` },
      {
        label: 'Your federal bracket',
        value: percent(value.statutoryFederalBracket),
        detail: `The rate on your last taxable dollar. It is ${percent(value.bracketMinusEffectiveFederal)} above your federal effective rate because the standard deduction and the lower brackets come first`,
      },
      {
        label: 'Tax on your next $1,000',
        value: formatMoney(nextThousandTax),
        detail: `${percent(value.nextThousandRate)} — federal, FICA and state together. This is what a raise is taxed at, not the effective rate`,
      },
    ],
    assumptions: [
      'Effective tax rate here means total tax divided by gross pay, not by taxable income. Dividing by taxable income gives a higher number and is not what most people mean.',
      'The federal bracket shown is the rate on your last dollar of taxable income. It is a rate on part of your income, never on all of it.',
      'The next-$1,000 figure is measured by running the whole calculation again $1,000 higher, so it accounts for state credits and phase-outs rather than assuming a flat bracket.',
      ...sharedAssumptions(liability),
      `Filing status: ${FILING_STATUS_LABELS[liability.filingStatus]}.`,
    ],
  };
}
