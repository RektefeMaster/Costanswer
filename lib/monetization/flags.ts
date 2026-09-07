/**
 * Monetization feature flags.
 *
 * Two layers, deliberately. Environment variables are the floor: a channel that
 * is off in the environment cannot be switched on from the admin screen, so a
 * compromised admin session cannot start sending consumer data to a network
 * nobody approved. Stored overrides sit on top and can only ever turn something
 * *off* — that is what makes the kill switch trustworthy under exactly the
 * conditions you need it: a provider misbehaving at 2am, no deploy available.
 *
 * `lib/integration-config.ts` already owned the three original switches and its
 * rule — analytics, advertising and affiliates cannot be enabled without a
 * dated privacy policy, a public contact address and a policy version — is
 * exactly right and is extended here rather than replaced.
 */
import { integrationConfig } from '@/lib/integration-config';

export const MONETIZATION_FLAGS = [
  'monetization.enabled',
  'ads.enabled',
  'affiliate.enabled',
  'affiliate.amazon.enabled',
  'affiliate.homedepot.enabled',
  'affiliate.cj.enabled',
  'affiliate.financial.enabled',
  'leads.enabled',
  'leads.angi.enabled',
  'leads.leadbank.enabled',
  'leads.hslg.enabled',
  'leads.generic.enabled',
  'leads.mock.enabled',
  'calls.enabled',
] as const;

export type MonetizationFlag = (typeof MONETIZATION_FLAGS)[number];

const ENV_KEY: Record<MonetizationFlag, string> = {
  'monetization.enabled': 'MONETIZATION_ENABLED',
  'ads.enabled': 'NEXT_PUBLIC_ADVERTISING_ENABLED',
  'affiliate.enabled': 'NEXT_PUBLIC_AFFILIATES_ENABLED',
  'affiliate.amazon.enabled': 'AFFILIATE_AMAZON_ENABLED',
  'affiliate.homedepot.enabled': 'AFFILIATE_HOMEDEPOT_ENABLED',
  'affiliate.cj.enabled': 'AFFILIATE_CJ_ENABLED',
  'affiliate.financial.enabled': 'AFFILIATE_FINANCIAL_ENABLED',
  'leads.enabled': 'LEADS_ENABLED',
  'leads.angi.enabled': 'LEADS_ANGI_ENABLED',
  'leads.leadbank.enabled': 'LEADS_LEADBANK_ENABLED',
  'leads.hslg.enabled': 'LEADS_HSLG_ENABLED',
  'leads.generic.enabled': 'LEADS_GENERIC_ENABLED',
  'leads.mock.enabled': 'LEADS_MOCK_ENABLED',
  'calls.enabled': 'CALLS_ENABLED',
};

/**
 * Flags whose parent must also be on.
 *
 * A merchant flag left on from a test does nothing while `affiliate.enabled` is
 * off, and turning the parent off is therefore a complete stop for the channel
 * rather than a partial one someone has to reason about.
 */
const PARENT: Partial<Record<MonetizationFlag, MonetizationFlag>> = {
  'ads.enabled': 'monetization.enabled',
  'affiliate.enabled': 'monetization.enabled',
  'leads.enabled': 'monetization.enabled',
  'calls.enabled': 'monetization.enabled',
  'affiliate.amazon.enabled': 'affiliate.enabled',
  'affiliate.homedepot.enabled': 'affiliate.enabled',
  'affiliate.cj.enabled': 'affiliate.enabled',
  'affiliate.financial.enabled': 'affiliate.enabled',
  'leads.angi.enabled': 'leads.enabled',
  'leads.leadbank.enabled': 'leads.enabled',
  'leads.hslg.enabled': 'leads.enabled',
  'leads.generic.enabled': 'leads.enabled',
  'leads.mock.enabled': 'leads.enabled',
};

export type FlagOverrides = Partial<Record<MonetizationFlag, false>>;

export type FlagEnvironment = Record<string, string | undefined>;

function envFlag(flag: MonetizationFlag, environment: FlagEnvironment): boolean {
  return environment[ENV_KEY[flag]] === 'true';
}

/**
 * The mock lead provider must be impossible to reach in production.
 *
 * Not "should not" — the whole point of a mock is that it accepts a consumer's
 * real phone number and does nothing with it, which is the worst possible thing
 * to have quietly enabled on a live site.
 */
function mockAllowed(environment: FlagEnvironment): boolean {
  return environment.NODE_ENV !== 'production' || environment.MONETIZATION_ALLOW_MOCKS === 'true';
}

export function resolveFlag(
  flag: MonetizationFlag,
  environment: FlagEnvironment = process.env,
  overrides: FlagOverrides = {},
): boolean {
  if (overrides[flag] === false) return false;
  if (flag === 'leads.mock.enabled' && !mockAllowed(environment)) return false;
  if (!envFlag(flag, environment)) return false;
  const parent = PARENT[flag];
  if (parent && !resolveFlag(parent, environment, overrides)) return false;
  // The three original switches carry a disclosure precondition. Keep it.
  if (flag === 'ads.enabled' && !integrationConfig.advertisingEnabled) return false;
  if (flag === 'affiliate.enabled' && !integrationConfig.affiliatesEnabled) return false;
  return true;
}

export function resolveAllFlags(
  environment: FlagEnvironment = process.env,
  overrides: FlagOverrides = {},
): Record<MonetizationFlag, boolean> {
  const resolved = {} as Record<MonetizationFlag, boolean>;
  for (const flag of MONETIZATION_FLAGS) resolved[flag] = resolveFlag(flag, environment, overrides);
  return resolved;
}

export function isMonetizationFlag(value: unknown): value is MonetizationFlag {
  return typeof value === 'string' && (MONETIZATION_FLAGS as readonly string[]).includes(value);
}
