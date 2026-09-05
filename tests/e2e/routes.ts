const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export {};

const htmlPaths = [
  '/',
  '/money/hourly-to-salary',
  '/money/salary-after-tax',
  '/money/paycheck',
  '/money/mortgage-payment',
  '/money/loan',
  '/money/compound-interest',
  '/money/debt-payoff',
  '/money/home-affordability',
  '/money/cost-of-living',
  '/money/inflation',
  '/money/car-loan',
  '/money/investment',
  '/money/retirement',
  '/money/amortization',
  '/money/cd',
  '/money/interest',
  '/money/roth-ira',
  '/money/401k',
  '/money/mortgage-payoff',
  '/money/refinance',
  '/money/bonus-tax',
  '/everyday/per-diem',
  '/money/credit-card-payoff',
  '/home/electricity-cost',
  '/home/appliance-electricity-cost',
  '/home/concrete-calculator',
  '/home/square-footage',
  '/car/ev-vs-gas',
  '/car/road-trip-fuel',
  '/car/car-affordability',
  '/everyday/business-days',
  '/everyday/tip',
  '/everyday/age',
  '/everyday/time',
  '/everyday/random-number',
  '/everyday/time-card',
  '/everyday/date',
  '/everyday/days-from-today',
  '/health/bmi',
  '/health/calorie',
  '/health/tdee',
  '/health/bmr',
  '/health/body-fat',
  '/math/percentage',
  '/math/percent-change',
  '/math/scientific',
  '/math/fraction',
  '/math/unit-conversion',
  '/education/grade',
  '/education/gpa',
  '/shopping/unit-price',
  '/shopping/where-cheaper',
  '/food/recipe-scaler',
  '/topics/money',
  '/topics/home',
  '/topics/car',
  '/topics/everyday',
  '/topics/food',
  '/topics/shopping',
  '/topics/health',
  '/topics/math',
  '/topics/education',
  '/search?q=concrete',
  '/methodology',
  '/methodology/data',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
  '/faq',
  '/salary',
  '/salary/states',
  '/salary/states/texas',
  '/salary/registered-nurse',
  '/salary/registered-nurse/texas',
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
  if (path !== '/search?q=concrete' && !html.includes('application/ld+json') && path !== '/about' && path !== '/privacy' && path !== '/terms' && path !== '/contact' && path !== '/methodology' && path !== '/methodology/data') {
    throw new Error(`${path} has no structured data`);
  }
}

for (const path of ['/sitemap.xml', '/sitemaps/pages/1.xml', '/sitemaps/topics/1.xml', '/sitemaps/tools/1.xml', '/sitemaps/salary/1.xml', '/robots.txt', '/manifest.webmanifest']) {
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
if (!toolsSitemap.includes('/home/electricity-cost') || !toolsSitemap.includes('/home/appliance-electricity-cost') || !toolsSitemap.includes('/health/bmi') || !toolsSitemap.includes('/money/car-loan') || toolsSitemap.includes('/search') || toolsSitemap.includes('/kg-to-lbs') || toolsSitemap.includes('/45-days-from-today')) throw new Error('Tool sitemap membership is incorrect.');
const topicsSitemap = await (await fetchWithTimeout('/sitemaps/topics/1.xml')).text();
if (!topicsSitemap.includes('/topics/home') || !topicsSitemap.includes('/topics/money') || !topicsSitemap.includes('/topics/health') || !topicsSitemap.includes('/topics/math') || !topicsSitemap.includes('/topics/education') || !topicsSitemap.includes('/topics/everyday') || topicsSitemap.includes('/topics/food')) throw new Error('Thin topic hubs entered the sitemap.');

const moneyTopicHtml = await (await fetchWithTimeout('/topics/money')).text();
if (moneyTopicHtml.includes('noindex')) throw new Error('A qualified multi-tool money hub should be indexable.');
const foodTopicHtml = await (await fetchWithTimeout('/topics/food')).text();
if (!foodTopicHtml.includes('noindex')) throw new Error('A one-tool topic hub must remain noindex.');
const homeTopicHtml = await (await fetchWithTimeout('/topics/home')).text();
if (homeTopicHtml.includes('noindex')) throw new Error('A qualified multi-tool topic hub should be indexable.');
const shoppingTopicHtml = await (await fetchWithTimeout('/topics/shopping')).text();
if (shoppingTopicHtml.includes('noindex')) throw new Error('A qualified multi-tool shopping hub should be indexable.');
const carTopicHtml = await (await fetchWithTimeout('/topics/car')).text();
if (carTopicHtml.includes('noindex')) throw new Error('A qualified multi-tool car hub should be indexable.');

for (const [from, to] of [
  ['/topics/auto', '/topics/car'],
  ['/auto/ev-vs-gas', '/car/ev-vs-gas'],
  ['/money/auto-loan', '/money/car-loan'],
] as const) {
  const redirected = await fetch(new URL(from, baseUrl), { signal: AbortSignal.timeout(10_000), redirect: 'manual' });
  if (redirected.status !== 308 && redirected.status !== 301) {
    throw new Error(`${from} should permanently redirect, got HTTP ${redirected.status}`);
  }
  const location = redirected.headers.get('location') ?? '';
  if (!location.endsWith(to)) throw new Error(`${from} redirected to ${location}, expected ${to}`);
}

/*
 * Every level of the salary family is open to search. The sitemap index must
 * therefore carry more than one salary page — a single file of 31,000 URLs is
 * six megabytes the Worker would rebuild on every cache miss — and every level
 * must be indexable, including the leaves.
 */
const salaryIndexXml = await (await fetchWithTimeout('/sitemap.xml')).text();
const salaryPageCount = [...salaryIndexXml.matchAll(/\/sitemaps\/salary\/\d+\.xml/g)].length;
if (salaryPageCount < 2) throw new Error(`The salary family should be split across sitemap files, found ${salaryPageCount}.`);

const salarySitemap = await (await fetchWithTimeout('/sitemaps/salary/1.xml')).text();
if (!salarySitemap.includes('/salary/registered-nurse<') && !salarySitemap.includes('/salary/registered-nurse</loc>')) {
  throw new Error('Occupation pages are missing from the salary sitemap.');
}
if (!salarySitemap.includes('/salary/states/texas')) throw new Error('State hubs are missing from the salary sitemap.');

const allSalaryPages = await Promise.all(
  Array.from({ length: salaryPageCount }, (_unused, index) => fetchWithTimeout(`/sitemaps/salary/${index + 1}.xml`).then((response) => response.text())),
);
const salaryCorpus = allSalaryPages.join('');
if (!salaryCorpus.includes('/salary/registered-nurse/texas')) {
  throw new Error('Occupation-in-state pages are open but missing from the sitemap.');
}
const submitted = [...salaryCorpus.matchAll(/<loc>/g)].length;
if (submitted < 30_000) throw new Error(`Only ${submitted} salary URLs were submitted; the whole corpus is meant to be open.`);

const occupationHtml = await (await fetchWithTimeout('/salary/registered-nurse')).text();
if (occupationHtml.includes('noindex')) throw new Error('Occupation pages should be indexable.');
const stateHubHtml = await (await fetchWithTimeout('/salary/states/texas')).text();
if (stateHubHtml.includes('noindex')) throw new Error('State hubs should be indexable.');
const leafHtml = await (await fetchWithTimeout('/salary/registered-nurse/texas')).text();
if (leafHtml.includes('noindex')) throw new Error('Occupation-in-state pages should be indexable.');
if (!leafHtml.includes('/salary/registered-nurse/oklahoma')) throw new Error('An occupation-in-state page must link its peer states.');

for (const path of ['/salary/all-occupations', '/salary/not-a-real-job', '/salary/registered-nurse/not-a-state']) {
  const response = await fetchWithTimeout(path);
  if (response.status !== 404) throw new Error(`${path} should not exist, got HTTP ${response.status}`);
}

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
