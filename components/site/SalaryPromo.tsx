import Link from 'next/link';
import { CategoryArt } from '@/components/site/CategoryArt';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import type { CategoryId } from '@/lib/categories';
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
const PROMOTED_CODES = ['29-1141', '15-1252', '53-3032', '25-2021', '47-2111', '31-1131', '13-2011', '43-6014'] as const;
const PROMO_TONES = ['mint', 'amber', 'blue', 'rose', 'coral', 'violet', 'mint', 'amber'] as const;
const PROMO_ART: Record<(typeof PROMOTED_CODES)[number], CategoryId> = {
  '29-1141': 'health',
  '15-1252': 'math',
  '53-3032': 'car',
  '25-2021': 'education',
  '47-2111': 'home',
  '31-1131': 'health',
  '13-2011': 'money',
  '43-6014': 'everyday',
};

export function SalaryPromo() {
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
          <CategoryArt category="money" />
        </div>
        <p className="eyebrow"><span /> {`Pay · BLS ${oewsIndex.referenceLabel}`}</p>
        <h2 id="salary-promo-title">What does that job actually pay?</h2>
        <p className="section-lede">
          {`Median wages for ${formatNumber(occupations.length)} occupations, in every state, from the federal wage survey — with what the money leaves after that state's taxes and what it buys at local prices.`}
        </p>
        <ul className="topic-prompts">
          <li>
            <Link href={salaryFamilyPath()}>
              <span>Browse every occupation</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href={salaryStateIndexPath()}>
              <span>Browse by state</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="category-grid">
        {rows.map(({ occupation, median, art, tone }, index) => (
          <Link className={`category-card ${tone}`} href={salaryOccupationPath(occupation)} key={occupation.code}>
            <CategoryArt category={art} />
            <span className="category-topline">
              <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="category-arrow" aria-hidden="true">↗</span>
            </span>
            <span className="category-copy">
              <strong>{occupationHeadingName(occupation)}</strong>
              <small>{`Median ${formatMoney(median, 0)} a year`}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
