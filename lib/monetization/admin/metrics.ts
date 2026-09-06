/**
 * The numbers an operator actually needs.
 *
 * One rule shapes all of it: estimated, confirmed and paid money are never
 * added together. A dashboard that prints "$20,000" when eight of it is a
 * payout nobody has confirmed is the fastest way to make a business decision on
 * a number that does not exist.
 *
 * The headline metric is total revenue per thousand sessions across every
 * channel, not ad RPM. Ad RPM optimizes for the thing that damages the product
 * fastest.
 */
import { formatMoneyValue, money, revenuePerThousand, type Money } from '../money';
import { groupRevenueBy, totalRevenue, type RevenueLedgerEntry, type RevenueTotals } from '../revenue/ledger';
import { dayBucket, type D1DatabaseLike } from '../store/d1';
import { eventCounts, revenueBetween } from '../store/repositories/revenue';

export type FunnelStep = {
  readonly name: string;
  readonly count: number;
  /** Conversion from the previous step. Null when there is no denominator. */
  readonly rate: number | null;
};

export type MonetizationSnapshot = {
  readonly window: { from: string; to: string };
  readonly totals: RevenueTotals;
  readonly bySource: ReadonlyMap<string, RevenueTotals>;
  readonly byCalculator: ReadonlyMap<string, RevenueTotals>;
  readonly byVertical: ReadonlyMap<string, RevenueTotals>;
  readonly byProvider: ReadonlyMap<string, RevenueTotals>;
  readonly leadFunnel: readonly FunnelStep[];
  readonly affiliateFunnel: readonly FunnelStep[];
  readonly sessions: number;
  readonly revenuePerThousandSessions: Money | null;
  readonly hasTestData: boolean;
};

const LEAD_FUNNEL_STEPS = [
  'lead_cta_impression', 'lead_cta_click', 'lead_form_start',
  'lead_consent_accept', 'lead_submit', 'lead_provider_accept', 'lead_paid',
] as const;

const AFFILIATE_FUNNEL_STEPS = [
  'affiliate_module_impression', 'affiliate_offer_impression',
  'affiliate_offer_click', 'affiliate_revenue_confirmed',
] as const;

export async function monetizationSnapshot(
  database: D1DatabaseLike,
  input: { days: number; now?: number },
): Promise<MonetizationSnapshot> {
  const now = input.now ?? Date.now();
  const fromMs = now - input.days * 24 * 60 * 60 * 1000;
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(now).toISOString();

  // Test rows are fetched so the dashboard can say whether any exist, and
  // excluded from every total. Seeding a production dashboard with fake revenue
  // is how an operator loses the ability to trust it.
  const all = await revenueBetween(database, fromIso, toIso, true);
  const production = all.filter((entry) => !entry.isTest);

  const counts = await eventCounts(database, dayBucket(fromMs), dayBucket(now));
  const sessions = counts.get('calculator_view') ?? counts.get('tool_opened') ?? 0;
  const totals = totalRevenue(production);

  return {
    window: { from: fromIso, to: toIso },
    totals,
    bySource: groupRevenueBy(production, 'sourceType'),
    byCalculator: groupRevenueBy(production, 'calculatorId'),
    byVertical: groupRevenueBy(production, 'vertical'),
    byProvider: groupRevenueBy(production, 'providerId'),
    leadFunnel: buildFunnel(counts, LEAD_FUNNEL_STEPS),
    affiliateFunnel: buildFunnel(counts, AFFILIATE_FUNNEL_STEPS),
    sessions,
    revenuePerThousandSessions: revenuePerThousand(totals.realized, sessions),
    hasTestData: all.some((entry) => entry.isTest),
  };
}

function buildFunnel(counts: ReadonlyMap<string, number>, steps: readonly string[]): FunnelStep[] {
  return steps.map((name, index) => {
    const count = counts.get(name) ?? 0;
    if (index === 0) return { name, count, rate: null };
    const previous = counts.get(steps[index - 1]) ?? 0;
    // A rate with a zero denominator is not zero, it is unknown. Printing 0%
    // makes an unmeasured step look like a broken one.
    return { name, count, rate: previous > 0 ? count / previous : null };
  });
}

/** Formatting kept here so every surface renders the same figure the same way. */
export function formatTotals(totals: RevenueTotals, locale = 'en-US'): Record<string, string> {
  return {
    estimated: formatMoneyValue(totals.estimated, locale),
    reported: formatMoneyValue(totals.reported, locale),
    confirmed: formatMoneyValue(totals.confirmed, locale),
    paid: formatMoneyValue(totals.paid, locale),
    reversed: formatMoneyValue(totals.reversed, locale),
    realized: formatMoneyValue(totals.realized, locale),
  };
}

export function emptyTotals(): RevenueTotals {
  const zero = money(0);
  return { estimated: zero, reported: zero, confirmed: zero, paid: zero, reversed: zero, realized: zero };
}

export function summarizeLedger(entries: readonly RevenueLedgerEntry[]): RevenueTotals {
  return totalRevenue(entries);
}
