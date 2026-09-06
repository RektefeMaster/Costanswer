/**
 * Call campaigns.
 *
 * A tracked number is issued by a network, not generated here, so this is
 * storage and validation rather than provisioning. The validation is the
 * important half: a disconnected or out-of-hours number is the most visible
 * possible failure — the reader calls it, hears nothing, and concludes the site
 * is fake.
 */
import type { CallCampaign } from '../../calls/types';
import type { LeadVerticalId } from '../../policy';
import { fromJson, nowIso, toBoolean, type D1DatabaseLike } from '../d1';

function callCampaignFromRow(row: Record<string, unknown>): CallCampaign {
  return {
    callCampaignId: String(row.call_campaign_id),
    providerId: String(row.provider_id),
    vertical: String(row.vertical) as LeadVerticalId,
    trackedNumberE164: String(row.tracked_number_e164),
    displayNumber: String(row.display_number),
    active: toBoolean(row.active),
    validFrom: String(row.valid_from),
    validUntil: row.valid_until === null || row.valid_until === undefined ? undefined : String(row.valid_until),
    stateCoverage: fromJson<string[]>(row.state_coverage, []),
    timezone: String(row.timezone),
    openHour: Number(row.open_hour),
    closeHour: Number(row.close_hour),
    disclosedPartnerName: String(row.disclosed_partner_name),
  };
}

export async function activeCallCampaigns(
  database: D1DatabaseLike,
  vertical: string,
): Promise<CallCampaign[]> {
  const rows = await database.prepare(
    'SELECT * FROM call_campaigns WHERE vertical = ? AND active = 1',
  ).bind(vertical).all();
  return rows.results.map(callCampaignFromRow);
}

export async function allCallCampaigns(database: D1DatabaseLike): Promise<CallCampaign[]> {
  const rows = await database.prepare('SELECT * FROM call_campaigns ORDER BY vertical ASC').all();
  return rows.results.map(callCampaignFromRow);
}

/**
 * Reject a number that is not in E.164 before it can ever reach a page.
 *
 * Validating on write rather than on render means a mistyped number fails in
 * the admin screen, where somebody can fix it, instead of silently disappearing
 * from a live page.
 */
export async function upsertCallCampaign(
  database: D1DatabaseLike,
  campaign: CallCampaign,
  at: number = Date.now(),
): Promise<void> {
  if (!/^\+1\d{10}$/.test(campaign.trackedNumberE164)) {
    throw new Error('A tracked number must be a US number in E.164 form, for example +18005551234.');
  }
  if (campaign.openHour < 0 || campaign.closeHour > 24 || campaign.openHour >= campaign.closeHour) {
    throw new Error('Call hours must be a real window inside a single day.');
  }
  const timestamp = nowIso(at);
  await database.prepare(`
    INSERT INTO call_campaigns (
      call_campaign_id, provider_id, vertical, tracked_number_e164, display_number,
      active, valid_from, valid_until, state_coverage, timezone, open_hour,
      close_hour, disclosed_partner_name, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(call_campaign_id) DO UPDATE SET
      provider_id = excluded.provider_id, vertical = excluded.vertical,
      tracked_number_e164 = excluded.tracked_number_e164,
      display_number = excluded.display_number, active = excluded.active,
      valid_from = excluded.valid_from, valid_until = excluded.valid_until,
      state_coverage = excluded.state_coverage, timezone = excluded.timezone,
      open_hour = excluded.open_hour, close_hour = excluded.close_hour,
      disclosed_partner_name = excluded.disclosed_partner_name,
      updated_at = excluded.updated_at
  `).bind(
    campaign.callCampaignId, campaign.providerId, campaign.vertical,
    campaign.trackedNumberE164, campaign.displayNumber, campaign.active ? 1 : 0,
    campaign.validFrom, campaign.validUntil ?? null, JSON.stringify(campaign.stateCoverage),
    campaign.timezone, campaign.openHour, campaign.closeHour,
    campaign.disclosedPartnerName, timestamp, timestamp,
  ).run();
}

export async function setCallCampaignActive(
  database: D1DatabaseLike,
  callCampaignId: string,
  active: boolean,
  at: number = Date.now(),
): Promise<void> {
  await database.prepare('UPDATE call_campaigns SET active = ?, updated_at = ? WHERE call_campaign_id = ?')
    .bind(active ? 1 : 0, nowIso(at), callCampaignId).run();
}
