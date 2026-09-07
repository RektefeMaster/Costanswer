/**
 * What the reader needs, decided before anyone is paid.
 *
 * This module imports no merchant, no offer and no payout. It cannot: its only
 * inputs are the page's policy and the reader's stated intent. That is what
 * makes the guarantee checkable rather than aspirational — a test asserts this
 * file's import list, and a future edit that reaches for a commission fails the
 * build rather than quietly reordering a recommendation.
 */
import type { MonetizationContext } from '../context';
import { getMonetizationPolicy, type AffiliateCategoryId } from '../policy';

export type RelevantCategory = {
  readonly categoryId: AffiliateCategoryId;
  /** 0–1. How well this category follows from what the reader just calculated. */
  readonly relevance: number;
  readonly reason: string;
};

/**
 * Categories that follow from this page.
 *
 * `hire_professional` returns nothing at all. Someone who has just said they
 * intend to hire a contractor does not want a list of trowels, and showing them
 * anyway is the "random product carousel" failure the brief calls out by name.
 */
export function relevantCategories(context: MonetizationContext): RelevantCategory[] {
  if (!context.affiliateEligible) return [];
  if (context.intent === 'hire_professional') return [];

  const policy = getMonetizationPolicy(context.pageId);
  if (!policy.affiliate.enabled) return [];

  const declared = policy.affiliate.categories;
  if (declared.length === 0) return [];

  // Stating DIY intent is the strongest possible signal that materials are
  // wanted. Saying nothing is weaker but not zero — the calculator itself is
  // evidence. Saying "just researching" is weak enough that only the single
  // most on-topic category survives the threshold below.
  const intentWeight = context.intent === 'diy' ? 1 : context.intent === 'researching' ? 0.45 : 0.7;

  return declared
    .map((categoryId, index) => ({
      categoryId,
      // The first category a policy lists is the primary one for that page;
      // later entries are genuine but secondary, and decay accordingly.
      relevance: round(intentWeight * (1 - index * 0.15)),
      reason: index === 0
        ? `Primary material category for ${context.pageId}.`
        : `Secondary material category for ${context.pageId}.`,
    }))
    .filter((entry) => entry.relevance >= RELEVANCE_THRESHOLD);
}

/**
 * Below this, a category is not shown at all.
 *
 * Set so that a "just researching" reader sees at most the single most relevant
 * category and a page with three declared categories does not turn into three
 * shopping blocks under an answer.
 */
export const RELEVANCE_THRESHOLD = 0.4;

function round(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 1) * 1000) / 1000;
}

/**
 * A hard stop, independent of flags and configuration.
 *
 * Restricted pages and high-risk verticals never carry product recommendations,
 * whatever a policy row says. Duplicating the check here rather than trusting
 * the context is deliberate: this is the last function before an offer is
 * chosen, and the cost of the check is nothing against the cost of a paid link
 * under a body-fat estimate.
 */
export function affiliateForbidden(context: MonetizationContext): boolean {
  return context.riskClass === 'restricted'
    || context.vertical === 'health'
    || context.vertical === 'insurance';
}
