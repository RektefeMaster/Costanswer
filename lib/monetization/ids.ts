/**
 * Identifiers for monetization records.
 *
 * Every id is prefixed by what it names. A prefix is not decoration: these ids
 * travel into provider payloads, webhook replays, analytics events and support
 * conversations, and a bare opaque string in a log line tells nobody whether it
 * is a lead, a delivery attempt or a ledger row.
 */
export const ID_PREFIXES = {
  lead: 'ld',
  leadContact: 'lc',
  consent: 'cs',
  delivery: 'dl',
  providerEvent: 'pe',
  revenue: 'rv',
  affiliateClick: 'ac',
  session: 'sx',
  idempotency: 'ik',
  audit: 'au',
  suppression: 'sp',
  call: 'cl',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const RANDOM_LENGTH = 20;

/**
 * A sortable, collision-resistant id.
 *
 * The first ten characters are the millisecond timestamp in the same alphabet,
 * so ids sort by creation time in an index without a second column, which is
 * what every one of these tables is queried by. The remainder is CSPRNG.
 */
export function generateId(kind: IdKind, now: number = Date.now()): string {
  const prefix = ID_PREFIXES[kind];
  return `${prefix}_${encodeTime(now)}${randomPart()}`;
}

function encodeTime(now: number): string {
  if (!Number.isInteger(now) || now < 0) throw new Error(`Invalid timestamp for id: ${now}`);
  let remaining = now;
  let out = '';
  for (let index = 0; index < 10; index += 1) {
    out = ALPHABET[remaining % ALPHABET.length] + out;
    remaining = Math.floor(remaining / ALPHABET.length);
  }
  return out;
}

function randomPart(): string {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

const ID_PATTERN = /^([a-z]{2})_([0-9a-hjkmnp-tv-z]{30})$/;

export function isId(value: unknown, kind?: IdKind): value is string {
  if (typeof value !== 'string') return false;
  const match = ID_PATTERN.exec(value);
  if (!match) return false;
  if (kind === undefined) return (Object.values(ID_PREFIXES) as string[]).includes(match[1]);
  return match[1] === ID_PREFIXES[kind];
}

export function assertId(value: unknown, kind: IdKind): string {
  if (!isId(value, kind)) throw new Error(`Not a valid ${kind} id.`);
  return value;
}
