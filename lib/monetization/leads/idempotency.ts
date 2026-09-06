/**
 * Making one submission stay one submission.
 *
 * Four things independently cause the same lead to arrive twice: a double
 * click, a browser retry on a flaky connection, our own retry after a provider
 * timeout, and a webhook replay. Each is handled at a different layer, and the
 * layers are named here so that adding a fifth has an obvious home.
 *
 *   browser  -> a key the form generates once and reuses for every retry
 *   endpoint -> monetization_idempotency, keyed on that value
 *   provider -> a derived key sent with the submission, unique per delivery
 *   webhook  -> a unique index on (provider_id, provider_event_id)
 */
import { pepperedHash } from '../hash';

/**
 * The key the provider sees.
 *
 * Derived from the lead and campaign rather than random, so our own retry of a
 * timed-out submission carries the same key the first attempt did — which is
 * the case that actually creates duplicate billing, because the first attempt
 * may well have succeeded on the provider's side before the socket died.
 */
export async function providerIdempotencyKey(
  input: { leadId: string; campaignId: string },
  pepper: string,
): Promise<string> {
  const hash = await pepperedHash(`delivery:${input.leadId}:${input.campaignId}`, pepper);
  return hash.slice(0, 32);
}

const CLIENT_KEY = /^[A-Za-z0-9_-]{16,64}$/;

export function isValidClientKey(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_KEY.test(value);
}

export type IdempotencyStore = {
  lookup(scope: string, key: string): Promise<string | null>;
  remember(scope: string, key: string, resultId: string, expiresAt: string): Promise<void>;
};

/**
 * Run an operation at most once per key.
 *
 * On a repeat it returns the id the first call produced. It does not re-run the
 * operation and it does not error: a person who double-clicked should see the
 * same confirmation, not a failure telling them they already did this.
 */
export async function once<T extends { id: string }>(input: {
  store: IdempotencyStore;
  scope: string;
  key: string;
  ttlHours?: number;
  now?: number;
  operation: () => Promise<T>;
  load: (id: string) => Promise<T | null>;
}): Promise<{ result: T; replayed: boolean }> {
  const existing = await input.store.lookup(input.scope, input.key);
  if (existing) {
    const loaded = await input.load(existing);
    if (loaded) return { result: loaded, replayed: true };
  }

  const result = await input.operation();
  const ttl = (input.ttlHours ?? 48) * 60 * 60 * 1000;
  const expiresAt = new Date((input.now ?? Date.now()) + ttl).toISOString();
  await input.store.remember(input.scope, input.key, result.id, expiresAt);
  return { result, replayed: false };
}
