/**
 * One ledger for every channel.
 *
 * Ads, affiliate, leads and calls report money in four different shapes on four
 * different clocks, and the only way to answer "what did this calculator earn"
 * is to normalize them into one row type with one status vocabulary.
 *
 * The statuses are the important part. An outbound affiliate click is not
 * revenue, an accepted lead is not money in the bank, and a network that
 * reverses a commission six weeks later is normal rather than exceptional. A
 * dashboard that adds those together and prints one number is lying to its
 * owner, so `estimated`, `reported`, `confirmed`, `paid` and `reversed` are
 * carried separately all the way to the screen.
 */
import { addMoney, money, sumMoney, type Money } from '../money';

export const REVENUE_SOURCES = ['ad', 'affiliate', 'lead', 'call'] as const;
export type RevenueSource = (typeof REVENUE_SOURCES)[number];

export const REVENUE_STATUSES = ['estimated', 'reported', 'confirmed', 'paid', 'reversed'] as const;
export type RevenueStatus = (typeof REVENUE_STATUSES)[number];

export type RevenueLedgerEntry = {
  readonly entryId: string;
  readonly sourceType: RevenueSource;
  readonly providerId: string;
  readonly campaignId?: string;
  readonly pageId?: string;
  readonly calculatorId?: string;
  readonly vertical?: string;
  readonly locale?: string;
  readonly eventId?: string;
  /** The provider's own reference. Unique per provider; the replay guard. */
  readonly providerReference?: string;
  readonly amount: Money;
  readonly status: RevenueStatus;
  /** Test rows are never summed into a production figure. */
  readonly isTest: boolean;
  readonly occurredAt: string;
  readonly reportedAt?: string;
  readonly confirmedAt?: string;
  readonly paidAt?: string;
  readonly reversedAt?: string;
};

const TRANSITIONS: Readonly<Record<RevenueStatus, readonly RevenueStatus[]>> = {
  estimated: ['reported', 'confirmed', 'reversed'],
  reported: ['confirmed', 'reversed'],
  confirmed: ['paid', 'reversed'],
  paid: ['reversed'],
  reversed: [],
};

export function canTransitionRevenue(from: RevenueStatus, to: RevenueStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertRevenueTransition(from: RevenueStatus, to: RevenueStatus): void {
  if (!canTransitionRevenue(from, to)) {
    throw new Error(`Revenue cannot move from ${from} to ${to}.`);
  }
}

/**
 * Which statuses are real money.
 *
 * `estimated` never is. An estimated row exists so a funnel has a numerator on
 * the day it happens, not so it can be added to a bank balance.
 */
export function isRealizedRevenue(status: RevenueStatus): boolean {
  return status === 'confirmed' || status === 'paid';
}

export type RevenueTotals = {
  readonly estimated: Money;
  readonly reported: Money;
  readonly confirmed: Money;
  readonly paid: Money;
  readonly reversed: Money;
  /** confirmed + paid − reversed. The only figure that may be called revenue. */
  readonly realized: Money;
};

export function totalRevenue(entries: readonly RevenueLedgerEntry[]): RevenueTotals {
  const production = entries.filter((entry) => !entry.isTest);
  const byStatus = (status: RevenueStatus) =>
    sumMoney(production.filter((entry) => entry.status === status).map((entry) => entry.amount));

  const confirmed = byStatus('confirmed');
  const paid = byStatus('paid');
  const reversed = byStatus('reversed');

  return {
    estimated: byStatus('estimated'),
    reported: byStatus('reported'),
    confirmed,
    paid,
    reversed,
    realized: money(confirmed.minorUnits + paid.minorUnits - Math.abs(reversed.minorUnits)),
  };
}

export function groupRevenueBy<K extends keyof RevenueLedgerEntry>(
  entries: readonly RevenueLedgerEntry[],
  key: K,
): Map<string, RevenueTotals> {
  const groups = new Map<string, RevenueLedgerEntry[]>();
  for (const entry of entries) {
    const value = String(entry[key] ?? 'unknown');
    const bucket = groups.get(value);
    if (bucket) bucket.push(entry);
    else groups.set(value, [entry]);
  }
  const totals = new Map<string, RevenueTotals>();
  for (const [value, bucket] of groups) totals.set(value, totalRevenue(bucket));
  return totals;
}

/**
 * A reversal is a new row, not an edit.
 *
 * Editing the original destroys the audit trail and makes a reconciliation
 * against a provider statement impossible: the statement shows both events and
 * the ledger has to as well.
 */
export function reversalOf(entry: RevenueLedgerEntry, entryId: string, reversedAt: string): RevenueLedgerEntry {
  assertRevenueTransition(entry.status, 'reversed');
  return {
    ...entry,
    entryId,
    amount: money(-entry.amount.minorUnits, entry.amount.currency),
    status: 'reversed',
    reversedAt,
    providerReference: entry.providerReference ? `${entry.providerReference}:reversal` : undefined,
  };
}

export function addRevenue(left: RevenueTotals, right: RevenueTotals): RevenueTotals {
  return {
    estimated: addMoney(left.estimated, right.estimated),
    reported: addMoney(left.reported, right.reported),
    confirmed: addMoney(left.confirmed, right.confirmed),
    paid: addMoney(left.paid, right.paid),
    reversed: addMoney(left.reversed, right.reversed),
    realized: addMoney(left.realized, right.realized),
  };
}
