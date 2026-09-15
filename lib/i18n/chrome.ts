import type { Locale } from './locales';
import { localized, type Localized } from './locales';

export const CHROME = {
  skip: localized({ 'en-US': 'Skip to main content', 'es-US': 'Saltar al contenido' }),
  search: localized({ 'en-US': 'Search calculators', 'es-US': 'Buscar' }),
  salaries: localized({ 'en-US': 'Salaries', 'es-US': 'Salarios' }),
  jobCosts: localized({ 'en-US': 'Job costs', 'es-US': 'Costos de un trabajo' }),
  menu: localized({ 'en-US': 'Open site navigation', 'es-US': 'Abrir el menú' }),
  menuShort: localized({ 'en-US': 'Menu', 'es-US': 'Menú' }),
  explore: localized({ 'en-US': 'Explore', 'es-US': 'Explorar' }),
  english: localized({ 'en-US': 'English', 'es-US': 'English' }),
  spanish: localized({ 'en-US': 'Español', 'es-US': 'Español' }),
  language: localized({ 'en-US': 'Language', 'es-US': 'Idioma' }),
  topics: localized({ 'en-US': 'Topics', 'es-US': 'Temas' }),
  theSite: localized({ 'en-US': 'The site', 'es-US': 'El sitio' }),
  legal: localized({ 'en-US': 'Legal', 'es-US': 'Legal' }),
  about: localized({ 'en-US': 'About', 'es-US': 'Acerca de' }),
  faq: localized({ 'en-US': 'FAQ', 'es-US': 'Preguntas' }),
  methodology: localized({ 'en-US': 'Methodology', 'es-US': 'Metodología' }),
  dataSources: localized({ 'en-US': 'Data sources', 'es-US': 'Fuentes de datos' }),
  contact: localized({ 'en-US': 'Contact', 'es-US': 'Contacto' }),
  terms: localized({ 'en-US': 'User agreement', 'es-US': 'Términos' }),
  privacy: localized({ 'en-US': 'Privacy', 'es-US': 'Privacidad' }),
  disclosure: localized({ 'en-US': 'Disclosure', 'es-US': 'Divulgación' }),
  whatJobsPay: localized({ 'en-US': 'What jobs pay', 'es-US': 'Lo que pagan los trabajos' }),
  payByState: localized({ 'en-US': 'Pay by state', 'es-US': 'Sueldo por estado' }),
  calculatorsEn: localized({ 'en-US': 'Calculators', 'es-US': 'Calculadoras (inglés)' }),
  footerLegal: localized({
    'en-US': 'Independently published calculators, not a licensed advisory firm. Estimates for informational use. Not legal, tax, medical, or financial advice.',
    'es-US': 'Calculadoras publicadas de forma independiente, no un despacho con licencia. Cifras informativas. No son asesoría legal, fiscal, médica ni financiera.',
  }),
} as const satisfies Record<string, Localized<string>>;

export function chrome(key: keyof typeof CHROME, locale: Locale): string {
  return CHROME[key][locale];
}
