/**
 * Versioned consent text.
 *
 * A consent record is only worth what the text says, so the text is data with a
 * version and a hash, not copy inside a component. When the wording changes the
 * old version stays here forever: a person who agreed to v1 agreed to v1, and
 * retroactively overwriting what they read is the one thing that turns a
 * consent record from evidence into a liability.
 *
 * Both locales are stored separately and linked by version. The Spanish text is
 * written for US Spanish speakers about a US service; it is not a word-for-word
 * rendering of the English, and it does not translate the partner's legal name.
 */
import { sha256 } from '@/lib/data/sha256';
import { localized, type Locale, type Localized } from '@/lib/i18n/locales';

export type ConsentScope = 'contact_about_this_request';

export type ConsentTextBlock = {
  /** Stable id for this exact block of words, referenced by every stored record. */
  readonly textId: string;
  readonly heading: string;
  /** Bullet points the reader sees above the checkbox. */
  readonly points: readonly string[];
  /** The sentence beside the checkbox. Never pre-checked. */
  readonly checkboxLabel: string;
  readonly footnote: string;
};

export type ConsentVersion = {
  readonly version: string;
  readonly activeFrom: string;
  readonly retiredAt?: string;
  readonly scope: readonly ConsentScope[];
  readonly text: Localized<ConsentTextBlock>;
};

/**
 * v1.
 *
 * The five things the reader has to understand are the five bullets, in the
 * order they matter: who gets the information, that they will be contacted,
 * that nothing obliges them to hire anyone, that CostAnswer is paid, and that
 * the estimate on the page is not a quote. The last one is here because it is
 * the misunderstanding that actually happens.
 */
const V1: ConsentVersion = {
  version: '2026-09-06.1',
  activeFrom: '2026-09-06',
  scope: ['contact_about_this_request'],
  text: localized<ConsentTextBlock>({
    'en-US': {
      textId: 'lead-consent-en-2026-09-06-1',
      heading: 'Before we send your request',
      points: [
        'CostAnswer will send the details on this form to {{PARTNER}}, who works with local service professionals.',
        'They, or professionals they work with, may contact you by phone, text or email about this project — including at the number you give us.',
        'Asking for estimates does not commit you to hiring anyone, and you can stop the conversation at any time.',
        'CostAnswer is paid a referral fee for sending this request. That fee does not change your price and did not change the estimate above.',
        'The estimate on this page is our own calculation. It is not a quote, and a professional may price the work differently.',
      ],
      checkboxLabel: 'I agree to CostAnswer sending my request to {{PARTNER}} so they can contact me about this project.',
      footnote: 'You can ask us to stop using your details for CostAnswer contact at any time through our privacy page.',
    },
    'es-US': {
      textId: 'lead-consent-es-2026-09-06-1',
      heading: 'Antes de enviar su solicitud',
      points: [
        'CostAnswer enviará los datos de este formulario a {{PARTNER}}, que trabaja con profesionales de servicios locales.',
        'Ellos, o los profesionales con los que trabajan, pueden comunicarse con usted por teléfono, mensaje de texto o correo electrónico sobre este proyecto, incluso al número que nos dé.',
        'Pedir estimados no lo obliga a contratar a nadie, y puede terminar la conversación cuando quiera.',
        'CostAnswer recibe un pago por referir esta solicitud. Ese pago no cambia su precio y no cambió el estimado de arriba.',
        'El estimado de esta página es nuestro propio cálculo. No es una cotización, y un profesional puede cobrar algo distinto.',
      ],
      checkboxLabel: 'Acepto que CostAnswer envíe mi solicitud a {{PARTNER}} para que se comuniquen conmigo sobre este proyecto.',
      footnote: 'Puede pedirnos que dejemos de usar sus datos para comunicaciones de CostAnswer en cualquier momento desde nuestra página de privacidad.',
    },
  }),
};

export const CONSENT_VERSIONS: readonly ConsentVersion[] = Object.freeze([V1]);

export function activeConsentVersion(asOf: string): ConsentVersion {
  const candidates = CONSENT_VERSIONS
    .filter((entry) => entry.activeFrom <= asOf && (!entry.retiredAt || asOf < entry.retiredAt))
    .sort((left, right) => right.activeFrom.localeCompare(left.activeFrom));
  const active = candidates[0];
  if (!active) throw new Error(`No consent version is active on ${asOf}.`);
  return active;
}

export function getConsentVersion(version: string): ConsentVersion {
  const found = CONSENT_VERSIONS.find((entry) => entry.version === version);
  if (!found) throw new Error(`Unknown consent version: ${version}`);
  return found;
}

/**
 * The consent as the reader actually saw it, with the partner named.
 *
 * The partner name is substituted rather than left generic because "a partner"
 * is not a disclosure. The rendered text is what gets hashed, so the stored
 * hash proves which partner was named.
 */
export function renderConsent(version: ConsentVersion, locale: Locale, partnerName: string): {
  textId: string;
  heading: string;
  points: string[];
  checkboxLabel: string;
  footnote: string;
  sha256: string;
} {
  const block = version.text[locale];
  const substitute = (value: string) => value.replaceAll('{{PARTNER}}', partnerName);
  const points = block.points.map(substitute);
  const checkboxLabel = substitute(block.checkboxLabel);
  const canonical = [version.version, locale, block.textId, block.heading, ...points, checkboxLabel, block.footnote].join('\n');
  return {
    textId: block.textId,
    heading: block.heading,
    points,
    checkboxLabel,
    footnote: block.footnote,
    sha256: sha256(canonical),
  };
}

/**
 * Every version has both locales and a unique id per locale.
 *
 * Called from the tests. A missing Spanish block would mean a Spanish reader
 * silently agreeing to English text, which is not consent.
 */
export function assertConsentVersionsAreComplete(): void {
  const textIds = new Set<string>();
  const versions = new Set<string>();
  for (const entry of CONSENT_VERSIONS) {
    if (versions.has(entry.version)) throw new Error(`Duplicate consent version ${entry.version}.`);
    versions.add(entry.version);
    for (const locale of ['en-US', 'es-US'] as const) {
      const block = entry.text[locale];
      if (!block) throw new Error(`Consent version ${entry.version} has no ${locale} text.`);
      if (textIds.has(block.textId)) throw new Error(`Duplicate consent text id ${block.textId}.`);
      textIds.add(block.textId);
      if (!block.checkboxLabel.includes('{{PARTNER}}')) {
        throw new Error(`Consent ${block.textId} must name the partner in its checkbox label.`);
      }
    }
  }
}
