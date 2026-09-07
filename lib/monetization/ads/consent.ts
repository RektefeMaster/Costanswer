/**
 * The signal that decides whether a third-party ad script may run.
 *
 * Three states, not two. "Unknown" is not "no": a first-time visitor in a
 * jurisdiction that requires an explicit choice has not refused, they have not
 * been asked — and the difference decides whether the script waits or never
 * runs at all.
 *
 * This is a boundary, not a consent management platform. Certified CMPs exist
 * because the requirements are detailed and change; building one here would be
 * a compliance liability wearing a component's clothes. What this owns is the
 * decision — may the script run, and may personalised advertising run — so that
 * a real CMP plugs in without touching a calculator.
 */
export type AdConsentSignal = 'granted' | 'denied' | 'unknown';

export type AdConsentState = {
  /** Whether the network's script may load at all. */
  readonly script: AdConsentSignal;
  /** Whether it may personalise. Denied still permits contextual ads. */
  readonly personalisation: AdConsentSignal;
  /** US state privacy opt-out, which is a sale/share signal rather than consent. */
  readonly saleOptOut: boolean;
};

export const DEFAULT_AD_CONSENT: AdConsentState = {
  script: 'unknown',
  personalisation: 'unknown',
  saleOptOut: false,
};

export type ConsentRequirement = 'none' | 'us_state_optout' | 'tcf_v2';

/**
 * May the script load?
 *
 * `tcf_v2` requires an affirmative signal, so unknown means wait. The US state
 * regime is opt-out rather than opt-in, so unknown means proceed — and honouring
 * the opt-out is what the flag below is for. Encoding the two regimes
 * differently is the whole point: treating them the same is either a compliance
 * failure or revenue thrown away.
 */
export function mayLoadAdScript(requirement: ConsentRequirement, state: AdConsentState): boolean {
  switch (requirement) {
    case 'none':
      return true;
    case 'us_state_optout':
      return state.script !== 'denied';
    case 'tcf_v2':
      return state.script === 'granted';
    default: {
      const exhaustive: never = requirement;
      throw new Error(`Unhandled consent requirement: ${exhaustive}`);
    }
  }
}

/** May advertising be personalised? An opt-out forces contextual-only. */
export function mayPersonalise(state: AdConsentState): boolean {
  if (state.saleOptOut) return false;
  return state.personalisation === 'granted';
}

export const AD_CONSENT_STORAGE_KEY = 'costanswer:ad-consent';

export function parseAdConsent(raw: unknown): AdConsentState {
  if (raw === null || typeof raw !== 'object') return DEFAULT_AD_CONSENT;
  const record = raw as Record<string, unknown>;
  const signal = (value: unknown): AdConsentSignal =>
    value === 'granted' || value === 'denied' ? value : 'unknown';
  return {
    script: signal(record.script),
    personalisation: signal(record.personalisation),
    saleOptOut: record.saleOptOut === true,
  };
}
