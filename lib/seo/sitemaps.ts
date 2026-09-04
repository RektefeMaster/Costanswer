import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot } from '@/lib/data/gasoline-snapshot';
import { grocerySnapshot } from '@/lib/data/grocery-snapshot';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { cpiSnapshot } from '@/lib/data/cpi-snapshot';
import { taxSnapshot } from '@/lib/data/tax/snapshot';
import { PUBLISHING_SNAPSHOT_INSTANT } from '@/lib/publishing';
import { CATEGORY_IDS, evaluateToolIndexability, getToolsByCategory, isCategoryHubIndexable, tools } from '@/lib/tool-registry';

export const SITEMAP_URL_LIMIT = 50_000;
export const SITEMAP_FAMILY_IDS = ['pages', 'topics', 'tools'] as const;
export type SitemapFamilyId = (typeof SITEMAP_FAMILY_IDS)[number];

export type SitemapEntry = {
  path: `/${string}`;
  lastModified: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
};

const CONTENT_RELEASE_DATE = PUBLISHING_SNAPSHOT_INSTANT;

function toolLastModified(tool: (typeof tools)[number]): string {
  const reviewDate = `${tool.indexability.reviewedAt}T00:00:00.000Z`;
  const candidates = [CONTENT_RELEASE_DATE, reviewDate];
  if (tool.id === 'electricity-cost' || tool.id === 'appliance-electricity' || tool.id === 'ev-vs-gas' || tool.id === 'where-cheaper') candidates.push(electricitySnapshot.publishedAt);
  if (tool.id === 'where-cheaper' || tool.id === 'road-trip-fuel') candidates.push(gasolineSnapshot.publishedAt);
  if (tool.id === 'where-cheaper') candidates.push(grocerySnapshot.publishedAt);
  if (tool.id === 'mortgage-payment' || tool.id === 'home-affordability') candidates.push(mortgageRateSnapshot.publishedAt);
  if (tool.id === 'inflation') candidates.push(cpiSnapshot.publishedAt);
  if (tool.id === 'salary-after-tax' || tool.id === 'paycheck' || tool.id === 'cost-of-living') candidates.push(taxSnapshot.publishedAt);
  for (const candidate of candidates) {
    if (!Number.isFinite(Date.parse(candidate))) throw new Error(`Invalid sitemap timestamp: ${candidate}`);
  }
  return candidates.reduce((latest, candidate) => candidate > latest ? candidate : latest);
}

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
    pages: ['/', '/about', '/methodology', '/methodology/data', '/privacy', '/terms', '/contact', '/faq'].map((path) => ({
      path: path as `/${string}`,
      lastModified: CONTENT_RELEASE_DATE,
      changeFrequency: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1 : 0.5,
    })),
    topics: CATEGORY_IDS.filter(isCategoryHubIndexable).map((category) => ({
      path: `/topics/${category}`,
      lastModified: getToolsByCategory(category)
        .map(toolLastModified)
        .reduce((latest, modified) => modified > latest ? modified : latest, CONTENT_RELEASE_DATE),
      changeFrequency: 'weekly',
      priority: 0.75,
    })),
    tools: tools.filter((tool) => evaluateToolIndexability(tool).indexable).map((tool) => ({
      path: tool.path,
      lastModified: toolLastModified(tool),
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

export function sitemapPageLastModified(family: SitemapFamilyId, oneBasedPage: number): string | null {
  const entries = getSitemapPage(family, oneBasedPage);
  if (!entries?.length) return null;
  return entries.reduce((latest, entry) => entry.lastModified > latest ? entry.lastModified : latest, entries[0].lastModified);
}

export function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
