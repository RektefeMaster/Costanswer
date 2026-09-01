const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export {};

const htmlPaths = [
  '/',
  '/money/hourly-to-salary',
  '/home/electricity-cost',
  '/home/concrete-calculator',
  '/auto/ev-vs-gas',
  '/everyday/business-days',
  '/shopping/unit-price',
  '/food/recipe-scaler',
  '/topics/money',
  '/topics/home',
  '/topics/auto',
  '/topics/everyday',
  '/topics/food',
  '/topics/shopping',
  '/search?q=concrete',
  '/methodology',
  '/methodology/data',
  '/about',
  '/privacy',
];

async function fetchWithTimeout(path: string): Promise<Response> {
  const signal = AbortSignal.timeout(10_000);
  return fetch(new URL(path, baseUrl), { signal });
}

for (const path of htmlPaths) {
  const response = await fetchWithTimeout(path);
  if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
  const html = await response.text();
  if (!html.includes('<title>')) throw new Error(`${path} has no document title`);
  if (!html.includes('rel="canonical"')) throw new Error(`${path} has no canonical link`);
  if (path !== '/search?q=concrete' && !html.includes('application/ld+json') && path !== '/about' && path !== '/privacy' && path !== '/methodology' && path !== '/methodology/data') {
    throw new Error(`${path} has no structured data`);
  }
}

for (const path of ['/sitemap.xml', '/sitemaps/pages/1.xml', '/sitemaps/topics/1.xml', '/sitemaps/tools/1.xml', '/robots.txt', '/manifest.webmanifest']) {
  const response = await fetchWithTimeout(path);
  if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
}

const searchHtml = await (await fetchWithTimeout('/search?q=concrete')).text();
if (!searchHtml.includes('noindex')) throw new Error('Search results must remain noindex.');

const robotsText = await (await fetchWithTimeout('/robots.txt')).text();
if (robotsText.includes('Disallow: /search')) throw new Error('Crawlers must be able to read the search page noindex directive.');

const sitemapIndex = await (await fetchWithTimeout('/sitemap.xml')).text();
if (!sitemapIndex.includes('<sitemapindex') || !sitemapIndex.includes('/sitemaps/tools/1.xml')) throw new Error('Sitemap index is incomplete.');
const toolsSitemap = await (await fetchWithTimeout('/sitemaps/tools/1.xml')).text();
if (!toolsSitemap.includes('/home/electricity-cost') || toolsSitemap.includes('/search')) throw new Error('Tool sitemap membership is incorrect.');
const topicsSitemap = await (await fetchWithTimeout('/sitemaps/topics/1.xml')).text();
if (!topicsSitemap.includes('/topics/home') || topicsSitemap.includes('/topics/money')) throw new Error('Thin topic hubs entered the sitemap.');

const moneyTopicHtml = await (await fetchWithTimeout('/topics/money')).text();
if (!moneyTopicHtml.includes('noindex')) throw new Error('A one-tool topic hub must remain noindex.');
const homeTopicHtml = await (await fetchWithTimeout('/topics/home')).text();
if (homeTopicHtml.includes('noindex')) throw new Error('A qualified multi-tool topic hub should be indexable.');

const rootResponse = await fetchWithTimeout('/');
if (!rootResponse.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")) throw new Error('Production security headers are missing.');
const rootHtml = await rootResponse.text();
if (!rootHtml.includes('/og.png')) throw new Error('Homepage social-preview metadata is missing.');

const jsonLdMatch = rootHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
if (!jsonLdMatch) throw new Error('Homepage JSON-LD is missing.');
JSON.parse(jsonLdMatch[1]);

const aboutHtml = await (await fetchWithTimeout('/about')).text();
if (!aboutHtml.includes('property="og:url"') || !aboutHtml.includes('/about')) throw new Error('About-page share metadata is not route-specific.');

console.log(`E2E route contract passed for ${htmlPaths.length + 6} endpoints at ${baseUrl}.`);
