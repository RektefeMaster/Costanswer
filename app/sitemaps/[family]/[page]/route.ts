import { siteConfig } from '@/lib/site-config';
import {
  escapeXml,
  getSitemapPage,
  SITEMAP_FAMILY_IDS,
  sitemapPagePaths,
  type SitemapFamilyId,
} from '@/lib/seo/sitemaps';

export function generateStaticParams() {
  return sitemapPagePaths();
}

function isSitemapFamily(value: string): value is SitemapFamilyId {
  return SITEMAP_FAMILY_IDS.includes(value as SitemapFamilyId);
}

export async function GET(_request: Request, context: { params: Promise<{ family: string; page: string }> }) {
  const { family, page } = await context.params;
  const match = page.match(/^(\d+)\.xml$/);
  if (!isSitemapFamily(family) || !match) return new Response('Not found', { status: 404 });
  const entries = getSitemapPage(family, Number(match[1]));
  if (!entries) return new Response('Not found', { status: 404 });

  const rows = entries.map((entry) => {
    const location = new URL(entry.path, siteConfig.origin).toString();
    return `<url><loc>${escapeXml(location)}</loc><lastmod>${entry.lastModified}</lastmod><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority></url>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
