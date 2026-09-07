-- Migration 0002: attribution, call campaigns, and affiliate conversion imports.
--
-- Attribution is stored on the record it explains rather than in a visitor
-- table. There is no row per person anywhere in this schema and this does not
-- add one: a lead knows where it came from, a click knows where it came from,
-- and nothing knows what else that browser did.

ALTER TABLE lead_requests ADD COLUMN attribution_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE affiliate_clicks ADD COLUMN attribution_json TEXT NOT NULL DEFAULT '{}';

-- Tracked numbers issued by a call network. Never generated locally, and never
-- shown outside the window its buyer actually answers.
CREATE TABLE IF NOT EXISTS call_campaigns (
  call_campaign_id   TEXT PRIMARY KEY,
  provider_id        TEXT NOT NULL REFERENCES monetization_providers(provider_id),
  vertical           TEXT NOT NULL,
  tracked_number_e164 TEXT NOT NULL,
  display_number     TEXT NOT NULL,
  active             INTEGER NOT NULL DEFAULT 0,
  valid_from         TEXT NOT NULL,
  valid_until        TEXT,
  state_coverage     TEXT NOT NULL DEFAULT '[]',
  timezone           TEXT NOT NULL DEFAULT 'America/New_York',
  open_hour          INTEGER NOT NULL DEFAULT 8,
  close_hour         INTEGER NOT NULL DEFAULT 18,
  disclosed_partner_name TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_call_campaigns_vertical ON call_campaigns (vertical, active);

-- One imported line from a network's own report.
--
-- Affiliate networks mostly do not expose conversions in real time, so revenue
-- arrives as a statement days or weeks later. The batch id and the line
-- reference together are what make importing the same file twice a no-op.
CREATE TABLE IF NOT EXISTS affiliate_conversion_imports (
  import_id          TEXT PRIMARY KEY,
  batch_id           TEXT NOT NULL,
  merchant_id        TEXT NOT NULL,
  line_reference     TEXT NOT NULL,
  occurred_on        TEXT NOT NULL,
  amount_minor       INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'USD',
  status             TEXT NOT NULL CHECK (status IN ('reported','confirmed','paid','reversed')),
  revenue_entry_id   TEXT,
  imported_by        TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_line ON affiliate_conversion_imports (merchant_id, line_reference);
CREATE INDEX IF NOT EXISTS idx_conversion_batch ON affiliate_conversion_imports (batch_id);
