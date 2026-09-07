/**
 * Every word a reader sees in a commercial module, in both locales.
 *
 * Written rather than translated. The Spanish is for a US Spanish speaker
 * dealing with a US contractor, so it says "estimado" and "cotización" the way
 * those words are actually used here, and it does not translate a partner's
 * name or a legal term that only exists in English.
 *
 * The `Localized` type makes a missing Spanish string a build error, which is
 * the point: a half-translated consent flow is worse than an English one,
 * because the reader cannot tell which half they understood.
 */
import { localized, type Localized } from '@/lib/i18n/locales';

export const UI_STRINGS = {
  intentQuestion: localized({
    'en-US': 'What are you planning to do?',
    'es-US': '¿Qué piensa hacer?',
  }),
  intentHire: localized({ 'en-US': 'Hire a professional', 'es-US': 'Contratar a un profesional' }),
  intentDiy: localized({ 'en-US': 'Do it myself', 'es-US': 'Hacerlo yo mismo' }),
  intentResearch: localized({ 'en-US': 'Just researching', 'es-US': 'Solo estoy investigando' }),

  leadHeading: localized({
    'en-US': 'Planning to hire someone?',
    'es-US': '¿Piensa contratar a alguien?',
  }),
  leadBody: localized({
    'en-US': 'Compare estimates from professionals serving your area. No obligation to hire.',
    'es-US': 'Compare estimados de profesionales que atienden su área. Sin obligación de contratar.',
  }),
  leadCta: localized({ 'en-US': 'Get local estimates', 'es-US': 'Pedir estimados locales' }),

  zipLabel: localized({ 'en-US': 'ZIP code', 'es-US': 'Código postal' }),
  zipHint: localized({
    'en-US': 'We check whether a professional covers your area before asking for anything else.',
    'es-US': 'Verificamos si un profesional cubre su área antes de pedirle cualquier otro dato.',
  }),
  checkCoverage: localized({ 'en-US': 'Check my area', 'es-US': 'Verificar mi área' }),
  checking: localized({ 'en-US': 'Checking…', 'es-US': 'Verificando…' }),

  noCoverage: localized({
    'en-US': 'We do not currently have a professional matching option for this project in your area. Your CostAnswer estimate is unaffected.',
    'es-US': 'Por ahora no tenemos una opción para conectarlo con profesionales para este proyecto en su área. Su estimado de CostAnswer no cambia.',
  }),
  backToTool: localized({ 'en-US': 'Back to the calculator', 'es-US': 'Volver a la calculadora' }),

  stepProject: localized({ 'en-US': 'About the project', 'es-US': 'Sobre el proyecto' }),
  stepContact: localized({ 'en-US': 'How to reach you', 'es-US': 'Cómo comunicarse con usted' }),
  stepConsent: localized({ 'en-US': 'Your permission', 'es-US': 'Su permiso' }),

  homeownerLabel: localized({ 'en-US': 'Do you own this property?', 'es-US': '¿Usted es dueño de esta propiedad?' }),
  yes: localized({ 'en-US': 'Yes', 'es-US': 'Sí' }),
  no: localized({ 'en-US': 'No', 'es-US': 'No' }),

  timeframeLabel: localized({ 'en-US': 'When do you want the work done?', 'es-US': '¿Cuándo quiere que se haga el trabajo?' }),
  timeframeImmediately: localized({ 'en-US': 'As soon as possible', 'es-US': 'Lo antes posible' }),
  timeframeMonth: localized({ 'en-US': 'Within a month', 'es-US': 'Dentro de un mes' }),
  timeframeThreeMonths: localized({ 'en-US': 'Within three months', 'es-US': 'Dentro de tres meses' }),
  timeframeSixMonths: localized({ 'en-US': 'Within six months', 'es-US': 'Dentro de seis meses' }),
  timeframePlanning: localized({ 'en-US': 'Still planning', 'es-US': 'Todavía estoy planeando' }),

  propertyTypeLabel: localized({ 'en-US': 'Property type', 'es-US': 'Tipo de propiedad' }),
  propertySingleFamily: localized({ 'en-US': 'Single-family home', 'es-US': 'Casa unifamiliar' }),
  propertyCondo: localized({ 'en-US': 'Condo', 'es-US': 'Condominio' }),
  propertyTownhouse: localized({ 'en-US': 'Townhouse', 'es-US': 'Casa adosada' }),
  propertyMultiFamily: localized({ 'en-US': 'Multi-family', 'es-US': 'Edificio multifamiliar' }),
  propertyMobile: localized({ 'en-US': 'Mobile or manufactured home', 'es-US': 'Casa móvil o prefabricada' }),

  workTypeLabel: localized({ 'en-US': 'Is this a repair or a replacement?', 'es-US': '¿Es una reparación o un reemplazo?' }),
  workRepair: localized({ 'en-US': 'Repair', 'es-US': 'Reparación' }),
  workReplacement: localized({ 'en-US': 'Replacement', 'es-US': 'Reemplazo' }),
  workNew: localized({ 'en-US': 'New installation', 'es-US': 'Instalación nueva' }),

  firstNameLabel: localized({ 'en-US': 'First name', 'es-US': 'Nombre' }),
  lastNameLabel: localized({ 'en-US': 'Last name', 'es-US': 'Apellido' }),
  phoneLabel: localized({ 'en-US': 'Phone number', 'es-US': 'Número de teléfono' }),
  emailLabel: localized({ 'en-US': 'Email address', 'es-US': 'Correo electrónico' }),
  contactHint: localized({
    'en-US': 'A professional uses this to reach you about this project. We ask for nothing we do not need.',
    'es-US': 'Un profesional usa estos datos para comunicarse con usted sobre este proyecto. No pedimos nada que no necesitemos.',
  }),

  continueLabel: localized({ 'en-US': 'Continue', 'es-US': 'Continuar' }),
  backLabel: localized({ 'en-US': 'Back', 'es-US': 'Atrás' }),
  submitLabel: localized({ 'en-US': 'Send my request', 'es-US': 'Enviar mi solicitud' }),
  submitting: localized({ 'en-US': 'Sending…', 'es-US': 'Enviando…' }),

  requiredField: localized({ 'en-US': 'This field is required.', 'es-US': 'Este campo es obligatorio.' }),
  consentRequired: localized({
    'en-US': 'Tick the box so we can send your request.',
    'es-US': 'Marque la casilla para que podamos enviar su solicitud.',
  }),

  successHeading: localized({ 'en-US': 'Request sent', 'es-US': 'Solicitud enviada' }),
  whatHappensNext: localized({ 'en-US': 'What happens next', 'es-US': 'Qué pasa después' }),
  nextSteps: localized({
    'en-US': 'A professional may call, text or email you about this project. Nobody has quoted the job yet, and nothing here commits you to hiring anyone. CostAnswer has not checked or approved any individual contractor.',
    'es-US': 'Un profesional puede llamarlo, enviarle un mensaje o escribirle sobre este proyecto. Todavía nadie ha cotizado el trabajo y nada aquí lo obliga a contratar. CostAnswer no ha verificado ni aprobado a ningún contratista en particular.',
  }),
  estimateVsQuote: localized({
    'en-US': 'The number on this page is our estimate. A contractor quote is theirs, and it can differ for good reasons.',
    'es-US': 'El número de esta página es nuestro estimado. La cotización de un contratista es de ellos y puede ser distinta por buenas razones.',
  }),

  diyHeading: localized({ 'en-US': 'Doing it yourself?', 'es-US': '¿Lo va a hacer usted mismo?' }),
  diyBody: localized({
    'en-US': 'Materials and tools commonly needed for this project.',
    'es-US': 'Materiales y herramientas que normalmente se necesitan para este proyecto.',
  }),
  checkPrice: localized({ 'en-US': 'Check current price', 'es-US': 'Ver el precio actual' }),
  advertisingLabel: localized({ 'en-US': 'Advertising', 'es-US': 'Publicidad' }),
  paidPlacementNote: localized({
    'en-US': 'Order is influenced by compensation.',
    'es-US': 'El orden está influido por la compensación.',
  }),

  callHeading: localized({ 'en-US': 'Prefer to talk?', 'es-US': '¿Prefiere hablar por teléfono?' }),
  callBody: localized({
    'en-US': 'Call to request a local estimate.',
    'es-US': 'Llame para pedir un estimado local.',
  }),

  errorGeneric: localized({
    'en-US': 'Local estimate matching is temporarily unavailable. Your CostAnswer estimate is unaffected.',
    'es-US': 'La conexión con profesionales locales no está disponible en este momento. Su estimado de CostAnswer no cambia.',
  }),
} as const satisfies Record<string, Localized<string>>;

export type UiStringKey = keyof typeof UI_STRINGS;
