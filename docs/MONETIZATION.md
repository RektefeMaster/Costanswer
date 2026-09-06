# CostAnswer monetization

Status: implemented, every channel disabled · 2026-09-06

One document rather than eight. The architecture, the three engines, consent and
privacy, the event taxonomy, provider onboarding and the failure runbook are all
short enough that splitting them would produce cross-references instead of
information.

---

## 1. The rule

Commercial economics may read the answer. The answer may never read commercial
economics.

```text
CALCULATION / EDITORIAL            MONETIZATION
lib/calculations/       ──────►    lib/monetization/
lib/data/               context    (reads a frozen context)
                        only
        ▲                                │
        └──────── never ─────────────────┘
```

Enforced three ways, each catching a different mistake:

1. **Direction.** No file under `lib/calculations/` imports anything under
   `lib/monetization/`. `tests/monetization-boundary.spec.ts` reads the source
   tree and fails the build on the first import that does.
2. **Shape of the handoff.** A monetization module never receives a live
   calculation. It receives a `MonetizationContext` — frozen, no functions, no
   getters, no class instances — built by the single door in
   `lib/monetization/boundary.ts`. `toCalculationFacts` rejects any key drawn
   from the commercial vocabulary.
3. **Shape of the return.** `MonetizationDecision` has no `estimate`, `range`,
   `confidence` or `assumption` field, so a commercial module physically cannot
   answer the reader's question. A test asserts the type stays that way.

**What compensation may do:** order two offers the reader has equal reason to
see, inside a module labelled as commercial, and say so when it did.
**What it may never do:** change a formula, an assumption, a data source, a
range, a confidence level or an estimate.

---

## 2. Architecture

```text
lib/monetization/
  boundary.ts        the wall, and the one door through it
  context.ts         MonetizationContext, frozen and inert
  policy.ts          per-page eligibility. Data, not inference.
  flags.ts           env floor + stored kill switches
  money.ts           integer minor units
  hash.ts            peppered HMAC, constant-time compare, webhook verify
  ids.ts             prefixed, time-sortable ids
  events.ts          event taxonomy over the existing analytics allowlist
  consent/           versioned consent text, both locales, hashed as rendered
  leads/             types · schema · campaigns · routing · dedupe ·
                     idempotency · delivery · service · providers/
  affiliate/         types · catalog · relevance · commercial · links · disclosure
  ads/               provider · slots
  calls/             pay-per-call campaigns
  revenue/           the one ledger
  store/             D1 client, migrations, repositories
  http/              request helpers: origin, rate limit, admin auth
  admin/             dashboard metrics
  ui/                localized strings

app/api/monetization/   coverage · lead · affiliate-click · webhooks/[provider]
                        · drain · admin
components/monetization/ NextActionModule · LeadCta · LeadForm · IntentSwitch
                        · AffiliateModule · AffiliateOfferLink · CallCta
                        · Disclosure · AdSlot
```

### The storage decision

The site had no database. Every dataset it ships is an immutable snapshot
compiled into the Worker, and that stays true — a mortgage rate does not need a
database. A consent record does.

`MONETIZATION_DB` is an optional D1 binding. **Its absence is not an error.** A
Worker deployed without it serves every calculator exactly as before; the lead
channel reports itself unavailable and no CTA renders. The failure mode of a
missing database must be "we did not collect this person's phone number", never
"we collected it and dropped it".

Queues are also unprovisioned, so reliable delivery is a D1 outbox
(`lead_deliveries`) drained by `POST /api/monetization/drain` on a schedule.

Provision:

```bash
wrangler d1 create costanswer-monetization
```

```bash
wrangler d1 execute costanswer-monetization --remote --file lib/monetization/store/migrations/0001_monetization.sql
```

Then set `MONETIZATION_D1_DATABASE_ID` and rebuild. `vite.config.ts` binds it
only when that variable is present.

---

## 3. Lead engine

### The order of operations

The order is the design, and it is not the obvious one.

```text
coverage  →  qualify  →  contact  →  consent (partner named)
          →  validate →  suppress? →  duplicate? →  route
          →  consent re-check  →  deliver
```

Consent is recorded **before** routing, because the consent text names the
partner and a partner cannot be named after someone has already agreed. That is
why coverage is a separate first step: it picks the campaign, consent names it,
and routing verifies that what it chose is what the person was told.

The re-check before delivery is not redundant. Routing and delivery are
separated by a durable row and possibly a Worker restart. What must be true at
the moment of sending is that *this* person agreed to *this* partner.

### Routing

`eligible → compliant → available → quality fit → economics`

Payout is read last, in one function, and only among campaigns that already
passed every other gate. A router that sorts by payout first and filters
afterwards will, on the day a high-paying campaign is out of coverage, pick it
anyway through whatever fallback path exists. Sorting last makes that
impossible rather than unlikely.

Expected payout is discounted by the campaign's recent rejection rate and by a
degraded provider: a $90 lead a buyer rejects half the time is worth less than a
$60 one they take.

**One lead, one route.** A fallback is prepared only when the primary campaign's
terms permit one, it belongs to a *different* provider, and the consent named
that partner too. A fallback is attempted only after a hard failure — never
after a rejection. A buyer saying no is a commercial answer; sending the same
person elsewhere because of it is the indiscriminate distribution the policy
forbids.

### One submission stays one lead

Four independent causes, four layers:

| Cause | Layer |
| --- | --- |
| Double click, browser retry | Client key generated once per form, `monetization_idempotency` |
| Our retry after a provider timeout | Derived provider key, unique index on `(provider_id, idempotency_key)` |
| The same person twice in a window | Peppered contact hashes + vertical + window |
| Webhook replay | Unique index on `(provider_id, provider_event_id)` |

`attemptDelivery` throws rather than re-attempting a settled delivery. A timeout
is `retryable_failure`, never a rejection: we do not know the buyer refused it,
only that we did not hear back.

**A defect this caught during implementation:** the contact row carries the
hashes and is written before the duplicate check, so without an explicit
exclusion every lead matched itself and was suppressed as its own duplicate.
`findDuplicateLead` now takes `excludeLeadId`, and there is a regression test.

### What the reader is told

| Delivery | Words |
| --- | --- |
| accepted | Request is in; a professional should be in touch; nobody has quoted; you are not committed |
| timeout / retrying | Request is in and we are still confirming; if anything goes wrong we will not pass your details on |
| no route | We do not have a matching option in your area; your estimate is unaffected |
| failed | We could not send it; nothing was passed on; your estimate is unaffected |

Never "a contractor has accepted", never "verified professional", never a claim
that the CostAnswer estimate is a quote.

---

## 4. Affiliate engine

Two scores, never one.

`relevance.ts` decides **what** the reader needs, from the page's policy and
their stated intent. It imports no merchant, no offer and no payout — a test
asserts its import list. `commercial.ts` decides **which approved merchant**,
among things already known to be relevant. It can reorder and it can return
fewer; there is no path by which a payout introduces a product.

Sorting is relevance first, exact ties broken by an operator-set
`commercialWeight` — not a commission rate, because programme rates change
without notice and a stale number must not become a ranking decision. Where
compensation did change the order, the module says so on the page.

Someone who has said they will hire a professional sees no products at all.

**Amazon.** No stored price. Their agreement governs price display and caching,
so the button reads "Check current price". No scraping, no cloaked redirect, no
invented ratings. The required identification sentence is stored verbatim and a
test asserts it is unchanged in both locales. It renders only when the merchant
is actually linkable.

**Links.** `rel="sponsored nofollow noopener noreferrer"`, real anchor to the
merchant's own URL, click reported by `sendBeacon` that navigation never waits
on.

---

## 5. Advertising

One active network at a time — most ad-management programmes require
exclusivity, and two managers over the same inventory means duplicate auctions
and double layout shift.

Slots reserve their box whether or not they fill, so a network arriving late
cannot push the answer down the page. Nothing is loaded by `AdSlot` itself; the
slot declares itself and a provider script attaches. A page with advertising off
renders the same layout with quiet empty space.

`assertPlacementOrder` fails the build on any layout that puts a slot between an
input and its answer. A `data-ad-status='empty'` slot has no visible chrome.

---

## 6. Consent and privacy

Consent text is versioned data with a hash, not copy in a component. Old
versions stay forever — someone who agreed to v1 agreed to v1, and overwriting
what they read turns a consent record from evidence into a liability. Both
locales are stored separately and linked by version; the Spanish is written, not
translated.

The partner name is substituted into the rendered text and the **rendered** text
is what is hashed, so the stored hash proves which partner was named.

`lead_consents` has no update and no delete path in its repository.

### PII separation

| Table | Holds | Retention |
| --- | --- | --- |
| `lead_requests` | the business record, no contact details | ~4 years (dispute window) |
| `lead_contacts` | the person, plus peppered hashes | 180 days, then erased |
| `lead_consents` | what they agreed to, and when | ~4 years |
| `lead_consents` evidence columns | hashed IP, user agent | own clock, own purge |
| `monetization_events` | aggregate counters | no personal data at all |

Analytics carries internal ids, category, provider and **state** — never a ZIP,
which in a rural county is a household. `parseMonetizationEvent` rejects any
payload with a forbidden field, an unknown field, or a missing required one.

Retention runs inside the drain job. A retention policy that depends on someone
remembering to run it is not a retention policy.

### Suppression

Stored as hashes, so honouring a request does not require keeping the number
that was asked to be forgotten. Scope is internal: CostAnswer stops its own use
and erases the contact row. It does not claim it can delete a record a partner
now controls independently — the privacy page says so plainly rather than
implying a power we do not have.

**CostAnswer does not cold call, text, email or drip-market anyone.** The system
is for user-initiated requests only.

---

## 7. High-risk verticals

Financial, insurance and health lead generation are **disabled by default and
not enabled by this work**. Health calculators are `restricted`: no ads, no
affiliate, no leads, whatever the flags say — BMI and body fat are pages people
arrive at feeling bad about themselves.

The pre-existing `lib/affiliates.ts` offers (LendingTree, Rocket Mortgage, SoFi,
Bankrate) are all mortgage/loan/debt marketplaces, which is financial lead
generation in substance. They are now gated behind
`AFFILIATE_FINANCIAL_ENABLED`, which is off.

---

## 8. Events

Calculator events keep their existing names in `lib/analytics.ts`. Monetization
adds the taxonomy in `lib/monetization/events.ts`:

**Lead** `lead_cta_impression` · `lead_cta_click` · `lead_coverage_check` ·
`lead_coverage_available` · `lead_coverage_unavailable` · `lead_form_start` ·
`lead_form_step_complete` · `lead_form_validation_error` · `lead_consent_view` ·
`lead_consent_accept` · `lead_submit` · `lead_provider_submit` ·
`lead_provider_accept` · `lead_provider_reject` · `lead_provider_timeout` ·
`lead_billable` · `lead_paid` · `lead_reversed`

**Calls** `call_cta_impression` · `call_cta_click` · `call_connected` ·
`call_qualified` · `call_billable`

**Affiliate** `affiliate_module_impression` · `affiliate_offer_impression` ·
`affiliate_offer_click` · `affiliate_conversion_imported` ·
`affiliate_revenue_confirmed` · `affiliate_revenue_reversed`

**Advertising** `ad_slot_eligible` · `ad_slot_rendered` · `ad_revenue_imported`
— never a fabricated impression when the network owns the authoritative count.

**Product** `advanced_opened` · `compare_used` · `reverse_used` ·
`quote_checked` · `source_clicked` · `guide_to_calculator` ·
`language_switched` · `intent_selected`

### Revenue

One ledger, five statuses: `estimated → reported → confirmed → paid`, and
`reversed` from any of them. Only `confirmed + paid − reversed` may be called
revenue. An outbound click is not revenue and an accepted lead is not money in
the bank. Test rows are excluded from every production figure and the dashboard
says whether any exist.

A reversal is a new row, never an edit — a provider statement shows both events
and the ledger has to as well.

Headline metric: **total revenue per 1,000 sessions across all four channels**,
not ad RPM. Ad RPM optimizes for the thing that damages the product fastest.

---

## 9. Provider onboarding

Every integration below is `configuration_required`, which is the accurate
status rather than a placeholder. Each adapter is complete except the request
itself: it declares what it needs, refuses to submit without it, is registered
and routable, and appears in the admin endpoint. **No endpoint, field name,
authentication scheme or response format is invented anywhere in this codebase.**

| Provider | Type | Code | Credentials | Docs | Live |
| --- | --- | --- | --- | --- | --- |
| Mock | lead | YES | n/a | n/a | dev only, blocked in production |
| Angi | lead | YES | NO | PRIVATE — account-gated | NO |
| LeadBank | lead | YES | NO | NEEDED — no public spec | NO |
| Home Services Lead Group | lead / call | YES | NO | PRIVATE — account-gated | NO |
| Generic server post | direct | YES | NO | per-partner | NO — allowlist empty |
| Amazon Associates | affiliate | YES | NO | PUBLIC | NO — approval follows sales |
| Home Depot | affiliate | YES | NO | NEEDED — link format at approval | NO |
| CJ | affiliate | YES | NO | NEEDED — per-advertiser | NO |
| Google AdSense | ads | YES | NO | PUBLIC | NO — needs account + CMP |
| Journey by Mediavine | ads | YES | NO | PUBLIC | NO — traffic requirement |
| Raptive | ads | YES | NO | PUBLIC | NO — traffic requirement |

### What each still needs

**Angi** — the lead-auction endpoint and authentication scheme, request field
names, the accept/reject status vocabulary, the webhook signing method, and the
verticals and geographies on our contract. Publicly advertised at the checked
date: referral links, tracked phone numbers, API lead auctions.

**LeadBank** — the delivery endpoint and authentication, the required field set
per campaign, the response contract, the postback format, and the consent
language their campaigns require.

**Home Services Lead Group** — the post URL and authentication, the field map,
the real-time accept/reject response contract, the pay-per-call number
provisioning workflow, and the postback signing method. Publicly advertised at
the checked date: pay-per-call, pay-per-lead, server-to-server posting.

**Generic server post** — `POST_ENDPOINTS` in `generic-post.ts` is an empty
compiled allowlist and that is deliberate. Configuration selects from it and
cannot extend it: a URL taken from a database row is a server-side request
forgery primitive with a consumer's phone number attached.

### Connecting one

1. Get the partner's own current documentation. Record the date checked.
2. Fill in the adapter's request and response mapping from that documentation.
3. Set the environment variables listed in `.env.example`.
4. Insert a provider row and a campaign row (coverage, caps, required fields,
   `disclosed_partner_name`).
5. Set the flag. No calculator code changes.

---

## 10. Activation

Nothing turns on by deploying. Each channel is a configuration change.

**Stage A — infrastructure live, all providers off.** Deploy. Provision D1, run
the migration, set `MONETIZATION_HASH_PEPPER` and `MONETIZATION_ADMIN_TOKEN`.
Verify the admin endpoint, the drain schedule and the event counters. No
external provider is enabled.

**Stage B — affiliate, narrow.** Once a merchant approves: set its tracking id,
`AFFILIATE_<MERCHANT>_ENABLED=true`, `NEXT_PUBLIC_AFFILIATES_ENABLED=true`, and
`MONETIZATION_ENABLED=true`. Insert offers for one or two home-improvement
calculators. Watch impressions, clicks, link accuracy and disclosure rendering.

**Stage C — one lead provider.** Once a network approves: complete its adapter
from their documentation, set credentials, insert provider and campaign rows,
`LEADS_<PROVIDER>_ENABLED=true`, `LEADS_ENABLED=true`. Start with the cleanest
high-intent vertical in the tightest geography. Watch coverage rate, form
completion, acceptance rate, rejection reasons.

**Stage D — a second provider,** only after fallback and exclusivity rules have
been validated in production. More networks is not more distribution: one lead
still goes to one route.

**Stage E — advertising.** Set `AD_PROVIDER` and its site id, wire the required
consent platform, `NEXT_PUBLIC_ADVERTISING_ENABLED=true`. Measure calculator
completion rate and Core Web Vitals against the pre-advertising baseline. If
completion drops materially, the calculator wins.

---

## 11. Failure runbook

The safe action is almost always: **disable the affected provider, not the site.**

```bash
curl -X POST https://costanswer.com/api/monetization/admin \
  -H "authorization: Bearer $MONETIZATION_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"action":"kill-switch","flag":"leads.enabled","disabled":true,"reason":"provider rejecting everything"}'
```

| Symptom | Action |
| --- | --- |
| A provider rejects everything | Kill that provider's flag. Three consecutive failures already marks it `down` and the router stops selecting it. |
| A provider API is down | Nothing to do immediately — deliveries queue and the drain retries with backoff. Kill the flag if it lasts. |
| Affiliate account suspended | Kill `affiliate.<merchant>.enabled`. Links stop rendering; nothing else changes. |
| An affiliate link is broken | Disable that offer row. |
| Ad script destroys CLS | Kill `ads.enabled`. Slots return to reserved empty space with no layout change. |
| Consent system fails | Kill `leads.enabled`. No consent means no delivery — the code already refuses, so this only stops the form appearing. |
| Webhook signature changes | Events keep arriving and are stored unverified without acting. Fix the adapter, then reprocess. |
| Revenue import duplicates | It cannot: `(provider_id, provider_reference)` is unique. Check for a changed reference format. |
| Duplicate leads spike | Widen `windowHours` or switch the policy to `allow_flagged`. |
| Spam submissions spike | Rate limits and the honeypot run first. If it persists, tighten `RATES_LIMITS.submit`. |

Kill switches only ever turn things **off**. A compromised admin session cannot
start sending consumer data to a network nobody approved.

---

## 12. What is deliberately not built

Per the frozen scope: no public API, no white-label, no chatbot, no contractor
marketplace, dashboard, bidding engine or CRM, no premium subscription, no
mandatory accounts, no outbound marketing of any kind.

The lead provider model carries `providerType: 'lead_network' | 'direct_partner'`
so a future direct contractor relationship needs no calculator change.
`calibration.ts` in the job engine and the `LeadProvider` interface are the two
seams a Real Quote Dataset would plug into later. Neither is built now.
