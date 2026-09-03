import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';

export type InflationCpiObservation = {
  period: string;
  index: number;
};

const monthPeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a real month.');

export const inflationInputSchema = z.object({
  amount: finiteNumber('Amount', 0.01, 1_000_000_000),
  startPeriod: monthPeriodSchema,
  endPeriod: monthPeriodSchema,
});

export type InflationInput = z.infer<typeof inflationInputSchema>;

export type InflationValue = {
  equivalentAmount: number;
  multiplier: number;
  percentChange: number;
  startIndex: number;
  endIndex: number;
  startPeriod: string;
  endPeriod: string;
};

function cpiIndexForPeriod(observations: InflationCpiObservation[], period: string): number {
  const row = observations.find((observation) => observation.period === period);
  if (!row) throw new Error(`No CPI-U observation for ${period}.`);
  return row.index;
}

function formatMonthYear(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(Date.UTC(year, month - 1, 1));
}

export function calculateInflation(
  rawInput: unknown,
  dataset: { observations: InflationCpiObservation[]; snapshotId: string },
): CalculationResult<InflationValue> {
  const input = inflationInputSchema.parse(rawInput);
  const startIndex = cpiIndexForPeriod(dataset.observations, input.startPeriod);
  const endIndex = cpiIndexForPeriod(dataset.observations, input.endPeriod);
  const multiplier = endIndex / startIndex;
  const equivalentAmount = input.amount * multiplier;
  const percentChange = (multiplier - 1) * 100;

  return {
    value: {
      equivalentAmount: round(equivalentAmount),
      multiplier: round(multiplier, 4),
      percentChange: round(percentChange, 1),
      startIndex,
      endIndex,
      startPeriod: input.startPeriod,
      endPeriod: input.endPeriod,
    },
    calculationVersion: 'cpi-u-inflation-v1.0.0',
    datasetSnapshotIds: [dataset.snapshotId],
    breakdown: [
      {
        label: `CPI-U in ${formatMonthYear(input.startPeriod)}`,
        value: formatNumber(startIndex, { maximumFractionDigits: 3 }),
        detail: 'U.S. city average, all items, not seasonally adjusted',
      },
      {
        label: `CPI-U in ${formatMonthYear(input.endPeriod)}`,
        value: formatNumber(endIndex, { maximumFractionDigits: 3 }),
        detail: 'Same series, later or earlier month',
      },
      {
        label: 'Buying-power equivalent',
        value: formatMoney(equivalentAmount),
        detail: `${formatMoney(input.amount)} × ${formatNumber(endIndex, { maximumFractionDigits: 3 })} ÷ ${formatNumber(startIndex, { maximumFractionDigits: 3 })}`,
      },
    ],
    assumptions: [
      'This uses the BLS CPI-U all-items index, not a personal shopping basket or a regional CPI.',
      'It measures average urban consumer prices. It is not a forecast and it is not a wage, tax, or Social Security adjustment.',
      'A later month can be a preliminary BLS estimate and can be revised.',
    ],
  };
}
