/**
 * Transcribed official money tables: HSA limits, VA funding fee, RMD Uniform Lifetime.
 *
 * These are not fetched feeds. Each number is copied from a named IRS or VA
 * publication, then sealed so a mistyped digit fails the build. Re-run this
 * script after changing a figure; do not edit the JSON hash by hand.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sealNormalizedSnapshot } from './ingest-io';

const ROOT = process.cwd();
const VERIFIED_AT = '2026-09-08';

const UNIFORM_LIFETIME: Array<{ age: number; period: number }> = [
  { age: 72, period: 27.4 }, { age: 73, period: 26.5 }, { age: 74, period: 25.5 },
  { age: 75, period: 24.6 }, { age: 76, period: 23.7 }, { age: 77, period: 22.9 },
  { age: 78, period: 22.0 }, { age: 79, period: 21.1 }, { age: 80, period: 20.2 },
  { age: 81, period: 19.4 }, { age: 82, period: 18.5 }, { age: 83, period: 17.7 },
  { age: 84, period: 16.8 }, { age: 85, period: 16.0 }, { age: 86, period: 15.2 },
  { age: 87, period: 14.4 }, { age: 88, period: 13.7 }, { age: 89, period: 12.9 },
  { age: 90, period: 12.2 }, { age: 91, period: 11.5 }, { age: 92, period: 10.8 },
  { age: 93, period: 10.1 }, { age: 94, period: 9.5 }, { age: 95, period: 8.9 },
  { age: 96, period: 8.4 }, { age: 97, period: 7.8 }, { age: 98, period: 7.3 },
  { age: 99, period: 6.8 }, { age: 100, period: 6.4 }, { age: 101, period: 6.0 },
  { age: 102, period: 5.6 }, { age: 103, period: 5.2 }, { age: 104, period: 4.9 },
  { age: 105, period: 4.6 }, { age: 106, period: 4.3 }, { age: 107, period: 4.1 },
  { age: 108, period: 3.9 }, { age: 109, period: 3.7 }, { age: 110, period: 3.5 },
  { age: 111, period: 3.4 }, { age: 112, period: 3.3 }, { age: 113, period: 3.1 },
  { age: 114, period: 3.0 }, { age: 115, period: 2.9 }, { age: 116, period: 2.8 },
  { age: 117, period: 2.7 }, { age: 118, period: 2.5 }, { age: 119, period: 2.3 },
  { age: 120, period: 2.0 },
];

function writeSealed<T extends { snapshotId: string }>(relativePath: string, candidate: T): { snapshotId: string } {
  const sealed = sealNormalizedSnapshot(candidate);
  const target = path.join(ROOT, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(sealed, null, 2)}\n`);
  return { snapshotId: sealed.snapshotId };
}

const hsa = writeSealed('data/irs-hsa/2026.json', {
  schemaVersion: '1.0.0',
  snapshotId: 'irs-hsa-limits-2026-v1',
  datasetId: 'irs-hsa-limits',
  observationPeriod: '2026',
  coverageYear: 2026,
  fetchedAt: '2026-09-08T00:00:00.000Z',
  verifiedAt: VERIFIED_AT,
  publishedAt: '2025-05-19',
  sourceStatus: 'verified',
  sourceUrl: 'https://www.irs.gov/pub/irs-drop/rp-25-19.pdf',
  sourceDocumentationUrl: 'https://www.irs.gov/irb/2025-21_IRB',
  attribution: 'IRS Revenue Procedure 2025-19, Internal Revenue Bulletin 2025-21. 2026 HSA contribution limits and HDHP deductible / out-of-pocket ceilings. The $1,000 age-55 catch-up is IRC §223(b)(3), which is not inflation-adjusted.',
  limits: {
    selfOnlyContribution: 4400,
    familyContribution: 8750,
    catchUpAge55: 1000,
    hdhpMinDeductibleSelfOnly: 1700,
    hdhpMinDeductibleFamily: 3400,
    hdhpMaxOutOfPocketSelfOnly: 8500,
    hdhpMaxOutOfPocketFamily: 17000,
    exceptedBenefitHra: 2200,
  },
  sources: [
    {
      id: 'irs-rp-2025-19',
      name: 'IRS Revenue Procedure 2025-19',
      url: 'https://www.irs.gov/pub/irs-drop/rp-25-19.pdf',
      publishedAt: '2025-05-19',
      detail: 'Calendar year 2026 HSA annual limitation, HDHP minimum deductible, HDHP maximum out-of-pocket, and excepted-benefit HRA maximum.',
    },
    {
      id: 'irs-pub-969',
      name: 'IRS Publication 969, Health Savings Accounts and Other Tax-Favored Health Plans',
      url: 'https://www.irs.gov/publications/p969',
      publishedAt: null,
      detail: 'The $1,000 additional contribution for an eligible individual who turns 55 before the close of the tax year, which IRC §223(b)(3) does not index.',
    },
  ],
  validationReport: [
    'Self-only contribution $4,400 and family contribution $8,750 match Rev. Proc. 2025-19 §2.01(1).',
    'HDHP minimum deductible $1,700 / $3,400 and out-of-pocket maximum $8,500 / $17,000 match §2.01(2).',
    'Excepted-benefit HRA maximum $2,200 matches §2.02.',
    'Age-55 catch-up remains $1,000 under IRC §223(b)(3); it is not in the revenue procedure because it is not inflation-adjusted.',
  ],
});

const va = writeSealed('data/va-funding-fee/current.json', {
  schemaVersion: '1.0.0',
  snapshotId: 'va-funding-fee-2023-04-07-v1',
  datasetId: 'va-funding-fee',
  observationPeriod: '2026',
  effectiveFrom: '2023-04-07',
  fetchedAt: '2026-09-08T00:00:00.000Z',
  verifiedAt: VERIFIED_AT,
  sourceStatus: 'verified',
  sourceUrl: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
  sourceDocumentationUrl: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
  attribution: 'U.S. Department of Veterans Affairs, VA funding fee rate charts, effective April 7, 2023, confirmed still the published charts on 8 September 2026.',
  purchase: {
    firstUse: [
      { minDownPaymentPercent: 0, ratePercent: 2.15 },
      { minDownPaymentPercent: 5, ratePercent: 1.5 },
      { minDownPaymentPercent: 10, ratePercent: 1.25 },
    ],
    subsequent: [
      { minDownPaymentPercent: 0, ratePercent: 3.3 },
      { minDownPaymentPercent: 5, ratePercent: 1.5 },
      { minDownPaymentPercent: 10, ratePercent: 1.25 },
    ],
  },
  cashOut: { firstUsePercent: 2.15, subsequentPercent: 3.3 },
  irrrlPercent: 0.5,
  nadlPurchasePercent: 1.25,
  nadlRefinancePercent: 0.5,
  manufacturedNotAffixedPercent: 1,
  assumptionPercent: 0.5,
  vendeePercent: 2.25,
  exemptionReasons: [
    'Receiving VA compensation for a service-connected disability',
    'Eligible for that compensation but receiving retirement or active-duty pay instead',
    'Receiving Dependency and Indemnity Compensation as a surviving spouse',
    'Service member with a proposed or memorandum rating before closing on a pre-discharge claim',
    'Active-duty member who provides evidence of a Purple Heart on or before closing',
  ],
  sources: [
    {
      id: 'va-funding-fee-page',
      name: 'VA funding fee and loan closing costs',
      url: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
      publishedAt: '2026-01-15',
      detail: 'Official rate charts effective 7 April 2023, including purchase, cash-out, IRRRL, NADL, manufactured-home, assumption and vendee rates, and the exemption list.',
    },
  ],
  validationReport: [
    'Purchase first-use rates are 2.15% under 5% down, 1.50% at 5% or more, and 1.25% at 10% or more.',
    'Purchase subsequent-use is 3.30% under 5% down; 5% and 10% down match first-use.',
    'Cash-out is 2.15% first use and 3.30% subsequent, with no down-payment step.',
    'IRRRL 0.50%, NADL purchase 1.25%, NADL refinance 0.50%, manufactured not affixed 1.00%, assumptions 0.50%, vendee 2.25%.',
    'VA’s worked example of a $190,000 first-use purchase at 5% down is 1.5% = $2,850.',
  ],
});

const rmd = writeSealed('data/irs-rmd/current.json', {
  schemaVersion: '1.0.0',
  snapshotId: 'irs-rmd-uniform-lifetime-2026-v1',
  datasetId: 'irs-rmd-tables',
  observationPeriod: '2026',
  distributionYear: 2026,
  tableEffectiveYear: 2022,
  fetchedAt: '2026-09-08T00:00:00.000Z',
  verifiedAt: VERIFIED_AT,
  sourceStatus: 'verified',
  sourceUrl: 'https://www.irs.gov/pub/irs-pdf/p590b.pdf',
  sourceDocumentationUrl: 'https://www.irs.gov/publications/p590b',
  attribution: 'IRS Publication 590-B, Appendix B, Table III (Uniform Lifetime), used for 2026 required minimum distributions. The table itself was last revised for 2022. Required beginning ages are SECURE 2.0, not the table.',
  uniformLifetime: UNIFORM_LIFETIME,
  requiredBeginningAges: [
    { bornOnOrAfter: 1960, age: 75 },
    { bornOnOrAfter: 1951, age: 73 },
    { bornOnOrAfter: null, age: 72 },
  ],
  sources: [
    {
      id: 'irs-pub-590b',
      name: 'IRS Publication 590-B, Distributions from Individual Retirement Arrangements (IRAs)',
      url: 'https://www.irs.gov/pub/irs-pdf/p590b.pdf',
      publishedAt: '2026-01-01',
      detail: 'Appendix B Table III Uniform Lifetime, and the instruction to divide the prior year-end balance by the denominator for the owner’s age as of birthday in the distribution year.',
    },
    {
      id: 'secure-2-0',
      name: 'SECURE 2.0 Act of 2022, section 107',
      url: 'https://www.congress.gov/117/plaws/publ328/PLAW-117publ328.pdf',
      publishedAt: '2022-12-29',
      detail: 'Required beginning age 73 for those born 1951 through 1959, and 75 for those born in 1960 or later.',
    },
  ],
  validationReport: [
    'Table III runs from age 72 at 27.4 through age 120 and over at 2.0, 49 rows with no gaps.',
    'IRS worked example: $100,000 at age 75 ÷ 24.6 = $4,065.',
    'The table is used unless the sole beneficiary is a spouse more than 10 years younger, in which case Table II applies and this snapshot does not compute it.',
  ],
});

console.log(`Wrote ${hsa.snapshotId}, ${va.snapshotId}, ${rmd.snapshotId}.`);
