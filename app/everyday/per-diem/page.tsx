import { PerDiemCalculator } from '@/components/calculators/PerDiemCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { gsaPerDiemSnapshot, listPerDiemDestinations } from '@/lib/data/gsa-perdiem-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

const tool = getTool('per-diem');
export const metadata = toolMetadata(tool);

const perDiemSource = datasetSourceDisplay({
  datasetId: 'gsa-perdiem',
  observationPeriod: gsaPerDiemSnapshot.observationPeriod,
  sourceStatus: gsaPerDiemSnapshot.sourceStatus,
  publishedAt: gsaPerDiemSnapshot.publishedAt,
  verifiedAt: gsaPerDiemSnapshot.verifiedAt,
  fetchedAt: gsaPerDiemSnapshot.fetchedAt,
});

const destinations = listPerDiemDestinations();
/* A well-known destination with seasonal rates, so the month-by-month table is visible on arrival. */
const defaultDestination = destinations.find((row) => row.state === 'DC')
  ?? destinations.find((row) => !row.isStandardRate)
  ?? destinations[0];

/* Dates inside the loaded fiscal year, from the versioned publication clock. */
const defaultStartDate = PUBLISHING_SNAPSHOT_DATE > gsaPerDiemSnapshot.effectiveFrom
  ? PUBLISHING_SNAPSHOT_DATE
  : gsaPerDiemSnapshot.effectiveFrom;
const defaultEndDate = new Date(Date.parse(`${defaultStartDate}T00:00:00.000Z`) + 3 * 86_400_000)
  .toISOString()
  .slice(0, 10);

export default function PerDiemPage() {
  return (
    <ToolPage
      tool={tool}
      caution="These are federal ceilings for a government trip, not an estimate of what a trip costs. Lodging is reimbursed at what you actually pay, up to the cap."
      methodology={[
        {
          title: 'Nights and days are different counts',
          body: 'Lodging is a nightly ceiling and meals are paid per day, so a three-day trip has two nights of lodging and three days of meals. Getting those two counts confused is the most common way a per diem estimate comes out wrong.',
        },
        {
          title: 'Three quarters on travel days',
          body: `GSA pays 75% of the daily meals and incidentals rate on the first and last day of travel. The reduced amounts are published, not derived, so a ${gsaPerDiemSnapshot.mieBreakdowns[0].total} dollar day shows GSA's own ${gsaPerDiemSnapshot.mieBreakdowns[0].firstLastDay} rather than a rounding of it.`,
        },
        {
          title: 'Seasonal lodging caps',
          body: 'GSA sets lodging month by month, and many destinations cost more in season. Each night of a trip is priced against the month that night falls in, so a stay crossing into high season is not flattened to one rate.',
        },
        {
          title: 'What is not covered',
          body: 'Continental U.S. only. Alaska, Hawaii, U.S. territories and foreign locations are set by the Department of Defense and the State Department rather than GSA, and are not in this dataset. Lodging tax is reimbursed separately and is not in the cap.',
        },
      ]}
      sources={[
        {
          name: 'U.S. General Services Administration',
          detail: `${gsaPerDiemSnapshot.attribution} Snapshot ${gsaPerDiemSnapshot.snapshotId}.`,
          href: gsaPerDiemSnapshot.sourceDocumentationUrl,
          dateLabel: perDiemSource.line,
        },
        {
          name: 'GSA meals and incidental expenses breakdown',
          detail: 'The published split across breakfast, lunch, dinner and incidentals, and the first and last day of travel amounts.',
          href: gsaPerDiemSnapshot.mieBreakdownUrl,
          dateLabel: `FY${gsaPerDiemSnapshot.fiscalYear}`,
        },
      ]}
    >
      <PerDiemCalculator
        destinations={destinations}
        fiscalYear={gsaPerDiemSnapshot.fiscalYear}
        effectiveFrom={gsaPerDiemSnapshot.effectiveFrom}
        effectiveTo={gsaPerDiemSnapshot.effectiveTo}
        defaultDestinationKey={defaultDestination.key}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
      />
    </ToolPage>
  );
}
