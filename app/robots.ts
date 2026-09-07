import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Operator surfaces and the endpoints behind them. A crawler finding
      // these is a crawler probing an authenticated endpoint, and there is
      // nothing here for a search result.
      disallow: ['/admin/', '/api/monetization/'],
    }],
    sitemap: new URL('/sitemap.xml', siteConfig.origin).toString(),
  };
}
