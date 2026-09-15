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
  /**
   * Exactly the origins this network needs, per directive.
   *
   * The site's Content-Security-Policy is `script-src 'self'`, which silently
   * blocks every ad network: the script never loads, nothing is logged where an
   * operator would look, and the obvious conclusion is that the integration is
   * broken rather than that the policy refused it. Enabling a network has to
   * open its origins — and only its origins, which is why this is a list per
   * network rather than a wildcard on the policy.
   */
  readonly cspOrigins?: {
    readonly script?: readonly string[];
    readonly connect?: readonly string[];
    readonly img?: readonly string[];
    readonly frame?: readonly string[];
  };
  /** Script origin, so it can be added to the CSP deliberately rather than by wildcard. */
  readonly scriptOrigin?: string;
  /**
   * Consent signal this site requires before the network's script may run.
   *
   * This is the regime the *site* applies, not the strictest regime that
   * exists anywhere. The distinction was worth a whole audit finding: every
   * network here is used in the EEA under opt-in rules and in the US under
   * opt-out rules, and collapsing the two into `tcf_v2` meant a US reader who
   * had never been asked anything counted as having refused. The site then
   * served blank boxes to its entire audience while a "Do Not Sell" control
   * waited on the privacy page for a visit that does not come.
   *
   * Where the opt-in layer lives is the other half of the answer, and for
   * AdSense it is not here — see the note on that entry.
   */
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
    cspOrigins: {
      script: ['https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com'],
      connect: ['https://pagead2.googlesyndication.com', 'https://googleads.g.doubleclick.net'],
      img: ['https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com', 'https://www.google.com'],
      frame: ['https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
    },
    /*
     * Opt-out here, opt-in at Google.
     *
     * Google requires a certified CMP for EEA, UK and Swiss traffic and ships
     * one in the AdSense console (Privacy & messaging). That CMP does its own
     * geo-detection at Google's end, writes the TCF string, and AdSense reads
     * that string in preference to anything this page can say. So the opt-in
     * layer exists and is mandatory — it is configured in the AdSense account
     * rather than in this repository.
     *
     * What this layer owns is the regime it can actually decide from a static
     * page: the US opt-out. Resolving the country here instead would mean
     * reading a request header, which turns every prerendered calculator page
     * dynamic in order to answer a question Google already answers.
     */
    consentRequirement: 'us_state_optout',
    outstandingDependency:
      'AdSense account approval and a publisher client id. Before serving EEA, UK or Swiss traffic, turn on a Google-certified CMP in the AdSense console under Privacy & messaging; that is what supplies the opt-in consent this layer deliberately does not try to collect.',
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

/**
 * CSP additions for whichever network is live, or nothing.
 *
 * Returns an empty record when no network is configured, so the policy a
 * calculator page ships with is unchanged by the existence of this file. That
 * matters: the default posture must stay as tight as it is today.
 */
export function adCspSources(
  environment: Record<string, string | undefined> = process.env,
): Readonly<Record<'script' | 'connect' | 'img' | 'frame', readonly string[]>> {
  const provider = activeAdProvider(environment);
  const origins = provider?.cspOrigins;
  return {
    script: origins?.script ?? [],
    connect: origins?.connect ?? [],
    img: origins?.img ?? [],
    frame: origins?.frame ?? [],
  };
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

/**
 * The consent regime the site applies when no network is configured.
 *
 * Analytics consent-mode defaults have to agree with the ad script about the
 * same reader, and analytics can be on while advertising is off. Reading the
 * active provider when there is one, and falling back to the site's own
 * posture when there is not, keeps one answer rather than two.
 */
export function siteConsentRequirement(
  environment: Record<string, string | undefined> = process.env,
): AdProviderDescriptor['consentRequirement'] {
  return activeAdProvider(environment)?.consentRequirement ?? 'us_state_optout';
}
