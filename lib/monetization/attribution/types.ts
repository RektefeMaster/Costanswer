/**
 * First-party commercial attribution.
 *
 * What this is for: knowing which traffic produces revenue, so the content and
 * SEO work can be aimed. What it is deliberately not: a profile of a person.
 *
 * Three decisions make that difference real rather than stated.
 *
 *   - No cookie. The privacy page says no tracking cookies are set and that
 *     stays true: capture happens in `sessionStorage`, which is per-origin and
 *     per-tab, dies when the tab closes, and is never sent to another site.
 *   - The session id is a random value that lives as long as one tab. It is not
 *     a stable identifier and cannot join two visits together.
 *   - The referrer is reduced to a category before it is stored. Which search
 *     engine sent someone is useful; the full URL of the page they came from
 *     can carry a query, a document title, or a private forum thread.
 */
export const REFERRER_CATEGORIES = [
  'direct', 'organic_search', 'paid_search', 'social', 'email', 'referral', 'internal', 'unknown',
] as const;
export type ReferrerCategory = (typeof REFERRER_CATEGORIES)[number];

export type Attribution = {
  /** Path only. Never a query string: those carry what someone typed. */
  readonly landingPath?: string;
  readonly referrerCategory?: ReferrerCategory;
  /** The referring host, not the full URL. */
  readonly referrerHost?: string;
  readonly utmSource?: string;
  readonly utmMedium?: string;
  readonly utmCampaign?: string;
  /** Random, per-tab, dies with the tab. Not a stable identifier. */
  readonly sessionId?: string;
  readonly placement?: string;
};

const FIELD_MAX = 80;
const PATH_MAX = 200;

export function isReferrerCategory(value: unknown): value is ReferrerCategory {
  return typeof value === 'string' && (REFERRER_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Bound and clean whatever arrives from a browser.
 *
 * Attribution comes from the client, so it is attacker-controlled: it is
 * length-capped, stripped of anything that is not a plain token, and a query
 * string is discarded rather than trimmed.
 */
export function sanitizeAttribution(value: unknown): Attribution {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;

  const token = (input: unknown): string | undefined => {
    if (typeof input !== 'string') return undefined;
    const cleaned = input.trim().slice(0, FIELD_MAX).replace(/[^\w.\-+ ]/g, '');
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const path = typeof record.landingPath === 'string'
    ? record.landingPath.split('?')[0].split('#')[0].slice(0, PATH_MAX)
    : undefined;

  return {
    landingPath: path && path.startsWith('/') ? path : undefined,
    referrerCategory: isReferrerCategory(record.referrerCategory) ? record.referrerCategory : undefined,
    referrerHost: token(record.referrerHost)?.toLowerCase(),
    utmSource: token(record.utmSource),
    utmMedium: token(record.utmMedium),
    utmCampaign: token(record.utmCampaign),
    sessionId: token(record.sessionId),
    placement: token(record.placement),
  };
}

const SEARCH_HOSTS = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'ecosia.', 'brave.', 'startpage.'];
const SOCIAL_HOSTS = ['facebook.', 'instagram.', 'x.com', 'twitter.', 'reddit.', 'linkedin.', 'pinterest.', 'tiktok.', 'youtube.'];
const EMAIL_HOSTS = ['mail.', 'outlook.', 'gmail.'];

/**
 * Reduce a referrer to a category.
 *
 * `paid_search` is decided by the campaign parameters rather than by the host,
 * because a search engine referrer looks identical either way and guessing
 * would misattribute organic traffic to spend that never happened.
 */
export function classifyReferrer(
  referrer: string | undefined,
  currentHost: string,
  utmMedium?: string,
): { category: ReferrerCategory; host?: string } {
  const paid = utmMedium && /^(cpc|ppc|paid|paidsearch)$/i.test(utmMedium);
  if (!referrer) return { category: paid ? 'paid_search' : 'direct' };

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return { category: 'unknown' };
  }

  if (host === currentHost.toLowerCase()) return { category: 'internal', host };
  if (SEARCH_HOSTS.some((prefix) => host.includes(prefix))) {
    return { category: paid ? 'paid_search' : 'organic_search', host };
  }
  if (SOCIAL_HOSTS.some((prefix) => host.includes(prefix))) return { category: 'social', host };
  if (EMAIL_HOSTS.some((prefix) => host.startsWith(prefix))) return { category: 'email', host };
  return { category: 'referral', host };
}
