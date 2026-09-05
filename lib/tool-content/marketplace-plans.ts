import type { ToolEditorial } from './types';

export const MARKETPLACE_PLANS_EDITORIAL: ToolEditorial[] = [{
  toolId: 'marketplace-plans',
  guide: {
    heading: 'What a health plan costs you in a good year and a bad one',
    lede: 'A premium is the price of being covered, not the price of getting care. The plan with the lowest monthly cost usually has the highest ceiling, and the two figures point in opposite directions. This page reads the premiums, deductibles, and out-of-pocket maximums actually filed for your county and shows both ends: what a year costs if you never use the plan, and the most it can cost if you do.',
    sections: [
      { heading: 'The number a premium comparison hides', paragraphs: [
        'Every Marketplace plan has an out-of-pocket maximum: a legal ceiling on what you pay for covered in-network care in a year. Once you reach it, the plan pays everything else it covers. That ceiling, plus twelve months of premium, is the most the plan can cost you, and it is the only figure that makes a cheap premium comparable to an expensive one.',
        'Bronze plans win on premium and lose on ceiling; Gold plans do the reverse. Neither is the right answer on its own, because which one costs less depends entirely on a year you cannot know in advance. Seeing both ends is what turns the choice into a decision about risk rather than a guess about price.',
      ] },
      { heading: 'How your county premium is built', paragraphs: [
        'Premiums are filed by county, and a ZIP is resolved to its county before anything is priced. Where a ZIP straddles a county line the page asks which one you are in, because the two file separately and can differ substantially.',
        'A household premium is the sum of each person’s premium: every adult, plus at most the three oldest children under 21. A fourth child adds nothing. Premiums rise with age on a published curve, so two households of the same size in the same county can be priced very differently.',
      ] },
      { heading: 'What the middle scenario does and does not do', paragraphs: [
        'The care figure you enter is added to the premium and capped at the plan’s out-of-pocket maximum. That is an honest bound rather than a simulation: the published file carries deductibles and maximums, but not the coinsurance rates and covered-service splits a real cost model would need.',
        'In practice you pay the full price of care until the deductible is met, then a share of it until the maximum, so a middling year usually lands between the deductible and the maximum. Use the entered figure as a rough marker, and the two ends as the numbers you can rely on.',
      ] },
      { heading: 'A credit changes the shape, not just the size', paragraphs: [
        'A premium tax credit is a fixed number of dollars a month, not a percentage off. Subtracting the same amount from every level narrows the gaps between them, and a plan cheaper than the credit falls to zero rather than paying you anything back.',
        'That is why people with a credit often find Gold costs barely more than Silver, and why comparing sticker prices before applying the credit can point at the wrong plan entirely. Enter your credit here, or work it out first with the subsidy calculator.',
      ] },
      { heading: 'What price cannot tell you', paragraphs: [
        'Two plans at the same metal level and the same premium can cover completely different doctors, hospitals, and medicines. Networks, drug formularies, and prior-authorisation rules are not in this comparison and are not a small detail: an out-of-network bill sits outside the out-of-pocket maximum entirely.',
        'Before enrolling, check that your doctors are in the network and your prescriptions are on the formulary. A plan that is cheaper on every figure here can still be the more expensive one if it does not cover the care you actually use.',
      ] },
    ],
  },
  faq: [
    { question: 'How much is health insurance in my area?', answer: ['Enter your ZIP code and the ages of everyone enrolling. The page reads the premiums filed with CMS for your county and shows the cheapest plan at each metal level. Deductibles and out-of-pocket maximums are the range across plans at that level in the county, not the figures attached to that one cheapest plan.'] },
    { question: 'Is a Bronze plan cheaper than a Silver plan?', answer: ['On premium, almost always. Over a year in which you need care, often not: Bronze carries a much higher deductible and a higher out-of-pocket maximum, so the most it can cost you is greater. The table shows both ends so the trade-off is visible rather than buried.'] },
    { question: 'What is an out-of-pocket maximum?', answer: ['It is the legal ceiling on what you pay for covered, in-network care in a plan year, counting deductibles, copays, and coinsurance but not premiums. Once you reach it the plan pays the rest of what it covers. Out-of-network care and excluded services do not count toward it and are not capped by it.'] },
    { question: 'Why is my premium different from my neighbour’s?', answer: ['Premiums are per person and rise with age on a published curve, so the ages enrolling matter as much as the plan. Household size matters too: everyone aged 21 and over is charged, and up to three children under 21. Two households in one county can pay very different amounts for the same plan.'] },
    { question: 'Do these prices include a subsidy?', answer: ['No, unless you enter one. The figures are the full filed premiums. Most Marketplace enrollees qualify for a premium tax credit, which comes off every metal level alike; work yours out with the subsidy calculator and enter it here to see how it changes the comparison.'] },
    { question: 'Why does my state show no plans?', answer: ['The file this page uses is the one CMS publishes for the states on HealthCare.gov. A state running its own Marketplace files its premiums separately and is not in it. The page names the state rather than showing an empty result, because those are different facts.'] },
    { question: 'Does a higher metal level mean better doctors?', answer: ['No. Metal levels describe how costs are split between you and the plan, not the size or quality of the network. A Bronze and a Gold plan from the same insurer often share a network, and two Gold plans from different insurers may not overlap at all. Check the network directly.'] },
    { question: 'What is the difference between the deductible and the out-of-pocket maximum?', answer: ['The deductible is what you pay before the plan starts sharing costs. The out-of-pocket maximum is the total you can pay in a year before the plan covers everything it covers. The deductible is always the smaller of the two, and reaching it is not the same as being done paying.'] },
  ],
  glossary: [
    { term: 'Premium', definition: 'The monthly price of holding the plan, paid whether or not you use any care.' },
    { term: 'Deductible', definition: 'What you pay for covered care before the plan begins paying its share.' },
    { term: 'Out-of-pocket maximum', definition: 'The yearly ceiling on your share of covered in-network care, after which the plan pays the rest.' },
    { term: 'Metal level', definition: 'Bronze, Silver, Gold, or Platinum: how costs are split between you and the plan, not a measure of network quality.' },
    { term: 'Benchmark plan', definition: 'The second-lowest-cost Silver plan in a county, used to size the premium tax credit.' },
    { term: 'Rating area', definition: 'The geographic area a state files premiums for; each county sits in exactly one.' },
    { term: 'Network', definition: 'The doctors and hospitals a plan has contracted with. Care outside it is not capped by the out-of-pocket maximum.' },
  ],
  tips: [
    'Compare the worst-year figure, not the premium, before deciding a cheap plan is the cheap one.',
    'Work out your premium tax credit first and enter it: a fixed credit narrows the gaps between metal levels.',
    'Check that your own doctors and prescriptions are covered before comparing anything on price.',
    'If your income qualifies you for a cost-sharing reduction, price Silver again with it before choosing Bronze.',
  ],
  caveats: [
    'These are filed plan-year prices for a county, not a quote, and not confirmation that a plan is available to you.',
    'Deductible and out-of-pocket figures are individual medical amounts; family maximums are higher and drug deductibles can be separate.',
    'The middle scenario caps entered care at the out-of-pocket maximum rather than modelling coinsurance, which the published file does not carry.',
    'Out-of-network care, excluded services, and balance billing are outside the out-of-pocket maximum and outside this comparison.',
    'Networks, formularies, and prior-authorisation rules are not compared, and they can matter more than price.',
  ],
}];
