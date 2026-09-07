/**
 * Consent records.
 *
 * There is deliberately no update and no delete in this file. A consent record
 * that can be edited after the fact proves nothing, and a provider dispute six
 * months later is exactly when its immutability has to hold. Corrections are
 * new rows.
 *
 * The evidence columns — hashed IP, user agent — are written only when a
 * campaign's terms require them, carry their own purge date, and are never
 * selected by any reporting query.
 */
import { generateId } from '../../ids';
import { nowIso, plusDays, toJson, type D1DatabaseLike } from '../d1';
import type { Locale } from '@/lib/i18n/locales';

export type ConsentEvidence = {
  readonly ipHash?: string;
  readonly userAgent?: string;
};

export type NewConsentRecord = {
  readonly leadId: string;
  readonly consentVersion: string;
  readonly consentTextId: string;
  readonly consentTextSha256: string;
  readonly locale: Locale;
  readonly pagePath: string;
  readonly calculatorId?: string;
  readonly serviceRequested: string;
  readonly disclosedPartners: readonly string[];
  readonly communicationScope: readonly string[];
  readonly privacyPolicyVersion: string;
  readonly termsVersion: string;
  readonly acceptedAt: string;
  readonly evidence?: ConsentEvidence;
};

export type StoredConsent = NewConsentRecord & { readonly consentId: string };

/** Consent evidence outlives the contact record; a dispute can arrive later. */
export const CONSENT_EVIDENCE_RETENTION_DAYS = 1_460;

export async function recordConsent(
  database: D1DatabaseLike,
  record: NewConsentRecord,
  at: number = Date.now(),
): Promise<StoredConsent> {
  const consentId = generateId('consent', at);
  await database.prepare(`
    INSERT INTO lead_consents (
      consent_id, lead_id, consent_version, consent_text_id, consent_text_sha256,
      locale, page_path, calculator_id, service_requested, disclosed_partners,
      communication_scope, privacy_policy_version, terms_version, accepted_at,
      evidence_ip_hash, evidence_user_agent, evidence_purge_after, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    consentId, record.leadId, record.consentVersion, record.consentTextId, record.consentTextSha256,
    record.locale, record.pagePath, record.calculatorId ?? null, record.serviceRequested,
    toJson(record.disclosedPartners), toJson(record.communicationScope),
    record.privacyPolicyVersion, record.termsVersion, record.acceptedAt,
    record.evidence?.ipHash ?? null, record.evidence?.userAgent ?? null,
    record.evidence ? plusDays(CONSENT_EVIDENCE_RETENTION_DAYS, at) : null,
    nowIso(at),
  ).run();

  return { ...record, consentId };
}

export async function getConsentForLead(
  database: D1DatabaseLike,
  leadId: string,
): Promise<{ consentId: string; consentVersion: string; consentTextSha256: string; acceptedAt: string; disclosedPartners: string[] } | null> {
  const row = await database.prepare(`
    SELECT consent_id, consent_version, consent_text_sha256, accepted_at, disclosed_partners
      FROM lead_consents WHERE lead_id = ? ORDER BY created_at ASC LIMIT 1
  `).bind(leadId).first();
  if (!row) return null;
  return {
    consentId: String(row.consent_id),
    consentVersion: String(row.consent_version),
    consentTextSha256: String(row.consent_text_sha256),
    acceptedAt: String(row.accepted_at),
    disclosedPartners: JSON.parse(String(row.disclosed_partners ?? '[]')) as string[],
  };
}

/**
 * The gate every delivery passes through.
 *
 * A lead with no consent row, or whose consent did not name this partner,
 * cannot be delivered — whatever the routing engine chose and whatever the
 * campaign pays. This is the last line of defence and it is checked at the
 * moment of sending, not at the moment of routing, because the two are separated
 * by a queue.
 */
export async function assertDeliveryConsent(
  database: D1DatabaseLike,
  leadId: string,
  partnerName: string,
): Promise<{ consentId: string; consentVersion: string; consentTextSha256: string; acceptedAt: string; disclosedPartners: string[] }> {
  const consent = await getConsentForLead(database, leadId);
  if (!consent) throw new Error(`Refusing to deliver lead ${leadId}: no consent record.`);
  if (!consent.disclosedPartners.includes(partnerName)) {
    throw new Error(`Refusing to deliver lead ${leadId} to "${partnerName}": that partner was not named in the consent the person read.`);
  }
  return consent;
}

export async function purgeExpiredConsentEvidence(
  database: D1DatabaseLike,
  at: number = Date.now(),
): Promise<number> {
  const result = await database.prepare(`
    UPDATE lead_consents
       SET evidence_ip_hash = NULL, evidence_user_agent = NULL, evidence_purge_after = NULL
     WHERE evidence_purge_after IS NOT NULL AND evidence_purge_after <= ?
  `).bind(nowIso(at)).run();
  return result.meta?.changes ?? 0;
}
