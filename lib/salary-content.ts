/**
 * The editorial layer over the wage data.
 *
 * OEWS titles are classification labels, not the words people use. "Heavy and
 * Tractor-Trailer Truck Drivers" is what BLS measured; "truck driver" is what
 * someone types. Two things bridge that here, and both are written by hand
 * rather than derived, because deriving them at scale produces confident
 * nonsense — a rule that turns "Waiters and Waitresses" into "Waitress" is
 * worse than no rule.
 *
 * `singular` names one person in the job, for headings and questions.
 * `aliases` are the other real names for the same job. Aliases appear in
 * sentences on the page and in site search. They never become alternate URLs:
 * one job, one page, whatever a reader calls it.
 *
 * Coverage is deliberately partial. These are the occupations carrying most of
 * the country's employment, and so most of the searching. Anything absent falls
 * back to the official title, which is accurate if less natural.
 */
import type { OewsOccupation } from '@/lib/data/bls-oews';

export type OccupationNaming = {
  singular: string;
  /**
   * Written out only where pluralising the last word is wrong.
   *
   * "truck driver" becomes "truck drivers" mechanically. "accountant or
   * auditor" does not — the rule reaches only the last word and leaves
   * "accountant or auditors" — so those are spelled out.
   */
  plural?: string;
  aliases?: readonly string[];
};

export const OCCUPATION_NAMING: Record<string, OccupationNaming> = {
  '11-1011': { singular: 'chief executive', aliases: ['CEO'] },
  '11-1021': { singular: 'general or operations manager', aliases: ['operations manager', 'general manager'] },
  '11-2021': { singular: 'marketing manager' },
  '11-2022': { singular: 'sales manager' },
  '11-3021': { singular: 'computer and information systems manager', aliases: ['IT manager', 'IT director'] },
  '11-3031': { singular: 'financial manager', aliases: ['finance manager'] },
  '11-3071': { singular: 'transportation or logistics manager', aliases: ['logistics manager'] },
  '11-3121': { singular: 'human resources manager', aliases: ['HR manager'] },
  '11-9021': { singular: 'construction manager' },
  '11-9032': { singular: 'school principal or district administrator', plural: 'school principals or district administrators', aliases: ['principal', 'school administrator'] },
  '11-9111': { singular: 'medical or health services manager', aliases: ['healthcare administrator', 'hospital administrator'] },
  '11-9141': { singular: 'property manager', aliases: ['real estate manager'] },
  '13-1020': { singular: 'buyer or purchasing agent', plural: 'buyers or purchasing agents', aliases: ['purchasing agent', 'buyer'] },
  '13-1031': { singular: 'claims adjuster', aliases: ['insurance adjuster'] },
  '13-1041': { singular: 'compliance officer' },
  '13-1071': { singular: 'human resources specialist', aliases: ['HR specialist', 'recruiter'] },
  '13-1082': { singular: 'project management specialist', aliases: ['project manager'] },
  '13-1111': { singular: 'management analyst', aliases: ['management consultant'] },
  '13-1151': { singular: 'training and development specialist', aliases: ['corporate trainer'] },
  '13-1161': { singular: 'market research analyst', aliases: ['marketing specialist'] },
  '13-2011': { singular: 'accountant or auditor', plural: 'accountants or auditors', aliases: ['accountant', 'CPA', 'auditor'] },
  '13-2051': { singular: 'financial analyst', aliases: ['investment analyst'] },
  '15-1211': { singular: 'computer systems analyst', aliases: ['systems analyst'] },
  '15-1232': { singular: 'computer user support specialist', aliases: ['IT support', 'help desk technician'] },
  '15-1244': { singular: 'network and computer systems administrator', aliases: ['network administrator', 'sysadmin'] },
  '15-1252': { singular: 'software developer', aliases: ['software engineer', 'programmer'] },
  '15-1253': { singular: 'software quality assurance analyst', aliases: ['QA engineer', 'test engineer'] },
  '15-1254': { singular: 'web developer' },
  '15-2051': { singular: 'data scientist' },
  '17-2051': { singular: 'civil engineer' },
  '17-2071': { singular: 'electrical engineer' },
  '17-2112': { singular: 'industrial engineer' },
  '17-2141': { singular: 'mechanical engineer' },
  '19-4021': { singular: 'biological technician' },
  '21-1012': { singular: 'school or career counselor', aliases: ['guidance counselor', 'career counselor'] },
  '21-1018': { singular: 'substance abuse or mental health counselor', aliases: ['mental health counselor', 'addiction counselor'] },
  '21-1021': { singular: 'child, family or school social worker', aliases: ['social worker'] },
  '21-1093': { singular: 'social and human service assistant', aliases: ['case worker'] },
  '23-1011': { singular: 'lawyer', aliases: ['attorney'] },
  '23-2011': { singular: 'paralegal', aliases: ['legal assistant'] },
  '25-2011': { singular: 'preschool teacher' },
  '25-2021': { singular: 'elementary school teacher', aliases: ['grade school teacher'] },
  '25-2022': { singular: 'middle school teacher' },
  '25-2031': { singular: 'high school teacher', aliases: ['secondary school teacher'] },
  '25-2058': { singular: 'special education teacher' },
  '25-3021': { singular: 'self-enrichment teacher' },
  '25-3031': { singular: 'substitute teacher' },
  '25-9045': { singular: 'teaching assistant', aliases: ['teacher aide', 'paraprofessional'] },
  '27-1024': { singular: 'graphic designer' },
  '29-1051': { singular: 'pharmacist' },
  '29-1141': { singular: 'registered nurse', aliases: ['RN', 'nurse'] },
  '29-1171': { singular: 'nurse practitioner', aliases: ['NP'] },
  '29-1215': { singular: 'family medicine physician', aliases: ['family doctor', 'GP', 'primary care doctor'] },
  '29-1214': { singular: 'emergency medicine physician', aliases: ['ER doctor', 'emergency room doctor'] },
  '29-1216': { singular: 'internal medicine physician', aliases: ['internist'] },
  '29-1071': { singular: 'physician assistant', aliases: ['PA'] },
  '29-1292': { singular: 'dental hygienist' },
  '29-2010': { singular: 'clinical laboratory technologist', aliases: ['medical lab technician'] },
  '29-2052': { singular: 'pharmacy technician', aliases: ['pharmacy tech'] },
  '29-2061': { singular: 'licensed practical nurse', aliases: ['LPN', 'LVN', 'licensed vocational nurse'] },
  '29-2055': { singular: 'surgical technologist', aliases: ['surgical tech'] },
  '31-1120': { singular: 'home health or personal care aide', aliases: ['home health aide', 'caregiver'] },
  '31-1131': { singular: 'nursing assistant', aliases: ['CNA', 'certified nursing assistant'] },
  '31-9091': { singular: 'dental assistant' },
  '31-9092': { singular: 'medical assistant' },
  '33-2011': { singular: 'firefighter' },
  '33-3012': { singular: 'correctional officer', aliases: ['prison guard'] },
  '33-3051': { singular: 'police officer', aliases: ['cop', 'sheriff deputy'] },
  '33-9032': { singular: 'security guard' },
  '35-1012': { singular: 'food service supervisor', aliases: ['restaurant supervisor'] },
  '35-2011': { singular: 'fast food cook' },
  '35-2012': { singular: 'institution or cafeteria cook', aliases: ['cafeteria cook'] },
  '35-2014': { singular: 'restaurant cook', aliases: ['line cook', 'cook'] },
  '35-2021': { singular: 'food preparation worker', aliases: ['food prep'] },
  '35-3011': { singular: 'bartender' },
  '35-3023': { singular: 'fast food or counter worker', aliases: ['fast food worker'] },
  '35-3031': { singular: 'waiter or waitress', plural: 'waiters or waitresses', aliases: ['server'] },
  '35-9011': { singular: 'dining room attendant', aliases: ['busser', 'barback'] },
  '35-9021': { singular: 'dishwasher' },
  '35-9031': { singular: 'restaurant host or hostess', plural: 'restaurant hosts or hostesses', aliases: ['host', 'hostess'] },
  '37-2011': { singular: 'janitor', aliases: ['custodian', 'cleaner'] },
  '37-2012': { singular: 'maid or housekeeping cleaner', plural: 'maids or housekeeping cleaners', aliases: ['housekeeper'] },
  '37-3011': { singular: 'landscaping and groundskeeping worker', aliases: ['landscaper', 'groundskeeper'] },
  '39-3091': { singular: 'amusement and recreation attendant' },
  '39-5012': { singular: 'hairdresser or cosmetologist', plural: 'hairdressers or cosmetologists', aliases: ['hairstylist', 'barber', 'cosmetologist'] },
  '39-9011': { singular: 'childcare worker', aliases: ['daycare worker', 'nanny'] },
  '39-9031': { singular: 'personal trainer', aliases: ['fitness instructor'] },
  '39-9032': { singular: 'recreation worker' },
  '41-1011': { singular: 'retail supervisor', aliases: ['store manager', 'retail manager'] },
  '41-2011': { singular: 'cashier' },
  '41-2021': { singular: 'counter or rental clerk' },
  '41-2031': { singular: 'retail salesperson', aliases: ['sales associate', 'retail worker'] },
  '41-3021': { singular: 'insurance sales agent', aliases: ['insurance agent'] },
  '41-3031': { singular: 'securities or financial services sales agent', aliases: ['financial advisor', 'stockbroker'] },
  '41-3091': { singular: 'services sales representative', aliases: ['sales rep'] },
  '41-4012': { singular: 'wholesale and manufacturing sales representative', aliases: ['outside sales rep'] },
  '43-1011': { singular: 'office and administrative support supervisor', aliases: ['office manager'] },
  '43-3021': { singular: 'billing clerk' },
  '43-3031': { singular: 'bookkeeper', aliases: ['bookkeeping clerk', 'accounting clerk'] },
  '43-3071': { singular: 'bank teller', aliases: ['teller'] },
  '43-4051': { singular: 'customer service representative', aliases: ['customer service rep', 'call center agent'] },
  '43-4171': { singular: 'receptionist', aliases: ['front desk clerk'] },
  '43-5052': { singular: 'mail carrier', aliases: ['postal worker', 'mailman'] },
  '43-5061': { singular: 'production planning clerk' },
  '43-5071': { singular: 'shipping and receiving clerk', aliases: ['warehouse clerk'] },
  '43-6011': { singular: 'executive assistant', aliases: ['executive secretary'] },
  '43-6013': { singular: 'medical secretary', aliases: ['medical administrative assistant'] },
  '43-6014': { singular: 'administrative assistant', aliases: ['secretary', 'admin assistant'] },
  '43-9061': { singular: 'office clerk' },
  '47-1011': { singular: 'construction supervisor', aliases: ['construction foreman'] },
  '47-2031': { singular: 'carpenter' },
  '47-2061': { singular: 'construction laborer', aliases: ['construction worker'] },
  '47-2073': { singular: 'heavy equipment operator', aliases: ['operating engineer'] },
  '47-2111': { singular: 'electrician' },
  '47-2152': { singular: 'plumber', aliases: ['pipefitter', 'steamfitter'] },
  '49-1011': { singular: 'maintenance supervisor' },
  '49-3023': { singular: 'auto mechanic', aliases: ['automotive technician', 'car mechanic'] },
  '49-9021': { singular: 'HVAC technician', aliases: ['HVAC tech', 'air conditioning mechanic'] },
  '49-9041': { singular: 'industrial machinery mechanic', aliases: ['industrial mechanic', 'millwright'] },
  '49-9071': { singular: 'maintenance and repair worker', aliases: ['maintenance technician', 'handyman'] },
  '51-1011': { singular: 'production supervisor' },
  '51-2090': { singular: 'assembler or fabricator', plural: 'assemblers or fabricators', aliases: ['assembly worker'] },
  '51-4121': { singular: 'welder', aliases: ['cutter', 'solderer'] },
  '51-9061': { singular: 'quality inspector', aliases: ['inspector', 'quality control inspector'] },
  '51-9111': { singular: 'packaging machine operator' },
  '53-1047': { singular: 'transportation and material moving supervisor', aliases: ['warehouse supervisor'] },
  '53-3031': { singular: 'driver/sales worker', aliases: ['delivery driver'] },
  '53-3032': { singular: 'truck driver', aliases: ['semi driver', 'tractor-trailer driver', 'CDL driver'] },
  '53-3033': { singular: 'light truck driver', aliases: ['delivery driver', 'van driver'] },
  '53-3051': { singular: 'school bus driver' },
  '53-7051': { singular: 'forklift operator', aliases: ['industrial truck operator'] },
  '53-7061': { singular: 'vehicle cleaner', aliases: ['car washer'] },
  '53-7062': { singular: 'laborer or material mover', plural: 'laborers or material movers', aliases: ['warehouse worker', 'freight handler'] },
  '53-7064': { singular: 'packer or packager', plural: 'packers or packagers', aliases: ['packer'] },
  '53-7065': { singular: 'stocker or order filler', plural: 'stockers or order fillers', aliases: ['stocker', 'order picker'] },
};

/** How one person in the job is named, falling back to the official title. */
export function occupationSingular(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): string {
  return OCCUPATION_NAMING[occupation.code]?.singular ?? occupation.displayTitle;
}

const TITLE_CASE_MINOR_WORDS = new Set(['a', 'an', 'and', 'or', 'of', 'in', 'the', 'for', 'to', 'at', 'by', 'with']);

/**
 * The singular name as a heading reads it.
 *
 * Curated names are written in running-text case so they can sit inside a
 * sentence; a heading wants title case. Minor words stay lowercase unless they
 * open the phrase, and anything already carrying a capital — an acronym, or an
 * official title falling through uncurated — is left exactly as written.
 */
export function occupationHeadingName(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): string {
  const naming = OCCUPATION_NAMING[occupation.code];
  if (!naming) return occupation.displayTitle;
  return naming.singular
    .split(' ')
    .map((word, index) => {
      if (word !== word.toLowerCase()) return word;
      if (index > 0 && TITLE_CASE_MINOR_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function pluraliseWord(word: string): string {
  if (/(s|sh|ch|x|z)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/**
 * How the job is named when talking about more than one person.
 *
 * Questions read "do truck drivers earn more" rather than "do heavy and
 * tractor-trailer truck drivers earn more", because the second is not a
 * sentence anybody says or searches.
 */
export function occupationPlural(occupation: Pick<OewsOccupation, 'code' | 'displayTitle'>): string {
  const naming = OCCUPATION_NAMING[occupation.code];
  if (!naming) return occupation.displayTitle.toLowerCase();
  if (naming.plural) return naming.plural;
  const words = naming.singular.split(' ');
  words[words.length - 1] = pluraliseWord(words[words.length - 1]);
  return words.join(' ');
}

/** Whether a hand-written singular exists, so prose can pick its phrasing. */
export function hasCuratedName(occupation: Pick<OewsOccupation, 'code'>): boolean {
  return OCCUPATION_NAMING[occupation.code] !== undefined;
}

export function occupationAliases(occupation: Pick<OewsOccupation, 'code'>): readonly string[] {
  return OCCUPATION_NAMING[occupation.code]?.aliases ?? [];
}

/**
 * The article a singular name takes.
 *
 * Written out because "an HVAC technician" and "a university professor" both
 * break the first-letter-is-a-vowel rule, and the name is read aloud in the
 * heading of every page.
 */
export function indefiniteArticle(noun: string): 'a' | 'an' {
  const word = noun.trim().split(/[\s-]/)[0];
  if (/^(HVAC|HR|IT|RN|LPN|LVN|MRI|EMT|X-ray)$/i.test(word)) return 'an';
  if (/^(uni|use|user|eu|one)/i.test(word)) return 'a';
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * Questions a salary page should answer, each from different data.
 *
 * These are the phrasings people actually type, and they are on the page as
 * visible text before they are ever marked up — `FAQPage` structured data for
 * questions a reader cannot see is the cheap trick that gets a site's rich
 * results turned off. Every answer here is composed from a figure the page
 * already shows: the wage, the tax computed on it, the local price level, the
 * national comparison. None of them restate another in different words, which
 * is the difference between a page that answers five questions and a page that
 * pads one answer five times.
 */
import type { OccupationWageProfile } from '@/lib/calculations/salary';
import { taxesOnWagesLabel } from '@/lib/calculations/salary';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';

export type SalaryQuestion = { question: string; answer: string[] };

function money(value: number): string {
  return formatMoney(value, 0);
}

function percent(value: number, digits = 1): string {
  return `${formatNumber(Math.abs(value), { maximumFractionDigits: digits })}%`;
}

export function salaryQuestions(profile: OccupationWageProfile): SalaryQuestion[] {
  const singular = occupationSingular(profile.occupation);
  const article = indefiniteArticle(singular);
  const plural = occupationPlural(profile.occupation);
  const where = profile.area === 'US' ? 'the United States' : profile.areaLabel;
  const inWhere = profile.area === 'US' ? '' : ` in ${profile.areaLabel}`;
  const questions: SalaryQuestion[] = [];

  const median = profile.wage.annualMedian;
  if (median !== null) {
    const hourly = profile.wage.hourlyMedian;
    questions.push({
      question: `How much does ${article} ${singular} make${inWhere}?`,
      answer: [
        `The median wage for ${plural} in ${where} is ${money(median)} a year${hourly === null ? '' : `, or ${formatMoney(hourly)} an hour`}.`,
        `Half earn more than that and half earn less. The figure comes from the Bureau of Labor Statistics occupational wage survey for ${profile.referenceLabel}.`,
      ],
    });
  } else if (profile.wage.hourlyMedian !== null) {
    questions.push({
      question: `How much does ${article} ${singular} make an hour${inWhere}?`,
      answer: [
        `The median hourly wage for ${plural} in ${where} is ${formatMoney(profile.wage.hourlyMedian)}, from the Bureau of Labor Statistics survey for ${profile.referenceLabel}.`,
        'BLS publishes no annual figure for this occupation, because the hours worked in a year vary too much for one to mean anything.',
      ],
    });
  }

  if (profile.takeHome) {
    const takeHome = profile.takeHome;
    questions.push({
      question: `What is the take-home pay for ${article} ${singular}${inWhere}?`,
      answer: [
        `On the median wage of ${money(takeHome.grossAnnual)}, one filer taking the standard deduction keeps about ${money(takeHome.annual)} a year — roughly ${money(takeHome.monthly)} a month.`,
        `That is after ${taxesOnWagesLabel(takeHome)}, an effective rate of ${formatNumber(takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}.`,
        takeHome.stateIncomeTax > 0
          ? `${profile.areaLabel} takes ${money(takeHome.stateIncomeTax)} of it in state income tax.`
          : `${profile.areaLabel} levies no state income tax on wages, so nothing is withheld for it.`,
      ],
    });
  }

  if (profile.versusNation) {
    const gap = profile.versusNation.differencePercent;
    questions.push({
      question: `Do ${plural} earn more in ${profile.areaLabel} than in the rest of the country?`,
      answer: [
        gap === 0
          ? `The median is the same as the national median of ${money(profile.versusNation.nationalAnnualMedian)}.`
          : `${gap > 0 ? 'Yes' : 'No'} — the median${inWhere} is ${percent(gap)} ${gap > 0 ? 'above' : 'below'} the national median of ${money(profile.versusNation.nationalAnnualMedian)}.`,
        profile.costAdjusted
          ? `Nominal pay is only half the comparison: prices in ${profile.areaLabel} sit at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against a national 100, so the gap in what the money buys is different from the gap in the salary.`
          : 'Nominal pay is only half the comparison; state taxes and local prices change what it is worth.',
      ],
    });
  }

  if (median !== null && profile.costAdjusted && profile.versusHousehold) {
    const ratio = profile.versusHousehold.ratio;
    questions.push({
      question: `Is ${money(median)} a good salary in ${profile.areaLabel}?`,
      answer: [
        `It is ${formatNumber(ratio, { maximumFractionDigits: 2 })} times the median household income of ${money(profile.versusHousehold.medianHouseholdIncome)} — and a household often has more than one earner, so a single salary at this level goes further than the ratio alone suggests.`,
        `Prices in ${profile.areaLabel} run at ${formatNumber(profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} against a national average of 100${profile.costAdjusted.housingRentsRpp === null ? '' : `, with rents at ${formatNumber(profile.costAdjusted.housingRentsRpp, { maximumFractionDigits: 1 })}`}, so ${money(median)} here buys about what ${money(profile.costAdjusted.adjustedAnnualMedian)} buys at national average prices.`,
      ],
    });
  }

  const top = profile.wage.annual.p90;
  if (top !== null && median !== null) {
    questions.push({
      question: `What do the highest-paid ${plural} earn${inWhere}?`,
      answer: [
        `The top tenth earn ${money(top)} a year or more, against ${money(profile.wage.annual.p10 ?? median)} at the bottom tenth.`,
        `Experience, specialism, employer and the part of ${where} someone works in all move a wage inside that range; the survey reports the spread, not the reason for it.`,
      ],
    });
  } else if (profile.wage.atOrAboveWageCap) {
    questions.push({
      question: `What do the highest-paid ${plural} earn${inWhere}?`,
      answer: [
        `BLS reports the top of this occupation only as "at or above the survey's top code", so the highest wages are not published as a number.`,
        'That happens where enough people earn above the cap that publishing a figure would identify them.',
      ],
    });
  }

  if (profile.employment.total !== null) {
    questions.push({
      question: `How many ${plural} are there in ${where}?`,
      answer: [
        `The survey counted ${formatNumber(profile.employment.total)} of these jobs in ${where} for ${profile.referenceLabel}.`,
        profile.employment.locationQuotient === null
          ? 'It counts wage and salary jobs, so the self-employed are outside it.'
          : `That makes the occupation ${profile.employment.locationQuotient === 1 ? 'exactly as concentrated here as nationally' : `${percent((profile.employment.locationQuotient - 1) * 100, 0)} ${profile.employment.locationQuotient > 1 ? 'more' : 'less'} concentrated here than in the country as a whole`}. It counts wage and salary jobs, so the self-employed are outside it.`,
      ],
    });
  }

  return questions;
}

/**
 * `Occupation` structured data for the wage this page publishes.
 *
 * schema.org models exactly this — an occupation, a place, and a salary
 * distribution — so the percentiles the page already shows are stated in the
 * vocabulary built for them rather than left for a parser to infer.
 */
export function occupationJsonLd(profile: OccupationWageProfile, url: string) {
  const annual = profile.wage.annual;
  const distribution: Record<string, unknown> = {
    '@type': 'MonetaryAmountDistribution',
    name: 'base',
    currency: 'USD',
    duration: 'P1Y',
  };
  if (annual.p10 !== null) distribution.percentile10 = annual.p10;
  if (annual.p25 !== null) distribution.percentile25 = annual.p25;
  if (annual.median !== null) distribution.median = annual.median;
  if (annual.p75 !== null) distribution.percentile75 = annual.p75;
  if (annual.p90 !== null) distribution.percentile90 = annual.p90;

  return {
    '@context': 'https://schema.org',
    '@type': 'Occupation',
    name: profile.occupation.displayTitle,
    alternateName: [...new Set([profile.occupation.title, ...occupationAliases(profile.occupation)])]
      .filter((name) => name !== profile.occupation.displayTitle),
    occupationalCategory: profile.occupation.code,
    description: `Wages for ${profile.occupation.displayTitle.toLowerCase()} in ${profile.areaLabel}, from the BLS Occupational Employment and Wage Statistics survey for ${profile.referenceLabel}.`,
    url,
    ...(profile.area === 'US'
      ? { occupationLocation: { '@type': 'Country', name: 'United States' } }
      : { occupationLocation: { '@type': 'State', name: profile.areaLabel } }),
    ...(Object.keys(distribution).length > 4 ? { estimatedSalary: distribution } : {}),
  };
}
