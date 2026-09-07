import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Operator surfaces, and the whole JSON surface behind the calculators.
      // A crawler reaching `/admin/` is a crawler probing an authenticated
      // endpoint. `/api/` answers the calculators — estimate, quote, location,
      // per diem — and none of it is a search result, so budget spent crawling
      // it is budget not spent on the pages that are the product.
      disallow: ['/admin/', '/api/'],
    }],
    sitemap: new URL('/sitemap.xml', siteConfig.origin).toString(),
  };
}
