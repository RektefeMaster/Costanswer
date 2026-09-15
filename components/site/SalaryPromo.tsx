import type { Locale } from '@/lib/i18n/locales';
import { siteText } from '@/lib/i18n/site-copy';
import { occupationHeadingEs } from '@/lib/salary-content-es';
import { salaryOccupationPathEs } from '@/lib/salary-es-pages';
import Link from '@/components/i18n/LocalizedLink';
import { SalaryArt, type SalaryArtKind } from '@/components/site/SalaryArt';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { getOewsEstimate, oewsIndex } from '@/lib/data/bls-oews-snapshot';
import { occupationHeadingName } from '@/lib/salary-content';
import { nationalSalaryOccupations, salaryFamilyPath, salaryOccupationPath, salaryStateIndexPath } from '@/lib/salary-pages';

/**
 * The doorway into the salary family from the front of the site.
 *
 * It lists the occupations most people actually work in, with the figure each
 * page opens on, so it earns its place as content rather than as a row of
 * links. It is also the crawl path: without it and the footer, 31,000 pages
 * hang off a hub nothing points at.
 */
const PROMOTED_CODES = ['29-1141', '41-2011', '43-4051', '15-1252', '53-3032', '25-2021', '47-2111', '13-2011'] as const;
const PROMO_TONES = ['mint', 'amber', 'blue', 'rose', 'coral', 'violet', 'mint', 'amber'] as const;
const PROMO_ART: Record<(typeof PROMOTED_CODES)[number], SalaryArtKind> = {
  '29-1141': 'nurse',
  '41-2011': 'admin',
  '43-4051': 'admin',
  '15-1252': 'developer',
  '53-3032': 'truck',
  '25-2021': 'teacher',
  '47-2111': 'electrician',
  '13-2011': 'accountant',
};

export function SalaryPromo({ locale = 'en-US' }: { locale?: Locale }) {
  const t = (text: string) => siteText(text, locale);
  const occupations = nationalSalaryOccupations();
  const rows = PROMOTED_CODES
    .map((code, index) => {
      const occupation = occupations.find((candidate) => candidate.code === code);
      const estimate = occupation ? getOewsEstimate('US', code) : undefined;
      return occupation && estimate?.annual.median != null
        ? { occupation, median: estimate.annual.median, art: PROMO_ART[code], tone: PROMO_TONES[index] ?? 'mint' }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  if (rows.length === 0) return null;

  return (
    <section className="category-strip salary-promo" aria-labelledby="salary-promo-title">
      <div className="section-intro">
        <div className="salary-promo-mark" aria-hidden="true">
          <SalaryArt kind="pay-stub" />
        </div>
        <p className="eyebrow"><span /> {`${locale === 'es-US' ? 'Salarios' : 'Pay'} · BLS ${oewsIndex.referenceLabel}`}</p>
        <h2 id="salary-promo-title">{t("What does that job actually pay?")}</h2>
        <p className="section-lede">
          {locale === 'es-US' ? `Salarios medianos de ${formatNumber(occupations.length)} ocupaciones en todos los estados, según la encuesta federal. Consulta cuánto queda después de impuestos y qué puedes comprar a precios locales.` : `Median wages for ${formatNumber(occupations.length)} occupations, in every state, from the federal wage survey, plus what the money leaves after that state's taxes and what it buys at local prices.`}
        </p>
        <ul className="topic-prompts">
          <li>
            <Link href={salaryFamilyPath()}>
              <span>{t("Browse every occupation")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href={salaryStateIndexPath()}>
              <span>{t("Browse by state")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="category-grid">
        {rows.map(({ occupation, median, art, tone }, index) => (
          <Link className={`category-card ${tone}`} href={locale === 'es-US' ? salaryOccupationPathEs(occupation) : salaryOccupationPath(occupation)} key={occupation.code}>
            <SalaryArt kind={art} />
            <span className="category-topline">
              <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="category-arrow" aria-hidden="true">↗</span>
            </span>
            <span className="category-copy">
              <strong>{locale === 'es-US' ? occupationHeadingEs(occupation) : occupationHeadingName(occupation)}</strong>
              <small>{locale === 'es-US' ? `Mediana de ${formatMoney(median, 0)} al año` : `Median ${formatMoney(median, 0)} a year`}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
