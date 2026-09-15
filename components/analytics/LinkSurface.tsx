'use client';

import type { ReactNode } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { emitAnalyticsEvent, type LinkSurface as SurfaceId } from '@/lib/analytics';

/**
 * One analytics island per block of internal links, not one per link.
 *
 * `RelatedToolLink` wraps a single anchor, which is right when a section holds
 * four of them. The bracket directories hold forty-odd, and shipping forty-odd
 * client components to track a section would cost more than the section earns.
 * This renders the section element the block already needed and reads the
 * clicked anchor out of the event, so the links themselves stay server markup.
 *
 * Only anchors carrying `data-link-target` report. A breadcrumb or a source
 * link that happens to sit inside the section is not a next step and is not
 * counted as one.
 */
export function TrackedLinkSurface({
  surface,
  className,
  labelledBy,
  children,
}: {
  surface: SurfaceId;
  className: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section
      className={className}
      aria-labelledby={labelledBy}
      onClick={(event) => {
        const anchor = (event.target as Element | null)?.closest?.('a[data-link-target]');
        const target = anchor?.getAttribute('data-link-target');
        if (target) emitAnalyticsEvent('internal_link_click', { surface, target });
      }}
    >
      {children}
    </section>
  );
}

/**
 * A single next-step link at the end of the section that raised the question.
 *
 * The wage bracket pages compute a filing-status comparison, a compound savings
 * projection and a mortgage range, then stop. Each of those has a calculator
 * behind it that takes the reader's own numbers, and a link placed at the end
 * of the section is read while the question is still live. The same links
 * gathered into a card block before the FAQ reach whoever is left after seven
 * hundred lines, which is not the same audience.
 */
export function TrackedNextStep({
  href,
  target,
  children,
}: {
  href: string;
  /** The step's stable id, shared with `resolveIncomeLinks` where they overlap. */
  target: string;
  children: ReactNode;
}) {
  return (
    <p className="matrix-cta-link">
      <Link
        href={href}
        onClick={() => emitAnalyticsEvent('internal_link_click', { surface: 'matrix-next-step', target })}
      >
        {children}
      </Link>
    </p>
  );
}
