import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { JobEstimator } from '@/components/job/JobEstimator';
import { CostPage } from '@/components/job/CostPage';
import { formatMoney } from '@/lib/calculations/contracts';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { JOB_CATALOG, isJobId, jobPath } from '@/lib/job/catalog';
import { jobCostPageTitle, jobCostQuestions, jobRelatedTools } from '@/lib/job/content';
import { calculateJobEstimate } from '@/lib/job/estimate';
import { costPageRobots } from '@/lib/job/publication';
import { toJobEstimateInput } from '@/lib/job/scope';
import { loadJobDatasets } from '@/lib/job/server-datasets';
import {
  costStateFromSlug,
  costStateLeafIsOpen,
  jobInStatePath,
  jobStateWageRatio,
  openCostStateLeaves,
  openStatesForJob,
  representativeZipForState,
} from '@/lib/job/state-pages';
import { getStateName, type StateCode } from '@/lib/location/states';
import { salaryStatePath } from '@/lib/salary-pages';
import { stateSlug } from '@/lib/salary-pages';
import { pageMetadata } from '@/lib/seo';

type Params = { job: string; state: string };

export function generateStaticParams() {
  return openCostStateLeaves().map(({ jobId, state }) => ({
    job: jobId,
    state: stateSlug(state),
  }));
}

function stateFips(state: StateCode): string {
  const row = geographySnapshot.states.find((entry) => entry.state === state);
  if (!row) throw new Error(`Missing FIPS for ${state}`);
  return row.stateFips;
}

function defaultModifiers(jobId: keyof typeof JOB_CATALOG): Record<string, string> {
  const modifiers: Record<string, string> = {};
  for (const modifier of JOB_CATALOG[jobId].modifiers) {
    modifiers[modifier.id] = modifier.defaultOptionId;
  }
  return modifiers;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { job, state: stateSegment } = await params;
  if (!isJobId(job)) return {};
  const state = costStateFromSlug(stateSegment);
  if (!state || !costStateLeafIsOpen(job, state)) return {};
  const meta = JOB_CATALOG[job];
  const stateName = getStateName(state);
  const title = `${jobCostPageTitle(meta).replace(/\?$/, '')} in ${stateName}?`;
  const description = `What does ${meta.shortTitle.toLowerCase()} cost in ${stateName}? Labor uses ${stateName} BLS trade wages; materials stay national. Enter a ZIP for a CostAnswer estimated range.`;
  return pageMetadata(title, description, jobInStatePath(job, state), costPageRobots('jobPage'));
}

export default async function JobCostInStatePage({ params }: { params: Promise<Params> }) {
  const { job, state: stateSegment } = await params;
  if (!isJobId(job)) notFound();
  const state = costStateFromSlug(stateSegment);
  if (!state || !costStateLeafIsOpen(job, state)) notFound();

  const meta = JOB_CATALOG[job];
  const stateName = getStateName(state);
  const zip = representativeZipForState(state);
  const ratio = jobStateWageRatio(job, state);
  const faqs = [
    ...jobCostQuestions(job),
    {
      question: `Why does ${meta.shortTitle.toLowerCase()} cost differ in ${stateName}?`,
      answer: [
        `Materials use the same national sourced baselines everywhere. Crew wages come from BLS OEWS for ${stateName}, so labor-heavy jobs move more than material-heavy ones.`,
        ratio == null
          ? 'This page is open because the state’s trade wage bill sits outside the recipe’s confidence band against the national bill.'
          : `Trade wages here run about ${Math.round(Math.abs(ratio - 1) * 100)}% ${ratio > 1 ? 'above' : 'below'} the national crew wage bill for this recipe.`,
      ],
    },
  ];

  let preview: { expected: string; low: string; high: string; zip: string } | null = null;
  if (zip) {
    try {
      const datasets = await loadJobDatasets(job, state, stateFips(state));
      const input = toJobEstimateInput(job, zip, defaultModifiers(job), { units: meta.scope.defaultValue });
      const result = calculateJobEstimate(input, datasets);
      const range = result.value.range;
      if (range) {
        preview = {
          zip,
          expected: formatMoney(range.expectedCents / 100, 0),
          low: formatMoney(range.lowCents / 100, 0),
          high: formatMoney(range.highCents / 100, 0),
        };
      }
    } catch {
      preview = null;
    }
  }

  const peerStates = openStatesForJob(job);
  const heading = `${jobCostPageTitle(meta).replace(/\?$/, '')} in ${stateName}?`;

  return (
    <CostPage
      title={heading}
      description={
        preview
          ? `Default-scope CostAnswer range in ${stateName} (ZIP ${preview.zip}): about ${preview.expected} (roughly ${preview.low}–${preview.high}). Labor uses ${stateName} BLS wages; materials are national. Change the ZIP below for your place.`
          : `Estimate ${meta.shortTitle.toLowerCase()} in ${stateName} from BLS trade wages and named recipes. Materials stay national. Enter a ZIP to run the engine.`
      }
      path={jobInStatePath(job, state)}
      pageId={`job-${job}`}
      faqs={faqs}
      methodology={[
        { title: 'Unit', body: meta.scope.hint },
        { title: 'Geography', body: `${stateName} wages from BLS OEWS. ZIP is an approximate ZIP/ZCTA match to county.` },
        { title: 'Why this state page exists', body: 'It opens only when this state’s crew wage bill differs from the national bill by more than the recipe’s confidence band. Materials do not change by state in this engine.' },
      ]}
    >
      <p className="related-lede">
        <Link href={jobPath(job)}>National {meta.shortTitle.toLowerCase()} page</Link>
        {' · '}
        <Link href="/cost/check-quote">Check a contractor quote</Link>
        {/*
          The labour half of this estimate is built from this state's BLS wages,
          and the state salary hub is where those wages are published. It is the
          only honest bridge between the cost corpus and the salary corpus: the
          catalog carries a trade label, not an SOC code, so a link to a named
          occupation would be a guess.
        */}
        {' · '}
        <Link href={salaryStatePath(state)}>{`BLS wages in ${stateName}`}</Link>
        {jobRelatedTools(job).map((tool) => (
          <span key={tool.href}>
            {' · '}
            <Link href={tool.href}>{tool.label}</Link>
          </span>
        ))}
      </p>
      {peerStates.length > 1 && (
        <section className="related-section" aria-labelledby="peer-states-title">
          <p className="eyebrow muted"><span /> Other states</p>
          <h2 id="peer-states-title">{`Where ${meta.shortTitle.toLowerCase()} wages move the range`}</h2>
          <ul className="topic-prompts">
            {peerStates.slice(0, 12).map((peer) => (
              <li key={peer}>
                <Link href={jobInStatePath(job, peer)}>
                  <span>{getStateName(peer)}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <JobEstimator
        key={`${job}-${state}`}
        jobId={job}
        mode="estimate"
        initialZip={zip ?? '75201'}
      />
    </CostPage>
  );
}
