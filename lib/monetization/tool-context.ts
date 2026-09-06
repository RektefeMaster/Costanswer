/**
 * Turning a registry tool into a monetization context.
 *
 * This is the door between the two halves of the site, and it is deliberately
 * narrow: it reads the tool's identity and its policy row and produces a frozen
 * record. It does not run an engine, does not receive a result, and cannot
 * reach a number the reader typed — the interactive island owns those and never
 * hands them across.
 *
 * A page whose calculator genuinely knows a project size or a location can pass
 * those in explicitly via `displayed`, and only what the reader already saw on
 * the page is allowed through `toCalculationFacts`.
 */
import type { ToolDefinition } from '@/lib/tool-registry';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locales';
import { toCalculationFacts, type CalculationFacts } from './boundary';
import { createMonetizationContext, type MonetizationContext, type MonetizationProject, type UserIntent } from './context';
import { getMonetizationPolicy } from './policy';

export function toolMonetizationContext(
  tool: ToolDefinition,
  options: {
    locale?: Locale;
    intent?: UserIntent;
    location?: { state?: string; zip?: string; city?: string };
    project?: MonetizationProject;
    facts?: CalculationFacts;
  } = {},
): MonetizationContext {
  const policy = getMonetizationPolicy(tool.id);
  return createMonetizationContext({
    pageId: tool.id,
    calculatorId: tool.id,
    calculatorType: tool.engine,
    locale: options.locale ?? DEFAULT_LOCALE,
    vertical: policy.vertical,
    riskClass: policy.riskClass,
    intent: options.intent,
    location: options.location,
    project: options.project,
    leadEligible: policy.lead.enabled,
    affiliateEligible: policy.affiliate.enabled,
    adsEligible: policy.ads.enabled,
    facts: options.facts,
  });
}

export { toCalculationFacts };
