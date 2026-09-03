import { CarAffordabilityCalculator } from '@/components/calculators/CarAffordabilityCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';
import { VEHICLE_AFFORDABILITY_BANDS } from '@/lib/calculations/vehicle';
import { electricitySnapshot, getElectricityRate } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot, getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

const tool = getTool('car-affordability');
export const metadata = toolMetadata(tool);

const gasolineSource = datasetSourceDisplay({
  datasetId: 'eia-gasoline',
  observationPeriod: gasolineSnapshot.observationPeriod,
  sourceStatus: gasolineSnapshot.sourceStatus,
  publishedAt: gasolineSnapshot.publishedAt,
  verifiedAt: gasolineSnapshot.verifiedAt,
  fetchedAt: gasolineSnapshot.fetchedAt,
});
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});
const taxSnapshot = getTaxYearSnapshot(DEFAULT_TAX_YEAR);

function gasolineGeographyLabel(stateCode: StateCode): string {
  const geography = getGasolinePriceForState(stateCode);
  switch (geography.kind) {
    case 'state':
      return `${geography.name} weekly average`;
    case 'padd':
      return `${geography.name} regional average`;
    case 'nation':
      return 'U.S. weekly average';
    default: {
      const exhaustive: never = geography.kind;
      throw new Error(`Unhandled gasoline geography: ${exhaustive}`);
    }
  }
}

const states = STATE_CODES.map((stateCode) => ({
  stateCode,
  stateName: US_STATES[stateCode],
  dollarsPerGallon: getGasolinePriceForState(stateCode).dollarsPerGallon,
  gasolineGeographyLabel: gasolineGeographyLabel(stateCode),
  priceCentsPerKwh: getElectricityRate(stateCode).priceCentsPerKwh,
}));

const comfortable = VEHICLE_AFFORDABILITY_BANDS.comfortable;
const reasonable = VEHICLE_AFFORDABILITY_BANDS.reasonable;

export default function CarAffordabilityPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is cash out of pocket on take-home pay, not a lender approval. The price, insurance, and upkeep are numbers you supply, and depreciation is left out entirely."
      methodology={[
        {
          title: 'Total monthly cost, not just the payment',
          body: 'The loan payment uses the same fixed-rate amortization as the loan and mortgage tools, on whatever is left after the down payment and trade-in. Fuel or charging reuses the same energy math as EV vs. Gas. Insurance, upkeep, and registration are added at the amounts you enter. Yearly figures are the monthly total times twelve.',
        },
        {
          title: 'The number first, then our guideline',
          body: `The headline is the calculated monthly cost and what share of take-home pay it is. Only after that do we place it on our own guideline: comfortable keeps the whole vehicle at or under ${comfortable.maxTotalShare * 100}% of take-home pay and the loan payment alone at or under ${comfortable.maxPaymentShare * 100}%, stretch still fits ${reasonable.maxTotalShare * 100}% and ${reasonable.maxPaymentShare * 100}%, and anything above that is the top of the range. Two caps are used on purpose so a long term cannot hide an expensive car behind a small payment. These percentages are ${siteConfig.name} planning thresholds on take-home pay, not a lender decision and not a rule that fits every household.`,
        },
        {
          title: 'How much car, and the gap',
          body: 'The comfortable, reasonable, and aggressive prices are the inverse of the same payment math: running costs come out of the budget first, and the payment factor turns what is left back into a price. Because the model is linear, the amount this car sits above the comfortable price is also exactly the extra down payment that would close the gap.',
        },
      ]}
      sources={[
        {
          name: 'U.S. Energy Information Administration — gasoline',
          detail: `${gasolineSnapshot.attribution} Snapshot ${gasolineSnapshot.snapshotId}.`,
          href: gasolineSnapshot.sourceDocumentationUrl,
          dateLabel: gasolineSource.line,
        },
        {
          name: 'U.S. Energy Information Administration — electricity',
          detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}. Home charging only; public fast charging is priced separately by the network.`,
          href: electricitySnapshot.sourceDocumentationUrl,
          dateLabel: electricitySource.line,
        },
        {
          name: 'IRS federal tax schedules',
          detail: `Used only when take-home pay is estimated from a salary. Snapshot ${taxSnapshot.snapshotId}. Unsupported states show a federal-and-FICA-only estimate.`,
          href: 'https://www.irs.gov/',
          dateLabel: `Tax year ${DEFAULT_TAX_YEAR}`,
        },
        {
          name: 'Consumer Financial Protection Bureau',
          detail: 'How auto loans, terms, and dealer financing work. This tool does not apply any CFPB threshold as a pass or fail.',
          href: 'https://www.consumerfinance.gov/consumer-tools/auto-loans/',
          dateLabel: 'Official guidance',
        },
      ]}
    >
      <CarAffordabilityCalculator
        states={states}
        gasoline={{ snapshotId: gasolineSnapshot.snapshotId, observationPeriod: gasolineSnapshot.observationPeriod }}
        electricity={{ snapshotId: electricitySnapshot.snapshotId, observationPeriod: electricitySnapshot.observationPeriod }}
        taxYear={DEFAULT_TAX_YEAR}
      />
    </ToolPage>
  );
}
