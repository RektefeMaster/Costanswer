import type { ToolEditorial } from './types';

export const MEDICARE_EDITORIAL: ToolEditorial[] = [{
  toolId: 'medicare-cost',
  guide: {
    heading: 'What Medicare costs in 2026, and where the income cliffs fall',
    lede: 'Most people pay the standard Part B premium and never think about it again. The ones who get caught out are those whose income two years ago crossed a threshold they did not know existed, because the surcharge that follows is a cliff rather than a slope and it is set from a tax return that can no longer be changed. This page applies the published CMS tables and shows both: what you pay, and how close you are to paying more.',
    sections: [
      { heading: 'Your 2026 premium was decided in 2024', paragraphs: [
        'The income-related monthly adjustment amount, IRMAA, is set from the modified adjusted gross income on the tax return you filed two years earlier: adjusted gross income plus tax-exempt interest. For 2026 premiums that is the 2024 return. If SSA cannot get it, they use 2023 instead.',
        'This catches people in the year they retire, and in the year they take a large one-off gain. A Roth conversion, a house sale, or an inherited account can lift income for one year and raise premiums two years later, long after the money is spent. The lag is the whole difficulty, and it is not discretionary.',
      ] },
      { heading: 'A cliff, not a taper', paragraphs: [
        'Each rung applies in full as soon as income passes its threshold. There is no phase-in: one dollar of income over a line can add hundreds of dollars across the year, on Part B and on drug coverage at the same time. The distance to your next threshold is shown for exactly this reason.',
        'The boundaries are not all read the same way either. CMS prints most rungs as "more than" a figure, so income exactly at it stays on the lower rung, but the top rung as "greater than or equal to", so income exactly at that one moves up. This page carries each rule as printed rather than assuming they match.',
      ] },
      { heading: 'It is charged per person', paragraphs: [
        'A married couple both on Medicare each pay their own adjustment, calculated from the same joint income. The household cost is therefore double the figure on any single-person table, which is a common and expensive surprise.',
        'Filing separately while married uses a far steeper ladder: it jumps from no adjustment straight to the second-highest rung, with nothing in between. Couples who file separately for unrelated reasons often do not discover this until the premium arrives.',
      ] },
      { heading: 'When the income year is wrong, say so', paragraphs: [
        'If income fell because of a life-changing event, SSA will use a more recent year. The qualifying events are specific: marriage, divorce, death of a spouse, you or your spouse stopping or reducing work, loss of an income-producing property, loss of a pension, or an employer settlement payment. Form SSA-44 is how you ask.',
        'Retirement is the common one and it is worth acting on promptly, because the adjustment is otherwise charged against the working income of two years ago for a full year of retirement. A one-off capital gain, by contrast, is not a life-changing event and generally cannot be appealed away.',
      ] },
      { heading: 'What premiums do not cover', paragraphs: [
        'Part B pays 80% of the approved amount after its annual deductible, and the other 20% has no ceiling at all. That single fact is why Medigap policies and Medicare Advantage plans exist, and why no honest calculator turns Original Medicare into a total cost of care.',
        'The Part A hospital deductible is per benefit period rather than per year, so a second hospital stay more than sixty days after the first starts a new one and is owed again. Skilled nursing coinsurance, hospital day-61 coinsurance, and lifetime reserve days sit on top of everything above and are listed separately here rather than folded into a total that would be wrong.',
      ] },
    ],
  },
  faq: [
    { question: 'How much does Medicare cost per month in 2026?', answer: ['The standard Part B premium is $202.90 a month, and Part A is free for anyone with 40 quarters of Medicare-taxed work. On top of that sit any drug plan or Medigap premium you choose, and an income-related adjustment if your 2024 income was above the first threshold. Enter your figures to total them.'] },
    { question: 'What is IRMAA and will I pay it?', answer: ['It is the income-related monthly adjustment amount, a surcharge on Part B and Part D for higher incomes. For 2026 it starts above $109,000 of modified adjusted gross income for a single filer and $218,000 for a couple filing jointly, measured on the 2024 return. Below those figures you pay the standard premium.'] },
    { question: 'Why is my premium based on income from two years ago?', answer: ['Because SSA sets premiums before the year begins and uses the most recent return the IRS has verified, which is two years back. It means a high-income year follows you into premiums long afterwards, and that a drop in income does not lower your premium until two years later unless you file form SSA-44 for a life-changing event.'] },
    { question: 'Can I get the surcharge removed after I retire?', answer: ['Often yes. Stopping or reducing work is one of the life-changing events SSA accepts on form SSA-44, and retirement is the most common reason people file it. Provide evidence of the reduced income and SSA will use a more recent year. A one-off capital gain is not a qualifying event.'] },
    { question: 'Do my spouse and I each pay the surcharge?', answer: ['Yes. It is charged per enrolled person, calculated from your joint income, so a couple who are both on Medicare pay it twice. Doubling the figure from any single-person table is the right way to budget for a couple.'] },
    { question: 'Is Part A really free?', answer: ['It is premium-free with 40 quarters of Medicare-taxed work, which is ten years, and a spouse’s record can qualify you on its own. With 30 to 39 quarters it is $311 a month for 2026, and with fewer than 30 it is $565. Free refers to the premium: the hospital deductible is owed regardless, per benefit period.'] },
    { question: 'What does the Part B deductible cover?', answer: ['It is $283 for 2026, paid once in the year before Part B starts paying. After it, Part B pays 80% of the Medicare-approved amount for covered services and you pay the remaining 20% with no annual limit, which is the gap Medigap and Medicare Advantage are designed to close.'] },
    { question: 'Does Medicare Advantage replace the Part B premium?', answer: ['No. Medicare Advantage changes how Parts A and B deliver and pay for care, but the Part B premium is still owed, plus any premium the plan itself charges. Some plans pay part of the Part B premium back, which is a plan feature rather than a change to the underlying rules.'] },
  ],
  glossary: [
    { term: 'IRMAA', definition: 'Income-related monthly adjustment amount: a surcharge added to Part B and Part D premiums for higher incomes.' },
    { term: 'MAGI', definition: 'For Medicare, adjusted gross income plus tax-exempt interest, taken from the return filed two years earlier.' },
    { term: 'Benefit period', definition: 'Starts on hospital admission and ends after 60 days out. The Part A deductible is owed once per benefit period, not once per year.' },
    { term: 'Quarters of coverage', definition: 'Calendar quarters of Medicare-taxed work. Forty makes Part A premium-free.' },
    { term: 'Lifetime reserve days', definition: 'Sixty extra hospital days usable once across a lifetime, at a higher daily coinsurance.' },
    { term: 'Form SSA-44', definition: 'The form for asking SSA to use a more recent year’s income after a life-changing event.' },
    { term: 'Medigap', definition: 'A private supplement that covers gaps in Original Medicare, priced by its insurer rather than by any federal table.' },
  ],
  tips: [
    'Check your two-years-back income against the thresholds before a Roth conversion or a property sale, not after.',
    'File form SSA-44 as soon as you retire rather than waiting for the higher premium to arrive.',
    'Budget the surcharge twice for a couple who are both enrolled; it is charged per person from the same joint income.',
    'If you file separately while married, check the separate ladder: it skips straight to the second-highest rung.',
  ],
  caveats: [
    'These are published premiums and deductibles, not a bill. Enrollment, plan availability, and any late-enrollment penalty are decided by Medicare and SSA.',
    'The 20% Part B coinsurance has no annual cap, so no total cost of care can be produced from these tables.',
    'Drug plan and Medigap premiums are set by insurers and are entered by you; they appear in no federal table.',
    'Medicaid, Medicare Savings Programs, Extra Help, employer retiree coverage, and state pharmaceutical assistance can all reduce these amounts and are not modelled.',
  ],
}];
