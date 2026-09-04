import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from '@/lib/calculations/contracts';
import {
  getMieBreakdown,
  getPerDiemDestination,
  getStandardRateForState,
  gsaPerDiemSnapshot,
  monthKeyForDate,
} from '@/lib/data/gsa-perdiem-snapshot';
import { formatPerDiemDestinationLabel } from '@/lib/data/gsa-perdiem';
import { getStateName, isStateCode } from '@/lib/location/states';
import { PER_DIEM_ENGINE_ID } from './version';

function stateLabel(code: string): string {
  return isStateCode(code) ? getStateName(code) : code;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD form.');

export const perDiemInputSchema = z.object({
  destinationKey: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  /** Nights actually spent in a hotel, when that is fewer than the trip's nights. */
  lodgingNightsOverride: finiteNumber('Lodging nights', 0, 365).optional(),
  /** A real nightly room rate, to check against the ceiling. Excludes tax. */
  actualNightlyRate: finiteNumber('Nightly room rate', 0, 100_000).optional(),
}).superRefine((input, context) => {
  if (input.endDate < input.startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'The return date cannot be before the departure date.' });
  }
});

export type PerDiemInput = z.infer<typeof perDiemInputSchema>;

export type PerDiemNight = {
  date: string;
  lodgingCap: number;
};

export type PerDiemDay = {
  date: string;
  /** GSA pays three quarters of M&IE on the first and last day of travel. */
  isTravelDay: boolean;
  mie: number;
};

export type PerDiemValue = {
  fiscalYear: number;
  destinationLabel: string;
  /** The counties or cities this rate covers, as GSA words it. */
  coveredArea: string | null;
  usesStandardRate: boolean;
  state: string;
  totalDays: number;
  lodgingNights: number;
  lodgingTotal: number;
  mieTotal: number;
  grandTotal: number;
  fullDayMie: number;
  travelDayMie: number;
  /** True when the trip spans months whose lodging caps differ. */
  seasonalRates: boolean;
  lowestNightlyCap: number;
  highestNightlyCap: number;
  nights: PerDiemNight[];
  days: PerDiemDay[];
  mealBreakdown: { breakfast: number; lunch: number; dinner: number; incidentals: number };
  outsideRateYear: boolean;
  /**
   * A real room rate measured against the ceiling.
   *
   * The ceiling is a limit, not an entitlement: a room under it is reimbursed
   * at what it cost, and a room over it needs an exception or comes out of the
   * traveller's pocket. Null until a rate is entered.
   */
  hotelCheck: {
    nightlyRate: number;
    /** Nights where the rate is at or under that month's ceiling. */
    nightsWithinLimit: number;
    nightsOverLimit: number;
    /** Total room cost at the entered rate, before tax. */
    actualLodgingCost: number;
    /** What the ceiling allows for the same nights. */
    allowedLodgingCost: number;
    /** Positive when the stay costs more than the ceiling allows. */
    overBy: number;
    withinLimit: boolean;
    /** Trip total using the real room rate rather than the ceiling. */
    tripTotalAtActualRate: number;
    /** Lodging allowed under the ceiling plus M&IE — what is reimbursable when the room is over. */
    reimbursableTripTotal: number;
  } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(isoDateValue: string, days: number): string {
  return new Date(Date.parse(`${isoDateValue}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) / DAY_MS) + 1;
}

/**
 * Federal travel per diem for a CONUS trip.
 *
 * Two things make this more than multiplication. Lodging is a nightly ceiling
 * that GSA sets month by month, so a trip crossing into a destination's high
 * season is not priced at one rate. And meals are paid per day, not per night,
 * with the first and last day of travel at three quarters — so a three-day trip
 * has two nights of lodging and three days of meals, two of them reduced.
 */
export function calculatePerDiem(rawInput: unknown): CalculationResult<PerDiemValue> {
  const input = perDiemInputSchema.parse(rawInput);
  const destination = getPerDiemDestination(input.destinationKey);
  if (!destination) throw new Error('Choose a destination from the list.');
  const mie = getMieBreakdown(destination.mieTotal);

  const totalDays = daysBetweenInclusive(input.startDate, input.endDate);
  const tripNights = Math.max(0, totalDays - 1);
  const lodgingNights = input.lodgingNightsOverride === undefined
    ? tripNights
    : Math.min(Math.round(input.lodgingNightsOverride), tripNights);

  // Each night is charged at the cap for the month that night falls in.
  const nights: PerDiemNight[] = Array.from({ length: lodgingNights }, (_, index) => {
    const date = addDays(input.startDate, index);
    return { date, lodgingCap: destination.lodgingByMonth[monthKeyForDate(date)] };
  });

  // A single-day trip has no full days: it is travel out and back, so the whole
  // of it is a travel day.
  const days: PerDiemDay[] = Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(input.startDate, index);
    const isTravelDay = index === 0 || index === totalDays - 1;
    return { date, isTravelDay, mie: isTravelDay ? mie.firstLastDay : mie.total };
  });

  const lodgingTotal = nights.reduce((sum, night) => sum + night.lodgingCap, 0);
  const mieTotal = days.reduce((sum, day) => sum + day.mie, 0);
  const caps = nights.map((night) => night.lodgingCap);
  const lowestNightlyCap = caps.length > 0 ? Math.min(...caps) : 0;
  const highestNightlyCap = caps.length > 0 ? Math.max(...caps) : 0;

  // GSA's county field sometimes lists every covered jurisdiction in a
  // sentence, which is useful detail but not a label. Long ones move to
  // `coveredArea` so the headline stays a place name.
  const destinationLabel = formatPerDiemDestinationLabel(destination);
  const coveredArea = destination.isStandardRate
    ? `Everywhere in ${stateLabel(destination.state)} that GSA does not list separately`
    : destination.county;

  // A real room rate is checked night by night, because a seasonal ceiling can
  // allow the same room in one month and refuse it in the next. A same-day trip
  // has no lodging nights, so there is nothing to compare.
  const hotelCheck = input.actualNightlyRate === undefined || nights.length === 0 ? null : (() => {
    const nightlyRate = input.actualNightlyRate as number;
    const nightsOverLimit = nights.filter((night) => nightlyRate > night.lodgingCap).length;
    const actualLodgingCost = nightlyRate * nights.length;
    const allowedLodgingCost = nights.reduce((sum, night) => sum + Math.min(nightlyRate, night.lodgingCap), 0);
    return {
      nightlyRate: round(nightlyRate),
      nightsWithinLimit: nights.length - nightsOverLimit,
      nightsOverLimit,
      actualLodgingCost: round(actualLodgingCost),
      allowedLodgingCost: round(allowedLodgingCost),
      overBy: round(Math.max(0, actualLodgingCost - allowedLodgingCost)),
      withinLimit: nightsOverLimit === 0,
      tripTotalAtActualRate: round(actualLodgingCost + mieTotal),
      reimbursableTripTotal: round(allowedLodgingCost + mieTotal),
    };
  })();

  // Rates are set per federal fiscal year. A trip outside the loaded year is
  // still priced, but the reader is told the year does not match.
  const outsideRateYear = input.startDate < gsaPerDiemSnapshot.effectiveFrom
    || input.endDate > gsaPerDiemSnapshot.effectiveTo;

  return {
    value: {
      fiscalYear: gsaPerDiemSnapshot.fiscalYear,
      destinationLabel,
      coveredArea,
      usesStandardRate: destination.isStandardRate,
      state: destination.state,
      totalDays,
      lodgingNights,
      lodgingTotal: round(lodgingTotal),
      mieTotal: round(mieTotal),
      grandTotal: round(lodgingTotal + mieTotal),
      fullDayMie: mie.total,
      travelDayMie: mie.firstLastDay,
      seasonalRates: lowestNightlyCap !== highestNightlyCap,
      lowestNightlyCap,
      highestNightlyCap,
      nights,
      days,
      mealBreakdown: {
        breakfast: mie.breakfast,
        lunch: mie.lunch,
        dinner: mie.dinner,
        incidentals: mie.incidentals,
      },
      outsideRateYear,
      hotelCheck,
    },
    calculationVersion: PER_DIEM_ENGINE_ID,
    datasetSnapshotIds: [gsaPerDiemSnapshot.snapshotId],
    breakdown: [
      {
        label: 'Lodging ceiling',
        value: formatMoney(lodgingTotal),
        detail: lodgingNights === 0
          ? 'No overnight stay on a same-day trip'
          : lowestNightlyCap === highestNightlyCap
            ? `${lodgingNights} ${lodgingNights === 1 ? 'night' : 'nights'} at ${formatMoney(lowestNightlyCap, 0)}, before taxes and fees`
            : `${lodgingNights} nights from ${formatMoney(lowestNightlyCap, 0)} to ${formatMoney(highestNightlyCap, 0)}, seasonal rates`,
      },
      {
        label: 'Meals and incidentals',
        value: formatMoney(mieTotal),
        detail: totalDays <= 2
          ? `${totalDays} travel ${totalDays === 1 ? 'day' : 'days'} at ${formatMoney(mie.firstLastDay)}`
          : `${totalDays - 2} full days at ${formatMoney(mie.total, 0)}, plus two travel days at ${formatMoney(mie.firstLastDay)}`,
      },
      {
        label: 'Maximum reimbursement',
        value: formatMoney(lodgingTotal + mieTotal),
        detail: `FY${gsaPerDiemSnapshot.fiscalYear} rates for ${destinationLabel}`,
      },
      ...(hotelCheck ? [{
        label: hotelCheck.withinLimit ? 'Your room, within the limit' : 'Your room, over the limit',
        value: formatMoney(hotelCheck.actualLodgingCost),
        detail: hotelCheck.withinLimit
          ? `${formatMoney(hotelCheck.nightlyRate)} a night is at or under the ceiling on every night`
          : `${formatMoney(hotelCheck.overBy)} above what the ceiling allows, on ${hotelCheck.nightsOverLimit} of ${nights.length} nights`,
      }] : []),
    ],
    assumptions: [
      'These are the federal ceilings, not what a trip costs. Lodging is reimbursed at actual cost up to the cap, so a cheaper room is reimbursed at the cheaper price.',
      'The lodging cap excludes taxes and fees, which are reimbursed separately on top of it.',
      `Meals and incidentals are paid per day at a flat rate. GSA pays ${formatMoney(mie.firstLastDay)} on the first and last day of travel, three quarters of the ${formatMoney(mie.total, 0)} daily rate.`,
      `A ${totalDays}-day trip has ${tripNights} ${tripNights === 1 ? 'night' : 'nights'} of lodging and ${totalDays} days of meals, which is why the two counts differ.`,
      ...(destination.isStandardRate
        ? ['GSA does not list this locality separately, so it takes the standard CONUS rate that covers everywhere else in the state.']
        : []),
      ...(lowestNightlyCap !== highestNightlyCap
        ? ['This destination has seasonal lodging caps, so each night is priced against the month it falls in rather than one headline rate.']
        : []),
      'Continental U.S. only. Alaska, Hawaii, U.S. territories and foreign locations are set by the Department of Defense and the State Department, not GSA, and are not in this dataset.',
      ...(hotelCheck
        ? ['A room rate you entered is compared with the ceiling night by night and excludes lodging tax, which is reimbursed separately. Going over the ceiling usually needs an approved exception, and is otherwise the traveller\u2019s own cost.']
        : []),
      'Your employer sets its own policy. A private employer is under no obligation to use these rates, and federal agencies apply their own travel rules on top of them.',
      ...(outsideRateYear
        ? [`These are FY${gsaPerDiemSnapshot.fiscalYear} rates, effective ${gsaPerDiemSnapshot.effectiveFrom} to ${gsaPerDiemSnapshot.effectiveTo}. Your dates fall partly outside that year, so a different rate table applies to those days.`]
        : []),
    ],
  };
}

/** Destination for a state when GSA lists no specific locality. */
export function standardRateDestinationKey(state: string): string | undefined {
  return getStandardRateForState(state)?.key;
}
