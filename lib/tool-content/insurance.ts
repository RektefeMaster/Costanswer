import type { ToolEditorial } from './types';

export const INSURANCE_EDITORIAL: ToolEditorial[] = [{
  toolId: 'insurance-cost',
  guide: {
    heading: 'Build an insurance budget you can check',
    lede: 'Start with a published insurance benchmark for your state, replace it with a quote when you have one, and see the monthly and annual cost of protecting your home and car together. Each amount keeps its source and data year visible, so a historical average never becomes a supposed personal rate.',
    sections: [
      { heading: 'What the state averages actually measure', paragraphs: [
        'The homeowners benchmark is the NAIC average annual premium for an HO-3 policy. The renters benchmark is its HO-4 average. These are different products: a renters policy does not insure the building, and an HO-3 average is not a condo, landlord, flood, or earthquake quote.',
        'The auto benchmark is average expenditure per insured vehicle. It reflects the mix of coverage people purchased, rather than a policy with standardized liability limits, collision, and comprehensive. Multiplying by your vehicle count is a budgeting assumption; it does not apply a multi-car discount.',
      ] },
      { heading: 'Use a quote to make the budget yours', paragraphs: [
        'Choose your own premium for either insurance line and enter its billing period. A six-month premium is counted twice a year; a monthly premium is counted twelve times. For auto, enter the total for all selected vehicles when the field requests a household quote. Installment charges belong in the amount you enter.',
        'The published data describe the report year, not the day you open this calculator. Local catastrophe exposure, rebuilding cost, driving history, coverage limits, deductibles, and insurer availability can make a current quote very different. This calculator does not add unverified age, credit, ZIP, or risk multipliers.',
      ] },
      { heading: 'A cushion is a scenario you choose', paragraphs: [
        'An optional budget cushion shows the base annual cost alongside a higher amount you choose to plan for. It is not a statistical confidence interval, a prediction of renewal prices, or the range of quotes you will receive. A zero cushion leaves the base budget unchanged.',
      ] },
      { heading: 'Compare deductibles without guessing claim probability', paragraphs: [
        'Enter two annual premiums and their dollar deductibles for the same coverage, then test one covered loss. With no claim, the modeled annual cost is the premium. With one covered claim, it is the premium plus the smaller of the loss and the deductible.',
        'This comparison assumes the loss is covered in full above the deductible. Coverage limits, exclusions, depreciation, separate wind or hurricane deductibles, multiple claims, and renewal effects need to be reviewed in the policy. If a deductible is expressed as a percentage, convert it using the insured amount named in your policy before entering dollars.',
      ] },
      { heading: 'Bring the insurance line into your housing budget', paragraphs: [
        'Use the annual homeowners amount in the mortgage payment or home affordability calculator. Keep it separate from property tax, HOA dues, and private mortgage insurance. PMI protects the lender and does not replace homeowners coverage.',
      ] },
    ],
  },
  faq: [
    { question: 'How much should I budget for home and car insurance together?', answer: ['Select your state, choose homeowners or renters coverage, and include the vehicles you want to budget for. The calculator adds the annual amounts and divides by twelve. Replace the published benchmarks with current quotes to make the total specific to your household.'] },
    { question: 'Are these insurance prices current personal quotes?', answer: ['No. The state benchmarks are historical NAIC observations with the year shown next to the calculator. They do not price your address, vehicle, driving record, coverage, or insurer. Your own premium mode uses the quote or renewal amount you enter.'] },
    { question: 'Does the auto average mean full coverage?', answer: ['No. NAIC average expenditure reflects the actual mix of policies purchased per insured vehicle. It is not a quote with fixed liability limits plus collision and comprehensive. Compare actual policies with matching limits, exclusions, and deductibles.'] },
    { question: 'Can I estimate renters insurance without including a car?', answer: ['Yes. Choose renters coverage and turn off the auto line. The result then uses only the HO-4 state benchmark or your own renters premium. Your landlord’s insurance generally covers the building rather than your belongings.'] },
    { question: 'Will choosing a higher deductible save me money?', answer: ['A higher deductible can come with a lower premium, but the saving must come from an actual quote. Use the deductible comparison with two matching policies to see the annual cost with no claim and with one covered loss. The calculator does not assume how likely a claim is.'] },
    { question: 'Does homeowners insurance include flood or earthquake damage?', answer: ['A standard homeowners policy generally excludes flood and earthquake damage. Those coverages may require separate policies or endorsements. The HO-3 benchmark here must not be used to estimate their premiums. Check the relevant exclusions and deductibles in your policy.'] },
    { question: 'Why is my insurance renewal much higher than the state average?', answer: ['The average combines older policies with different properties, vehicles, limits, deductibles, and risk profiles. It also describes an earlier observation year. A difference from that average does not by itself show that a quote is overpriced or that coverage is equivalent.'] },
  ],
  glossary: [
    { term: 'Annual premium', definition: 'The price paid for a year of insurance coverage, before any separately billed charges you have not entered.' },
    { term: 'HO-3', definition: 'The homeowners policy form used for the published homeowners benchmark on this page.' },
    { term: 'HO-4', definition: 'A renters policy form, used here for the published renters benchmark.' },
    { term: 'Average expenditure', definition: 'NAIC’s auto spending measure per insured vehicle, reflecting the mix of coverage purchased.' },
    { term: 'Deductible', definition: 'The covered loss amount you pay before the policy pays, subject to its terms.' },
    { term: 'Budget cushion', definition: 'An additional percentage you choose to reserve; it is not a measured insurance price range.' },
  ],
  tips: ['Compare the same coverage limits, deductibles, policy term, and exclusions on every quote.', 'Enter the entire household auto premium only once; do not multiply a multi-vehicle quote again.', 'Use rebuilding cost rather than a property’s sale price when discussing dwelling coverage with an insurer.', 'Keep an emergency reserve for the deductible separately from the recurring premium budget.'],
  caveats: ['Published annual averages are historical benchmarks and do not guarantee price, eligibility, availability, or coverage.', 'No automatic inflation adjustment, bundle discount, ZIP-level rate, or underwriting surcharge is assumed.', 'Health, dental, Medicare, flood, and other specialty products require their own data and methods. Their prices cannot be derived from HO-3, HO-4, or auto averages.'],
}];
