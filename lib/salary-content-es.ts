/**
 * Spanish editorial layer over the same wage profile the English pages use.
 *
 * Every sentence is composed from a figure the page already shows: median,
 * take-home, location quotient, price level, household income. The language
 * is US Spanish about US jobs — 401(k), FICA, IRS stay in English and are
 * glossed once. This is not a word-for-word translation of the English page.
 */
import type { OccupationWageProfile } from '@/lib/calculations/salary';
import { taxesOnWagesLabel } from '@/lib/calculations/salary';
import type { SalaryQuestion } from '@/lib/salary-content';
import { formatMoneyLocale, formatNumberLocale } from '@/lib/i18n/format';
import { stateAreaLabelEs } from '@/lib/location/states-es';
import { oewsIndex } from '@/lib/data/bls-oews-snapshot';
import {
  occupationAliasesEs,
  occupationArticleEs,
  occupationPluralEs,
  occupationSingularEs,
} from '@/lib/salary-naming-es';

export { occupationAliasesEs, occupationPluralEs, occupationSingularEs };

const LOCALE = 'es-US' as const;

function money(value: number): string {
  return formatMoneyLocale(LOCALE, value, 0);
}

function hourly(value: number): string {
  return formatMoneyLocale(LOCALE, value, 2);
}

function percent(value: number, digits = 1): string {
  return `${formatNumberLocale(LOCALE, Math.abs(value), { maximumFractionDigits: digits })} %`;
}

function count(value: number): string {
  return formatNumberLocale(LOCALE, value);
}

function whereLabel(profile: OccupationWageProfile): string {
  return profile.area === 'US' ? 'Estados Unidos' : stateAreaLabelEs(profile.area);
}

function inWhere(profile: OccupationWageProfile): string {
  return profile.area === 'US' ? 'en Estados Unidos' : `en ${stateAreaLabelEs(profile.area)}`;
}

function taxesEs(profile: OccupationWageProfile): string {
  const label = taxesOnWagesLabel(profile.takeHome);
  if (label === 'federal, state and FICA tax') return 'impuestos federales, estatales y FICA';
  if (label === 'federal and FICA tax') return 'impuestos federales y FICA';
  return 'impuestos';
}

export function occupationHeadingEs(occupation: { code: string; displayTitle: string }): string {
  const singular = occupationSingularEs(occupation);
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

export function salaryTitleEs(profile: OccupationWageProfile): string {
  const name = occupationSingularEs(profile.occupation);
  const article = occupationArticleEs(profile.occupation);
  const where = whereLabel(profile);
  const withQuestion = `¿Cuánto gana ${article} ${name} en ${where}?`;
  if (withQuestion.length <= 56) return withQuestion;
  const full = `Sueldo de ${name} ${inWhere(profile)}`;
  if (full.length <= 56) return full;
  return `Sueldo de ${name} en ${where}`;
}

export function salaryDescriptionEs(profile: OccupationWageProfile): string {
  const singular = occupationSingularEs(profile.occupation);
  const article = occupationArticleEs(profile.occupation);
  const where = whereLabel(profile);
  const median = profile.wage.annualMedian;
  const hourlyMedian = profile.wage.hourlyMedian;
  if (median === null) {
    return `Lo que gana ${article} ${singular} ${inWhere(profile)}, según la encuesta salarial OEWS de BLS ${profile.referenceLabel}, con percentiles y sueldo neto.`;
  }
  const takeHome = profile.takeHome
    ? `, unos ${money(profile.takeHome.monthly)} al mes después de ${taxesEs(profile)}`
    : '';
  const hourlyBit = hourlyMedian === null ? '' : ` (${hourly(hourlyMedian)} por hora)`;
  return `${article === 'un' ? 'Un' : 'Una'} ${singular} ${inWhere(profile)} gana una mediana de ${money(median)} al año${hourlyBit}${takeHome}. Cifras BLS ${profile.referenceLabel}.`;
}

/**
 * The first paragraph an answer engine should cite: one occupation, one place,
 * one official median, one take-home figure, one source name.
 */
export function salaryDirectAnswerEs(profile: OccupationWageProfile): string {
  const singular = occupationSingularEs(profile.occupation);
  const article = occupationArticleEs(profile.occupation);
  const Article = article === 'un' ? 'Un' : 'Una';
  const where = inWhere(profile);
  const median = profile.wage.annualMedian;
  const hourlyMedian = profile.wage.hourlyMedian;
  if (median === null && hourlyMedian === null) {
    return `BLS no publicó una mediana salarial para ${singular} ${where} en ${profile.referenceLabel}. La encuesta suprime cifras cuando no puede publicarlas sin identificar a los encuestados.`;
  }
  if (median === null && hourlyMedian !== null) {
    return `${Article} ${singular} ${where} gana una mediana de ${hourly(hourlyMedian)} por hora, según la encuesta OEWS de BLS de ${profile.referenceLabel}. BLS no publica un sueldo anual para esta ocupación porque las horas al año varían demasiado.`;
  }
  const pay = `${Article} ${singular} ${where} gana una mediana de ${money(median!)} al año${hourlyMedian === null ? '' : ` (${hourly(hourlyMedian)} por hora)`}`;
  const net = profile.takeHome
    ? `, unos ${money(profile.takeHome.monthly)} al mes después de ${taxesEs(profile)}`
    : '';
  const jobs = profile.employment.total === null
    ? ''
    : ` BLS contó ${count(profile.employment.total)} empleos de este tipo ${where} en ${profile.referenceLabel}.`;
  return `${pay}${net}. Cifra de la encuesta salarial ocupacional de BLS.${jobs}`;
}

export function salaryIntroEs(profile: OccupationWageProfile): string {
  return salaryDirectAnswerEs(profile);
}

export function salaryQuestionsEs(profile: OccupationWageProfile): SalaryQuestion[] {
  const singular = occupationSingularEs(profile.occupation);
  const article = occupationArticleEs(profile.occupation);
  const plural = occupationPluralEs(profile.occupation);
  const where = whereLabel(profile);
  const place = inWhere(profile);
  const questions: SalaryQuestion[] = [];
  const median = profile.wage.annualMedian;

  if (median !== null) {
    const hourlyMedian = profile.wage.hourlyMedian;
    questions.push({
      question: `¿Cuánto gana ${article} ${singular} ${place}?`,
      answer: [
        `La mediana salarial de ${plural} ${place} es ${money(median)} al año${hourlyMedian === null ? '' : `, o ${hourly(hourlyMedian)} por hora`}.`,
        `La mitad gana más y la mitad gana menos. La cifra sale de la encuesta OEWS de la Oficina de Estadísticas Laborales (BLS) para ${profile.referenceLabel}.`,
      ],
    });
    if (profile.wage.annualMean !== null) {
      questions.push({
        question: `¿Cuál es el sueldo promedio de ${article} ${singular} ${place}?`,
        answer: [
          `La media (promedio) de BLS para ${plural} ${place} es ${money(profile.wage.annualMean)} al año. La mediana es ${money(median)}.`,
          'La media sube cuando un grupo menor con sueldos altos jala el promedio. Para un cheque típico, la mediana es el mejor centro.',
        ],
      });
    }
    if (hourlyMedian !== null) {
      questions.push({
        question: `¿Cuánto gana por hora ${article} ${singular} ${place}?`,
        answer: [
          `La mediana por hora es ${hourly(hourlyMedian)}. A tiempo completo eso encaja con unos ${money(median)} al año.`,
          `BLS ${profile.referenceLabel}; la cifra por hora y la anual salen de la misma encuesta.`,
        ],
      });
    }
  } else if (profile.wage.hourlyMedian !== null) {
    questions.push({
      question: `¿Cuánto gana por hora ${article} ${singular} ${place}?`,
      answer: [
        `La mediana por hora de ${plural} ${place} es ${hourly(profile.wage.hourlyMedian)}, según BLS ${profile.referenceLabel}.`,
        'BLS no publica un sueldo anual para esta ocupación porque las horas trabajadas en un año varían demasiado para que un total signifique algo.',
      ],
    });
  }

  if (profile.takeHome) {
    const takeHome = profile.takeHome;
    questions.push({
      question: `¿Cuánto queda neto para ${article} ${singular} ${place}?`,
      answer: [
        `Sobre la mediana de ${money(takeHome.grossAnnual)}, un declarante soltero con la deducción estándar se queda con unos ${money(takeHome.annual)} al año, o ${money(takeHome.monthly)} al mes.`,
        `Eso es después de ${taxesEs(profile)}, una tasa efectiva de ${formatNumberLocale(LOCALE, takeHome.effectiveTaxRate, { style: 'percent', maximumFractionDigits: 1 })}.`,
        takeHome.stateIncomeTax > 0
          ? `${where} se lleva ${money(takeHome.stateIncomeTax)} en impuesto estatal sobre salarios.`
          : `${where} no cobra impuesto estatal sobre salarios, así que no se retiene nada por ese concepto.`,
      ],
    });
  }

  if (profile.versusNation) {
    const gap = profile.versusNation.differencePercent;
    questions.push({
      question: `¿Se gana más como ${singular} ${place} que en el resto del país?`,
      answer: [
        gap === 0
          ? `La mediana es igual a la nacional de ${money(profile.versusNation.nationalAnnualMedian)}.`
          : `${gap > 0 ? 'Sí' : 'No'}. La mediana ${place} está un ${percent(gap)} ${gap > 0 ? 'por encima' : 'por debajo'} de la mediana nacional de ${money(profile.versusNation.nationalAnnualMedian)}.`,
        profile.costAdjusted
          ? `El sueldo nominal es solo la mitad de la comparación: los precios ${place} están en ${formatNumberLocale(LOCALE, profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} frente a un promedio nacional de 100, así que lo que alcanza el dinero no es la misma diferencia que la del salario.`
          : 'El sueldo nominal es solo la mitad de la comparación; los impuestos estatales y los precios locales cambian lo que vale.',
      ],
    });
  }

  if (median !== null && profile.costAdjusted && profile.versusHousehold) {
    const ratio = profile.versusHousehold.ratio;
    questions.push({
      question: `¿Es ${money(median)} un buen sueldo ${place}?`,
      answer: [
        `Equivale a ${formatNumberLocale(LOCALE, ratio, { maximumFractionDigits: 2 })} veces el ingreso mediano del hogar de ${money(profile.versusHousehold.medianHouseholdIncome)}. Un hogar suele tener más de un ingreso, así que un solo sueldo a este nivel rinde más de lo que el ratio sugiere.`,
        `Los precios ${place} están en ${formatNumberLocale(LOCALE, profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} frente a 100 nacional${profile.costAdjusted.housingRentsRpp === null ? '' : `, con rentas en ${formatNumberLocale(LOCALE, profile.costAdjusted.housingRentsRpp, { maximumFractionDigits: 1 })}`}, así que ${money(median)} aquí compra lo que ${money(profile.costAdjusted.adjustedAnnualMedian)} compra a precios promedio del país.`,
      ],
    });
  }

  const top = profile.wage.annual.p90;
  if (top !== null && median !== null) {
    questions.push({
      question: `¿Cuánto ganan los ${plural} mejor pagados ${place}?`,
      answer: [
        `El diez por ciento de arriba gana ${money(top)} al año o más, frente a ${money(profile.wage.annual.p10 ?? median)} en el diez por ciento de abajo.`,
        `La experiencia, la especialidad, el empleador y la zona de ${where} mueven el sueldo dentro de ese rango; la encuesta reporta la dispersión, no la causa.`,
      ],
    });
  } else if (profile.wage.atOrAboveWageCap) {
    questions.push({
      question: `¿Cuánto ganan los ${plural} mejor pagados ${place}?`,
      answer: [
        'BLS reporta la parte alta de esta ocupación solo como “igual o por encima del tope de la encuesta”, así que los sueldos más altos no salen como número.',
        'Eso ocurre cuando hay suficientes personas por encima del tope como para que publicar una cifra las identificara.',
      ],
    });
  }

  if (profile.employment.total !== null) {
    questions.push({
      question: `¿Cuántos ${plural} hay ${place}?`,
      answer: [
        `La encuesta contó ${count(profile.employment.total)} empleos de este tipo ${place} en ${profile.referenceLabel}.`,
        profile.employment.locationQuotient === null
          ? 'Cuenta empleos asalariados, así que los trabajadores por cuenta propia quedan fuera.'
          : `Eso hace que la ocupación esté ${profile.employment.locationQuotient === 1 ? 'igual de concentrada aquí que a nivel nacional' : `un ${percent((profile.employment.locationQuotient - 1) * 100, 0)} ${profile.employment.locationQuotient > 1 ? 'más' : 'menos'} concentrada aquí que en el país`}. Cuenta empleos asalariados; los autónomos quedan fuera.`,
      ],
    });
  }

  return questions;
}

export function occupationJsonLdEs(profile: OccupationWageProfile, url: string) {
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

  const spanishName = occupationHeadingEs(profile.occupation);
  const aliases = [...new Set([
    profile.occupation.displayTitle,
    profile.occupation.title,
    occupationSingularEs(profile.occupation),
    ...occupationAliasesEs(profile.occupation),
  ])].filter((name) => name !== spanishName);

  return {
    '@context': 'https://schema.org',
    '@type': 'Occupation',
    name: spanishName,
    alternateName: aliases,
    occupationalCategory: profile.occupation.code,
    description: salaryDescriptionEs(profile),
    inLanguage: 'es-US',
    url,
    dateModified: `${oewsIndex.observationPeriod}-01`,
    ...(profile.area === 'US'
      ? { occupationLocation: { '@type': 'Country', name: 'United States' } }
      : { occupationLocation: { '@type': 'State', name: whereLabel(profile) } }),
    ...(Object.keys(distribution).length > 4 ? { estimatedSalary: distribution } : {}),
  };
}

export function costContextEs(profile: OccupationWageProfile): {
  heading: string;
  lede: string;
  rents: string | null;
  household: string | null;
  concentration: string | null;
} | null {
  if (!profile.costAdjusted || profile.wage.annualMedian === null) return null;
  const where = whereLabel(profile);
  const median = profile.wage.annualMedian;
  return {
    heading: `Lo que valen ${money(median)} ${inWhere(profile)}`,
    lede: `Los precios en ${where} están en ${formatNumberLocale(LOCALE, profile.costAdjusted.allItemsRpp, { maximumFractionDigits: 1 })} frente a un promedio nacional de 100, así que ${money(median)} aquí compra lo que ${money(profile.costAdjusted.adjustedAnnualMedian)} compra a precios promedio del país.`,
    rents: profile.costAdjusted.housingRentsRpp === null
      ? null
      : `Las rentas están en ${formatNumberLocale(LOCALE, profile.costAdjusted.housingRentsRpp, { maximumFractionDigits: 1 })} frente a 100, el componente que más se mueve entre estados.`,
    household: profile.versusHousehold
      ? `El hogar mediano en ${where} ingresa ${money(profile.versusHousehold.medianHouseholdIncome)}, así que la mediana de esta ocupación es ${formatNumberLocale(LOCALE, profile.versusHousehold.ratio, { maximumFractionDigits: 2 })} veces eso, con un solo ingreso.`
      : null,
    concentration: profile.employment.concentrationVsNationPercent === null
      ? null
      : profile.employment.concentrationVsNationPercent === 0
        ? `El trabajo está tan concentrado en ${where} como a nivel nacional.`
        : `Está un ${percent(Math.abs(profile.employment.concentrationVsNationPercent), 0)} ${profile.employment.concentrationVsNationPercent > 0 ? 'más' : 'menos'} concentrado en ${where} que en el país.`,
  };
}
