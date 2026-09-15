import { describe, expect, it } from 'vitest';
import { bilingualSalaryPair, assertSalaryEsSlugsAreUnique, salaryOccupationFromSlugEs, salaryOccupationInStatePathEs, salaryOccupationPathEs } from '@/lib/salary-es-pages';
import { salaryOccupationFromSlug, salaryOccupationInStatePath, salaryOccupationPath, statesWithWageFor } from '@/lib/salary-pages';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { OCCUPATION_NAMING, salaryDirectAnswer } from '@/lib/salary-content';
import { occupationJsonLdEs, salaryDirectAnswerEs, salaryQuestionsEs } from '@/lib/salary-content-es';
import { hreflangLanguagesFor } from '@/lib/i18n/alternates';
import { localeFromPathname } from '@/lib/i18n/path-locale';
import { getSitemapFamilies } from '@/lib/seo/sitemaps';
import { hasCuratedNameEs, OCCUPATION_NAMING_ES } from '@/lib/salary-naming-es';

describe('Spanish salary addresses', () => {
  it('keeps Spanish occupation slugs unique and off reserved segments', () => {
    expect(() => assertSalaryEsSlugsAreUnique()).not.toThrow();
  });

  it('pairs English and Spanish URLs for the same occupation and state', () => {
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    const en = salaryOccupationInStatePath(nurses, 'TX');
    const es = salaryOccupationInStatePathEs(nurses, 'TX');
    expect(en).toBe('/salary/registered-nurse/texas');
    expect(es).toBe('/es/salario/enfermero-registrado/texas');
    expect(bilingualSalaryPair(en)).toEqual({ en, es });
    expect(bilingualSalaryPair(es)).toEqual({ en, es });
    expect(salaryOccupationFromSlugEs('enfermero-registrado')?.code).toBe('29-1141');
  });

  it('never invents a Spanish URL for an occupation without a page', () => {
    expect(salaryOccupationFromSlugEs('estados')).toBeUndefined();
    expect(salaryOccupationFromSlugEs('not-a-job')).toBeUndefined();
  });
});

describe('hreflang', () => {
  it('is reciprocal and defaults to English', () => {
    const en = '/salary/registered-nurse/texas';
    const es = '/es/salario/enfermero-registrado/texas';
    expect(hreflangLanguagesFor(en)).toEqual({ 'en-US': en, 'es-US': es, 'x-default': en });
    expect(hreflangLanguagesFor(es)).toEqual({ 'en-US': en, 'es-US': es, 'x-default': en });
    expect(hreflangLanguagesFor('/es')).toEqual({ 'en-US': '/', 'es-US': '/es', 'x-default': '/' });
  });

  it('includes the shared Spanish calculator route', () => {
    expect(hreflangLanguagesFor('/money/paycheck')).toEqual({
      'en-US': '/money/paycheck',
      'es-US': '/es/money/paycheck',
      'x-default': '/money/paycheck',
    });
  });
});

describe('locale from the URL, never the IP', () => {
  it('reads only the path', () => {
    expect(localeFromPathname('/salary/registered-nurse/texas')).toBe('en-US');
    expect(localeFromPathname('/es/salario/enfermero-registrado/texas')).toBe('es-US');
    expect(localeFromPathname('/es')).toBe('es-US');
  });
});

describe('Spanish copy is written, not swapped', () => {
  it('answers the same nurse in two states with different figures and Spanish questions', () => {
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    const texas = occupationWageProfile({ area: 'TX', occupationCode: nurses.code })!;
    const california = occupationWageProfile({ area: 'CA', occupationCode: nurses.code })!;
    const txAnswer = salaryDirectAnswerEs(texas.value);
    const caAnswer = salaryDirectAnswerEs(california.value);
    expect(txAnswer).toContain('Texas');
    expect(caAnswer).toContain('California');
    expect(txAnswer).not.toBe(caAnswer);
    expect(txAnswer).toMatch(/enfermero/);
    expect(txAnswer.toLowerCase()).not.toContain('how much does');
    const txQuestions = salaryQuestionsEs(texas.value).map((entry) => entry.question);
    expect(txQuestions.some((question) => question.includes('¿Cuánto gana'))).toBe(true);
    expect(salaryDirectAnswer(texas.value)).toMatch(/registered nurse/i);
    expect(salaryDirectAnswer(texas.value)).not.toBe(txAnswer);
  });
});

describe('bilingual corpus size', () => {
  it('publishes at least 50,000 unique English and Spanish salary URLs', () => {
    const families = getSitemapFamilies();
    const english = new Set(families.salary.map((entry) => entry.path));
    const spanish = new Set(families['salary-es'].map((entry) => entry.path));
    expect(english.size).toBe(families.salary.length);
    expect(spanish.size).toBe(families['salary-es'].length);
    for (const path of spanish) expect(path.startsWith('/es/')).toBe(true);
    for (const path of english) expect(path.startsWith('/es/')).toBe(false);
    const unique = new Set([...english, ...spanish, ...families['pages-es'].map((entry) => entry.path)]);
    expect(unique.size).toBeGreaterThanOrEqual(50_000);
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    expect(english.has(salaryOccupationPath(nurses))).toBe(true);
    expect(spanish.has(salaryOccupationPathEs(nurses))).toBe(true);
    const aState = statesWithWageFor(nurses)[0];
    expect(aState).toBeDefined();
    expect(families.salary.every((entry) => !entry.path.startsWith('/es/'))).toBe(true);
  });

  it('puts hreflang on salary sitemap entries', () => {
    const nurseLeaf = getSitemapFamilies().salary.find((entry) => entry.path === '/salary/registered-nurse/texas');
    expect(nurseLeaf?.alternates?.some((alternate) => alternate.hreflang === 'es-US' && alternate.path === '/es/salario/enfermero-registrado/texas')).toBe(true);
    const spanishLeaf = getSitemapFamilies()['salary-es'].find((entry) => entry.path === '/es/salario/enfermero-registrado/texas');
    expect(spanishLeaf?.alternates?.some((alternate) => alternate.hreflang === 'en-US' && alternate.path === '/salary/registered-nurse/texas')).toBe(true);
  });

  it('publishes the same occupation-in-state pairs in both languages', () => {
    const families = getSitemapFamilies();
    expect(families.salary.length).toBe(families['salary-es'].length);
  });
});

describe('Spanish naming is authored, not a leftover English title', () => {
  it('keeps a Spanish name for every occupation the English pages curated', () => {
    expect(Object.keys(OCCUPATION_NAMING_ES).sort()).toEqual(Object.keys(OCCUPATION_NAMING).sort());
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    expect(hasCuratedNameEs(nurses)).toBe(true);
  });

  it('names New York in Spanish in the answer a model would cite', () => {
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    const profile = occupationWageProfile({ area: 'NY', occupationCode: nurses.code })!.value;
    const answer = salaryDirectAnswerEs(profile);
    expect(answer).toContain('Nueva York');
    expect(answer).not.toContain('New York');
    expect(answer).not.toContain('the United States');
    expect(occupationJsonLdEs(profile, 'https://costanswer.com/es/salario/enfermero-registrado/new-york').inLanguage).toBe('es-US');
  });
});
