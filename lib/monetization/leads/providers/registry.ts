/**
 * The set of lead providers this deployment knows about.
 *
 * Construction is lazy and flag-gated so that a disabled provider is never
 * instantiated — which is what keeps `MockLeadProvider`, whose constructor
 * throws in production, from being built merely by importing the registry.
 */
import { resolveFlag, type FlagEnvironment, type FlagOverrides } from '../../flags';
import { GenericServerPostProvider } from './generic-post';
import { MockLeadProvider } from './mock';
import { AngiLeadProvider, HomeServicesLeadGroupProvider, LeadBankProvider } from './networks';
import type { LeadProvider, ProviderDescriptor } from './types';

export type ProviderFactory = () => LeadProvider;

const FACTORIES: Record<string, ProviderFactory> = {
  angi: () => new AngiLeadProvider(),
  leadbank: () => new LeadBankProvider(),
  hslg: () => new HomeServicesLeadGroupProvider(),
  mock: () => new MockLeadProvider(),
};

const FLAG_BY_PROVIDER = {
  angi: 'leads.angi.enabled',
  leadbank: 'leads.leadbank.enabled',
  hslg: 'leads.hslg.enabled',
  mock: 'leads.mock.enabled',
} as const;

export function createLeadProvider(providerId: string): LeadProvider {
  if (providerId.startsWith('generic:')) {
    return new GenericServerPostProvider(providerId.slice('generic:'.length));
  }
  const factory = FACTORIES[providerId];
  if (!factory) throw new Error(`Unknown lead provider: ${providerId}`);
  return factory();
}

export function enabledLeadProviderIds(
  environment: FlagEnvironment = process.env,
  overrides: FlagOverrides = {},
): Set<string> {
  const enabled = new Set<string>();
  for (const [providerId, flag] of Object.entries(FLAG_BY_PROVIDER)) {
    if (resolveFlag(flag, environment, overrides)) enabled.add(providerId);
  }
  if (resolveFlag('leads.generic.enabled', environment, overrides)) {
    // Generic destinations are enabled as a class; the compiled allowlist in
    // generic-post.ts is what decides which of them actually exist.
    enabled.add('generic');
  }
  return enabled;
}

/**
 * Every provider and its honest status, for the admin screen.
 *
 * Describes all of them regardless of flags: an operator needs to see that Angi
 * exists and what it is waiting for, not only the ones already switched on.
 */
export function describeAllProviders(): ProviderDescriptor[] {
  return Object.keys(FACTORIES)
    .filter((providerId) => providerId !== 'mock' || process.env.NODE_ENV !== 'production')
    .map((providerId) => createLeadProvider(providerId).describe());
}
