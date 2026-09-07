/**
 * The arithmetic and text behind the depth primitives.
 *
 * Kept out of the components on purpose. Everything here is pure, so it can be
 * tested in the node environment the suite already runs in rather than needing
 * a DOM, and none of it ships twice when several calculators use it.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * At least one reason, enforced by the type rather than by review.
 *
 * A confidence label on its own is a claim with nothing behind it — "medium
 * confidence" tells a reader neither what is uncertain nor whether it matters
 * to them. Requiring the reasons at the call site is what stops that label
 * being pasted onto a tool that has not thought about it.
 */
export type ConfidenceReasons = readonly [string, ...string[]];

export type ConfidenceStatement = {
  readonly level: ConfidenceLevel;
  readonly reason: string;
};

/**
 * Fold the reasons into one sentence, or refuse.
 *
 * The type already requires a non-empty list, but reasons are often built by
 * filtering — `[a && 'x', b && 'y'].filter(Boolean)` — and that can come back
 * empty at runtime with the type still satisfied. Returning null there makes
 * the component render nothing at all, which is the honest outcome: no reason
 * means no claim.
 */
export function confidenceStatement(
  level: ConfidenceLevel,
  reasons: ConfidenceReasons,
): ConfidenceStatement | null {
  const stated = reasons.map((reason) => reason.trim()).filter((reason) => reason.length > 0);
  if (stated.length === 0) return null;
  const joined = stated.join('; ');
  return { level, reason: /[.!?]$/.test(joined) ? joined : `${joined}.` };
}

export type CompareRow = {
  readonly label: string;
  readonly a: number;
  readonly b: number;
  /** How an amount is written in this row's units — money, percent, years. */
  readonly format: (value: number) => string;
};

export type ScenarioDelta = {
  readonly label: string;
  readonly a: string;
  readonly b: string;
  /** The signed difference, written in the row's own units. */
  readonly change: string;
  readonly direction: 'up' | 'down' | 'unchanged';
};

/**
 * Two scenarios side by side, with the difference named rather than left to
 * the reader to subtract.
 *
 * The tolerance is what stops a comparison reporting a change of "+$0.00"
 * because two floating-point paths through the same arithmetic disagreed in
 * the fifteenth digit. Below it the row reads as unchanged, which is what a
 * reader means by unchanged.
 */
export function compareScenarios(rows: readonly CompareRow[], tolerance = 0.005): ScenarioDelta[] {
  return rows.map((row) => {
    const difference = row.b - row.a;
    const direction = Math.abs(difference) < tolerance ? 'unchanged' : difference > 0 ? 'up' : 'down';
    return {
      label: row.label,
      a: row.format(row.a),
      b: row.format(row.b),
      change: direction === 'unchanged' ? row.format(0) : `${difference > 0 ? '+' : '−'}${row.format(Math.abs(difference))}`,
      direction,
    };
  });
}

export type ReverseSolveOptions = {
  /**
   * The forward calculation, as a function of the one input being solved for.
   *
   * Must be monotonic across `[lower, upper]`. That is a real restriction, not
   * a formality: net tax is not monotonic in income once phase-outs and
   * refundable credits are involved, so a bracket spanning one of those must
   * not be handed to this.
   */
  readonly evaluate: (input: number) => number;
  readonly target: number;
  readonly lower: number;
  readonly upper: number;
  /** How close the result must land to the target, in the output's units. */
  readonly tolerance?: number;
  readonly maxIterations?: number;
};

export type ReverseSolveResult =
  | { readonly status: 'solved'; readonly value: number; readonly iterations: number }
  | { readonly status: 'unreachable'; readonly reason: string }
  | { readonly status: 'flat'; readonly reason: string }
  | { readonly status: 'invalid-range'; readonly reason: string };

/**
 * Solve the forward calculation backwards by bisection.
 *
 * Bisection rather than anything cleverer because the forward function is an
 * engine, not an expression: there is no derivative to take, and a method that
 * can overshoot would return an input outside the range the caller said was
 * valid. Halving a bracket cannot leave it.
 *
 * Every failure is a named status rather than a thrown error or a nearest
 * guess, because "you cannot get there from here" is a real answer that the UI
 * should show — a reader asking what salary reaches a given take-home in a
 * state that cannot reach it deserves to be told that, not handed the closest
 * number and left to assume it works.
 */
export function solveForTarget(options: ReverseSolveOptions): ReverseSolveResult {
  const { evaluate, target, lower, upper } = options;
  const tolerance = options.tolerance ?? 0.01;
  const maxIterations = options.maxIterations ?? 80;

  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(upper > lower)) {
    return { status: 'invalid-range', reason: 'The search range must be a finite interval with upper above lower.' };
  }
  if (!Number.isFinite(target)) {
    return { status: 'invalid-range', reason: 'The target must be a finite number.' };
  }

  const atLower = evaluate(lower);
  const atUpper = evaluate(upper);
  if (!Number.isFinite(atLower) || !Number.isFinite(atUpper)) {
    return { status: 'invalid-range', reason: 'The calculation did not return a finite result across the search range.' };
  }

  if (Math.abs(atUpper - atLower) < tolerance) {
    return { status: 'flat', reason: 'This input does not move the result, so there is nothing to solve for.' };
  }

  const min = Math.min(atLower, atUpper);
  const max = Math.max(atLower, atUpper);
  if (target < min - tolerance || target > max + tolerance) {
    return { status: 'unreachable', reason: 'No value in the allowed range reaches that result.' };
  }

  const increasing = atUpper > atLower;
  let low = lower;
  let high = upper;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const mid = (low + high) / 2;
    const value = evaluate(mid);
    if (Math.abs(value - target) <= tolerance) return { status: 'solved', value: mid, iterations };
    if (increasing === value < target) low = mid;
    else high = mid;
  }

  // The bracket has collapsed as far as it usefully can. Report the midpoint
  // with the iteration count rather than pretending to more precision.
  return { status: 'solved', value: (low + high) / 2, iterations };
}

export type ReceiptInput = {
  readonly title: string;
  readonly headline: { readonly label: string; readonly value: string };
  readonly breakdown: ReadonlyArray<{ readonly label: string; readonly value: string; readonly detail?: string }>;
  readonly assumptions: readonly string[];
  readonly calculationVersion: string;
  readonly datasetSnapshotIds: readonly string[];
};

/**
 * The result as plain text someone can paste into an email.
 *
 * The point of the receipt is that a number leaves the page with its working
 * attached. A figure pasted on its own into a message to a lender or a
 * contractor loses the assumptions that make it true, and those assumptions
 * are usually where the disagreement is.
 */
export function receiptText(input: ReceiptInput): string {
  const lines: string[] = [input.title, '', `${input.headline.label}: ${input.headline.value}`];

  if (input.breakdown.length > 0) {
    lines.push('', 'How we got this');
    for (const step of input.breakdown) {
      lines.push(`- ${step.label}: ${step.value}${step.detail ? ` (${step.detail})` : ''}`);
    }
  }

  if (input.assumptions.length > 0) {
    lines.push('', 'What we assumed');
    for (const assumption of input.assumptions) lines.push(`- ${assumption}`);
  }

  lines.push('', `Method ${input.calculationVersion}`);
  lines.push(input.datasetSnapshotIds.length > 0
    ? `Data ${input.datasetSnapshotIds.join(', ')}`
    : 'Data Manual inputs / fixed rules');

  return lines.join('\n');
}
