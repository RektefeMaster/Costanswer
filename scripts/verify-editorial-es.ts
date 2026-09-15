import { getToolEditorial, listToolEditorial } from '../lib/tool-content';
import { EDITORIAL_ES } from '../lib/tool-content/es/editorial-es';

console.log('Testing Spanish editorial content...');
for (const entry of EDITORIAL_ES) {
  const ed = getToolEditorial(entry.toolId, 'es-US');
  if (ed.guide.heading !== entry.guide.heading) {
    throw new Error(`Heading mismatch on ${entry.toolId}: expected "${entry.guide.heading}", got "${ed.guide.heading}"`);
  }
  if (!ed.faq.length || !ed.glossary.length) {
    throw new Error(`Incomplete editorial for ${entry.toolId}`);
  }
  console.log(`  ✓ ${entry.toolId}: "${ed.guide.heading}" (${ed.faq.length} FAQs, ${ed.glossary.length} terms)`);
}

const en = getToolEditorial('paycheck', 'en-US');
const es = getToolEditorial('paycheck', 'es-US');
console.log('\nChecking fallback and isolation:');
console.log('  EN paycheck heading:', en.guide.heading);
console.log('  ES paycheck heading:', es.guide.heading);

const enFallback = getToolEditorial('recipe-scaler', 'en-US');
const esFallback = getToolEditorial('recipe-scaler', 'es-US');
if (esFallback.guide.heading !== enFallback.guide.heading) {
  throw new Error('Fallback failed for un-translated tool');
}
console.log('  ✓ Fallback for un-translated tools works cleanly.');

const allEs = listToolEditorial('es-US');
console.log(`\nSuccessfully loaded editorial for all ${allEs.length} tools.`);
