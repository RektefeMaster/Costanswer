import { RmdCalculator } from '@/components/calculators/money/RmdCalculator';
import { ToolPage } from '@/components/tool/ToolPage';
import { irsRmdSnapshot } from '@/lib/data/irs-rmd';
import { getTool } from '@/lib/tool-registry';
import { toolMetadata } from '@/lib/seo';

const tool = getTool('rmd');
export const metadata = toolMetadata(tool);

const sourceById = (id: string) => {
  const source = irsRmdSnapshot.sources.find((entry) => entry.id === id);
  if (!source) throw new Error(`The RMD snapshot is missing its ${id} source.`);
  return source;
};

export default function RmdPage() {
  const year = irsRmdSnapshot.distributionYear;
  return (
    <ToolPage
      tool={tool}
      sourcePeriods={{ 'irs-rmd-tables': `Distribution year ${year}` }}
      caution="This is Table III for an IRA you own, using age from your birth year in the distribution year. It is not Table II, not the 10-year inherited-IRA rule, and not a plan administrator’s worksheet."
      methodology={[
        {
          title: 'Balance divided by a published factor',
          body: `The ${year} RMD is the 31 December ${year - 1} balance divided by the Uniform Lifetime factor for your age as of your birthday in ${year}. IRS’s own example of $100,000 at age 75 is $100,000 ÷ 24.6 = $4,065.`,
        },
        {
          title: 'When RMDs start is not in the table',
          body: 'SECURE 2.0 starts lifetime RMDs at 73 if you were born from 1951 through 1959, and at 75 if you were born in 1960 or later. People born in 1950 or earlier already started at 72. The first RMD can wait until 1 April of the following year; that means two distributions in that following year.',
        },
        {
          title: 'What this page will not compute',
          body: 'A spouse more than 10 years younger who is the sole beneficiary uses Table II, a large joint-life matrix this snapshot does not carry. Most inherited IRAs after the SECURE Act use a 10-year emptying rule, sometimes with annual RMDs, sometimes without. A Roth IRA the original owner still holds has no lifetime RMD.',
        },
      ]}
      sources={[
        {
          name: sourceById('irs-pub-590b').name,
          href: sourceById('irs-pub-590b').url,
          detail: sourceById('irs-pub-590b').detail,
          dateLabel: `${year} distributions · table last revised ${irsRmdSnapshot.tableEffectiveYear}`,
        },
        {
          name: sourceById('secure-2-0').name,
          href: sourceById('secure-2-0').url,
          detail: sourceById('secure-2-0').detail,
          dateLabel: 'Enacted 29 December 2022',
        },
      ]}
    >
      <RmdCalculator />
    </ToolPage>
  );
}
