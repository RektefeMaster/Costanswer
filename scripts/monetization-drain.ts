/**
 * Call the drain endpoint.
 *
 * A thin client so the schedule that finishes deliveries and enforces retention
 * is one command in a cron entry rather than a curl invocation somebody has to
 * remember the shape of. It carries no logic: everything it triggers is in the
 * Worker, which is the only place that can reach the database.
 */
export {};

const siteOrigin = process.env.MONETIZATION_DRAIN_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL;
const token = process.env.MONETIZATION_ADMIN_TOKEN;

if (!siteOrigin) {
  console.error('Set MONETIZATION_DRAIN_ORIGIN or NEXT_PUBLIC_SITE_URL.');
  process.exit(1);
}
if (!token) {
  console.error('Set MONETIZATION_ADMIN_TOKEN.');
  process.exit(1);
}

const response = await fetch(new URL('/api/monetization/drain', siteOrigin), {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: '{}',
});

const body = await response.text();
if (!response.ok) {
  console.error(`Drain failed with ${response.status}: ${body}`);
  process.exit(1);
}
// The response names delivery ids and statuses, never a person.
console.log(body);
