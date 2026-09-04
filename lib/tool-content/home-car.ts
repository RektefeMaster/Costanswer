import type { ToolEditorial } from './types';

export const HOME_CAR_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'electricity-cost',
    guide: {
      heading: 'State-average electric bills versus your utility',
      lede: 'Monthly cost is kWh × the EIA residential average for the state you pick, unless you type the rate from your bill. The EIA figure is a statewide average retail price, not your utility’s tariff.',
      sections: [
        {
          heading: 'Why the bill diverges',
          paragraphs: [
            'Fixed customer charges, time-of-use periods, summer rattlesnake rates in Texas ERCOT cities, and California tiered rates are not in a single cents-per-kWh average. If you have a bill, type that effective rate and the snapshot drops out of the result.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Which state’s electricity is used?',
        answer: [
          'The state you select. The cents-per-kWh is EIA’s residential average for that state in the stored period, unless you override it.',
        ],
      },
      {
        question: 'Does this include delivery charges?',
        answer: [
          'EIA’s retail average blends generation and delivery as reported. It still will not match a bill with a large fixed charge and low usage.',
        ],
      },
    ],
    glossary: [
      { term: 'kWh', definition: 'Kilowatt-hour, the usual unit on a residential bill.' },
      { term: 'EIA', definition: 'U.S. Energy Information Administration, source of the state average price snapshot.' },
    ],
    tips: [
      'Divide a recent bill’s total by kWh for an effective rate, then type that.',
      'Appliance-level costs are on the appliance electricity calculator.',
    ],
    caveats: [
      'State average, not a quote from your utility. Not energy advice.',
    ],
  },
  {
    toolId: 'appliance-electricity',
    guide: {
      heading: 'What a device costs to run',
      lede: 'Wattage × hours of use becomes kWh, then kWh × a rate. The rate is the EIA state average unless you type your own. Duty cycle and phantom load are only as good as the hours you enter.',
      sections: [
        {
          heading: 'Nameplate watts are not always running watts',
          paragraphs: [
            'A refrigerator’s compressor cycles. A dryer listing 5,600 watts does not run that hard for a full hour of “cycle time” in every home. Use measured watts if you have a meter; otherwise treat the result as an upper-ish planning number.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much does a dryer cost per load?',
        answer: [
          'Type the dryer’s watts, hours per load, loads per week, and a rate. The page annualizes from that pattern. It will not read a model number.',
        ],
      },
    ],
    glossary: [
      { term: 'Watt', definition: 'Power. 1,000 watts for one hour is 1 kWh.' },
      { term: 'Duty cycle', definition: 'The fraction of time a compressor or heater is actually drawing nameplate power.' },
    ],
    tips: [
      'For always-on devices, hours per day are 24 and the interesting input is watts.',
      'Compare two states only if you keep watts and hours identical.',
    ],
    caveats: [
      'Formula estimate from the watts and hours you typed, priced at an average or your override.',
    ],
  },
  {
    toolId: 'concrete',
    guide: {
      heading: 'Slab volume, bags, and waste',
      lede: 'Length × width × thickness becomes cubic yards. Bag counts use published yield for the bag weight you pick. Waste is listed separately so the measured volume stays honest.',
      sections: [
        {
          heading: 'Waste is not the slab',
          paragraphs: [
            'Uneven subgrade, spillage, and over-excavation eat extra concrete. The typical bag count includes a waste factor; the low/high range is there because that factor is a judgment, not a measurement.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How many 80 lb bags for a 10×10 slab?',
        answer: [
          'It depends on thickness. A 4-inch slab is a different volume than a 6-inch slab. Type all three dimensions. The page will not assume 4 inches for you.',
        ],
      },
    ],
    glossary: [
      { term: 'Cubic yard', definition: '27 cubic feet. Ready-mix is usually ordered in cubic yards.' },
      { term: 'Yield', definition: 'How much volume a bag is rated to produce. The snapshot cites the packaged-concrete figures in use.' },
    ],
    tips: [
      'Order ready-mix in yards for anything larger than a small pad; bag math is for small jobs.',
      'Confirm thickness. A patio and a driveway are not the same slab.',
    ],
    caveats: [
      'Volume math is exact for a rectangle. Bags and waste are planning estimates. Not an engineering spec.',
    ],
  },
  {
    toolId: 'square-footage',
    guide: {
      heading: 'Adding rectangular rooms to a total area',
      lede: 'Each space is length × width. The total is the sum, with square meters from the shared conversion engine. Irregular rooms, stairs, and wall thickness are not modeled unless you split them into rectangles.',
      sections: [
        {
          heading: 'What “square footage” means in a listing',
          paragraphs: [
            'Appraisers and listing agents do not always count the same spaces. This page totals the rectangles you enter. It is not a legal living-area calculation.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this include closets and hallways?',
        answer: [
          'Only if you add them as spaces. The engine does not infer a floor plan.',
        ],
      },
    ],
    glossary: [
      { term: 'Square foot', definition: 'Length in feet times width in feet for a rectangle.' },
      { term: 'Finished area', definition: 'A listing term this page does not certify.' },
    ],
    tips: [
      'Break an L-shaped room into two rectangles.',
      'Use the concrete calculator if you need thickness as well as area.',
    ],
    caveats: [
      'Exact for the rectangles you typed. Not an appraisal.',
    ],
  },
  {
    toolId: 'ev-vs-gas',
    guide: {
      heading: 'Yearly charging versus gasoline',
      lede: 'Miles, MPG, a gas price, EV efficiency, and a state electricity rate become two energy bills. The gas price can be an EIA geography average or a pump price you type. Public fast charging is not home charging.',
      sections: [
        {
          heading: 'What is left out on purpose',
          paragraphs: [
            'Purchase price, insurance, tires, and depreciation are not in this energy comparison. Home charging at the EIA residential average is not the same as a 400-volt highway charger billed per minute or per kWh by a network.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this include the federal EV tax credit?',
        answer: [
          'No. This page is energy cost only. Credits have eligibility rules this engine does not apply.',
        ],
      },
    ],
    glossary: [
      { term: 'kWh/100 miles', definition: 'A common EV efficiency measure. Lower is less electricity per mile.' },
      { term: 'MPG', definition: 'Miles per gallon for the gas vehicle in the comparison.' },
    ],
    tips: [
      'If you charge at work for free, the EV side of this comparison is overstated.',
      'Use a winter MPG and a winter kWh/100 mi if that is your climate.',
    ],
    caveats: [
      'Energy-cost estimate from averages or your overrides. Not a TCO and not a buying recommendation.',
    ],
  },
  {
    toolId: 'road-trip-fuel',
    guide: {
      heading: 'Fuel cost for the miles you drive',
      lede: 'Distance ÷ MPG × dollars per gallon. The gallon price starts as an EIA weekly regular-gas average for a state or PADD region, unless you type a pump price.',
      sections: [
        {
          heading: 'Geography of the gas price',
          paragraphs: [
            'Some states have their own weekly average in the snapshot. Others inherit a PADD regional average. California and Texas often differ by more than a dollar. A trip that crosses regions is still one price unless you split the drive.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is highway MPG or city MPG the right input?',
        answer: [
          'Use the MPG you expect on that trip. EPA combined is a compromise and often optimistic on a loaded car in hills.',
        ],
      },
    ],
    glossary: [
      { term: 'PADD', definition: 'Petroleum Administration for Defense District, EIA’s regional grouping for some gasoline series.' },
    ],
    tips: [
      'Type the pump price from the start of the trip if you already know it.',
      'Tolls, food, and lodging are not fuel. Do not treat this as a full trip budget.',
    ],
    caveats: [
      'Fuel only, at an average or a price you typed. Not a routing app.',
    ],
  },
  {
    toolId: 'car-affordability',
    guide: {
      heading: 'Monthly cash cost of a car versus take-home pay',
      lede: 'Loan payment, fuel or charging, insurance, upkeep, and registration are added into a monthly cash cost, then compared with take-home pay using CostAnswer bands. Depreciation is left out, so this is out-of-pocket cost, not total cost of ownership.',
      sections: [
        {
          heading: 'Two caps on purpose',
          paragraphs: [
            'A long loan can hide an expensive car behind a small payment. The guideline therefore caps both the total monthly cash cost and the payment share of take-home. Those percentages are planning thresholds, not a credit union rule.',
          ],
        },
        {
          heading: 'Energy reuses the same engines',
          paragraphs: [
            'Gasoline and home charging use the same EIA snapshots as the EV vs. gas and electricity pages. Insurance and maintenance are whatever you type; there is no vehicle-price API.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much car can I afford?',
        answer: [
          'The inverse prices (comfortable, reasonable, aggressive) take running costs out of the budget first, then turn leftover room into a sticker price. They are CostAnswer bands on take-home pay, not a dealer pre-approval.',
        ],
      },
      {
        question: 'Why isn’t depreciation included?',
        answer: [
          'There is no honest used-car residual on this site. Cash out of pocket is still useful; it is just not TCO.',
        ],
      },
    ],
    glossary: [
      { term: 'Out-of-pocket cost', definition: 'Cash that leaves the account: payment, energy, insurance, upkeep, registration. Not resale loss.' },
      { term: 'TCO', definition: 'Total cost of ownership, including depreciation. Not this page.' },
    ],
    tips: [
      'If take-home is estimated from a salary, unsupported states are federal-and-FICA only.',
      'A 72-month loan that “fits” the payment cap can still fail the total-cost cap.',
    ],
    caveats: [
      'Planning guideline, not a lender or dealer decision, and not financial advice.',
    ],
  },
];
