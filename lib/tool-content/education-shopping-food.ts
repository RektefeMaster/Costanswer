import type { ToolEditorial } from './types';

export const EDUCATION_SHOPPING_FOOD_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'grade',
    guide: {
      heading: 'Weighted grades from the weights you type',
      lede: 'Each item or category contributes earned/possible × weight. A letter, if shown, uses an assumed 90/80/70/60 scale. Your syllabus may use plus/minus cutoffs or a curve this page does not know.',
      sections: [
        {
          heading: 'Weights must mean the same thing',
          paragraphs: [
            'If homework is 20% of the course, the weights you enter should sum in a way that matches the syllabus. The engine will not notice that you left out the final exam.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What grade do I need on the final?',
        answer: [
          'Only if you enter the final as an item with its weight and leave earned unknown — this page computes a weighted average of known items, not a solver for a missing exam unless you rearrange the inputs yourself.',
        ],
      },
    ],
    glossary: [
      { term: 'Weight', definition: 'How much an item counts in the average, as you typed it.' },
      { term: 'Assumed letter scale', definition: '90/80/70/60 convenience labels. Not your registrar.' },
    ],
    tips: [
      'Copy weights from the syllabus, not from memory.',
    ],
    caveats: [
      'Exact for the weights entered. Not an official transcript.',
    ],
  },
  {
    toolId: 'gpa',
    guide: {
      heading: 'Unweighted 4.0 GPA from credits and letters',
      lede: 'Each course contributes grade points × credit hours, then the total is divided by credits. The letter-to-points map is a visible unweighted 4.0 convenience scale. Weighted honors points, plus/minus variants, and pass/fail policies differ by school.',
      sections: [
        {
          heading: 'Why this will not match every portal',
          paragraphs: [
            'Some high schools add 0.5 or 1.0 for AP. Some colleges use A+ = 4.0, others 4.3. If your handbook disagrees with the table on the page, the handbook wins for that school.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is this a weighted GPA?',
        answer: [
          'No. It is unweighted 4.0 convenience points. For a weighted GPA, your school’s extra points are not in this engine.',
        ],
      },
    ],
    glossary: [
      { term: 'Credit hour', definition: 'The weight of a course in the average.' },
      { term: 'Unweighted 4.0', definition: 'A = 4.0 style scale without honors boosts, as shown on the page.' },
    ],
    tips: [
      'Repeat-course policies (replace versus average) are school rules, not this calculator.',
    ],
    caveats: [
      'Exact for the scale displayed. Not a registrar calculation.',
    ],
  },
  {
    toolId: 'unit-price',
    guide: {
      heading: 'Which package is cheaper per unit',
      lede: 'Prices are normalized to a common unit so a 12 oz box can be compared with a 1 lb box. The cheapest unit price wins. Bulk is not always cheaper once the units match.',
      sections: [
        {
          heading: 'Unit mismatches are the whole point',
          paragraphs: [
            'Store tags sometimes compare apples to pounds. This page converts, then ranks. It does not know warehouse-club membership fees or spoilage if you cannot finish a giant pack.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is bulk cheaper?',
        answer: [
          'Only if the unit price is lower after conversion. Type both packages. A warehouse size can still lose to a sale on a smaller box.',
        ],
      },
    ],
    glossary: [
      { term: 'Unit price', definition: 'Price divided by quantity in a shared unit.' },
    ],
    tips: [
      'Convert both items to the same dimension (mass or volume), not one of each.',
    ],
    caveats: [
      'Exact for the quantities typed. Not a coupon or membership-fee model.',
    ],
  },
  {
    toolId: 'where-cheaper',
    guide: {
      heading: 'Government averages, not store ads',
      lede: 'Compare two states on EIA electricity, EIA gasoline geographies, or BLS grocery staples that split by region. These are published averages. They are not the price at your grocery or your utility.',
      sections: [
        {
          heading: 'Some grocery items have no state split',
          paragraphs: [
            'BLS publishes some staples only as U.S. city averages. The page says so instead of inventing a Texas versus California gap. Electricity and gasoline have stronger geographic coverage in the snapshots.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Which state has cheaper gas?',
        answer: [
          'Pick gasoline and two states. The snapshot may use a state series or a PADD region. California often sits well above the U.S. average; that is the data, not a ranking of places to live.',
        ],
      },
    ],
    glossary: [
      { term: 'BLS APU', definition: 'Average Price series for selected urban prices. Coverage is item-specific.' },
    ],
    tips: [
      'For a household budget, use cost of living; this page is three official price families only.',
    ],
    caveats: [
      'Averages for a geography and period. Not a shopping list and not a COL index.',
    ],
  },
  {
    toolId: 'recipe-scaler',
    guide: {
      heading: 'Scaling servings with 1/16 rounding',
      lede: 'Each ingredient quantity is multiplied by desired servings ÷ original servings, then rounded to the nearest 1/16. That keeps kitchen fractions usable. It will not convert cups to grams.',
      sections: [
        {
          heading: 'What does not scale linearly',
          paragraphs: [
            'Salt, yeast, and bake times are not always linear. The page scales quantities. Cook the dish, do not treat the output as a commercial formula.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How do I double a recipe?',
        answer: [
          'Set desired servings to twice the original. Amounts round to 1/16. Spices may still need tasting.',
        ],
      },
    ],
    glossary: [
      { term: 'Scale factor', definition: 'Desired servings divided by original servings.' },
    ],
    tips: [
      'If you need metric mass, convert after scaling; this page does not know density.',
    ],
    caveats: [
      'Exact scaling then 1/16 rounding. Not food-safety advice.',
    ],
  },
];
