import { EvVsGasCalculator } from '@/components/calculators/car/EvVsGasCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { gasolineSnapshot, getGasolinePriceForState } from '@/lib/data/gasoline-snapshot';
import { STATE_CODES } from '@/lib/location/states';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('ev-vs-gas');
export const metadata = toolMetadata(tool);
const electricitySource = datasetSourceDisplay({
  datasetId: 'eia-electricity',
  observationPeriod: electricitySnapshot.observationPeriod,
  sourceStatus: electricitySnapshot.sourceStatus,
  publishedAt: electricitySnapshot.publishedAt,
  verifiedAt: electricitySnapshot.verifiedAt,
  fetchedAt: electricitySnapshot.fetchedAt,
});

/* Same verified weekly EIA series the road-trip calculator defaults to. */
const gasPrices = STATE_CODES.map((stateCode) => {
  const geography = getGasolinePriceForState(stateCode);
  return {
    stateCode,
    dollarsPerGallon: geography.dollarsPerGallon,
    geographyLabel: geography.kind === 'state' ? geography.name : `the ${geography.name} region`,
  };
});

const gasolineSource = datasetSourceDisplay({
  datasetId: 'eia-gasoline',
  observationPeriod: gasolineSnapshot.observationPeriod,
  sourceStatus: gasolineSnapshot.sourceStatus,
  publishedAt: gasolineSnapshot.publishedAt,
  verifiedAt: gasolineSnapshot.verifiedAt,
  fetchedAt: gasolineSnapshot.fetchedAt,
});

export default function EvVsGasPage() {
  return (
    <ToolPage
      tool={tool}
      caution="This is driving energy, not the full cost of owning a car. The sticker price, insurance, and upkeep can matter more than fuel."
      methodology={[
        { title: 'Yearly gallons', body: 'Miles divided by MPG gives gallons. Times the pump price gives yearly gasoline cost. The price starts at the latest EIA weekly average for your state or PADD region, and a station price you type replaces it.' },
        { title: 'Electricity at the wall', body: 'EV efficiency is battery energy. Charging loss is added to estimate what you pull from the wall.' },
        { title: 'Same miles for both', body: 'Both yearly costs use the same miles. We show the difference and a break even gas price. That is not the full cost of owning a car.' },
      ]}
      sources={[
        { name: 'U.S. Energy Information Administration', detail: `${electricitySnapshot.attribution} Snapshot ${electricitySnapshot.snapshotId}.`, href: electricitySnapshot.sourceDocumentationUrl, dateLabel: electricitySource.line },
        { name: 'U.S. Energy Information Administration', detail: `${gasolineSnapshot.attribution} Snapshot ${gasolineSnapshot.snapshotId}.`, href: gasolineSnapshot.sourceDocumentationUrl, dateLabel: gasolineSource.line },
        { name: 'EIA average retail price note', detail: 'State averages describe delivered electricity overall. They are not your utility rate.', href: 'https://www.eia.gov/tools/faqs/faq.php?id=507&t=5', dateLabel: 'Method note' },
      ]}
    >
      <EvVsGasCalculator
        rates={electricitySnapshot.states}
        gasPrices={gasPrices}
        snapshotId={electricitySnapshot.snapshotId}
        gasolineSnapshotId={gasolineSnapshot.snapshotId}
        observationPeriod={electricitySnapshot.observationPeriod}
        gasolineObservationPeriod={gasolineSnapshot.observationPeriod}
      />
    </ToolPage>
  );
}

