import type { ToolEditorial } from './types';

export const HEALTH_INSURANCE_EDITORIAL: ToolEditorial[] = [{
  toolId: 'health-insurance',
  guide: {
    heading: 'Work out what a Marketplace plan actually costs you in 2026',
    lede: 'The premium tax credit is not a discount rate or a percentage off. It is a fixed dollar amount built from your household income, your household size, and one specific plan you may not be buying. This page applies the published federal formula step by step, shows the percentage it used, and says plainly where the arithmetic stops and a Marketplace decision begins.',
    sections: [
      { heading: 'Two premiums, two different jobs', paragraphs: [
        'The credit is sized by the second-lowest-cost Silver plan available to the people enrolling in your county, called the benchmark. It is subtracted from whichever plan you actually pick. Those are usually different plans at different prices, which is why the page asks for both numbers rather than one.',
        'Choose a cheaper plan than the benchmark and the credit stays the same size, so more of your premium disappears; the credit can never exceed what you are enrolled in, so it cannot pay you. Choose a dearer plan and the extra is yours. The benchmark also excludes any tobacco surcharge even when the plan you buy carries one.',
      ] },
      { heading: 'How the contribution percentage is found', paragraphs: [
        'Your income is expressed as a percentage of the poverty guideline for your household size, then located in the IRS table. The table gives each band a starting and an ending percentage, and your percentage sits proportionally between them. It is not a bracket: at 175% of the guideline you get a percentage roughly halfway across the 150–200% band, not the band edge.',
        'That percentage is applied to annual household income and divided by twelve to give your expected monthly contribution. The credit is the benchmark premium minus that contribution, floored at zero. When the benchmark is cheaper than your expected contribution there is no credit, which happens to higher earners in low-premium areas.',
      ] },
      { heading: 'Which income and which household', paragraphs: [
        'Use modified adjusted gross income for the coverage year, for the whole tax household, including members required to file even if they are not enrolling. Take-home pay, gross wages alone, and last year’s return are all different numbers and will give a different credit.',
        'The tax household is you, your spouse if you file jointly, and your dependents. It is not the same as the people on the policy. A household of four with two people enrolled still uses the guideline for four, which is why household size and enrolment are asked separately from the premiums.',
      ] },
      { heading: 'What changed for 2026', paragraphs: [
        'The temporary expansion that removed the 400% ceiling applied through 2025 and has lapsed. For 2026 the ceiling is back: a household one dollar over 400% of the poverty guideline receives no credit at all, so income near that line is worth checking carefully.',
        'The cap on repaying excess advance credits is also gone for 2026. If you take the credit in advance and your income ends up higher than you estimated, the full excess can be owed back at tax time. Reporting income and household changes to the Marketplace during the year is the way to avoid that.',
      ] },
      { heading: 'Where this stops and the Marketplace starts', paragraphs: [
        'Income is only one condition. The credit also requires qualifying Marketplace coverage, the tax-filing conditions, premiums actually paid, and no access to disqualifying government coverage or affordable employer coverage. This page cannot check any of those, so it asks you to state the assumption and labels the result accordingly.',
        'Medicaid, CHIP, Medicare, immigration status, mixed-eligibility families, employer HRAs, and state-funded assistance all change the answer in ways income alone does not reveal. Below the income range in particular, a Marketplace application is the right next step rather than this calculator.',
      ] },
    ],
  },
  faq: [
    { question: 'How do I find my second-lowest-cost Silver plan premium?', answer: ['Run a plan preview on your Marketplace with your county, household size, and the ages of the people enrolling. Sort Silver plans by price and take the second cheapest. For a year you have already been covered, the same figure appears on Form 1095-A, column B, as the applicable second-lowest-cost Silver plan premium.'] },
    { question: 'Why does the calculator ask for two different premiums?', answer: ['Because the credit is calculated from one plan and spent on another. The second-lowest-cost Silver plan decides how many dollars of credit you get. Your chosen plan is what those dollars are subtracted from. Entering the same number twice is only correct if you are actually enrolling in the benchmark plan itself.'] },
    { question: 'What happens if I earn just over 400% of the poverty guideline in 2026?', answer: ['The credit drops to zero. The temporary expansion above that ceiling ended after 2025, so 2026 has a hard cliff rather than a taper. The calculator shows the exact dollar income at which the ceiling falls for your household size, so you can see how close you are.'] },
    { question: 'Is this the same as the subsidy the Marketplace will offer me?', answer: ['It applies the same published formula, but it is not an eligibility determination. The Marketplace verifies income, coverage, filing status, and other conditions this page cannot see, and the IRS reconciles the final credit on Form 8962 with your actual income. Treat this as a planning number to check their figure against.'] },
    { question: 'Does the credit cover my deductible and copays?', answer: ['No. The premium tax credit only reduces the monthly premium. Deductibles, copays, and coinsurance are separate, and so are cost-sharing reductions, which are a different form of help attached to Silver plans for lower incomes. This calculator estimates premium assistance only.'] },
    { question: 'What if I only need coverage for part of 2026?', answer: ['Enter the number of months. The credit and net premium are totalled over that period, while your annual income stays annual: the poverty-guideline comparison uses your income for the whole year, not a prorated share of it. That is how the federal rules treat a partial year of enrollment.'] },
    { question: 'My employer offers coverage. Can I still get a credit?', answer: ['Usually not. An offer of employer coverage that counts as affordable and meets minimum value disqualifies you, and affordability for 2026 is measured against 9.96% of household income. Because the test depends on details of the offer, this calculator will not infer it; state that the conditions are unchecked and confirm with the Marketplace.'] },
    { question: 'Why does my income percentage show decimals?', answer: ['The contribution percentage is interpolated inside its band using unrounded income, so small income differences produce small credit differences rather than jumps at bracket edges. Displayed dollars are rounded to cents; the Marketplace and Form 8962 apply their own rounding, so a final figure can differ by small amounts.'] },
  ],
  glossary: [
    { term: 'Premium tax credit', definition: 'Federal assistance that reduces the monthly premium of a Marketplace plan, claimed in advance or at tax time.' },
    { term: 'Benchmark plan', definition: 'The second-lowest-cost Silver plan for the people enrolling in your county; it sizes the credit but need not be the plan you buy.' },
    { term: 'MAGI', definition: 'Modified adjusted gross income for the tax household in the coverage year, the income figure the credit is calculated from.' },
    { term: 'Federal poverty guideline', definition: 'The HHS income figure for a household size that income is compared against; 2026 coverage uses the 2025 guidelines.' },
    { term: 'Applicable contribution percentage', definition: 'The share of household income the IRS table expects you to pay toward the benchmark premium.' },
    { term: 'Advance payment', definition: 'Credit paid to the insurer during the year, reconciled against your actual income on Form 8962.' },
    { term: 'Cost-sharing reduction', definition: 'Separate help with deductibles and copays on Silver plans at lower incomes; not part of this premium estimate.' },
  ],
  tips: [
    'Take the benchmark premium from a plan preview for your own county and the ages actually enrolling, not a state or national average.',
    'Estimate income for the coverage year rather than copying last year’s return, and report changes to the Marketplace as they happen.',
    'Check the dollar income where the 400% ceiling falls for your household before assuming a raise leaves you better off.',
    'Compare plans on the premium after the credit plus the deductible you would face, not on the premium alone.',
  ],
  caveats: [
    'This is a premium estimate from published federal rules, not an eligibility determination, an offer of coverage, or tax advice.',
    'Eligibility conditions beyond income are assumed rather than checked, and the assumption is stated on the result.',
    'State-funded assistance, cost-sharing reductions, Medicaid, CHIP, and employer HRA arrangements are outside this calculation.',
    'For 2026 there is no cap on repaying excess advance credits, so an underestimated income can be owed back in full.',
  ],
}];
