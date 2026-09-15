import { getSitemapFamilies } from '../lib/seo/sitemaps';

console.log('Testing sitemap families:');
const families = getSitemapFamilies();
for (const [id, entries] of Object.entries(families)) {
  console.log(`  Family ${id}: ${entries.length} URLs`);
}

const pagesEs = families['pages-es'];
console.log(`\nPages-ES count: ${pagesEs.length}`);
console.log('Sample Spanish URLs:');
for (const entry of pagesEs.slice(0, 5)) {
  console.log(`  ${entry.path} -> alternates: ${entry.alternates?.map(a => `${a.hreflang}:${a.path}`).join(', ')}`);
}

const paycheckTool = families.tools.find(e => e.path === '/money/paycheck');
console.log('\nEnglish /money/paycheck alternates:');
console.log(' ', paycheckTool?.alternates?.map(a => `${a.hreflang}:${a.path}`).join(', '));
