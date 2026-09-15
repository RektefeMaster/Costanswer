import Link from '@/components/i18n/LocalizedLink';
import { TrackedLinkSurface } from '@/components/analytics/LinkSurface';
import type { Locale } from '@/lib/i18n/locales';
import type { StateCode } from '@/lib/location/states';
import { wageUi } from '@/lib/salary/wage-ui';
import { resolveIncomeLinks } from '@/lib/salary/income-links';

/**
 * The next steps that sit immediately under a wage answer.
 *
 * Placement is the point. A reader who has just been told what an occupation
 * pays has a live question and no page to take it to; the same links at the
 * foot of the page, below the sources, reach someone who has already decided to
 * leave. So this block sits directly after the wage panel and the take-home
 * section, before the editorial, and it names the reader's next question rather
 * than the calculator's title.
 */
export type SalaryNextStepsProps = {
  locale?: Locale;
  /** The occupation or state median. Absent when BLS withheld the wage. */
  annualMedian?: number | null;
  hourlyMedian?: number | null;
  /** Set only on a page that is actually about one state. */
  state?: StateCode | null;
  /** This page's English canonical path, so it is dropped from its own steps. */
  currentPath?: string;
};

export function SalaryNextSteps({ locale = 'en-US', annualMedian, hourlyMedian, state, currentPath }: SalaryNextStepsProps) {
  const { links } = resolveIncomeLinks({
    annualIncome: annualMedian,
    hourlyIncome: hourlyMedian,
    state,
    locale,
    currentPath,
  });

  return (
    <TrackedLinkSurface surface="answer-next-step" className="engine-notes" labelledBy="salary-next-title">
      <h2 id="salary-next-title">{wageUi('nextStepsTitle', locale)}</h2>
      <p className="engine-notes-lede">{wageUi('nextStepsLede', locale)}</p>
      <div className="salary-next-steps-grid">
        {links.map((link) => (
          <Link href={link.href} className="salary-step-card" key={link.id} data-link-target={link.id}>
            <div className="salary-step-card-content">
              <span className="salary-step-badge">{link.badge}</span>
              <strong className="salary-step-title">{link.label}</strong>
              <span className="salary-step-note">{link.note}</span>
            </div>
            <span className="salary-step-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </TrackedLinkSurface>
  );
}
