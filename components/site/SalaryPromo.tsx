import Link from 'next/link';
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
const PROMOTED_CODES = ['29-1141', '15-1252', '53-3032', '25-2021', '47-2111', '31-1131', '13-2011', '43-6014'] as const;

export function SalaryPromo() {
  const occupations = nationalSalaryOccupations();
  const rows = PROMOTED_CODES
    .map((code) => {
      const occupation = occupations.find((candidate) => candidate.code === code);
      const estimate = occupation ? getOewsEstimate('US', code) : undefined;
      return occupation && estimate?.annual.median != null ? { occupation, median: estimate.annual.median } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  if (rows.length === 0) return null;

  return (
    <section className="category-strip" aria-labelledby="salary-promo-title">
      <div className="section-intro">
        <p className="eyebrow"><span /> {`Pay · BLS ${oewsIndex.referenceLabel}`}</p>
        <h2 id="salary-promo-title">What does that job actually pay?</h2>
        <p className="section-lede">
          {`Median wages for ${formatNumber(occupations.length)} occupations, in every state, from the federal wage survey — with what the money leaves after that state's taxes and what it buys at local prices.`}
        </p>
        <p className="section-lede">
          <Link href={salaryFamilyPath()}>Browse every occupation →</Link>
          {' '}
          <Link href={salaryStateIndexPath()}>Browse by state →</Link>
        </p>
      </div>
      <div className="category-grid">
        {rows.map(({ occupation, median }, index) => (
          <Link className="category-card" href={salaryOccupationPath(occupation)} key={occupation.code}>
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
