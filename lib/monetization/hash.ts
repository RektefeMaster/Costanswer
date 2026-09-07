/**
 * Peppered one-way hashes for the fields that must be comparable but must not
 * be readable.
 *
 * Duplicate detection needs to know that two submissions carry the same phone
 * number. It does not need to know the phone number, and a table of bare
 * SHA-256 phone hashes is a table of phone numbers: the whole US keyspace is
 * about 10^10 and rainbows in minutes. The pepper is a server secret that never
 * leaves the Worker, so a leaked hash column is not a leaked contact list.
 *
 * Deliberately async: WebCrypto HMAC is the primitive that exists on the
 * runtime we deploy to, and a synchronous re-implementation would be a second
 * crypto implementation to trust.
 */
const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function importKey(pepper: string): Promise<CryptoKey> {
  const cached = keyCache.get(pepper);
  if (cached) return cached;
  const key = crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  keyCache.set(pepper, key);
  return key;
}

export async function pepperedHash(value: string, pepper: string): Promise<string> {
  if (pepper.length < 32) {
    throw new Error('The hashing pepper must be at least 32 characters. Set MONETIZATION_HASH_PEPPER.');
  }
  const key = await importKey(pepper);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison for secrets and signatures.
 *
 * `a === b` on a string leaks the position of the first differing byte through
 * timing, which is enough to forge an admin token or a webhook signature one
 * byte at a time.
 */
export function timingSafeEqual(left: string, right: string): boolean {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

/**
 * Verify a provider webhook signature.
 *
 * Providers differ in what they sign and how they encode it, so the adapter
 * supplies the canonical string; this only owns the HMAC and the comparison.
 */
export async function verifyHmacSignature(input: {
  payload: string;
  signature: string;
  secret: string;
  encoding?: 'hex' | 'base64';
}): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(input.payload)));
  const expected = input.encoding === 'base64'
    ? btoa(String.fromCharCode(...signed))
    : [...signed].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, input.signature.trim());
}

/** Normalize before hashing, so formatting differences are not treated as different people. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D+/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  // NANP: area code and exchange never begin with 0 or 1.
  if (/^[01]/.test(national) || /^[01]/.test(national.slice(3))) return null;
  return national;
}

export function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(trimmed)) return null;
  return trimmed;
}
