import type { ToolEditorial } from './types';

export const AUTO_COVERAGE_EDITORIAL: ToolEditorial[] = [{
  toolId: 'auto-coverage',
  guide: {
    heading: 'Whether collision and comprehensive still earn their premium',
    lede: 'These two coverages pay what your car is worth on the day of the loss, minus the deductible. That ceiling falls every year as the car depreciates. The premium does not follow it down, so on an old car the cost slowly catches up with the most the cover can ever return. This page puts the two numbers next to each other; it does not tell you what to do with them.',
    sections: [
      { heading: 'The benefit has a ceiling and the premium does not', paragraphs: [
        'Collision pays for damage to your own car in a crash you cause. Comprehensive pays for theft, hail, flood, fire, falling objects, and animal strikes. Both settle at the vehicle’s actual cash value less your deductible, so the most either can ever pay is what the car would have sold for the day before, minus that amount.',
        'A car worth $30,000 with a $1,000 deductible carries up to $29,000 of cover. The same car five years later might be worth $6,000, carrying $5,000 of cover for a premium that has barely moved. Dividing the ceiling by the annual premium turns that into a single number: how many years of premium the entire benefit is worth.',
      ] },
      { heading: 'When the deductible overtakes the car', paragraphs: [
        'If the deductible is at or above what the car is worth, a total loss returns nothing at all. The coverage is then paying for a benefit it structurally cannot deliver, and the calculator says so rather than showing a small number.',
        'This is easy to arrive at without noticing: people raise deductibles to cut the premium while the car keeps depreciating, and the two lines cross quietly. Checking the actual cash value against the deductible once a year is the whole maintenance this requires.',
      ] },
      { heading: 'Actual cash value is not what you think it is', paragraphs: [
        'It is what the car would sell for now, in its condition, with its mileage, in your area. It is not what you paid, not what you owe, and not a dealer’s asking price. Insurers set it themselves at claim time using their own valuation, and it is usually lower than owners expect.',
        'If you owe more than the car is worth, dropping physical damage cover is generally not permitted by the lender, and gap coverage exists precisely because the settlement can fall short of the loan. Check the loan or lease terms before treating this as a live choice.',
      ] },
      { heading: 'Liability is a different question entirely', paragraphs: [
        'Liability pays other people for injuries and damage you cause. Its worth has nothing to do with what your car is worth: a driver of a $2,000 car can cause a $200,000 injury claim. It is required in almost every state, and nothing on this page is about it.',
        'It is shown alongside for context only, so you can see how the physical-damage premium compares with the part of the policy that is not optional. Reducing liability limits to save money is the opposite of the trade this page examines.',
      ] },
      { heading: 'What the published averages can and cannot tell you', paragraphs: [
        'The state figures are NAIC averages of written premium per insured car-year across every policy in the state: every driver, record, vehicle, and coverage limit combined. They are useful for seeing the shape of the trade-off before you have a quote.',
        'They are not your premium. Your record, vehicle, mileage, deductibles, and insurer move it a long way from the average. The moment you have a declarations page, enter the collision and comprehensive lines from it: the comparison then uses your actual cost rather than a benchmark.',
      ] },
    ],
  },
  faq: [
    { question: 'When should I drop collision and comprehensive?', answer: ['There is no threshold that is right for everyone, which is why this page gives you the arithmetic rather than a verdict. The figures that matter are the most the cover can pay, which is your car’s value less the deductible, and what a year of it costs. The judgement on top is whether you could replace the car out of savings if it were destroyed tomorrow.'] },
    { question: 'What is the difference between collision and comprehensive?', answer: ['Collision covers damage to your own car from a crash, including one you cause. Comprehensive covers almost everything else that can happen to a parked or moving car that is not a collision: theft, hail, flood, fire, vandalism, and animal strikes. They are priced separately and usually carry different deductibles.'] },
    { question: 'Is “full coverage” a real thing?', answer: ['Not as a defined product. It usually means liability plus collision plus comprehensive, but the term is marketing rather than a policy form, and it says nothing about limits. Compare the individual coverages and their limits; two policies both described as full coverage can differ enormously.'] },
    { question: 'My car is old. Can I keep just comprehensive?', answer: ['Many insurers allow comprehensive without collision, since it covers theft and weather rather than driving. It is worth pricing separately, because comprehensive is usually the cheaper of the two while covering the losses an old car is still fully exposed to.'] },
    { question: 'Does dropping coverage affect my liability insurance?', answer: ['No. Liability is a separate coverage that pays other people, and it remains required in almost every state regardless of what you carry on your own vehicle. Dropping physical damage cover does not reduce your liability limits, and it should not be used as a way to reduce them.'] },
    { question: 'Why is the payout less than what I paid for the car?', answer: ['Because these coverages settle at actual cash value, which is what the car is worth at the moment of the loss after depreciation, not the purchase price. On a financed car this can be less than the loan balance, which is the gap that gap insurance exists to cover.'] },
    { question: 'Can I lower the premium instead of dropping the coverage?', answer: ['Raising the deductible usually does, but it lowers the ceiling too: the payout is the value minus the deductible, so a higher deductible cuts the benefit at both ends. Change the deductible figures here to see the cost and the ceiling move together rather than assuming only the premium changes.'] },
  ],
  glossary: [
    { term: 'Actual cash value', definition: 'What the vehicle would have sold for immediately before the loss, after depreciation. The basis these coverages settle on.' },
    { term: 'Collision', definition: 'Coverage for damage to your own vehicle from a crash, including one you are at fault for.' },
    { term: 'Comprehensive', definition: 'Coverage for theft, weather, fire, vandalism, and animal strikes, rather than collision damage.' },
    { term: 'Physical damage coverage', definition: 'Collision and comprehensive together: the part of a policy that pays for your own car.' },
    { term: 'Liability coverage', definition: 'The part of a policy that pays other people for injury and damage you cause. Required in almost every state.' },
    { term: 'Gap coverage', definition: 'Separate cover for the difference between a settlement and a loan balance when a car is worth less than is owed.' },
    { term: 'Written premium per car-year', definition: 'NAIC’s measure: total premium written divided by twelve-month vehicle exposures.' },
  ],
  tips: [
    'Look up the actual cash value once a year; the ceiling on these coverages falls with it while the premium does not.',
    'Check the collision and comprehensive lines separately on your declarations page: they are priced apart and often carry different deductibles.',
    'Confirm what a loan or lease requires before treating physical damage cover as optional.',
    'Move the deductible figures here before changing them on a policy, so you can see the ceiling fall at the same time as the premium.',
  ],
  caveats: [
    'This compares a capped benefit with its cost. It is not advice to keep or drop coverage, and it does not estimate how likely a claim is.',
    'State premiums are historical NAIC averages across all policies, not a quote and not a prediction of your renewal.',
    'Gap cover, rental reimbursement, roadside assistance, and custom equipment are separate coverages and are not counted here.',
    'Diminished value, total-loss thresholds, and state settlement rules can move an actual payout away from value less deductible.',
  ],
}];
