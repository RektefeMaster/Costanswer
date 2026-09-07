import { describe, expect, it } from 'vitest';
import {
  assertSalarySlugsAreUnreserved,
  isSalaryLevelIndexable,
  nationalSalaryOccupations,
  salaryOccupationFromSlug,
  salaryOccupationInStatePath,
  salaryOccupationPath,
  salaryStatePath,
  SALARY_STATE_SLUGS,
  stateFromSlug,
  stateSlug,
  statesWithWageFor,
} from '@/lib/salary-pages';
import { getOewsEstimate, getOewsOccupationBySlug, oewsPageWorthyPairs } from '@/lib/data/bls-oews-snapshot';
import {
  hasCuratedName,
  indefiniteArticle,
  occupationAliases,
  occupationJsonLd,
  occupationPlural,
  occupationSingular,
  salaryQuestions,
  OCCUPATION_NAMING,
} from '@/lib/salary-content';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { faqPageJsonLd } from '@/lib/seo';
import { getSitemapFamilies, paginateSitemapEntries, sitemapPagePaths } from '@/lib/seo/sitemaps';
import { STATE_CODES } from '@/lib/location/states';

describe('salary page addresses', () => {
  it('lets no occupation take a segment the family owns', () => {
    expect(() => assertSalarySlugsAreUnreserved()).not.toThrow();
  });

  it('round-trips every state through its slug', () => {
    expect(SALARY_STATE_SLUGS).toHaveLength(51);
    for (const state of STATE_CODES) {
      expect(stateFromSlug(stateSlug(state))).toBe(state);
    }
    expect(stateFromSlug('not-a-state')).toBeUndefined();
    expect(stateSlug('DC')).toBe('district-of-columbia');
    expect(stateSlug('NY')).toBe('new-york');
  });

  it('builds the addresses the pages are served at', () => {
    const nurses = salaryOccupationFromSlug('registered-nurse')!;
    expect(salaryOccupationPath(nurses)).toBe('/salary/registered-nurse');
    expect(salaryOccupationInStatePath(nurses, 'TX')).toBe('/salary/registered-nurse/texas');
    expect(salaryStatePath('TX')).toBe('/salary/states/texas');
  });

  it('addresses a page by the job\'s name, not by the survey\'s label', () => {
    const hvac = salaryOccupationFromSlug('hvac-technician');
    expect(hvac?.code).toBe('49-9021');
    expect(hvac?.title).toBe('Heating, Air Conditioning, and Refrigeration Mechanics and Installers');
    expect(salaryOccupationFromSlug('truck-driver')?.code).toBe('53-3032');
    expect(salaryOccupationFromSlug('administrative-assistant')?.code).toBe('43-6014');
  });

  it('keeps the snapshot slug where no name was written by hand', () => {
    const uncurated = nationalSalaryOccupations().find((occupation) => !hasCuratedName(occupation))!;
    expect(salaryOccupationPath(uncurated)).toBe(`/salary/${uncurated.slug}`);
  });

  it('gives a page only to occupations, never to roll-ups', () => {
    expect(salaryOccupationFromSlug('registered-nurse')?.group).toBe('detailed');
    const allOccupations = getOewsOccupationBySlug('all-occupations');
    expect(allOccupations?.group).toBe('total');
    expect(salaryOccupationFromSlug('all-occupations')).toBeUndefined();
  });

  it('reaches every occupation-in-state page from its occupation page', () => {
    const reachable = nationalSalaryOccupations()
      .reduce((total, occupation) => total + statesWithWageFor(occupation).length, 0);
    expect(reachable).toBe(oewsPageWorthyPairs().length);
  });
});

describe('what the salary family submits to search', () => {
  it('publishes every level that is open, and nothing from a level that is not', () => {
    /*
     * Asserts the gate, not a particular setting of it. The leaves are staged
     * while most states still have no 2026 tax schedule — their headline
     * take-home would omit state income tax — so a test that hard-codes them as
     * published would have to be edited every time that decision moves, which
     * is how a gate quietly stops being one.
     */
    const entries = getSitemapFamilies().salary;
    const paths = new Set(entries.map((entry) => entry.path));

    expect(paths.has('/salary')).toBe(isSalaryLevelIndexable('familyHub'));
    expect(paths.has('/salary/states')).toBe(isSalaryLevelIndexable('stateIndex'));
    expect(paths.has('/salary/states/texas')).toBe(isSalaryLevelIndexable('stateHub'));
    expect(paths.has('/salary/registered-nurse')).toBe(isSalaryLevelIndexable('occupation'));
    expect(paths.has('/salary/registered-nurse/texas')).toBe(isSalaryLevelIndexable('occupationInState'));
  });

  it('submits exactly the pages that exist, and no more', () => {
    const entries = getSitemapFamilies().salary;
    const leaves = isSalaryLevelIndexable('occupationInState') ? oewsPageWorthyPairs().length : 0;
    expect(entries).toHaveLength(2 + STATE_CODES.length + nationalSalaryOccupations().length + leaves);
    expect(new Set(entries.map((entry) => entry.path)).size).toBe(entries.length);
  });

  it('splits the family so no one sitemap file is unreasonably large', () => {
    const entries = getSitemapFamilies().salary;
    const pages = paginateSitemapEntries(entries, 10_000);

    // Whether it splits at all depends on how far the family is open; that no
    // page exceeds the limit, and that the index lists exactly the pages that
    // exist, has to hold either way.
    expect(pages.length).toBe(Math.max(1, Math.ceil(entries.length / 10_000)));
    for (const page of pages) expect(page.length).toBeLessThanOrEqual(10_000);
    expect(sitemapPagePaths().filter(({ family }) => family === 'salary')).toHaveLength(pages.length);
  });

  it('withdraws the leaves from search without touching a route', () => {
    // The staging decision has to be reversible in one edit, so this pins the
    // property that makes it so: the pages still resolve, they are simply not
    // submitted and not indexable.
    const submitted = new Set(getSitemapFamilies().salary.map((entry) => entry.path));
    if (!isSalaryLevelIndexable('occupationInState')) {
      expect(submitted.has('/salary/registered-nurse/texas')).toBe(false);
      // The address is still real: the family still builds it.
      expect(oewsPageWorthyPairs().length).toBeGreaterThan(30_000);
    }
  });

  it('can pull the leaves back out in one edit', () => {
    // The gate is what makes opening the whole corpus reversible: everything
    // below the hubs is published only because this returns true.
    const leafPaths = getSitemapFamilies().salary
      .filter((entry) => entry.path.split('/').length === 4 && !entry.path.startsWith('/salary/states'));
    expect(leafPaths.length > 0).toBe(isSalaryLevelIndexable('occupationInState'));
  });

  it('dates the family from the release it was built from', () => {
    for (const entry of getSitemapFamilies().salary) {
      expect(Number.isFinite(Date.parse(entry.lastModified))).toBe(true);
    }
  });
});

describe('the curated occupation names', () => {
  it('names only occupations this release actually publishes a page for', () => {
    const pageable = new Set(nationalSalaryOccupations().map((occupation) => occupation.code));
    const unknown = Object.keys(OCCUPATION_NAMING).filter((code) => !pageable.has(code));
    expect(unknown, 'a curated name for an occupation with no page is dead weight and drifts silently').toEqual([]);
  });

  it('falls back to the official title where nothing was written', () => {
    const uncurated = nationalSalaryOccupations().find((occupation) => !hasCuratedName(occupation))!;
    expect(occupationSingular(uncurated)).toBe(uncurated.displayTitle);
    const nurses = nationalSalaryOccupations().find((occupation) => occupation.code === '29-1141')!;
    expect(occupationSingular(nurses)).toBe('registered nurse');
    expect(occupationAliases(nurses)).toContain('RN');
  });

  it('covers the occupations most people work in', () => {
    const top = nationalSalaryOccupations()
      .map((occupation) => ({ occupation, employment: getOewsEstimate('US', occupation.code)?.employment ?? 0 }))
      .sort((left, right) => right.employment - left.employment)
      .slice(0, 100);
    const curated = top.filter(({ occupation }) => hasCuratedName(occupation)).length;
    expect(curated).toBeGreaterThanOrEqual(90);
  });

  it('picks the article a reader would say aloud', () => {
    expect(indefiniteArticle('electrician')).toBe('an');
    expect(indefiniteArticle('registered nurse')).toBe('a');
    expect(indefiniteArticle('HVAC technician')).toBe('an');
    expect(indefiniteArticle('accountant or auditor')).toBe('an');
    expect(indefiniteArticle('university professor')).toBe('a');
  });
});

describe('how the pages name the job in prose', () => {
  it('never leaves a plural reading as one person', () => {
    const suspect = nationalSalaryOccupations()
      .filter(hasCuratedName)
      .map((occupation) => ({ occupation, plural: occupationPlural(occupation) }))
      .filter(({ plural }) => / (or|and) [a-z-]+[^s]$/.test(plural));
    expect(suspect.map(({ occupation, plural }) => `${occupation.code}: ${plural}`)).toEqual([]);
  });

  it('speaks the plural people use, not the survey label', () => {
    const drivers = salaryOccupationFromSlug('truck-driver')!;
    expect(occupationPlural(drivers)).toBe('truck drivers');
    const servers = salaryOccupationFromSlug('waiter-or-waitress')!;
    expect(occupationPlural(servers)).toBe('waiters or waitresses');
  });

  it('falls back to the official title in the plural where nothing was written', () => {
    const uncurated = nationalSalaryOccupations().find((occupation) => !hasCuratedName(occupation))!;
    expect(occupationPlural(uncurated)).toBe(uncurated.displayTitle.toLowerCase());
  });
});

describe('the questions each page answers', () => {
  it('asks different questions and answers each from different data', () => {
    const profile = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!.value;
    const questions = salaryQuestions(profile);
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(new Set(questions.map((entry) => entry.question)).size).toBe(questions.length);
    const answers = questions.map((entry) => entry.answer.join(' '));
    expect(new Set(answers).size).toBe(answers.length);
    expect(questions[0].question).toBe('How much does a registered nurse make in Texas?');
    expect(answers.join(' ')).toContain('$95,970');
    expect(answers.join(' ')).toContain('$76,345');
  });

  it('says nothing about state tax where the state charges none', () => {
    const texas = salaryQuestions(occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!.value);
    const takeHome = texas.find((entry) => entry.question.includes('take-home'))!;
    expect(takeHome.answer.join(' ')).toContain('no state income tax');
    const california = salaryQuestions(occupationWageProfile({ area: 'CA', occupationCode: '15-1252' })!.value);
    expect(california.find((entry) => entry.question.includes('take-home'))!.answer.join(' '))
      .toMatch(/California takes \$[\d,]+ of it in state income tax/);
  });

  it('marks up only questions the reader can see', () => {
    const profile = occupationWageProfile({ area: 'WY', occupationCode: '47-2111' })!.value;
    const marked = faqPageJsonLd(salaryQuestions(profile), '/salary/electrician/wyoming');
    expect(marked.mainEntity).toHaveLength(salaryQuestions(profile).length);
    for (const entry of marked.mainEntity) expect(entry.acceptedAnswer.text.length).toBeGreaterThan(40);
  });

  it('states the salary distribution in the vocabulary built for it', () => {
    const profile = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!.value;
    const schema = occupationJsonLd(profile, 'https://costanswer.com/salary/registered-nurse/texas');
    expect(schema).toMatchObject({
      '@type': 'Occupation',
      occupationalCategory: '29-1141',
      occupationLocation: { '@type': 'State', name: 'Texas' },
      estimatedSalary: { currency: 'USD', duration: 'P1Y', median: 95_970, percentile90: 127_950 },
    });
    expect(schema.alternateName).toContain('RN');
    // The heading already says "Registered Nurse"; repeating it as an
    // alternate name would only pad the markup.
    expect(schema.alternateName).not.toContain('Registered Nurses');
  });
});
