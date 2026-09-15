import type { Locale } from '@/lib/i18n/locales';
import { siteText } from '@/lib/i18n/site-copy';
import Link from '@/components/i18n/LocalizedLink';
import { JobArt } from '@/components/site/JobArt';
import { JOB_CATALOG, JOB_IDS, jobPath, type JobId } from '@/lib/job/catalog';

const FEATURED = [
  'kitchen-remodel',
  'bathroom-remodel',
  'hvac-replacement',
  'water-heater-replacement',
  'heat-pump-replacement',
  'deck-build',
] as const satisfies readonly JobId[];
const TONES = ['amber', 'blue', 'mint', 'rose', 'coral', 'violet'] as const;

export function JobCostPromo({ locale = 'en-US' }: { locale?: Locale }) {
  const t = (text: string) => siteText(text, locale);
  return (
    <section className="category-strip job-cost-promo" aria-labelledby="job-cost-promo-title">
      <div className="section-intro">
        <p className="eyebrow"><span /> {t("Job costs")}</p>
        <h2 id="job-cost-promo-title">{t("How much should this remodel cost?")}</h2>
        <p className="section-lede"> {t("Kitchen, bathroom, HVAC, water heater, and eleven other residential projects on one engine using BLS wages, ECEC labor loading, and FEMA equipment proxies. Not a contractor quote.")} </p>
        <ul className="topic-prompts">
          <li>
            <Link href="/cost">
              <span>{t("Browse the fifteen jobs")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/cost/check-quote">
              <span>{t("Check a contractor quote")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="category-grid">
        {FEATURED.map((jobId, index) => {
          const job = JOB_CATALOG[jobId];
          return (
            <Link className={`category-card ${TONES[index] ?? 'amber'}`} href={jobPath(jobId)} key={jobId}>
              <JobArt kind={jobId} />
              <span className="category-topline">
                <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="category-copy">
                <strong>{t(job.shortTitle)}</strong>
                <small>{t(job.tradeLabel)}</small>
              </span>
            </Link>
          );
        })}
        {JOB_IDS.length - FEATURED.length > 0 && (
          <Link className="category-card amber" href="/cost">
            <JobArt kind="all" />
            <span className="category-topline">
              <span className="category-number">{String(FEATURED.length + 1).padStart(2, '0')}</span>
              <span className="category-arrow" aria-hidden="true">↗</span>
            </span>
            <span className="category-copy">
              <strong>{t("All fifteen jobs")}</strong>
              <small>{t("Estimate or check a quote")}</small>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
