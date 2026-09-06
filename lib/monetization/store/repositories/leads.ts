/**
 * Reading and writing leads.
 *
 * The split that matters runs through every function here: `saveLeadRequest`
 * and `saveLeadContact` are separate calls writing separate tables, and nothing
 * returns them joined unless the caller asked for the contact explicitly. A
 * dashboard query cannot accidentally select a phone number, because the
 * function that would return one is not the function it calls.
 */
import { assertLeadTransition, type DuplicateState, type LeadContact, type LeadRequest, type LeadStatus } from '../../leads/types';
import type { LeadVerticalId } from '../../policy';
import { fromJson, nowIso, toJson, type D1DatabaseLike } from '../d1';
import type { Locale } from '@/lib/i18n/locales';

export type NewLeadRequest = Omit<LeadRequest, 'createdAt' | 'updatedAt' | 'status' | 'duplicateState'> & {
  status?: LeadStatus;
  duplicateState?: DuplicateState;
};

export async function saveLeadRequest(
  database: D1DatabaseLike,
  lead: NewLeadRequest,
  at: number = Date.now(),
): Promise<LeadRequest> {
  const timestamp = nowIso(at);
  const row: LeadRequest = {
    ...lead,
    status: lead.status ?? 'created',
    duplicateState: lead.duplicateState ?? 'none',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await database.prepare(`
    INSERT INTO lead_requests (
      lead_id, status, vertical, page_id, calculator_id, locale, state, zip,
      project_json, qualification_json, consent_id, selected_campaign_id,
      routing_reason, duplicate_state, quality_score, created_at, updated_at, purge_after
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    row.leadId, row.status, row.vertical, row.pageId, row.calculatorId ?? null, row.locale,
    row.state ?? null, row.zip ?? null, toJson(row.project), toJson(row.qualification),
    row.consentId ?? null, row.selectedCampaignId ?? null, row.routingReason ?? null,
    row.duplicateState, row.qualityScore ?? null, row.createdAt, row.updatedAt, row.purgeAfter,
  ).run();

  return row;
}

export async function getLeadRequest(database: D1DatabaseLike, leadId: string): Promise<LeadRequest | null> {
  const row = await database.prepare('SELECT * FROM lead_requests WHERE lead_id = ?').bind(leadId).first();
  return row ? leadFromRow(row) : null;
}

/**
 * Move a lead to a new status.
 *
 * The transition is validated against the state machine before the write, so an
 * impossible sequence fails loudly here rather than producing a row that no
 * report knows how to interpret.
 */
export async function updateLeadStatus(
  database: D1DatabaseLike,
  leadId: string,
  next: LeadStatus,
  patch: Partial<Pick<LeadRequest, 'consentId' | 'selectedCampaignId' | 'routingReason' | 'duplicateState' | 'qualityScore'>> = {},
  at: number = Date.now(),
): Promise<void> {
  const current = await getLeadRequest(database, leadId);
  if (!current) throw new Error(`No lead ${leadId}.`);
  if (current.status !== next) assertLeadTransition(current.status, next);

  await database.prepare(`
    UPDATE lead_requests
       SET status = ?, consent_id = COALESCE(?, consent_id),
           selected_campaign_id = COALESCE(?, selected_campaign_id),
           routing_reason = COALESCE(?, routing_reason),
           duplicate_state = COALESCE(?, duplicate_state),
           quality_score = COALESCE(?, quality_score),
           updated_at = ?
     WHERE lead_id = ?
  `).bind(
    next, patch.consentId ?? null, patch.selectedCampaignId ?? null, patch.routingReason ?? null,
    patch.duplicateState ?? null, patch.qualityScore ?? null, nowIso(at), leadId,
  ).run();
}

export async function saveLeadContact(
  database: D1DatabaseLike,
  contact: LeadContact,
  purgeAfter: string,
  at: number = Date.now(),
): Promise<void> {
  await database.prepare(`
    INSERT INTO lead_contacts (
      lead_id, first_name, last_name, phone, email, address_line1, city,
      phone_hash, email_hash, created_at, purge_after
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    contact.leadId, contact.firstName ?? null, contact.lastName ?? null,
    contact.phone ?? null, contact.email ?? null, contact.addressLine1 ?? null,
    contact.city ?? null, contact.phoneHash ?? null, contact.emailHash ?? null,
    nowIso(at), purgeAfter,
  ).run();
}

/**
 * Load a person's details.
 *
 * Named so that its appearance in a diff is conspicuous. Callers are: the
 * delivery path, and the privacy tooling. Nothing else has a reason.
 */
export async function loadLeadContactForDelivery(
  database: D1DatabaseLike,
  leadId: string,
): Promise<LeadContact | null> {
  const row = await database.prepare(
    'SELECT * FROM lead_contacts WHERE lead_id = ? AND purged_at IS NULL',
  ).bind(leadId).first();
  if (!row) return null;
  return {
    leadId: String(row.lead_id),
    firstName: optionalString(row.first_name),
    lastName: optionalString(row.last_name),
    phone: optionalString(row.phone),
    email: optionalString(row.email),
    addressLine1: optionalString(row.address_line1),
    city: optionalString(row.city),
    phoneHash: optionalString(row.phone_hash),
    emailHash: optionalString(row.email_hash),
  };
}

export async function findDuplicateLead(
  database: D1DatabaseLike,
  input: { phoneHash?: string; emailHash?: string; vertical: string; since: string; excludeLeadId: string },
): Promise<{ leadId: string; createdAt: string } | null> {
  if (!input.phoneHash && !input.emailHash) return null;
  const row = await database.prepare(`
    SELECT r.lead_id AS lead_id, r.created_at AS created_at
      FROM lead_contacts c
      JOIN lead_requests r ON r.lead_id = c.lead_id
     WHERE r.vertical = ?
       AND r.created_at >= ?
       AND r.lead_id != ?
       AND (( ? IS NOT NULL AND c.phone_hash = ? ) OR ( ? IS NOT NULL AND c.email_hash = ? ))
     ORDER BY r.created_at DESC
     LIMIT 1
  `).bind(
    input.vertical, input.since, input.excludeLeadId,
    input.phoneHash ?? null, input.phoneHash ?? null,
    input.emailHash ?? null, input.emailHash ?? null,
  ).first();
  return row ? { leadId: String(row.lead_id), createdAt: String(row.created_at) } : null;
}

/**
 * Erase contact details while keeping the business record.
 *
 * A deletion request removes the person, not the accounting. The lead row and
 * its consent evidence stay on their own retention clocks, which is what lets a
 * provider dispute be answered years later without holding a phone number for
 * years.
 */
export async function purgeLeadContact(
  database: D1DatabaseLike,
  leadId: string,
  at: number = Date.now(),
): Promise<void> {
  await database.prepare(`
    UPDATE lead_contacts
       SET first_name = NULL, last_name = NULL, phone = NULL, email = NULL,
           address_line1 = NULL, city = NULL, purged_at = ?
     WHERE lead_id = ?
  `).bind(nowIso(at), leadId).run();
}

export async function purgeExpiredContacts(database: D1DatabaseLike, at: number = Date.now()): Promise<number> {
  const due = await database.prepare(
    'SELECT lead_id FROM lead_contacts WHERE purged_at IS NULL AND purge_after <= ?',
  ).bind(nowIso(at)).all<{ lead_id: string }>();
  for (const row of due.results) await purgeLeadContact(database, row.lead_id, at);
  return due.results.length;
}

function leadFromRow(row: Record<string, unknown>): LeadRequest {
  return {
    leadId: String(row.lead_id),
    status: String(row.status) as LeadStatus,
    vertical: String(row.vertical) as LeadVerticalId,
    pageId: String(row.page_id),
    calculatorId: optionalString(row.calculator_id),
    locale: String(row.locale) as Locale,
    state: optionalString(row.state),
    zip: optionalString(row.zip),
    project: fromJson(row.project_json, {}),
    qualification: fromJson(row.qualification_json, {}),
    consentId: optionalString(row.consent_id),
    selectedCampaignId: optionalString(row.selected_campaign_id),
    routingReason: optionalString(row.routing_reason),
    duplicateState: String(row.duplicate_state) as DuplicateState,
    qualityScore: row.quality_score === null || row.quality_score === undefined ? undefined : Number(row.quality_score),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    purgeAfter: String(row.purge_after),
  };
}

function optionalString(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}
