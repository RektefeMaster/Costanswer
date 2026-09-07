import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateFederalIncomeTax } from './federal';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { FEDERAL_BRACKET_ENGINE_ID } from './version';

export const federalBracketInputSchema = z.object({
  income: finiteNumber('Income', 0, 100_000_000),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
  /**
   * Whether the figure entered is pay before deductions or taxable income.
   *
   * Both readings are common and they give different brackets, so the tool asks
   * rather than guessing. Someone reading their own return has taxable income
   * in front of them; someone reading an offer letter has gross.
   */
  incomeBasis: z.enum(['gross', 'taxable']).default('gross'),
});

export type FederalBracketInput = z.infer<typeof federalBracketInputSchema>;

export type BracketBand = {
  rate: number;
  /** First dollar of taxable income this band charges. */
  from: number;
  /** Last dollar it charges, or null for the open top band. */
  to: number | null;
  /** How much of this filer's taxable income falls inside it. */
  incomeInBand: number;
  taxInBand: number;
  isCurrent: boolean;
};

export type FederalBracketValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  incomeBasis: 'gross' | 'taxable';
  grossIncome: number | null;
  standardDeduction: number;
  taxableIncome: number;
  /** Rate on the last taxable dollar, or null when there is no taxable income. */
  currentBracketRate: number | null;
  bands: BracketBand[];
  federalIncomeTax: number;
  effectiveFederalRate: number;
  /** Taxable income still available before the next band starts, or null at the top. */
  roomInCurrentBracket: number | null;
  /** Rate the next dollar would pay. The first band when not yet in one; null at the top. */
  nextBracketRate: number | null;
};

/**
 * Which federal band a filer is in, and how their income splits across all of them.
 *
 * The bracket question is asked constantly and answered badly, usually with a
 * single percentage. The single percentage is the least useful part: what
 * actually settles the misunderstanding is seeing the income sliced up, with a
 * separate line of tax against each rate, and the deduction sitting at the
 * bottom taxed at nothing.
 *
 * The room left in the current band is the other half of the answer. "You can
 * earn $37,000 more before any of it is taxed at 24%" is what someone weighing
 * overtime or a bonus is really asking, and it cannot be read off a rate.
 */
export function calculateFederalBracket(rawInput: unknown): CalculationResult<FederalBracketValue> {
  const input = federalBracketInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const standardDeduction = snapshot.federal.standardDeductionByFilingStatus[input.filingStatus];

  const grossIncome = input.incomeBasis === 'gross' ? input.income : null;
  const taxableIncome = input.incomeBasis === 'gross'
    ? Math.max(0, input.income - standardDeduction)
    : input.income;

  const federal = calculateFederalIncomeTax({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    // The federal engine takes gross and subtracts the deduction itself, so a
    // taxable-income entry is handed back its deduction to keep one code path.
    grossIncome: taxableIncome + standardDeduction,
    federal: snapshot.federal,
  });

  const schedule = snapshot.federal.bracketsByFilingStatus[input.filingStatus];
  let floor = 0;
  /*
   * Stay null until a band actually holds the last dollar. Seeding this with
   * the first band's 10% made a filer with no taxable income look like they
   * were in that band — and, because room also stayed null, like they were in
   * the top band. The first dollar's rate is still reported as nextBracketRate
   * so the page can say what happens when they start to owe tax.
   */
  let currentRate: number | null = null;
  let roomInCurrentBracket: number | null = null;
  let nextBracketRate: number | null = schedule[0]?.rate ?? null;

  const bands: BracketBand[] = schedule.map((bracket, index) => {
    const ceiling = bracket.notOver;
    const incomeInBand = Math.max(0, Math.min(taxableIncome, ceiling ?? Number.POSITIVE_INFINITY) - floor);
    /*
     * The band a filer is "in" is the one their last taxable dollar falls in.
     * At exactly a threshold that is the lower band — the dollar at the
     * boundary is charged at the lower rate, and saying otherwise would put
     * someone in a bracket they have not reached.
     */
    const isCurrent = taxableIncome > floor && (ceiling === null || taxableIncome <= ceiling);
    if (isCurrent) {
      currentRate = bracket.rate;
      roomInCurrentBracket = ceiling === null ? null : ceiling - taxableIncome;
      nextBracketRate = schedule[index + 1]?.rate ?? null;
    }
    const band: BracketBand = {
      rate: round(bracket.rate * 100, 2),
      from: floor,
      to: ceiling,
      incomeInBand: round(incomeInBand),
      taxInBand: round(incomeInBand * bracket.rate),
      isCurrent,
    };
    floor = ceiling ?? floor;
    return band;
  });

  const percent = (rate: number) => `${formatNumber(rate, { maximumFractionDigits: 2 })}%`;
  const effectiveFederalRate = taxableIncome === 0 ? 0 : federal.tax / taxableIncome;

  const value: FederalBracketValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    incomeBasis: input.incomeBasis,
    grossIncome: grossIncome === null ? null : round(grossIncome),
    standardDeduction: round(standardDeduction),
    taxableIncome: round(taxableIncome),
    currentBracketRate: currentRate === null ? null : round(currentRate * 100, 2),
    bands,
    federalIncomeTax: round(federal.tax),
    effectiveFederalRate: round(effectiveFederalRate * 100, 2),
    roomInCurrentBracket: roomInCurrentBracket === null ? null : round(roomInCurrentBracket),
    nextBracketRate: nextBracketRate === null ? null : round(nextBracketRate * 100, 2),
  };

  return {
    value,
    calculationVersion: FEDERAL_BRACKET_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      ...(grossIncome === null
        ? [{ label: 'Taxable income entered', value: formatMoney(taxableIncome) }]
        : [
          { label: 'Income', value: formatMoney(grossIncome) },
          { label: 'Standard deduction', value: `−${formatMoney(standardDeduction)}`, detail: 'Taxed at nothing. This is why your effective rate is below your bracket' },
          { label: 'Taxable income', value: formatMoney(taxableIncome) },
        ]),
      ...bands
        .filter((band) => band.incomeInBand > 0)
        .map((band) => ({
          label: `${percent(band.rate)} on ${formatMoney(band.incomeInBand)}`,
          value: formatMoney(band.taxInBand),
          detail: band.to === null
            ? `Everything above ${formatMoney(band.from)}`
            : `${formatMoney(band.from)} to ${formatMoney(band.to)}`,
        })),
      { label: 'Federal income tax', value: formatMoney(federal.tax), detail: `${percent(value.effectiveFederalRate)} of taxable income` },
    ],
    assumptions: [
      `Federal income tax only, for tax year ${input.taxYear}. Social Security, Medicare and state income tax are not included.`,
      input.incomeBasis === 'gross'
        ? `The ${formatMoney(standardDeduction)} standard deduction for ${FILING_STATUS_LABELS[input.filingStatus]} is applied. Itemised deductions are not modelled.`
        : 'You entered taxable income, so no deduction is applied. That is the figure after the standard or itemised deduction has already come out.',
      'Your bracket is the rate charged on your last dollar of taxable income. Every dollar below it is charged at the lower rates shown, which is why the tax is far less than the bracket times your income.',
      'Income exactly at a threshold sits in the lower band. Crossing into a higher bracket never lowers take-home pay, because only the amount above the threshold takes the higher rate.',
      'Credits, other income, capital gains and the alternative minimum tax are not modelled.',
      `Source: ${snapshot.federal.sourceName}.`,
    ],
  };
}
