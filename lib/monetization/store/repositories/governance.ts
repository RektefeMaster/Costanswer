/**
 * Suppression, privacy requests, flag overrides and the configuration audit.
 *
 * Grouped because they share one property: they are the records that let a
 * person or an operator say "stop", and each of them has to work when
 * everything else is broken.
 */
import { generateId } from '../../ids';
import type { FlagOverrides, MonetizationFlag } from '../../flags';
import { isMonetizationFlag } from '../../flags';
import { nowIso, type D1DatabaseLike } from '../d1';

export type SuppressionScope = 'internal_marketing' | 'all_internal';

/**
 * Record that a person does not want CostAnswer contacting them.
 *
 * Stored as hashes so honouring the request does not require keeping the phone
 * number that was asked to be forgotten — which would be the same mistake every
 * suppression list makes.
 *
 * The scope is `internal` in both cases on purpose. CostAnswer can stop its own
 * use of someone's details; it cannot reach into a network's CRM and delete a
 * record that network now controls independently. The privacy page says exactly
 * that rather than implying a power we do not have.
 */
export async function addSuppression(
  database: D1DatabaseLike,
  input: { phoneHash?: string; emailHash?: string; scope: SuppressionScope; reason: string },
  at: number = Date.now(),
): Promise<string> {
  if (!input.phoneHash && !input.emailHash) {
    throw new Error('A suppression record needs at least one hashed identifier.');
  }
  const suppressionId = generateId('suppression', at);
  await database.prepare(`
    INSERT INTO suppression_records (suppression_id, phone_hash, email_hash, scope, reason, created_at)
    VALUES (?,?,?,?,?,?)
  `).bind(suppressionId, input.phoneHash ?? null, input.emailHash ?? null, input.scope, input.reason, nowIso(at)).run();
  return suppressionId;
}

export async function isSuppressed(
  database: D1DatabaseLike,
  hashes: { phoneHash?: string; emailHash?: string },
): Promise<boolean> {
  if (!hashes.phoneHash && !hashes.emailHash) return false;
  const row = await database.prepare(`
    SELECT 1 AS hit FROM suppression_records
     WHERE (? IS NOT NULL AND phone_hash = ?) OR (? IS NOT NULL AND email_hash = ?)
     LIMIT 1
  `).bind(
    hashes.phoneHash ?? null, hashes.phoneHash ?? null,
    hashes.emailHash ?? null, hashes.emailHash ?? null,
  ).first();
  return row !== null;
}

export async function recordPrivacyRequest(
  database: D1DatabaseLike,
  input: { kind: 'access' | 'deletion' | 'opt_out' | 'suppression'; subjectReference: string; notes?: string },
  at: number = Date.now(),
): Promise<string> {
  const requestId = generateId('audit', at);
  await database.prepare(`
    INSERT INTO privacy_requests (request_id, kind, subject_reference, status, notes, created_at)
    VALUES (?,?,?,'received',?,?)
  `).bind(requestId, input.kind, input.subjectReference, input.notes ?? null, nowIso(at)).run();
  return requestId;
}

/**
 * Stored flag overrides.
 *
 * Only ever `false`. The schema stores a `disabled` boolean and this function
 * refuses to produce anything else, which is what guarantees the admin screen
 * cannot switch on a channel the environment has not approved.
 */
export async function loadFlagOverrides(database: D1DatabaseLike): Promise<FlagOverrides> {
  const rows = await database.prepare('SELECT flag FROM monetization_flag_overrides WHERE disabled = 1')
    .all<{ flag: string }>();
  const overrides: FlagOverrides = {};
  for (const row of rows.results) {
    if (isMonetizationFlag(row.flag)) overrides[row.flag] = false;
  }
  return overrides;
}

export async function setKillSwitch(
  database: D1DatabaseLike,
  flag: MonetizationFlag,
  disabled: boolean,
  actor: string,
  reason: string,
  at: number = Date.now(),
): Promise<void> {
  const timestamp = nowIso(at);
  if (disabled) {
    await database.prepare(`
      INSERT INTO monetization_flag_overrides (flag, disabled, reason, set_by, created_at)
      VALUES (?,1,?,?,?)
      ON CONFLICT(flag) DO UPDATE SET disabled = 1, reason = excluded.reason, set_by = excluded.set_by
    `).bind(flag, reason, actor, timestamp).run();
  } else {
    await database.prepare('DELETE FROM monetization_flag_overrides WHERE flag = ?').bind(flag).run();
  }
  await recordConfigChange(database, {
    actor, entityType: 'flag', entityId: flag, field: 'disabled',
    oldValue: disabled ? 'false' : 'true', newValue: disabled ? 'true' : 'false',
  }, at);
}

/**
 * The configuration audit trail.
 *
 * Secrets are never a value here. The field name is recorded; the value is not,
 * for anything whose name marks it as a credential.
 */
const SECRET_FIELD = /secret|token|key|password|credential/i;

export async function recordConfigChange(
  database: D1DatabaseLike,
  input: { actor: string; entityType: string; entityId: string; field: string; oldValue?: string; newValue?: string },
  at: number = Date.now(),
): Promise<void> {
  const redact = SECRET_FIELD.test(input.field);
  await database.prepare(`
    INSERT INTO monetization_config_audit (audit_id, actor, entity_type, entity_id, field, old_value, new_value, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).bind(
    generateId('audit', at), input.actor, input.entityType, input.entityId, input.field,
    redact ? '[redacted]' : input.oldValue ?? null,
    redact ? '[redacted]' : input.newValue ?? null,
    nowIso(at),
  ).run();
}

export async function recentConfigChanges(
  database: D1DatabaseLike,
  limit = 100,
): Promise<Array<{ actor: string; entityType: string; entityId: string; field: string; oldValue?: string; newValue?: string; createdAt: string }>> {
  const rows = await database.prepare(
    'SELECT * FROM monetization_config_audit ORDER BY created_at DESC LIMIT ?',
  ).bind(limit).all();
  return rows.results.map((row) => ({
    actor: String(row.actor),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    field: String(row.field),
    oldValue: row.old_value === null ? undefined : String(row.old_value),
    newValue: row.new_value === null ? undefined : String(row.new_value),
    createdAt: String(row.created_at),
  }));
}
