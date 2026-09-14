import type { JobId, JobPublicMeta } from '@/lib/job/catalog';
import { JOB_CATALOG } from '@/lib/job/catalog';

export type JobFaq = { question: string; answer: string[] };

/**
 * Visible FAQ for a job-cost page — same text as FAQPage JSON-LD.
 *
 * Written for the queries homeowners type (how much / what’s included /
 * vs a quote). Numbers stay out of canned answers; the calculator supplies those.
 */
export function jobCostQuestions(jobId: JobId): JobFaq[] {
  const job = JOB_CATALOG[jobId];
  const label = job.shortTitle.toLowerCase();
  const questions: JobFaq[] = [
    {
      question: `How much does ${indefiniteJob(job)} cost?`,
      answer: [
        `Enter your ZIP and scope on this page for a CostAnswer estimated range built from BLS trade wages, ECEC labor loading, and named material or equipment lines.`,
        'It is a planning figure, not a contractor bid. Incomplete ranges mean a critical material still has no sourced price.',
      ],
    },
    {
      question: `What is included in this ${label} estimate?`,
      answer: [
        `${job.scope.hint}`,
        `Trade: ${job.tradeLabel}. Modifiers on the form change crew time or materials; they do not invent a market average for your city.`,
      ],
    },
    {
      question: 'Why is this not the same as a contractor quote?',
      answer: [
        'A quote prices your house, your access, your permit office, and that company’s backlog. This engine prices a named recipe at published wage and cost proxies.',
        'Use Check a quote on the same engine to see whether a written bid sits low, mid, or high against that recipe.',
      ],
    },
  ];

  const extras = JOB_FAQ_EXTRAS[jobId];
  if (extras) questions.push(...extras);
  return questions;
}

export function jobCostPageTitle(job: JobPublicMeta): string {
  const spoken = JOB_SPOKEN_TITLE[job.jobId] ?? `How much does ${indefiniteJob(job)} cost?`;
  return spoken.length <= 58 ? spoken : job.title;
}

function indefiniteJob(job: JobPublicMeta): string {
  const noun = JOB_INDEFINITE[job.jobId] ?? job.shortTitle.toLowerCase();
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** Title-ready spoken queries for the highest-volume remodel / mechanical jobs. */
const JOB_SPOKEN_TITLE: Partial<Record<JobId, string>> = {
  'bathroom-remodel': 'How Much Does a Bathroom Remodel Cost?',
  'kitchen-remodel': 'How Much Does a Kitchen Remodel Cost?',
  'hvac-replacement': 'How Much Does HVAC Replacement Cost?',
  'water-heater-replacement': 'How Much Does a Water Heater Replacement Cost?',
  'heat-pump-replacement': 'How Much Does a Heat Pump Replacement Cost?',
  'electrical-panel-upgrade': 'How Much Does an Electrical Panel Upgrade Cost?',
  'concrete-driveway': 'How Much Does a Concrete Driveway Cost?',
  'deck-build': 'How Much Does It Cost to Build a Deck?',
  'fence-install': 'How Much Does a Fence Cost to Install?',
  'tree-removal': 'How Much Does Tree Removal Cost?',
  'interior-painting': 'How Much Does Interior Painting Cost?',
  'window-replacement': 'How Much Does Window Replacement Cost?',
  'exterior-door-replacement': 'How Much Does an Exterior Door Replacement Cost?',
  'siding-replacement': 'How Much Does Siding Replacement Cost?',
  'drywall-install': 'How Much Does Drywall Installation Cost?',
};

const JOB_INDEFINITE: Partial<Record<JobId, string>> = {
  'bathroom-remodel': 'bathroom remodel',
  'kitchen-remodel': 'kitchen remodel',
  'hvac-replacement': 'HVAC replacement',
  'water-heater-replacement': 'water heater replacement',
  'heat-pump-replacement': 'heat pump replacement',
  'electrical-panel-upgrade': 'electrical panel upgrade',
  'concrete-driveway': 'concrete driveway',
  'deck-build': 'deck',
  'fence-install': 'fence installation',
  'tree-removal': 'tree removal',
  'interior-painting': 'interior painting job',
  'window-replacement': 'window replacement',
  'exterior-door-replacement': 'exterior door replacement',
  'siding-replacement': 'siding replacement',
  'drywall-install': 'drywall installation',
};

const JOB_FAQ_EXTRAS: Partial<Record<JobId, JobFaq[]>> = {
  'bathroom-remodel': [
    {
      question: 'Does this bathroom remodel price include a new tub or shower pan?',
      answer: [
        'No. The priced fixtures are a toilet, a 36-inch vanity, and ceramic tile for the floor and shower walls on the same layout.',
        'A separate tub, shower pan, or layout change is outside this recipe and belongs in a contractor scope.',
      ],
    },
  ],
  'kitchen-remodel': [
    {
      question: 'Are countertops and appliances included?',
      answer: [
        'No. This recipe prices stock base and wall cabinets, a drop-in sink, ceramic floor tile, and paint on the same layout.',
        'Countertops, appliances, faucets, and moving walls are outside the named package — get those as separate lines on a contractor quote.',
      ],
    },
  ],
  'hvac-replacement': [
    {
      question: 'Is this a full furnace and AC replacement?',
      answer: [
        'Yes for a typical residential split system: outdoor condenser plus indoor furnace or air handler, with optional duct revisions.',
        'Tons scale equipment dollars from EIA’s baseline; labor hours stay per system unless you change access or ductwork.',
      ],
    },
  ],
  'water-heater-replacement': [
    {
      question: 'Gas or electric — which tank does this model?',
      answer: [
        'Gas uses EIA’s typical 40-gallon tank; electric uses the typical 36-gallon tank. Pick fuel on the form.',
        'Tankless, heat-pump water heaters, and relocating the unit are not in this recipe.',
      ],
    },
  ],
};
