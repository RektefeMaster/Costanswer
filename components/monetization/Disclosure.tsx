import { disclosureText } from '@/lib/monetization/affiliate/disclosure';
import type { Locale } from '@/lib/i18n/locales';

/**
 * The compensation notice, next to the thing it is about.
 *
 * Rendered inside the commercial module rather than in the footer, because a
 * disclosure the reader has to go looking for has not disclosed anything.
 */
export function Disclosure({ disclosureIds, locale }: { disclosureIds: readonly string[]; locale: Locale }) {
  if (disclosureIds.length === 0) return null;
  return (
    <p className="commercial-disclosure">
      {disclosureIds.map((id) => disclosureText(id, locale)).join(' ')}
    </p>
  );
}
