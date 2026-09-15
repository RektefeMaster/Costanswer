import { LoanLimitCalculator } from '@/components/calculators/money/LoanLimitCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import {
  countyLoanLimitView,
  fhfaLoanLimitSnapshot,
  getCountyLoanLimit,
  loanLimitPickerStates,
} from '@/lib/data/fhfa-loan-limits-snapshot';
import { datasetSourceDisplay } from '@/lib/data/source-display';
import { getTool } from '@/lib/tool-registry';
import { localizedToolMetadata } from '@/lib/i18n/metadata';

const tool = getTool('conforming-loan-limit');
export function generateMetadata() { return localizedToolMetadata(tool); }

const fhfaSource = datasetSourceDisplay({
  datasetId: 'fhfa-loan-limits',
  observationPeriod: fhfaLoanLimitSnapshot.observationPeriod,
  sourceStatus: fhfaLoanLimitSnapshot.sourceStatus,
  verifiedAt: fhfaLoanLimitSnapshot.verifiedAt,
  fetchedAt: fhfaLoanLimitSnapshot.fetchedAt,
});

const defaultRow = getCountyLoanLimit('48113') ?? getCountyLoanLimit('01001');
if (!defaultRow) throw new Error('FHFA snapshot is missing a default county.');
const defaultCounty = countyLoanLimitView(defaultRow);

export default function ConformingLoanLimitPage() {
  const snapshot = fhfaLoanLimitSnapshot;
  return (
    <ToolPage
      tool={tool}
      sourcePeriods={{ 'fhfa-loan-limits': `Loans acquired in ${snapshot.loanYear}` }}
      caution="A county limit is not a loan approval. Credit, income, reserves, occupancy and the property still decide whether a lender will lend. FHA and VA set different limits; a VA loan with full entitlement has no FHFA cap."
      methodology={[
        {
          title: 'The limit is on the loan, not the price',
          body: 'FHFA publishes four figures per county, one for each unit count from one to four. Your loan amount is compared with the figure that matches the property. A larger down payment can bring an expensive house under the same limit.',
        },
        {
          title: 'Three bands, not two',
          body: `At or under the local conforming baseline the loan is conforming. On the mainland that baseline is ${snapshot.baseline.oneUnit.toLocaleString('en-US')} for one unit in ${snapshot.loanYear}. In Alaska, Hawaii, Guam and the U.S. Virgin Islands statute sets the local baseline at 150% of that figure (${snapshot.ceiling.oneUnit.toLocaleString('en-US')}). Above the local baseline and at or under the county limit the loan is high-balance conforming: still agency-eligible, with its own price adjustment. Above the county limit it is jumbo.`,
        },
        {
          title: 'When the file applies',
          body: `These values apply to loans acquired in calendar year ${snapshot.loanYear} (${snapshot.effectiveFrom} through ${snapshot.effectiveTo}). A November announcement is not in force before 1 January.`,
        },
        {
          title: 'Alaska, Hawaii, Guam and the Virgin Islands',
          body: 'Statute sets those areas at 150% of the otherwise applicable limit, so a handful of Hawaii counties can sit above the national ceiling. That is a printed exception, not a data error.',
        },
      ]}
      sources={[
        {
          name: 'Federal Housing Finance Agency',
          detail: `${snapshot.attribution} Snapshot ${snapshot.snapshotId}. ${snapshot.countyFips.length.toLocaleString('en-US')} counties, ${snapshot.tiers.length} distinct limit tiers.`,
          href: snapshot.sourceUrl,
          dateLabel: fhfaSource.line,
        },
        {
          name: 'FHFA county loan-limit file',
          detail: 'The flat CSV of one-to-four unit limits by county FIPS code for the loan year.',
          href: snapshot.sourceDocumentationUrl,
          dateLabel: `Loan year ${snapshot.loanYear}`,
        },
      ]}
    >
      <LoanLimitCalculator
        snapshotId={snapshot.snapshotId}
        loanYear={snapshot.loanYear}
        baseline={[snapshot.baseline.oneUnit, snapshot.baseline.twoUnit, snapshot.baseline.threeUnit, snapshot.baseline.fourUnit]}
        states={loanLimitPickerStates()}
        defaultCounty={defaultCounty}
      />
    </ToolPage>
  );
}
