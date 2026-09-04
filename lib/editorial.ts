/**
 * Honest editorial identity for CostAnswer.
 *
 * Do not invent licensed credentials, named team bios, or a fake advisory firm.
 * The operator is a builder/researcher who publishes tested formulas and dated
 * official snapshots. That is the trust signal, not a CFA/CPA badge.
 */
import { siteConfig } from './site-config';

export const editorial = {
  byline: `${siteConfig.name} editorial`,
  role: 'Independent calculator publisher',
  /** One-line identity used next to results and on About. */
  identity:
    'CostAnswer is independently built and maintained. The person who writes the methodology and keeps the engines current is a software builder and researcher, not a licensed financial advisor, CPA, attorney, or clinician.',
  standardsHeading: 'Editorial standards',
  standards: [
    'We do not invent credentials, staff bios, or endorsements.',
    'Every calculator names the formula version that produced the result.',
    'Figures you did not type come from a dated, hashed copy of a U.S. public dataset, or the page says they came from you.',
    'Estimates, projections, and planning bands are labelled as such. They are not quotes, filings, diagnoses, or approvals.',
    'When a model leaves something out, that omission sits next to the answer, not only in the footer.',
    'Corrections are welcome. A report we can check includes the Method version and the Data snapshot id.',
  ],
  reviewLabel: 'Reviewed with the methodology',
  contactPath: '/contact' as const,
  methodologyPath: '/methodology' as const,
  aboutPath: '/about' as const,
} as const;
