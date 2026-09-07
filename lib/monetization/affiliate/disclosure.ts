/**
 * Compensation disclosures.
 *
 * Rendered next to the module, not only in the footer. A disclosure the reader
 * has to go looking for is not one, and both the FTC's position and every one
 * of these programmes' terms say so.
 *
 * Amazon's identification language is a specific sentence their agreement
 * requires, and it is quoted here rather than paraphrased. It is only rendered
 * when the Amazon merchant is actually linkable, because claiming to be an
 * Amazon Associate while not being one is its own problem.
 */
import { localized, type Locale, type Localized } from '@/lib/i18n/locales';

export type DisclosureBlock = {
  readonly disclosureId: string;
  readonly text: Localized<string>;
  /** True when the programme mandates this exact wording. Do not edit those. */
  readonly verbatimRequired: boolean;
};

export const DISCLOSURES: readonly DisclosureBlock[] = Object.freeze([
  {
    disclosureId: 'generic-affiliate',
    verbatimRequired: false,
    text: localized({
      'en-US': 'CostAnswer may earn a commission when you buy through some of these links. It does not change your price, and it did not change the calculation above.',
      'es-US': 'CostAnswer puede recibir una comisión cuando usted compra por medio de algunos de estos enlaces. Eso no cambia su precio y no cambió el cálculo de arriba.',
    }),
  },
  {
    disclosureId: 'amazon-associate',
    verbatimRequired: true,
    text: localized({
      'en-US': 'As an Amazon Associate we earn from qualifying purchases.',
      'es-US': 'As an Amazon Associate we earn from qualifying purchases.',
    }),
  },
  {
    disclosureId: 'lead-referral',
    verbatimRequired: false,
    text: localized({
      'en-US': 'CostAnswer is paid a referral fee if you request estimates. That fee does not change your price, and it did not change the estimate above.',
      'es-US': 'CostAnswer recibe un pago por referencia si usted pide estimados. Ese pago no cambia su precio y no cambió el estimado de arriba.',
    }),
  },
  {
    disclosureId: 'advertising',
    verbatimRequired: false,
    text: localized({
      'en-US': 'This page carries advertising. Ads are chosen by an ad network, not by CostAnswer, and they are never the answer to your question.',
      'es-US': 'Esta página incluye publicidad. Los anuncios los elige una red publicitaria, no CostAnswer, y nunca son la respuesta a su pregunta.',
    }),
  },
]);

const byId = new Map(DISCLOSURES.map((entry) => [entry.disclosureId, entry]));

export function getDisclosure(disclosureId: string): DisclosureBlock {
  const found = byId.get(disclosureId);
  if (!found) throw new Error(`Unknown disclosure: ${disclosureId}`);
  return found;
}

export function disclosureText(disclosureId: string, locale: Locale): string {
  return getDisclosure(disclosureId).text[locale];
}

/**
 * The Amazon sentence is the one string in this codebase nobody may reword.
 *
 * Asserted in the tests. It stays in English in both locales because it is a
 * required identification statement in a specific form, not body copy.
 */
export const AMAZON_REQUIRED_STATEMENT = 'As an Amazon Associate we earn from qualifying purchases.';
