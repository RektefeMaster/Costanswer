/**
 * Display advertising.
 *
 * One active network at a time. Not a limitation of the design — most ad
 * management programmes require exclusivity, and running two managers over the
 * same inventory produces duplicate auctions, double layout shift and a
 * programme violation. `activeAdProvider` therefore returns one or none, and
 * configuring two is a startup error rather than a silent race.
 *
 * Nothing here loads a script. The provider descriptor says what would load,
 * where, and under which consent signal; `AdSlot` decides whether the moment
 * has arrived. Keeping the decision and the loading apart is what lets a
 * calculator page render identically with advertising off.
 */
export type AdNetworkId = 'adsense' | 'mediavine-journey' | 'raptive';

export type AdProviderDescriptor = {
  readonly networkId: AdNetworkId;
  readonly displayName: string;
  readonly status: 'configuration_required' | 'configured' | 'enabled' | 'disabled';
  readonly requiredEnv: readonly string[];
  /** Script origin, so it can be added to the CSP deliberately rather than by wildcard. */
  readonly scriptOrigin?: string;
  /** Consent signal the network requires before its script may run. */
  readonly consentRequirement: 'none' | 'us_state_optout' | 'tcf_v2';
  readonly outstandingDependency?: string;
  readonly documentationCheckedAt: string;
};

const CHECKED_AT = '2026-09-06';

export const AD_PROVIDERS: readonly AdProviderDescriptor[] = Object.freeze([
  {
    networkId: 'adsense',
    displayName: 'Google AdSense',
    status: 'configuration_required',
    requiredEnv: ['AD_PROVIDER', 'ADSENSE_CLIENT_ID'],
    scriptOrigin: 'https://pagead2.googlesyndication.com',
    consentRequirement: 'tcf_v2',
    outstandingDependency:
      'AdSense account approval and a publisher client id. Google requires a certified consent management platform for EEA/UK/Swiss traffic, so a CMP must be selected and wired before this is enabled.',
    documentationCheckedAt: CHECKED_AT,
  },
  {
    networkId: 'mediavine-journey',
    displayName: 'Journey by Mediavine',
    status: 'configuration_required',
    requiredEnv: ['AD_PROVIDER', 'MEDIAVINE_SITE_ID'],
    consentRequirement: 'tcf_v2',
    outstandingDependency:
      'Journey by Mediavine acceptance, which has its own traffic and content requirements. Script host and site identifier are issued at approval.',
    documentationCheckedAt: CHECKED_AT,
  },
  {
    networkId: 'raptive',
    displayName: 'Raptive',
    status: 'configuration_required',
    requiredEnv: ['AD_PROVIDER', 'RAPTIVE_SITE_ID'],
    consentRequirement: 'tcf_v2',
    outstandingDependency:
      'Raptive acceptance, which currently requires substantially more monthly sessions than a new site has. Script host and site identifier are issued at approval.',
    documentationCheckedAt: CHECKED_AT,
  },
]);

const byId = new Map(AD_PROVIDERS.map((entry) => [entry.networkId, entry]));

export function isAdNetworkId(value: unknown): value is AdNetworkId {
  return typeof value === 'string' && byId.has(value as AdNetworkId);
}

export function activeAdProvider(
  environment: Record<string, string | undefined> = process.env,
): AdProviderDescriptor | null {
  const configured = environment.AD_PROVIDER?.trim();
  if (!configured) return null;
  if (!isAdNetworkId(configured)) {
    throw new Error(`AD_PROVIDER is "${configured}", which is not one of: ${[...byId.keys()].join(', ')}.`);
  }
  const descriptor = byId.get(configured);
  if (!descriptor) return null;
  const ready = descriptor.requiredEnv.every((key) => (environment[key]?.trim().length ?? 0) > 0);
  return ready ? descriptor : null;
}
