import { isSalaryLevelIndexable } from '../../lib/salary-pages';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

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
  '/money/insurance-cost',
  '/money/health-insurance',
  '/money/marketplace-plans',
  '/money/medicare-cost',
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
  '/money/effective-tax-rate',
  '/money/federal-tax-bracket',
  '/money/self-employment-tax',
  '/money/eitc',
  '/money/child-tax-credit',
  '/money/capital-gains',
  '/money/quarterly-estimated-tax',
  '/money/tax-refund',
  '/everyday/per-diem',
  '/money/credit-card-payoff',
  '/home/electricity-cost',
  '/home/appliance-electricity-cost',
  '/home/concrete-calculator',
  '/home/square-footage',
  '/car/ev-vs-gas',
  '/car/road-trip-fuel',
  '/car/car-affordability',
  '/car/auto-coverage',
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
  '/cost',
  '/cost/estimate',
  '/cost/check-quote',
  '/cost/hvac-replacement',
  '/cost/water-heater-replacement',
  '/cost/electrical-panel-upgrade',
  '/cost/tree-removal',
  '/cost/deck-build',
  '/cost/fence-install',
  '/cost/concrete-driveway',
  '/cost/interior-painting',
  '/cost/bathroom-remodel',
  '/cost/heat-pump-replacement',
  '/cost/window-replacement',
  '/cost/exterior-door-replacement',
  '/cost/siding-replacement',
  '/cost/drywall-install',
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

for (const path of ['/sitemap.xml', '/sitemaps/pages/1.xml', '/sitemaps/topics/1.xml', '/sitemaps/tools/1.xml', '/sitemaps/salary/1.xml', '/sitemaps/cost/1.xml', '/robots.txt', '/manifest.webmanifest']) {
  const response = await fetchWithTimeout(path);
  if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
}

const searchHtml = await (await fetchWithTimeout('/search?q=concrete')).text();
if (!searchHtml.includes('noindex')) throw new Error('Search results must remain noindex.');

const robotsText = await (await fetchWithTimeout('/robots.txt')).text();
if (robotsText.includes('Disallow: /search')) throw new Error('Crawlers must be able to read the search page noindex directive.');

const sitemapIndex = await (await fetchWithTimeout('/sitemap.xml')).text();
if (!sitemapIndex.includes('<sitemapindex') || !sitemapIndex.includes('/sitemaps/tools/1.xml') || !sitemapIndex.includes('/sitemaps/cost/1.xml')) throw new Error('Sitemap index is incomplete.');
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
 * The salary family publishes whatever SALARY_PUBLICATION currently opens.
 * The leaves are staged, so this asserts the gate rather than a particular
 * size: hubs stay in the sitemap and indexable; leaves stay reachable but
 * withdrawn from search until the gate flips.
 */
const salaryIndexXml = await (await fetchWithTimeout('/sitemap.xml')).text();
const salaryPageCount = [...salaryIndexXml.matchAll(/\/sitemaps\/salary\/\d+\.xml/g)].length;
if (salaryPageCount < 1) throw new Error(`The salary family is missing from the sitemap index, found ${salaryPageCount}.`);

const salarySitemap = await (await fetchWithTimeout('/sitemaps/salary/1.xml')).text();
if (!salarySitemap.includes('/salary/registered-nurse<') && !salarySitemap.includes('/salary/registered-nurse</loc>')) {
  throw new Error('Occupation pages are missing from the salary sitemap.');
}
if (!salarySitemap.includes('/salary/states/texas')) throw new Error('State hubs are missing from the salary sitemap.');

const allSalaryPages = await Promise.all(
  Array.from({ length: salaryPageCount }, (_unused, index) => fetchWithTimeout(`/sitemaps/salary/${index + 1}.xml`).then((response) => response.text())),
);
const salaryCorpus = allSalaryPages.join('');
const leafInSitemap = salaryCorpus.includes('/salary/registered-nurse/texas');
const submitted = [...salaryCorpus.matchAll(/<loc>/g)].length;
const leavesOpen = isSalaryLevelIndexable('occupationInState');

if (leavesOpen) {
  if (salaryPageCount < 2) throw new Error(`The open salary family should be split across sitemap files, found ${salaryPageCount}.`);
  if (!leafInSitemap) throw new Error('Occupation-in-state pages are open but missing from the sitemap.');
  if (submitted < 30_000) throw new Error(`Only ${submitted} salary URLs were submitted; the whole corpus is meant to be open.`);
} else if (leafInSitemap) {
  throw new Error('Occupation-in-state pages are staged but still in the sitemap.');
}

const salaryHubHtml = await (await fetchWithTimeout('/salary')).text();
if (!salaryHubHtml.includes('/salary/registered-nurse')) throw new Error('The salary hub must still link every occupation page.');
if (!salaryHubHtml.includes('salary-job-search')) throw new Error('The salary hub must offer occupation search.');
if (!salaryHubHtml.includes('Chief Executive')) throw new Error('The salary hub must list occupations by the names people use.');

const occupationHtml = await (await fetchWithTimeout('/salary/registered-nurse')).text();
if (occupationHtml.includes('noindex')) throw new Error('Occupation pages should be indexable.');
const stateHubHtml = await (await fetchWithTimeout('/salary/states/texas')).text();
if (stateHubHtml.includes('noindex')) throw new Error('State hubs should be indexable.');
const leafHtml = await (await fetchWithTimeout('/salary/registered-nurse/texas')).text();
if (leavesOpen) {
  if (leafHtml.includes('noindex')) throw new Error('Occupation-in-state pages should be indexable.');
} else if (!leafHtml.includes('noindex')) {
  throw new Error('Occupation-in-state pages are staged but missing noindex.');
}
if (!leafHtml.includes('/salary/registered-nurse/oklahoma')) throw new Error('An occupation-in-state page must link its peer states.');

const costSitemap = await (await fetchWithTimeout('/sitemaps/cost/1.xml')).text();
if (!costSitemap.includes('/cost/hvac-replacement') || !costSitemap.includes('/cost/estimate') || !costSitemap.includes('/cost/check-quote')) {
  throw new Error('Job Cost URLs are missing from the cost sitemap.');
}
for (const jobPath of [
  '/cost/hvac-replacement',
  '/cost/water-heater-replacement',
  '/cost/electrical-panel-upgrade',
  '/cost/tree-removal',
  '/cost/deck-build',
  '/cost/fence-install',
  '/cost/concrete-driveway',
  '/cost/interior-painting',
  '/cost/bathroom-remodel',
  '/cost/heat-pump-replacement',
  '/cost/window-replacement',
  '/cost/exterior-door-replacement',
  '/cost/siding-replacement',
  '/cost/drywall-install',
]) {
  if (!costSitemap.includes(jobPath)) throw new Error(`${jobPath} is missing from the cost sitemap.`);
}
if (costSitemap.includes('/cost/roof-replacement')) throw new Error('Removed roof-replacement must not stay in the cost sitemap.');
const costHubHtml = await (await fetchWithTimeout('/cost')).text();
if (!costHubHtml.includes('/cost/tree-removal')) throw new Error('The job-cost hub must link the published jobs.');
if (costHubHtml.includes('/cost/roof-replacement') || costHubHtml.includes('Chain link')) {
  throw new Error('The job-cost hub still advertises a removed roof or chain-link job.');
}
if (!costHubHtml.includes('CostAnswer estimated range') && !costHubHtml.includes('Job Cost Engine')) {
  throw new Error('The job-cost hub is missing engine copy.');
}
const treeHtml = await (await fetchWithTimeout('/cost/tree-removal')).text();
if (treeHtml.includes('noindex')) throw new Error('Job pages should be indexable while COST_PUBLICATION is open.');

for (const path of ['/salary/all-occupations', '/salary/not-a-real-job', '/salary/registered-nurse/not-a-state', '/cost/not-a-real-job', '/cost/roof-replacement']) {
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
