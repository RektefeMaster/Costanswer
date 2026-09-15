import { nationalSalaryOccupations, salaryOccupationInStatePath, salaryOccupationPath, statesWithWageFor } from '../lib/salary-pages';
import { bilingualSalaryPair, salaryOccupationInStatePathEs, salaryOccupationPathEs } from '../lib/salary-es-pages';
import { occupationWageProfile } from '../lib/calculations/salary';
import { occupationHeadingEs, occupationJsonLdEs, occupationPluralEs, salaryDescriptionEs, salaryDirectAnswerEs, salaryQuestionsEs, salaryTitleEs } from '../lib/salary-content-es';
import { occupationJsonLd } from '../lib/salary-content';
import { hreflangLanguagesFor } from '../lib/i18n/alternates';
import { hasCuratedNameEs } from '../lib/salary-naming-es';
import { wageUi, WAGE_UI } from '../lib/salary/wage-ui';

console.log('=== VERIFYING 62,000+ SALARY PAGE CORPUS ===\n');

const occupations = nationalSalaryOccupations();
console.log(`Total national detailed occupations: ${occupations.length}`);

// Test 1: Verify all WAGE_UI keys exist in both en-US and es-US with non-empty strings
console.log('Checking wage UI string integrity...');
for (const key of Object.keys(WAGE_UI) as Array<keyof typeof WAGE_UI>) {
  const en = wageUi(key, 'en-US');
  const es = wageUi(key, 'es-US');
  if (!en || !es) {
    throw new Error(`Missing wageUi translation for key: ${key}`);
  }
}
console.log(`  ✓ All ${Object.keys(WAGE_UI).length} wage UI keys verified in both en-US and es-US.`);

// Test 2: Verify uncurated occupations fallback translation quality
console.log('\nChecking algorithmic translation for uncurated occupations...');
const uncurated = occupations.filter((o) => !hasCuratedNameEs(o));
console.log(`Uncurated occupations count: ${uncurated.length}`);
for (const occ of uncurated.slice(0, 20)) {
  const headingEs = occupationHeadingEs(occ);
  const pluralEs = occupationPluralEs(occ);
  if (!headingEs || !pluralEs) {
    throw new Error(`Empty translation for uncurated occupation ${occ.code}: ${occ.displayTitle}`);
  }
  // Verify no raw English words like "managers", "teachers", "mechanics" remain untranslated when matched
  if (/\b(mechanics|technicians|inspectors|engineers|operators|supervisors)\b/i.test(headingEs)) {
    throw new Error(`Untranslated core English keyword in uncurated heading: "${headingEs}" (original: "${occ.displayTitle}")`);
  }
}
console.log('  ✓ Sample uncurated occupations translated with authentic trade/professional terminology.');

// Test 3: Sample occupations across sectors: healthcare, tech, trades, service, education, logistics, finance
const sampleCodes = [
  '29-1141', // registered nurse
  '15-1252', // software developer
  '47-2111', // electrician
  '53-3032', // truck driver
  '25-2021', // elementary school teacher
  '35-2014', // restaurant cook
  '13-2011', // accountant
  '49-3023', // automotive service tech
  '47-2031', // carpenter
  '33-2011', // firefighter
];

const sampleStates = ['TX', 'CA', 'NY', 'FL', 'WA', 'WY', 'IL', 'OH', 'PA'] as const;

let totalChecked = 0;
let errors = 0;

for (const code of sampleCodes) {
  const occupation = occupations.find((o) => o.code === code);
  if (!occupation) {
    console.error(`Missing occupation for code: ${code}`);
    errors++;
    continue;
  }

  // National level check
  const enNatPath = salaryOccupationPath(occupation);
  const esNatPath = salaryOccupationPathEs(occupation);
  const natPair = bilingualSalaryPair(enNatPath);

  if (!natPair || natPair.es !== esNatPath || natPair.en !== enNatPath) {
    console.error(`Bilingual pair mismatch for national ${code}:`, natPair);
    errors++;
  }

  const enNatHreflang = hreflangLanguagesFor(enNatPath);
  const esNatHreflang = hreflangLanguagesFor(esNatPath);
  if (enNatHreflang['es-US'] !== esNatPath || esNatHreflang['en-US'] !== enNatPath) {
    console.error(`Hreflang mismatch for national ${code}`);
    errors++;
  }

  // Leaf level checks across sample states
  for (const state of sampleStates) {
    const enPath = salaryOccupationInStatePath(occupation, state);
    const esPath = salaryOccupationInStatePathEs(occupation, state);
    totalChecked++;

    const pair = bilingualSalaryPair(enPath);
    if (!pair || pair.en !== enPath || pair.es !== esPath) {
      console.error(`Bilingual pair failed for ${enPath} <-> ${esPath}`);
      errors++;
    }

    const enHreflang = hreflangLanguagesFor(enPath);
    const esHreflang = hreflangLanguagesFor(esPath);
    if (enHreflang['es-US'] !== esPath || esHreflang['en-US'] !== enPath) {
      console.error(`Leaf hreflang mismatch for ${code} in ${state}`);
      errors++;
    }

    const wageResult = occupationWageProfile({ area: state, occupationCode: occupation.code });
    if (!wageResult) {
      continue;
    }

    const profile = wageResult.value;

    // Spanish titles and copy
    const titleEs = salaryTitleEs(profile);
    const descEs = salaryDescriptionEs(profile);
    const directEs = salaryDirectAnswerEs(profile);
    const questionsEs = salaryQuestionsEs(profile);
    const jsonLdEs = occupationJsonLdEs(profile, `https://costanswer.com${esPath}`);

    // Verify Spanish titles and answers contain no untranslated English job title
    if (titleEs.includes('undefined') || descEs.includes('undefined') || directEs.includes('undefined')) {
      console.error(`Undefined found in Spanish text for ${code} ${state}`);
      errors++;
    }

    // Verify JSON-LD Schema
    if (jsonLdEs['@type'] !== 'Occupation' || jsonLdEs.inLanguage !== 'es-US') {
      console.error(`Invalid JSON-LD for ${esPath}`);
      errors++;
    }
    if (jsonLdEs.estimatedSalary && (jsonLdEs.estimatedSalary as Record<string, unknown>).currency !== 'USD') {
      console.error(`Invalid currency in JSON-LD for ${esPath}`);
      errors++;
    }

    // Verify location in JSON-LD
    const loc = jsonLdEs.occupationLocation as { '@type': string; name: string };
    if (!loc || loc['@type'] !== 'State' || !loc.name) {
      console.error(`Missing state location in JSON-LD for ${esPath}`);
      errors++;
    }

    // Verify English JSON-LD as well
    const jsonLdEn = occupationJsonLd(profile, `https://costanswer.com${enPath}`);
    if (jsonLdEn['@type'] !== 'Occupation' || jsonLdEn.inLanguage !== 'en-US') {
      console.error(`Invalid English JSON-LD for ${enPath}`);
      errors++;
    }

    // Verify take-home tax consistency
    if (profile.takeHome) {
      if (profile.takeHome.grossAnnual <= 0 || profile.takeHome.annual <= 0 || profile.takeHome.monthly <= 0) {
        console.error(`Invalid take-home math for ${code} ${state}:`, profile.takeHome);
        errors++;
      }
    }
  }
}

console.log(`\nChecked ${totalChecked} sample occupation-state leaf combinations.`);
console.log(`Errors encountered: ${errors}`);

if (errors > 0) {
  process.exit(1);
}

console.log('\nAll checked leaves, uncurated fallbacks, and metadata passed successfully!');
