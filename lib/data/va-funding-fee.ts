import { z } from 'zod';
import snapshotJson from '@/data/va-funding-fee/current.json';

const date = z.iso.date();
const ratePercent = z.number().finite().positive().max(10);
const downBand = z.object({
  minDownPaymentPercent: z.number().finite().min(0).max(100),
  ratePercent,
}).strict();

export const VA_LOAN_TYPES = [
  'purchase',
  'cash-out',
  'irrrl',
  'nadl-purchase',
  'nadl-refinance',
  'manufactured-not-affixed',
  'assumption',
  'vendee',
] as const;
export type VaLoanType = (typeof VA_LOAN_TYPES)[number];

export const vaFundingFeeSnapshotSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  snapshotId: z.string().regex(/^va-funding-fee-/),
  datasetId: z.literal('va-funding-fee'),
  observationPeriod: z.literal('2026'),
  effectiveFrom: z.literal('2023-04-07'),
  fetchedAt: z.string().datetime(),
  verifiedAt: date,
  sourceStatus: z.literal('verified'),
  sourceUrl: z.url(),
  sourceDocumentationUrl: z.url(),
  attribution: z.string().min(1),
  purchase: z.object({
    firstUse: z.array(downBand).length(3),
    subsequent: z.array(downBand).length(3),
  }).strict(),
  cashOut: z.object({
    firstUsePercent: ratePercent,
    subsequentPercent: ratePercent,
  }).strict(),
  irrrlPercent: ratePercent,
  nadlPurchasePercent: ratePercent,
  nadlRefinancePercent: ratePercent,
  manufacturedNotAffixedPercent: ratePercent,
  assumptionPercent: ratePercent,
  vendeePercent: ratePercent,
  exemptionReasons: z.array(z.string().min(1)).min(4),
  sources: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    url: z.url().refine((url) => {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname === 'www.va.gov'
        && !parsed.username && !parsed.password;
    }, 'Use a public VA source without credentials.'),
    publishedAt: date.nullable(),
    detail: z.string().min(1),
  }).strict()).min(1),
  validationReport: z.array(z.string().min(1)).min(1),
  normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((snapshot, context) => {
  const checkBands = (bands: Array<{ minDownPaymentPercent: number; ratePercent: number }>, label: string) => {
    if (bands[0].minDownPaymentPercent !== 0) {
      context.addIssue({ code: 'custom', message: `${label} must start at 0% down.` });
    }
    for (let index = 1; index < bands.length; index += 1) {
      if (bands[index].minDownPaymentPercent <= bands[index - 1].minDownPaymentPercent) {
        context.addIssue({ code: 'custom', message: `${label} down-payment steps must rise.` });
      }
      if (bands[index].ratePercent > bands[index - 1].ratePercent) {
        context.addIssue({ code: 'custom', message: `${label} rates must not rise as the down payment rises.` });
      }
    }
  };
  checkBands(snapshot.purchase.firstUse, 'Purchase first-use');
  checkBands(snapshot.purchase.subsequent, 'Purchase subsequent-use');
  if (snapshot.cashOut.subsequentPercent <= snapshot.cashOut.firstUsePercent) {
    context.addIssue({ code: 'custom', message: 'Subsequent cash-out must cost more than first use.' });
  }
});

export type VaFundingFeeSnapshot = z.infer<typeof vaFundingFeeSnapshotSchema>;
export const vaFundingFeeSnapshot = vaFundingFeeSnapshotSchema.parse(snapshotJson);

function rateFromBands(bands: Array<{ minDownPaymentPercent: number; ratePercent: number }>, downPaymentPercent: number): number {
  let rate = bands[0].ratePercent;
  for (const band of bands) {
    if (downPaymentPercent >= band.minDownPaymentPercent) rate = band.ratePercent;
  }
  return rate;
}

/** The published percentage for this loan shape, or 0 when the borrower is exempt. */
export function vaFundingFeeRatePercent(input: {
  loanType: VaLoanType;
  firstUse: boolean;
  downPaymentPercent: number;
  exempt: boolean;
}, snapshot: VaFundingFeeSnapshot = vaFundingFeeSnapshot): number {
  if (input.exempt) return 0;
  switch (input.loanType) {
    case 'purchase':
      return rateFromBands(input.firstUse ? snapshot.purchase.firstUse : snapshot.purchase.subsequent, input.downPaymentPercent);
    case 'cash-out':
      return input.firstUse ? snapshot.cashOut.firstUsePercent : snapshot.cashOut.subsequentPercent;
    case 'irrrl':
      return snapshot.irrrlPercent;
    case 'nadl-purchase':
      return snapshot.nadlPurchasePercent;
    case 'nadl-refinance':
      return snapshot.nadlRefinancePercent;
    case 'manufactured-not-affixed':
      return snapshot.manufacturedNotAffixedPercent;
    case 'assumption':
      return snapshot.assumptionPercent;
    case 'vendee':
      return snapshot.vendeePercent;
    default: {
      const exhaustive: never = input.loanType;
      throw new Error(`Unhandled VA loan type: ${exhaustive}`);
    }
  }
}
