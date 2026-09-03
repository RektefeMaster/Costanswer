/** Statutory contribution limits for context only. Not used in growth math and not an eligibility engine. */
export const IRS_RETIREMENT_LIMITS_2026 = {
  snapshotId: 'irs-retirement-limits-2026-v1',
  taxYear: 2026,
  electiveDeferral401k: 24_500,
  combined401kAnnual: 72_000,
  catchUp401kAge50: 8_000,
  iraLimit: 7_500,
  catchUpIraAge50: 1_100,
  sourceName: 'Internal Revenue Service',
  sourceDetail: 'IR-2025-111 and Notice 2025-67, 2026 COLA limits for 401(k) elective deferrals and IRAs.',
  sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  noticeUrl: 'https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions',
  publishedLabel: 'November 2025',
} as const;
