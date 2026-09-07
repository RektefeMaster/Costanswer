import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monetization',
  // Never indexed and never followed: this page is an operator tool, and a
  // crawler finding it is a crawler probing an authenticated endpoint.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The monetization dashboard.
 *
 * Rendered entirely in the browser against the authenticated JSON endpoint,
 * which is what keeps the admin token out of the server-rendered HTML and out
 * of the build. The page itself carries no data: without a token it shows a
 * prompt and nothing else, so it is safe for it to exist at a known address.
 */
import { MonetizationDashboard } from '@/components/monetization/MonetizationDashboard';

export default function MonetizationAdminPage() {
  return (
    <main id="main-content" className="admin-shell" tabIndex={-1}>
      <MonetizationDashboard />
    </main>
  );
}
