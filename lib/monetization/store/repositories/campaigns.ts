/** Campaign, provider health and usage reads for the routing engine. */
import { campaignFromRow, campaignToBindings, type LeadCampaign } from '../../leads/campaigns';
import type { CampaignUsage, ProviderHealth } from '../../leads/routing';
import { nowIso, type D1DatabaseLike } from '../d1';

export async function activeCampaignsForVertical(
  database: D1DatabaseLike,
  vertical: string,
): Promise<LeadCampaign[]> {
  const rows = await database.prepare(
    'SELECT * FROM lead_campaigns WHERE vertical = ? AND active = 1 ORDER BY priority DESC',
  ).bind(vertical).all();
  return rows.results.map(campaignFromRow);
}

export async function getCampaign(database: D1DatabaseLike, campaignId: string): Promise<LeadCampaign | null> {
  const row = await database.prepare('SELECT * FROM lead_campaigns WHERE campaign_id = ?').bind(campaignId).first();
  return row ? campaignFromRow(row) : null;
}

export async function allCampaigns(database: D1DatabaseLike): Promise<LeadCampaign[]> {
  const rows = await database.prepare('SELECT * FROM lead_campaigns ORDER BY vertical ASC, priority DESC').all();
  return rows.results.map(campaignFromRow);
}

/**
 * Write a campaign.
 *
 * Section 66 of the brief is the reason this exists: disabling a state,
 * lowering a cap or pausing a campaign must not need a deploy. The validation
 * here is what stops configuration from becoming a way to break routing —
 * a campaign with no disclosed partner name can never be delivered to, because
 * consent could not name it.
 */
export async function upsertCampaign(
  database: D1DatabaseLike,
  campaign: LeadCampaign,
  at: number = Date.now(),
): Promise<void> {
  if (campaign.disclosedPartnerName.trim().length === 0) {
    throw new Error('A campaign needs the partner name the consent text will show. Without one it can never be delivered to.');
  }
  if (campaign.expectedPayoutMinor < 0) throw new Error('Expected payout cannot be negative.');
  if (campaign.qualityFloor < 0 || campaign.qualityFloor > 1) {
    throw new Error('The quality floor is a fraction between 0 and 1.');
  }
  const timestamp = nowIso(at);
  await database.prepare(`
    INSERT INTO lead_campaigns (
      campaign_id, provider_id, vertical, display_name, active, exclusive,
      allows_fallback, priority, payout_model, expected_payout_minor, daily_cap,
      hourly_cap, state_coverage, zip_coverage, excluded_states, required_fields,
      consent_scope, disclosed_partner_name, quality_floor, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(campaign_id) DO UPDATE SET
      provider_id = excluded.provider_id, vertical = excluded.vertical,
      display_name = excluded.display_name, active = excluded.active,
      exclusive = excluded.exclusive, allows_fallback = excluded.allows_fallback,
      priority = excluded.priority, payout_model = excluded.payout_model,
      expected_payout_minor = excluded.expected_payout_minor,
      daily_cap = excluded.daily_cap, hourly_cap = excluded.hourly_cap,
      state_coverage = excluded.state_coverage, zip_coverage = excluded.zip_coverage,
      excluded_states = excluded.excluded_states, required_fields = excluded.required_fields,
      consent_scope = excluded.consent_scope,
      disclosed_partner_name = excluded.disclosed_partner_name,
      quality_floor = excluded.quality_floor, updated_at = excluded.updated_at
  `).bind(...campaignToBindings(campaign, timestamp)).run();
}

export async function setCampaignActive(
  database: D1DatabaseLike,
  campaignId: string,
  active: boolean,
  at: number = Date.now(),
): Promise<void> {
  await database.prepare('UPDATE lead_campaigns SET active = ?, updated_at = ? WHERE campaign_id = ?')
    .bind(active ? 1 : 0, nowIso(at), campaignId).run();
}

export async function upsertProvider(
  database: D1DatabaseLike,
  input: { providerId: string; providerType: string; displayName: string; status: string; supportedVerticals: readonly string[] },
  at: number = Date.now(),
): Promise<void> {
  const timestamp = nowIso(at);
  await database.prepare(`
    INSERT INTO monetization_providers (
      provider_id, provider_type, display_name, status, supported_verticals,
      health_state, consecutive_failures, created_at, updated_at
    ) VALUES (?,?,?,?,?,'unknown',0,?,?)
    ON CONFLICT(provider_id) DO UPDATE SET
      provider_type = excluded.provider_type, display_name = excluded.display_name,
      status = excluded.status, supported_verticals = excluded.supported_verticals,
      updated_at = excluded.updated_at
  `).bind(
    input.providerId, input.providerType, input.displayName, input.status,
    JSON.stringify(input.supportedVerticals), timestamp, timestamp,
  ).run();
}

export async function allProviders(database: D1DatabaseLike): Promise<Array<Record<string, unknown>>> {
  const rows = await database.prepare('SELECT * FROM monetization_providers ORDER BY provider_id ASC').all();
  return rows.results;
}

export async function providerHealthMap(database: D1DatabaseLike): Promise<Map<string, ProviderHealth>> {
  const rows = await database.prepare(
    'SELECT provider_id, health_state, consecutive_failures FROM monetization_providers',
  ).all<{ provider_id: string; health_state: string; consecutive_failures: number }>();
  return new Map(rows.results.map((row) => [row.provider_id, {
    providerId: row.provider_id,
    state: row.health_state as ProviderHealth['state'],
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
  }]));
}

/**
 * Caps and recent acceptance, counted from deliveries rather than a counter.
 *
 * A denormalized counter drifts the first time a delivery is settled twice, and
 * a cap that drifts either overspends a buyer's budget or silently stops
 * sending. Counting is cheap at this volume and cannot drift.
 */
export async function campaignUsageMap(
  database: D1DatabaseLike,
  campaignIds: readonly string[],
  at: number = Date.now(),
): Promise<Map<string, CampaignUsage>> {
  const usage = new Map<string, CampaignUsage>();
  if (campaignIds.length === 0) return usage;

  const dayStart = nowIso(at - 24 * 60 * 60 * 1000);
  const hourStart = nowIso(at - 60 * 60 * 1000);
  const weekStart = nowIso(at - 7 * 24 * 60 * 60 * 1000);

  for (const campaignId of campaignIds) {
    const row = await database.prepare(`
      SELECT
        SUM(CASE WHEN status IN ('accepted','paid') AND created_at >= ? THEN 1 ELSE 0 END) AS accepted_today,
        SUM(CASE WHEN status IN ('accepted','paid') AND created_at >= ? THEN 1 ELSE 0 END) AS accepted_hour,
        SUM(CASE WHEN status = 'rejected' AND created_at >= ? THEN 1 ELSE 0 END) AS rejected_week,
        SUM(CASE WHEN status IN ('accepted','rejected','paid') AND created_at >= ? THEN 1 ELSE 0 END) AS settled_week
      FROM lead_deliveries WHERE campaign_id = ?
    `).bind(dayStart, hourStart, weekStart, weekStart, campaignId).first<{
      accepted_today: number | null;
      accepted_hour: number | null;
      rejected_week: number | null;
      settled_week: number | null;
    }>();

    const settled = Number(row?.settled_week ?? 0);
    usage.set(campaignId, {
      campaignId,
      acceptedToday: Number(row?.accepted_today ?? 0),
      acceptedThisHour: Number(row?.accepted_hour ?? 0),
      recentRejectionRate: settled > 0 ? Number(row?.rejected_week ?? 0) / settled : 0,
    });
  }
  return usage;
}

/**
 * Update a provider's health after an attempt.
 *
 * Three consecutive failures marks a provider `down`, which the router treats as
 * ineligible. That is the circuit breaker: without it, a network having a bad
 * afternoon receives every lead, fails every one, and the reader waits eight
 * seconds each time to be told nothing worked.
 */
export const FAILURES_BEFORE_DOWN = 3;

export async function recordProviderAttempt(
  database: D1DatabaseLike,
  providerId: string,
  succeeded: boolean,
  reason?: string,
  at: number = Date.now(),
): Promise<void> {
  const timestamp = nowIso(at);
  if (succeeded) {
    await database.prepare(`
      UPDATE monetization_providers
         SET health_state = 'healthy', consecutive_failures = 0,
             last_success_at = ?, updated_at = ?
       WHERE provider_id = ?
    `).bind(timestamp, timestamp, providerId).run();
    return;
  }
  await database.prepare(`
    UPDATE monetization_providers
       SET consecutive_failures = consecutive_failures + 1,
           health_state = CASE WHEN consecutive_failures + 1 >= ? THEN 'down' ELSE 'degraded' END,
           last_failure_at = ?, last_failure_reason = ?, updated_at = ?
     WHERE provider_id = ?
  `).bind(FAILURES_BEFORE_DOWN, timestamp, reason ?? null, timestamp, providerId).run();
}
