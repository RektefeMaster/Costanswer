/**
 * Ad placements and the one rule about them.
 *
 * Nothing may sit between an input and its result. The existing layout already
 * honours that; encoding it here makes it enforceable — `assertPlacementOrder`
 * is called by a test that reads the tool template, so a future refactor that
 * drops a slot into the gap fails the build instead of shipping.
 */
export const AD_PLACEMENTS = ['header-leaderboard', 'desktop-rail', 'in-content', 'below-content'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export type PlacementSpec = {
  readonly placement: AdPlacement;
  /** Reserved box, so the slot cannot shift the page when it fills. */
  readonly reservedWidth: number;
  readonly reservedHeight: number;
  /** Below this viewport width the slot is not rendered at all. */
  readonly minViewportWidth: number;
  /**
   * Position relative to the answer. `before-answer` is not a legal value and
   * there is no placement that uses it — the type itself is the guardrail.
   */
  readonly region: 'above-calculator' | 'beside-content' | 'after-answer' | 'after-content';
  readonly lazy: boolean;
};

export const PLACEMENT_SPECS: Readonly<Record<AdPlacement, PlacementSpec>> = Object.freeze({
  'header-leaderboard': {
    placement: 'header-leaderboard',
    reservedWidth: 728,
    reservedHeight: 90,
    minViewportWidth: 921,
    region: 'above-calculator',
    lazy: false,
  },
  'desktop-rail': {
    placement: 'desktop-rail',
    reservedWidth: 300,
    reservedHeight: 600,
    minViewportWidth: 681,
    region: 'beside-content',
    lazy: true,
  },
  'in-content': {
    placement: 'in-content',
    reservedWidth: 300,
    reservedHeight: 250,
    minViewportWidth: 0,
    region: 'after-answer',
    lazy: true,
  },
  'below-content': {
    placement: 'below-content',
    reservedWidth: 300,
    reservedHeight: 250,
    minViewportWidth: 0,
    region: 'after-content',
    lazy: true,
  },
});

/**
 * The order a tool page is allowed to put things in.
 *
 * `answer` and `explanation` are not ad slots; they are here so the sequence can
 * be asserted as a whole. The first ad may not appear before `next-action`,
 * which is itself after the answer and its explanation.
 */
export const TOOL_PAGE_ORDER = [
  'calculator-input',
  'answer',
  'explanation',
  'next-action',
  'in-content',
  'detailed-content',
  'below-content',
] as const;

export function assertPlacementOrder(sequence: readonly string[]): void {
  const answerIndex = sequence.indexOf('answer');
  const inputIndex = sequence.indexOf('calculator-input');
  if (answerIndex === -1 || inputIndex === -1) {
    throw new Error('A tool page must render both the calculator input and the answer.');
  }
  for (const placement of AD_PLACEMENTS) {
    const index = sequence.indexOf(placement);
    if (index === -1) continue;
    if (PLACEMENT_SPECS[placement].region === 'above-calculator') {
      if (index > inputIndex) throw new Error(`${placement} must sit above the calculator, not inside the flow.`);
      continue;
    }
    if (index > inputIndex && index < answerIndex) {
      throw new Error(`${placement} sits between the calculator input and the answer. Nothing may.`);
    }
  }
}
