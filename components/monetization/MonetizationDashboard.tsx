'use client';

import { useCallback, useState } from 'react';

/**
 * The operator's view of what the site earns.
 *
 * One rule shapes the layout: estimated, confirmed and paid money are shown
 * apart and never added into a single headline. A dashboard that prints
 * "$20,000" when eight of it is a payout nobody confirmed is the fastest way to
 * make a business decision on a number that does not exist.
 *
 * The token is held in component state for the session and never persisted:
 * writing an admin credential to `localStorage` puts it within reach of any
 * script that ever runs on the origin.
 */
type Totals = Record<'estimated' | 'reported' | 'confirmed' | 'paid' | 'reversed' | 'realized', string>;

type Snapshot = {
  flags: Record<string, boolean>;
  revenue: {
    window: { from: string; to: string };
    totals: Totals;
    revenuePerThousandSessions: number | null;
    sessions: number;
    hasTestData: boolean;
    bySource: Record<string, Totals>;
    byCalculator: Record<string, Totals>;
    byVertical: Record<string, Totals>;
    byProvider: Record<string, Totals>;
  };
  funnels: { lead: FunnelStep[]; affiliate: FunnelStep[] };
  leadProviders: Array<{ providerId: string; displayName: string; status: string; credentialsPresent: boolean; outstandingDependency?: string }>;
  affiliateMerchants: Array<{ merchantId: string; displayName: string; status: string; credentialsPresent: boolean; outstandingDependency?: string }>;
  advertising: { active: string | null; providers: Array<{ networkId: string; displayName: string; status: string; consentRequirement: string }> };
  campaigns: Array<Record<string, unknown>>;
  callCampaigns: Array<Record<string, unknown>>;
  affiliateOffers: Array<Record<string, unknown>>;
  failures: Array<{ deliveryId: string; providerId: string; status: string; attemptCount: number; failureReason?: string }>;
  recentChanges: Array<{ actor: string; entityType: string; entityId: string; field: string; newValue?: string; createdAt: string }>;
};

type FunnelStep = { name: string; count: number; rate: number | null };

export function MonetizationDashboard() {
  const [token, setToken] = useState('');
  const [days, setDays] = useState(30);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/monetization/admin?days=${days}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        // A wrong token returns 404 rather than 401, so the endpoint does not
        // confirm its own existence to someone guessing.
        setError('That token was not accepted.');
        setSnapshot(null);
        return;
      }
      setSnapshot((await response.json()) as Snapshot);
    } catch {
      setError('Could not reach the monetization endpoint.');
    } finally {
      setBusy(false);
    }
  }, [token, days]);

  const kill = useCallback(async (flag: string) => {
    const reason = window.prompt(`Reason for disabling ${flag}?`);
    if (!reason) return;
    await fetch('/api/monetization/admin', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'kill-switch', flag, disabled: true, reason }),
    });
    await load();
  }, [token, load]);

  if (!snapshot) {
    return (
      <section className="admin-gate">
        <h1>Monetization</h1>
        <label htmlFor="admin-token">Admin token</label>
        <input
          id="admin-token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <button type="button" onClick={load} disabled={busy || token.length < 8}>
          {busy ? 'Loading…' : 'Open'}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }

  const { revenue, funnels } = snapshot;

  return (
    <div className="admin-dashboard">
      <header>
        <h1>Monetization</h1>
        <p>
          {revenue.window.from.slice(0, 10)} to {revenue.window.to.slice(0, 10)} ·{' '}
          {revenue.sessions.toLocaleString('en-US')} sessions
        </p>
        <label htmlFor="admin-days">Days</label>
        <input
          id="admin-days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        />
        <button type="button" onClick={load}>Refresh</button>
        {revenue.hasTestData && (
          <p className="admin-warning" role="status">
            Test rows exist in this window. They are excluded from every figure below.
          </p>
        )}
      </header>

      <section aria-labelledby="admin-revenue">
        <h2 id="admin-revenue">Revenue</h2>
        {/* Deliberately five columns, never one. */}
        <dl className="admin-totals">
          <div><dt>Estimated</dt><dd>{revenue.totals.estimated}</dd></div>
          <div><dt>Reported</dt><dd>{revenue.totals.reported}</dd></div>
          <div><dt>Confirmed</dt><dd>{revenue.totals.confirmed}</dd></div>
          <div><dt>Paid</dt><dd>{revenue.totals.paid}</dd></div>
          <div><dt>Reversed</dt><dd>{revenue.totals.reversed}</dd></div>
          <div className="admin-headline">
            <dt>Realized</dt>
            <dd>{revenue.totals.realized}</dd>
          </div>
        </dl>
        <p className="admin-note">
          Only confirmed and paid, less reversals, is money. Estimated is a booking, not a balance.
        </p>
        <p>
          <strong>Revenue per 1,000 sessions:</strong>{' '}
          {revenue.revenuePerThousandSessions === null
            ? 'no sessions in this window'
            : `$${(revenue.revenuePerThousandSessions / 100).toFixed(2)}`}
        </p>
      </section>

      <BreakdownTable title="By channel" rows={revenue.bySource} />
      <BreakdownTable title="By calculator" rows={revenue.byCalculator} />
      <BreakdownTable title="By vertical" rows={revenue.byVertical} />
      <BreakdownTable title="By provider" rows={revenue.byProvider} />

      <Funnel title="Lead funnel" steps={funnels.lead} />
      <Funnel title="Affiliate funnel" steps={funnels.affiliate} />

      <section aria-labelledby="admin-flags">
        <h2 id="admin-flags">Channels</h2>
        <ul className="admin-flags">
          {Object.entries(snapshot.flags).map(([flag, on]) => (
            <li key={flag}>
              <code>{flag}</code>
              <span className={on ? 'admin-on' : 'admin-off'}>{on ? 'on' : 'off'}</span>
              {on && <button type="button" onClick={() => kill(flag)}>Disable</button>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-providers">
        <h2 id="admin-providers">Providers</h2>
        <table>
          <thead>
            <tr><th>Provider</th><th>Status</th><th>Credentials</th><th>Waiting on</th></tr>
          </thead>
          <tbody>
            {[...snapshot.leadProviders, ...snapshot.affiliateMerchants].map((provider) => {
              const id = 'providerId' in provider ? provider.providerId : provider.merchantId;
              return (
                <tr key={id}>
                  <td>{provider.displayName}</td>
                  <td>{provider.status}</td>
                  <td>{provider.credentialsPresent ? 'present' : 'missing'}</td>
                  <td>{provider.outstandingDependency ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="admin-failures">
        <h2 id="admin-failures">Deliveries waiting or failing</h2>
        {snapshot.failures.length === 0
          ? <p>Nothing queued.</p>
          : (
            <table>
              <thead>
                <tr><th>Delivery</th><th>Provider</th><th>Status</th><th>Attempts</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {snapshot.failures.map((failure) => (
                  <tr key={failure.deliveryId}>
                    <td><code>{failure.deliveryId}</code></td>
                    <td>{failure.providerId}</td>
                    <td>{failure.status}</td>
                    <td>{failure.attemptCount}</td>
                    <td>{failure.failureReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>

      <section aria-labelledby="admin-audit">
        <h2 id="admin-audit">Recent configuration changes</h2>
        <ul className="admin-audit">
          {snapshot.recentChanges.map((change, index) => (
            <li key={`${change.createdAt}-${index}`}>
              <time>{change.createdAt.slice(0, 16).replace('T', ' ')}</time>{' '}
              <strong>{change.actor}</strong> set {change.entityType}/{change.entityId}{' '}
              <code>{change.field}</code> to <code>{change.newValue ?? '—'}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Record<string, Totals> }) {
  const entries = Object.entries(rows);
  if (entries.length === 0) return null;
  return (
    <section>
      <h2>{title}</h2>
      <table>
        <thead>
          <tr><th>Key</th><th>Estimated</th><th>Confirmed</th><th>Paid</th><th>Realized</th></tr>
        </thead>
        <tbody>
          {entries.map(([key, totals]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{totals.estimated}</td>
              <td>{totals.confirmed}</td>
              <td>{totals.paid}</td>
              <td><strong>{totals.realized}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Funnel({ title, steps }: { title: string; steps: FunnelStep[] }) {
  return (
    <section>
      <h2>{title}</h2>
      <ol className="admin-funnel">
        {steps.map((step) => (
          <li key={step.name}>
            <code>{step.name}</code>
            <b>{step.count.toLocaleString('en-US')}</b>
            {/* A rate with a zero denominator is unknown, not zero. Printing 0%
                makes an unmeasured step look like a broken one. */}
            <span>{step.rate === null ? '—' : `${(step.rate * 100).toFixed(1)}%`}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
