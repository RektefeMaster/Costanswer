/**
 * Privacy tooling for an authorized operator.
 *
 * The shape of this file is the point. It is not a PII browser: there is no
 * "list everyone", no search by name, and no free-text lookup over contact
 * details. An operator can answer a request from a person who has come to them
 * with a reference, and nothing else.
 *
 * Contact details are masked by default. Seeing them in full is a separate,
 * deliberate call — because processing a deletion request needs to confirm a
 * match, not read an address book.
 */
import { normalizeEmail, normalizePhone, pepperedHash } from '../hash';
import type { D1DatabaseLike } from '../store/d1';
import { getConsentForLead } from '../store/repositories/consents';
import { deliveriesForLead } from '../store/repositories/deliveries';
import { addSuppression, recordPrivacyRequest } from '../store/repositories/governance';
import {
  contactRetentionFor, getLeadRequest, loadLeadContactForDelivery, purgeLeadContact,
} from '../store/repositories/leads';

export type LeadDossier = {
  readonly leadId: string;
  readonly status: string;
  readonly vertical: string;
  readonly createdAt: string;
  readonly contactRetainedUntil: string;
  readonly contactPurged: boolean;
  readonly consent: {
    readonly version: string;
    readonly acceptedAt: string;
    readonly disclosedPartners: readonly string[];
    readonly textSha256: string;
  } | null;
  readonly deliveries: ReadonlyArray<{
    readonly providerId: string;
    readonly campaignId: string;
    readonly status: string;
    readonly settledAt?: string;
  }>;
  /** Masked unless the caller explicitly asked to reveal. */
  readonly contact: { readonly phone?: string; readonly email?: string; readonly name?: string };
};

function mask(value: string | undefined, keep: number): string | undefined {
  if (!value) return undefined;
  if (value.length <= keep) return '•'.repeat(value.length);
  return `${'•'.repeat(Math.max(value.length - keep, 0))}${value.slice(-keep)}`;
}

function maskEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [local, domain] = value.split('@');
  if (!domain) return mask(value, 2);
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

/**
 * Everything held about one request, found by its own reference.
 *
 * Answers the four questions a privacy request actually asks: what did you
 * collect, what did I agree to, who did you send it to, and when does it go.
 */
export async function leadDossier(
  database: D1DatabaseLike,
  leadId: string,
  reveal = false,
): Promise<LeadDossier | null> {
  const lead = await getLeadRequest(database, leadId);
  if (!lead) return null;

  const contact = await loadLeadContactForDelivery(database, leadId);
  const consent = await getConsentForLead(database, leadId);
  const deliveries = await deliveriesForLead(database, leadId);
  // The contact row has its own, much shorter clock. Reporting the lead
  // record's retention here would tell someone their phone number is kept
  // years longer than it actually is — in the one answer where being precise
  // is the entire point.
  const contactRetention = await contactRetentionFor(database, leadId);

  return {
    leadId: lead.leadId,
    status: lead.status,
    vertical: lead.vertical,
    createdAt: lead.createdAt,
    contactRetainedUntil: contactRetention ?? lead.purgeAfter,
    contactPurged: contact === null,
    consent: consent
      ? {
          version: consent.consentVersion,
          acceptedAt: consent.acceptedAt,
          disclosedPartners: consent.disclosedPartners,
          textSha256: consent.consentTextSha256,
        }
      : null,
    deliveries: deliveries.map((delivery) => ({
      providerId: delivery.providerId,
      campaignId: delivery.campaignId,
      status: delivery.status,
      settledAt: delivery.settledAt,
    })),
    contact: reveal
      ? { phone: contact?.phone, email: contact?.email, name: [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || undefined }
      : {
          phone: mask(contact?.phone, 4),
          email: maskEmail(contact?.email),
          name: mask(contact?.firstName, 1),
        },
  };
}

/**
 * Find a person's leads from details they supplied themselves.
 *
 * Matched on the peppered hash, never on the stored value, so this cannot be
 * used to browse: an operator has to already know the phone number or email to
 * find anything, which is exactly the position they are in when someone writes
 * in asking about their own data.
 */
export async function findLeadsForSubject(
  database: D1DatabaseLike,
  subject: { phone?: string; email?: string },
  pepper: string,
): Promise<string[]> {
  const phone = subject.phone ? normalizePhone(subject.phone) : null;
  const email = subject.email ? normalizeEmail(subject.email) : null;
  if (!phone && !email) return [];

  const phoneHash = phone ? await pepperedHash(`phone:${phone}`, pepper) : null;
  const emailHash = email ? await pepperedHash(`email:${email}`, pepper) : null;

  const found = new Set<string>();
  // One indexed lookup per identifier the person actually gave, rather than a
  // single query with null guards that no index can use well.
  for (const [column, value] of [['phone_hash', phoneHash], ['email_hash', emailHash]] as const) {
    if (!value) continue;
    const rows = await database.prepare(
      `SELECT lead_id FROM lead_contacts WHERE ${column} = ?`,
    ).bind(value).all<{ lead_id: string }>();
    for (const row of rows.results) found.add(String(row.lead_id));
  }
  return [...found];
}

export type DeletionOutcome = {
  readonly requestId: string;
  readonly leadsErased: number;
  readonly suppressed: boolean;
  /** What CostAnswer genuinely cannot do, stated rather than implied. */
  readonly notice: string;
};

const PARTNER_NOTICE =
  'Contact details held by CostAnswer are erased and future internal use is suppressed. '
  + 'Where a request was already delivered, that partner holds their own copy under their own '
  + 'policy and controls it independently; CostAnswer cannot delete it for them. The partner '
  + 'named on the form at the time is listed against each delivery above.';

/**
 * Process a deletion request.
 *
 * Erases the person and keeps the business record and the consent evidence,
 * which is what the published retention clocks describe. It does not claim to
 * reach into a partner's systems, because it cannot, and the notice says so in
 * the words the privacy page uses.
 */
export async function processDeletionRequest(
  database: D1DatabaseLike,
  subject: { phone?: string; email?: string },
  pepper: string,
  actor: string,
  at: number = Date.now(),
): Promise<DeletionOutcome> {
  const leadIds = await findLeadsForSubject(database, subject, pepper);
  for (const leadId of leadIds) await purgeLeadContact(database, leadId, at);

  const phone = subject.phone ? normalizePhone(subject.phone) : null;
  const email = subject.email ? normalizeEmail(subject.email) : null;
  const hashes = {
    phoneHash: phone ? await pepperedHash(`phone:${phone}`, pepper) : undefined,
    emailHash: email ? await pepperedHash(`email:${email}`, pepper) : undefined,
  };

  let suppressed = false;
  if (hashes.phoneHash || hashes.emailHash) {
    await addSuppression(database, { ...hashes, scope: 'all_internal', reason: `deletion request via ${actor}` }, at);
    suppressed = true;
  }

  const requestId = await recordPrivacyRequest(database, {
    kind: 'deletion',
    // The reference is a hash, so the request log itself holds no contact detail.
    subjectReference: hashes.phoneHash ?? hashes.emailHash ?? 'unknown',
    notes: `${leadIds.length} lead(s) erased by ${actor}`,
  }, at);

  return { requestId, leadsErased: leadIds.length, suppressed, notice: PARTNER_NOTICE };
}
