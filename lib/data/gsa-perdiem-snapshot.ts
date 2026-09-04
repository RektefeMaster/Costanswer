import currentPerDiemJson from '@/data/gsa-perdiem/current.json';
import { MONTH_KEYS, isDuplicateDcMetroRow, type GsaPerDiemSnapshot, type MieBreakdown, type MonthKey, type PerDiemDestination } from './gsa-perdiem';
import { readVerifiedEnvelope } from './envelope';

const envelope = readVerifiedEnvelope<GsaPerDiemSnapshot>(currentPerDiemJson);
export const gsaPerDiemSnapshot = envelope.snapshot;

const byKey = new Map(gsaPerDiemSnapshot.destinations.map((row) => [row.key, row]));
const standardByState = new Map<string, PerDiemDestination>(
  gsaPerDiemSnapshot.destinations.filter((row) => row.isStandardRate).map((row) => [row.state as string, row]),
);
const mieByTotal = new Map(gsaPerDiemSnapshot.mieBreakdowns.map((row) => [row.total, row]));

export function getPerDiemDestination(key: string): PerDiemDestination | undefined {
  return byKey.get(key);
}

/**
 * GSA lists specific cities and counties, and gives every state one standard
 * rate for everywhere else. A trip to a town that is not listed is not
 * unpriced; it takes its state's standard rate.
 */
export function getStandardRateForState(state: string): PerDiemDestination | undefined {
  return standardByState.get(state);
}

export function getMieBreakdown(total: number): MieBreakdown {
  const row = mieByTotal.get(total);
  if (!row) throw new Error(`No published M&IE breakdown for a ${total} total.`);
  return row;
}

/** Month key for a calendar date, so each night is priced in its own month. */
export function monthKeyForDate(isoDate: string): MonthKey {
  const month = Number(isoDate.slice(5, 7));
  const key = MONTH_KEYS[month - 1];
  if (!key) throw new Error(`Invalid month in date ${isoDate}.`);
  return key;
}

/**
 * Destinations a reader can pick.
 *
 * GSA repeats the Washington DC metro rate under Maryland and Virginia. Those
 * clones stay in the snapshot — they are what the API published — but they are
 * not offered as separate places, because they are the same ceiling.
 */
export function listPerDiemDestinations(): PerDiemDestination[] {
  return gsaPerDiemSnapshot.destinations.filter((row) => !isDuplicateDcMetroRow(row));
}
