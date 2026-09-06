/**
 * The boundary between what CostAnswer calculates and what CostAnswer earns.
 *
 * The rule is one sentence: money may read the answer, the answer may never
 * read money. A comment saying so would be worth nothing in six months and
 * forty pull requests, so the rule is enforced three ways, and each catches a
 * different mistake.
 *
 *   1. Direction of dependency. Nothing under `lib/calculations/` imports
 *      anything under `lib/monetization/`. `tests/monetization-boundary.spec.ts`
 *      reads the source tree and fails the build on the first import that does.
 *      This is what catches "I just need the payout here for a second".
 *
 *   2. Shape of the handoff. A monetization module cannot receive a live
 *      calculation. It receives a `MonetizationContext`, which is frozen,
 *      carries no functions, and is built by `toMonetizationContext` below —
 *      the only door in the wall. This is what catches a mutation reaching back
 *      through a shared object.
 *
 *   3. Shape of the return. `MonetizationDecision` can express which offer to
 *      show and in what order. It has no field that could restate a number the
 *      calculator produced, so a decision cannot be rendered as an answer even
 *      by a careless component.
 *
 * What commercial economics MAY do: order two offers that are already equally
 * relevant, inside a module the reader can see is commercial. What it may never
 * do: change a formula, an assumption, a source, a range, a confidence level or
 * an estimate. That distinction is the whole design.
 */
import type { CalculationResult } from '@/lib/calculations/contracts';

/**
 * A calculation, flattened to the facts monetization is allowed to know.
 *
 * Note what is absent: no engine, no formula, no callback, no snapshot handle,
 * no way to ask for a different result. Everything here is a value that was
 * already shown to the reader on the page.
 */
export type CalculationFacts = {
  readonly calculationVersion: string;
  /** Present only when the engine produced a monetary range the reader saw. */
  readonly estimateLow?: number;
  readonly estimateHigh?: number;
  readonly estimateMidpoint?: number;
  /** Free-form measure the reader entered, e.g. 120 sq ft. Never derived here. */
  readonly size?: number;
  readonly unit?: string;
};

const FORBIDDEN_FACT_KEYS = new Set([
  'payout', 'revenue', 'commission', 'cpc', 'cpl', 'epc', 'bid', 'price',
  'advertiser', 'merchant', 'sponsor', 'campaign', 'provider',
]);

/**
 * The single door in the wall.
 *
 * Takes a finished `CalculationResult` and the handful of figures the page
 * already displayed, and returns a frozen record. Rejects any extra key whose
 * name belongs to the commercial vocabulary — that is not paranoia, it is the
 * one mistake that would invert the dependency without changing any import.
 */
export function toCalculationFacts(
  result: Pick<CalculationResult<unknown>, 'calculationVersion'>,
  displayed: Omit<CalculationFacts, 'calculationVersion'> = {},
): CalculationFacts {
  for (const key of Object.keys(displayed)) {
    if (FORBIDDEN_FACT_KEYS.has(key.toLowerCase())) {
      throw new Error(
        `"${key}" is commercial vocabulary and cannot cross into calculation facts. `
        + 'Monetization reads the answer; the answer never reads monetization.',
      );
    }
  }
  const facts: CalculationFacts = {
    calculationVersion: result.calculationVersion,
    ...displayed,
  };
  assertPlainData(facts, 'CalculationFacts');
  return Object.freeze(facts);
}

/**
 * Everything a monetization decision is permitted to say.
 *
 * There is no `estimate`, no `range`, no `confidence` and no `assumption`
 * field, so a commercial module physically cannot answer the reader's question.
 * The most it can do is offer a next action.
 */
export type MonetizationDecision = {
  readonly kind: 'lead' | 'affiliate' | 'call' | 'ad' | 'none';
  readonly placementId: string;
  /** Ordered ids of things to show. Order may be commercially influenced. */
  readonly offerIds: readonly string[];
  /** Why nothing is shown, when nothing is. Rendered nowhere; logged. */
  readonly suppressedReason?: string;
  /** True when compensation influenced the ordering, so the UI can label it. */
  readonly compensationInfluencedOrder: boolean;
};

/**
 * Reject anything that is not inert data.
 *
 * A function or a getter on the context is a live wire back to the calculation
 * layer; a Date or a class instance is a shared mutable reference. Only
 * primitives, plain objects and arrays cross.
 */
export function assertPlainData(value: unknown, label: string, depth = 0): void {
  if (depth > 8) throw new Error(`${label} is nested too deeply to verify as inert data.`);
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    if (type === 'number' && !Number.isFinite(value as number)) {
      throw new Error(`${label} carries a non-finite number.`);
    }
    return;
  }
  if (type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new Error(`${label} carries a ${type}. Only inert data may cross the monetization boundary.`);
  }
  if (Array.isArray(value)) {
    for (const entry of value) assertPlainData(entry, label, depth + 1);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} carries a class instance. Only plain objects may cross the monetization boundary.`);
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get) throw new Error(`${label}.${key} is a getter, which can reach back into a live object.`);
    assertPlainData(entry, `${label}.${key}`, depth + 1);
  }
}

/** Deep-freeze, so a downstream module cannot mutate what it was handed. */
export function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) freezeDeep(entry);
    Object.freeze(value);
  }
  return value;
}
