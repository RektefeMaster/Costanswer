/**
 * Duplicate detection.
 *
 * The thing being prevented is billing a buyer twice for the same consumer.
 * The thing being protected is a person who genuinely has two projects — a
 * roof in March and a bathroom in June is two leads, and a naive "same phone
 * number" rule suppresses the second one and loses real revenue while looking
 * careful.
 *
 * So the key is the person *and* the vertical *and* a window, and the window is
 * configurable because different buyers define a duplicate differently.
 */
import { normalizeEmail, normalizePhone, pepperedHash } from '../hash';

export type DuplicatePolicy = {
  /** Hours within which the same person in the same vertical is a duplicate. */
  readonly windowHours: number;
  /** Suppress the second submission, or send it flagged and let the buyer decide. */
  readonly action: 'suppress' | 'allow_flagged';
};

export const DEFAULT_DUPLICATE_POLICY: DuplicatePolicy = {
  windowHours: 72,
  action: 'suppress',
};

export type ContactHashes = {
  readonly phoneHash?: string;
  readonly emailHash?: string;
};

export async function hashContact(
  contact: { phone?: string; email?: string },
  pepper: string,
): Promise<ContactHashes> {
  const phone = contact.phone ? normalizePhone(contact.phone) : null;
  const email = contact.email ? normalizeEmail(contact.email) : null;
  return {
    phoneHash: phone ? await pepperedHash(`phone:${phone}`, pepper) : undefined,
    emailHash: email ? await pepperedHash(`email:${email}`, pepper) : undefined,
  };
}

export type DuplicateLookup = (input: {
  phoneHash?: string;
  emailHash?: string;
  vertical: string;
  since: string;
  /**
   * The lead being checked.
   *
   * Its own contact row is written before this runs — it has to be, because the
   * hashes live on that row — so without this every lead matches itself and is
   * suppressed as a duplicate of itself.
   */
  excludeLeadId: string;
}) => Promise<{ leadId: string; createdAt: string } | null>;

export type DuplicateVerdict =
  | { readonly state: 'none' }
  | { readonly state: 'suppressed'; readonly priorLeadId: string }
  | { readonly state: 'allowed'; readonly priorLeadId: string };

export async function checkDuplicate(input: {
  hashes: ContactHashes;
  vertical: string;
  now: number;
  leadId: string;
  policy?: DuplicatePolicy;
  lookup: DuplicateLookup;
}): Promise<DuplicateVerdict> {
  const policy = input.policy ?? DEFAULT_DUPLICATE_POLICY;
  if (!input.hashes.phoneHash && !input.hashes.emailHash) return { state: 'none' };

  const since = new Date(input.now - policy.windowHours * 60 * 60 * 1000).toISOString();
  const prior = await input.lookup({
    ...input.hashes,
    vertical: input.vertical,
    since,
    excludeLeadId: input.leadId,
  });
  if (!prior || prior.leadId === input.leadId) return { state: 'none' };

  return policy.action === 'suppress'
    ? { state: 'suppressed', priorLeadId: prior.leadId }
    : { state: 'allowed', priorLeadId: prior.leadId };
}
