import { CATEGORY_IDS, evaluateToolIndexability, isCategoryHubIndexable, tools } from '@/lib/tool-registry';

export const SITEMAP_URL_LIMIT = 50_000;
export const SITEMAP_FAMILY_IDS = ['pages', 'topics', 'tools'] as const;
export type SitemapFamilyId = (typeof SITEMAP_FAMILY_IDS)[number];

export type SitemapEntry = {
  path: `/${string}`;
  lastModified: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
};

const RELEASE_DATE = '2026-09-01T00:00:00.000Z';

export function paginateSitemapEntries<T>(entries: readonly T[], limit = SITEMAP_URL_LIMIT): T[][] {
  if (!Number.isInteger(limit) || limit < 1 || limit > SITEMAP_URL_LIMIT) {
    throw new Error(`Sitemap page size must be between 1 and ${SITEMAP_URL_LIMIT}.`);
  }
  const pages: T[][] = [];
  for (let offset = 0; offset < entries.length; offset += limit) pages.push(entries.slice(offset, offset + limit));
  return pages;
}

export function getSitemapFamilies(): Record<SitemapFamilyId, SitemapEntry[]> {
  return {
    pages: ['/', '/about', '/methodology', '/methodology/data', '/privacy'].map((path) => ({
      path: path as `/${string}`,
      lastModified: RELEASE_DATE,
      changeFrequency: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1 : 0.5,
    })),
    topics: CATEGORY_IDS.filter(isCategoryHubIndexable).map((category) => ({
      path: `/topics/${category}`,
      lastModified: RELEASE_DATE,
      changeFrequency: 'weekly',
      priority: 0.75,
    })),
    tools: tools.filter((tool) => evaluateToolIndexability(tool).indexable).map((tool) => ({
      path: tool.path,
      lastModified: RELEASE_DATE,
      changeFrequency: 'monthly',
      priority: tool.featured ? 0.9 : 0.7,
    })),
  };
}

export function getSitemapPage(family: SitemapFamilyId, oneBasedPage: number): SitemapEntry[] | null {
  const pages = paginateSitemapEntries(getSitemapFamilies()[family]);
  return pages[oneBasedPage - 1] ?? null;
}

export function sitemapPagePaths(): Array<{ family: SitemapFamilyId; page: string }> {
  const families = getSitemapFamilies();
  return SITEMAP_FAMILY_IDS.flatMap((family) =>
    paginateSitemapEntries(families[family]).map((_, index) => ({ family, page: `${index + 1}.xml` })),
  );
}

export function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
