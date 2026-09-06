-- CostAnswer monetization schema, migration 0001.
--
-- Two design rules run through the whole file.
--
-- 1. Contact details live in exactly one table (lead_contacts) and nothing
--    joins to it except the code paths that must. Every other table -- routing,
--    delivery, events, revenue, analytics -- carries lead_id only. That is what
--    makes "no PII in analytics" a property of the schema instead of a habit.
--
-- 2. Money is INTEGER minor units. A REAL column holding 0.07 is a
--    reconciliation that never balances.

CREATE TABLE IF NOT EXISTS monetization_providers (
  provider_id        TEXT PRIMARY KEY,
  provider_type      TEXT NOT NULL CHECK (provider_type IN ('lead_network','direct_partner','affiliate_network','ad_network','call_network')),
  display_name       TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('configuration_required','configured','enabled','disabled','compliance_hold')),
  supported_verticals TEXT NOT NULL DEFAULT '[]',
  health_state       TEXT NOT NULL DEFAULT 'unknown' CHECK (health_state IN ('unknown','healthy','degraded','down')),
  last_success_at    TEXT,
  last_failure_at    TEXT,
  last_failure_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_campaigns (
  campaign_id        TEXT PRIMARY KEY,
  provider_id        TEXT NOT NULL REFERENCES monetization_providers(provider_id),
  vertical           TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  active             INTEGER NOT NULL DEFAULT 0,
  exclusive          INTEGER NOT NULL DEFAULT 1,
  allows_fallback    INTEGER NOT NULL DEFAULT 0,
  priority           INTEGER NOT NULL DEFAULT 100,
  payout_model       TEXT NOT NULL CHECK (payout_model IN ('per_lead','per_call','revenue_share','unknown')),
  expected_payout_minor INTEGER NOT NULL DEFAULT 0,
  daily_cap          INTEGER,
  hourly_cap         INTEGER,
  -- JSON arrays. SQLite has no array type and D1 has no extensions, so coverage
  -- is stored as JSON and matched in the routing layer, which already has to
  -- hold the campaign in memory to score it.
  state_coverage     TEXT NOT NULL DEFAULT '[]',
  zip_coverage       TEXT NOT NULL DEFAULT '[]',
  excluded_states    TEXT NOT NULL DEFAULT '[]',
  required_fields    TEXT NOT NULL DEFAULT '[]',
  consent_scope      TEXT NOT NULL DEFAULT '[]',
  disclosed_partner_name TEXT NOT NULL,
  quality_floor      REAL NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_vertical_active ON lead_campaigns (vertical, active);

-- The business record. No contact details here, deliberately.
CREATE TABLE IF NOT EXISTS lead_requests (
  lead_id            TEXT PRIMARY KEY,
  status             TEXT NOT NULL CHECK (status IN ('created','validated','consented','routing','submitted','accepted','rejected','failed','expired','suppressed')),
  vertical           TEXT NOT NULL,
  page_id            TEXT NOT NULL,
  calculator_id      TEXT,
  locale             TEXT NOT NULL,
  state              TEXT,
  zip                TEXT,
  project_json       TEXT NOT NULL DEFAULT '{}',
  qualification_json TEXT NOT NULL DEFAULT '{}',
  consent_id         TEXT,
  selected_campaign_id TEXT REFERENCES lead_campaigns(campaign_id),
  routing_reason     TEXT,
  duplicate_state    TEXT NOT NULL DEFAULT 'none' CHECK (duplicate_state IN ('none','detected','suppressed','allowed')),
  quality_score      REAL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  purge_after        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_requests_created ON lead_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON lead_requests (status);
CREATE INDEX IF NOT EXISTS idx_lead_requests_vertical ON lead_requests (vertical, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_requests_purge ON lead_requests (purge_after);

-- Contact details. Separate table, separate retention, separate access path.
-- The hash columns are peppered HMACs (see lib/monetization/hash.ts): they are
-- indexed for duplicate detection, and a leak of this index is not a leak of a
-- contact list.
CREATE TABLE IF NOT EXISTS lead_contacts (
  lead_id            TEXT PRIMARY KEY REFERENCES lead_requests(lead_id) ON DELETE CASCADE,
  first_name         TEXT,
  last_name          TEXT,
  phone              TEXT,
  email              TEXT,
  address_line1      TEXT,
  city               TEXT,
  phone_hash         TEXT,
  email_hash         TEXT,
  created_at         TEXT NOT NULL,
  purge_after        TEXT NOT NULL,
  purged_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_phone_hash ON lead_contacts (phone_hash);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_email_hash ON lead_contacts (email_hash);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_purge ON lead_contacts (purge_after);

-- Consent evidence. Append-only by policy: there is no UPDATE path in the
-- repository, because a consent record that can be edited after the fact is not
-- evidence of anything.
CREATE TABLE IF NOT EXISTS lead_consents (
  consent_id         TEXT PRIMARY KEY,
  lead_id            TEXT NOT NULL REFERENCES lead_requests(lead_id) ON DELETE CASCADE,
  consent_version    TEXT NOT NULL,
  consent_text_id    TEXT NOT NULL,
  consent_text_sha256 TEXT NOT NULL,
  locale             TEXT NOT NULL,
  page_path          TEXT NOT NULL,
  calculator_id      TEXT,
  service_requested  TEXT NOT NULL,
  disclosed_partners TEXT NOT NULL DEFAULT '[]',
  communication_scope TEXT NOT NULL DEFAULT '[]',
  privacy_policy_version TEXT NOT NULL,
  terms_version      TEXT NOT NULL,
  accepted_at        TEXT NOT NULL,
  -- Evidence fields, isolated. Written only when a campaign's terms require
  -- them, and purged on the consent-evidence retention clock, not the lead one.
  evidence_ip_hash   TEXT,
  evidence_user_agent TEXT,
  evidence_purge_after TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_consents_lead ON lead_consents (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_consents_version ON lead_consents (consent_version);

-- One row per attempt against one provider. The outbox: the drain job reads
-- next_attempt_at, so delivery survives a Worker eviction mid-flight.
CREATE TABLE IF NOT EXISTS lead_deliveries (
  delivery_id        TEXT PRIMARY KEY,
  lead_id            TEXT NOT NULL REFERENCES lead_requests(lead_id) ON DELETE CASCADE,
  campaign_id        TEXT NOT NULL,
  provider_id        TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('pending','processing','accepted','rejected','retryable_failure','permanent_failure','expired','paid','reversed')),
  attempt_count      INTEGER NOT NULL DEFAULT 0,
  max_attempts       INTEGER NOT NULL DEFAULT 5,
  idempotency_key    TEXT NOT NULL,
  provider_lead_id   TEXT,
  provider_status_raw TEXT,
  failure_reason     TEXT,
  latency_ms         INTEGER,
  next_attempt_at    TEXT,
  first_attempt_at   TEXT,
  last_attempt_at    TEXT,
  settled_at         TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_deliveries_idempotency ON lead_deliveries (provider_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_lead_deliveries_drain ON lead_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_lead_deliveries_lead ON lead_deliveries (lead_id);

-- Provider callbacks. The unique index on (provider_id, provider_event_id) is
-- what makes a replayed webhook a no-op instead of a second payment.
CREATE TABLE IF NOT EXISTS lead_provider_events (
  event_id           TEXT PRIMARY KEY,
  provider_id        TEXT NOT NULL,
  provider_event_id  TEXT NOT NULL,
  delivery_id        TEXT REFERENCES lead_deliveries(delivery_id) ON DELETE SET NULL,
  lead_id            TEXT REFERENCES lead_requests(lead_id) ON DELETE SET NULL,
  normalized_event   TEXT NOT NULL CHECK (normalized_event IN ('lead_received','lead_accepted','lead_rejected','lead_billable','lead_unbillable','lead_sold','lead_paid','lead_reversed','call_connected','call_qualified','unknown')),
  raw_status         TEXT,
  amount_minor       INTEGER,
  currency           TEXT,
  signature_verified INTEGER NOT NULL DEFAULT 0,
  received_at        TEXT NOT NULL,
  payload_digest     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_events_dedupe ON lead_provider_events (provider_id, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_provider_events_lead ON lead_provider_events (lead_id);

-- Idempotency for the public submit endpoint. A user's double click and a
-- browser retry carry the same key and must produce the same lead.
CREATE TABLE IF NOT EXISTS monetization_idempotency (
  idempotency_key    TEXT PRIMARY KEY,
  scope              TEXT NOT NULL,
  result_id          TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  expires_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON monetization_idempotency (expires_at);

CREATE TABLE IF NOT EXISTS affiliate_merchants (
  merchant_id        TEXT PRIMARY KEY,
  network            TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('configuration_required','configured','approved','enabled','disabled','compliance_hold')),
  disclosure_id      TEXT NOT NULL,
  last_verified_at   TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_offers (
  offer_id           TEXT PRIMARY KEY,
  merchant_id        TEXT NOT NULL REFERENCES affiliate_merchants(merchant_id),
  category           TEXT NOT NULL,
  locale             TEXT NOT NULL,
  headline           TEXT NOT NULL,
  body               TEXT NOT NULL,
  cta                TEXT NOT NULL,
  destination_url    TEXT NOT NULL,
  enabled            INTEGER NOT NULL DEFAULT 0,
  commercial_weight  INTEGER NOT NULL DEFAULT 0,
  last_verified_at   TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_category ON affiliate_offers (category, locale, enabled);

-- Clicks carry no PII and no session identifier that outlives the day bucket.
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  click_id           TEXT PRIMARY KEY,
  offer_id           TEXT NOT NULL,
  merchant_id        TEXT NOT NULL,
  category           TEXT NOT NULL,
  page_id            TEXT NOT NULL,
  calculator_id      TEXT,
  locale             TEXT NOT NULL,
  vertical           TEXT NOT NULL,
  placement          TEXT NOT NULL,
  day_bucket         TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_day ON affiliate_clicks (day_bucket, merchant_id);

CREATE TABLE IF NOT EXISTS revenue_ledger (
  entry_id           TEXT PRIMARY KEY,
  source_type        TEXT NOT NULL CHECK (source_type IN ('ad','affiliate','lead','call')),
  provider_id        TEXT NOT NULL,
  campaign_id        TEXT,
  page_id            TEXT,
  calculator_id      TEXT,
  vertical           TEXT,
  locale             TEXT,
  event_id           TEXT,
  provider_reference TEXT,
  amount_minor       INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'USD',
  status             TEXT NOT NULL CHECK (status IN ('estimated','reported','confirmed','paid','reversed')),
  is_test            INTEGER NOT NULL DEFAULT 0,
  occurred_at        TEXT NOT NULL,
  reported_at        TEXT,
  confirmed_at       TEXT,
  paid_at            TEXT,
  reversed_at        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revenue_occurred ON revenue_ledger (occurred_at);
CREATE INDEX IF NOT EXISTS idx_revenue_status ON revenue_ledger (status, source_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_provider_reference ON revenue_ledger (provider_id, provider_reference) WHERE provider_reference IS NOT NULL;

-- Aggregate counters, not a per-visit log. Monetization analytics needs
-- denominators (sessions, impressions) and there is no reason to keep a row per
-- person to get them.
CREATE TABLE IF NOT EXISTS monetization_events (
  day_bucket         TEXT NOT NULL,
  event_name         TEXT NOT NULL,
  page_id            TEXT NOT NULL DEFAULT '',
  calculator_id      TEXT NOT NULL DEFAULT '',
  vertical           TEXT NOT NULL DEFAULT '',
  locale             TEXT NOT NULL DEFAULT '',
  provider_id        TEXT NOT NULL DEFAULT '',
  placement          TEXT NOT NULL DEFAULT '',
  count              INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day_bucket, event_name, page_id, calculator_id, vertical, locale, provider_id, placement)
);
CREATE INDEX IF NOT EXISTS idx_monetization_events_day ON monetization_events (day_bucket, event_name);

CREATE TABLE IF NOT EXISTS monetization_flag_overrides (
  flag               TEXT PRIMARY KEY,
  disabled           INTEGER NOT NULL DEFAULT 1,
  reason             TEXT,
  set_by             TEXT NOT NULL,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppression_records (
  suppression_id     TEXT PRIMARY KEY,
  phone_hash         TEXT,
  email_hash         TEXT,
  scope              TEXT NOT NULL CHECK (scope IN ('internal_marketing','all_internal')),
  reason             TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suppression_phone ON suppression_records (phone_hash);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression_records (email_hash);

CREATE TABLE IF NOT EXISTS privacy_requests (
  request_id         TEXT PRIMARY KEY,
  kind               TEXT NOT NULL CHECK (kind IN ('access','deletion','opt_out','suppression')),
  subject_reference  TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('received','in_progress','completed','rejected')),
  notes              TEXT,
  created_at         TEXT NOT NULL,
  completed_at       TEXT
);

CREATE TABLE IF NOT EXISTS monetization_config_audit (
  audit_id           TEXT PRIMARY KEY,
  actor              TEXT NOT NULL,
  entity_type        TEXT NOT NULL,
  entity_id          TEXT NOT NULL,
  field              TEXT NOT NULL,
  old_value          TEXT,
  new_value          TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_config_audit_created ON monetization_config_audit (created_at);
