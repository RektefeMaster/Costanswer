import { RoadTripFuelCalculator } from '@/components/calculators/RoadTripFuelCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { gasolineSnapshot, getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('road-trip-fuel');
export const metadata = toolMetadata(tool);
const gasolineSource = datasetSourceDisplay({
  datasetId: 'eia-gasoline',
  observationPeriod: gasolineSnapshot.observationPeriod,
  sourceStatus: gasolineSnapshot.sourceStatus,
  publishedAt: gasolineSnapshot.publishedAt,
  verifiedAt: gasolineSnapshot.verifiedAt,
  fetchedAt: gasolineSnapshot.fetchedAt,
});

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

const prices = STATE_CODES.map((stateCode) => {
  const geography = getGasolinePriceForState(stateCode);
  return {
    stateCode,
    stateName: US_STATES[stateCode],
    dollarsPerGallon: geography.dollarsPerGallon,
    geographyLabel: gasolineGeographyLabel(stateCode),
  };
});

export default function RoadTripFuelPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is fuel for the miles you enter. Tolls, food, and a tank that is not the EPA MPG number will change what you spend."
      methodology={[
        { title: 'Gallons', body: 'Trip miles divided by the MPG you enter. That is highway fuel, not a full travel budget.' },
        { title: 'A price from EIA, or yours', body: `The default is the EIA weekly regular average for your state or PADD region as of ${gasolineSource.periodLabel}. A pump price you type replaces it.` },
        { title: 'Cost per mile', body: 'Fuel cost divided by miles. It ignores lodging, food, and extra city driving.' },
      ]}
      sources={[
        {
          name: 'U.S. Energy Information Administration',
          detail: `${gasolineSnapshot.attribution} Snapshot ${gasolineSnapshot.snapshotId}.`,
          href: gasolineSnapshot.sourceDocumentationUrl,
          dateLabel: gasolineSource.line,
        },
      ]}
    >
      <RoadTripFuelCalculator prices={prices} snapshotId={gasolineSnapshot.snapshotId} observationPeriod={gasolineSnapshot.observationPeriod} />
    </ToolPage>
  );
}
