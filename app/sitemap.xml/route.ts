import { siteConfig } from '@/lib/site-config';
import { escapeXml, sitemapPageLastModified, sitemapPagePaths } from '@/lib/seo/sitemaps';

export function GET() {
  const rows = sitemapPagePaths().map(({ family, page }) => {
    const location = new URL(`/sitemaps/${family}/${page}`, siteConfig.origin).toString();
    const lastModified = sitemapPageLastModified(family, Number.parseInt(page, 10));
    if (!lastModified) throw new Error(`Missing sitemap page metadata for ${family}/${page}.`);
    return `<sitemap><loc>${escapeXml(location)}</loc><lastmod>${lastModified}</lastmod></sitemap>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</sitemapindex>`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
