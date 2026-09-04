import type { ToolEditorial } from './types';

export const HEALTH_MATH_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'bmi',
    guide: {
      heading: 'Adult BMI as a screening ratio, not a diagnosis',
      lede: 'BMI is weight divided by height squared, then labeled with CDC adult category ranges. Those labels are secondary screening cutoffs. They are not a diagnosis, not body composition, and not a fitness score.',
      sections: [
        {
          heading: 'Who the adult formula misreads',
          paragraphs: [
            'Athletes with high muscle mass, some older adults, and people who are pregnant are poorly described by BMI. The engine still computes the ratio if you enter height and weight; the category is still not a clinical finding.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is a BMI of 24 “healthy”?',
        answer: [
          'It falls in the CDC adult “healthy weight” range used as a label on this page. That is not a medical clearance and not an assessment of diet or disease risk for you.',
        ],
      },
      {
        question: 'Can I use this for a child?',
        answer: [
          'No. Pediatric BMI uses age- and sex-specific percentiles, which this adult formula does not apply.',
        ],
      },
      {
        question: 'Does BMI measure body fat?',
        answer: [
          'No. It is a height-to-weight ratio. Two people with the same BMI can have very different fat and muscle. The body-fat calculator is a different, still imperfect, circumference estimate.',
        ],
      },
    ],
    glossary: [
      { term: 'BMI', definition: 'Body mass index, a height-weight ratio. Not fat percentage.' },
      { term: 'CDC category', definition: 'Adult screening bands. Not a diagnosis.' },
    ],
    tips: [
      'Use the same units consistently, or let the page convert.',
      'Body-fat and BMR pages answer different questions; BMI will not substitute for them.',
    ],
    caveats: [
      'Published adult formula, not a measurement or medical advice. Not for children.',
    ],
  },
  {
    toolId: 'bmr',
    guide: {
      heading: 'Mifflin–St Jeor BMR, not a metabolic cart',
      lede: 'Basal metabolic rate is estimated with the Mifflin–St Jeor equation from age, sex, height, and weight. It is an estimate of resting energy use, not a lab measurement.',
      sections: [
        {
          heading: 'Why equations disagree',
          paragraphs: [
            'Harris-Benedict, Katch-McArdle, and Mifflin–St Jeor were fitted on different samples. This site uses Mifflin–St Jeor and says so. Thyroid disease, fever, and some medications can move real BMR a long way from any equation.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is BMR the same as TDEE?',
        answer: [
          'No. TDEE multiplies BMR by an activity factor. BMR is the resting piece only.',
        ],
      },
      {
        question: 'Why does this use Mifflin–St Jeor?',
        answer: [
          'It is a widely cited adult equation and the one this engine is tested against. Other equations exist. The page will not switch formulas silently.',
        ],
      },
      {
        question: 'Should I eat only my BMR?',
        answer: [
          'No. BMR is a resting estimate. Eating at BMR for days is not a plan this site offers, and it is not medical advice.',
        ],
      },
    ],
    glossary: [
      { term: 'BMR', definition: 'Estimated basal metabolic rate in kcal/day under Mifflin–St Jeor.' },
      { term: 'Mifflin–St Jeor', definition: 'The equation this page applies. It is not a calorimeter.' },
    ],
    tips: [
      'If you have a measured RMR from a clinic, prefer that number over this estimate.',
    ],
    caveats: [
      'Formula estimate, not medical advice, not a diagnosis, not a meal plan.',
    ],
  },
  {
    toolId: 'tdee',
    guide: {
      heading: 'TDEE as BMR times an activity factor',
      lede: 'Total Daily Energy Expenditure here is adult BMR × a labeled activity multiplier. The multiplier is a planning assumption, not a GPS of your week.',
      sections: [
        {
          heading: 'Activity factors are coarse',
          paragraphs: [
            '“Sedentary” versus “active” hides a lot of jobs and training. If you sit at a desk and lift three evenings, you are not a single textbook category. Treat the result as a starting calorie budget to compare with intake, not as a prescription.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Which activity level should I pick?',
        answer: [
          'Pick the label that matches most of your week, then be willing to adjust. The factor is not computed from step counts.',
        ],
      },
      {
        question: 'Does a step count change TDEE here?',
        answer: [
          'No. There is no wearable import. The multiplier is the label you choose. If your weight is drifting, the label or the BMR inputs are a poor fit — not a prompt to invent a custom factor.',
        ],
      },
      {
        question: 'Is TDEE a meal plan?',
        answer: [
          'No. It is BMR times a documented activity factor. The calorie page can apply a small offset. Neither page is nutrition therapy.',
        ],
      },
    ],
    glossary: [
      { term: 'TDEE', definition: 'Estimated total daily energy expenditure: BMR × activity factor on this page.' },
      { term: 'Activity factor', definition: 'A documented multiplier. It is an assumption, not a measurement.' },
    ],
    tips: [
      'The calorie calculator adds an optional small offset for a goal; TDEE itself is the maintenance-style estimate.',
    ],
    caveats: [
      'Formula estimate. Not medical advice and not a diet.',
    ],
  },
  {
    toolId: 'calorie',
    guide: {
      heading: 'Estimated daily calories from BMR and activity',
      lede: 'Maintenance calories are TDEE. Optional small offsets for a surplus or deficit stay modest on purpose. Large cuts, medical diets, and eating-disorder care are outside this page.',
      sections: [
        {
          heading: 'Why the offset is small',
          paragraphs: [
            'Aggressive deficits are easy to type and hard to live with. This tool keeps optional offsets limited so the page cannot be mistaken for a crash-diet planner. A clinician may use different targets; that is their job, not this calculator’s.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How many calories do I need per day?',
        answer: [
          'The maintenance line is estimated TDEE from Mifflin–St Jeor and the activity factor you pick. It is not a lab measurement and not a meal plan.',
        ],
      },
      {
        question: 'Why can’t I type a large deficit?',
        answer: [
          'Optional offsets on this page stay small on purpose. A crash deficit is easy to type and easy to misread as a prescription. This is not a clinic protocol.',
        ],
      },
      {
        question: 'Does this work for teenagers?',
        answer: [
          'The equations here are adult formulas. Growth, sport, and medical care for minors are outside this page. It is not a diet prescription for anyone under 18.',
        ],
      },
    ],
    glossary: [
      { term: 'Maintenance', definition: 'Estimated calories to hold current weight under these assumptions.' },
      { term: 'Offset', definition: 'A small planned surplus or deficit. Not a medical target.' },
    ],
    tips: [
      'If weight is changing fast, the estimate or the activity factor is wrong for you; do not just cut more.',
    ],
    caveats: [
      'Not medical advice, not nutrition therapy, not for minors as a diet prescription.',
    ],
  },
  {
    toolId: 'body-fat',
    guide: {
      heading: 'U.S. Navy circumference method',
      lede: 'Body-fat percentage is estimated from neck, waist, and hip circumferences using the documented Navy method. It is not a DEXA scan, not Bod Pod, and not a tape of visceral fat.',
      sections: [
        {
          heading: 'Tape technique matters',
          paragraphs: [
            'A tape pulled tight or placed on the navel versus the Navy landmark will move the percentage. Follow the method’s measurement points if you want to match the equation. Even then, individual error versus DEXA can be several points.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is this as accurate as DEXA?',
        answer: [
          'No. It is a circumference estimate. Use it for a rough trend, not for a clinical or athletic cutoff.',
        ],
      },
      {
        question: 'Why do I need hip circumference?',
        answer: [
          'The documented Navy method uses hip for the female equation. The male equation uses neck and waist. Enter the measurements the selected method asks for.',
        ],
      },
      {
        question: 'Can I use this for a Navy accession physical?',
        answer: [
          'No. A service uses its own process and cutoffs. This page applies the published circumference formula for an estimate, not a fitness-for-duty finding.',
        ],
      },
    ],
    glossary: [
      { term: 'Navy method', definition: 'A published circumference formula used here. Not a military accession decision unless an official uses their own process.' },
    ],
    tips: [
      'Measure at the same time of day if you are tracking a trend.',
    ],
    caveats: [
      'Formula estimate, not a medical measurement or diagnosis.',
    ],
  },
  {
    toolId: 'percentage',
    guide: {
      heading: 'Three percent questions, exactly',
      lede: 'What is X% of Y, X is what percent of Y, and X is Y% of what. Division by zero is rejected. This is not a mortgage rate and not a tax bracket.',
      sections: [
        {
          heading: 'Percent of versus percent off',
          paragraphs: [
            '“15% of 200” is 30. “15% off 200” is 170. The third mode (X is Y% of what) solves for the original. Pick the question that matches the sentence you are trying to finish.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What is 15 percent of 200?',
        answer: [
          '30, using the first mode. A sale price of 15% off 200 is a different question; use the wording on the page that matches “off.”',
        ],
      },
    ],
    glossary: [
      { term: 'Percent', definition: 'A ratio times 100. This page does not add tax or round to currency unless the display does.' },
    ],
    tips: [
      'For a price change from old to new, the percent-change calculator is the clearer tool.',
    ],
    caveats: [
      'Exact arithmetic for the mode you picked. Not financial advice.',
    ],
  },
  {
    toolId: 'percent-change',
    guide: {
      heading: 'Increase or decrease from an original value',
      lede: 'Percent change is (new − original) / original. A zero original is undefined and rejected. This is not inflation (use CPI-U) and not a log return.',
      sections: [
        {
          heading: 'Up 50% then down 50% is not back to start',
          paragraphs: [
            '100 increased by 50% is 150. 150 decreased by 50% is 75. Sequential percent changes do not cancel. Run each step separately if you need a chain.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How do I calculate a percentage increase?',
        answer: [
          'Enter the original and the new value. The sign shows increase versus decrease. Zero as a baseline is not defined.',
        ],
      },
    ],
    glossary: [
      { term: 'Baseline', definition: 'The original value in the denominator. It cannot be zero on this page.' },
    ],
    tips: [
      'For buying power across years, use the inflation calculator, not a homemade percent on two prices of different goods.',
    ],
    caveats: [
      'Exact for two numbers. Not a market return with dividends.',
    ],
  },
  {
    toolId: 'scientific',
    guide: {
      heading: 'A keypad that follows ordinary order of operations',
      lede: 'Powers, roots, logs, factorials, and trig in degrees or radians, with π and e. The engine evaluates a normal arithmetic expression. It is not a computer-algebra system and not a graphing package.',
      sections: [
        {
          heading: 'Degrees versus radians',
          paragraphs: [
            'sin(90) is 1 in degrees and a different number in radians. The mode is a setting, not an inference from the number you typed.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this use degrees or radians?',
        answer: [
          'Whichever mode is selected. Check the control before you trust a trig result.',
        ],
      },
    ],
    glossary: [
      { term: 'Order of operations', definition: 'The usual precedence the keypad follows, including parentheses.' },
    ],
    tips: [
      'Factorials grow fast; large n will be rejected rather than overflowing silently if the engine bounds them.',
    ],
    caveats: [
      'Exact within ordinary floating-point evaluation. Not a proof assistant.',
    ],
  },
  {
    toolId: 'fraction',
    guide: {
      heading: 'Exact fraction arithmetic',
      lede: 'Add, subtract, multiply, divide, and simplify with integer arithmetic, then show mixed and decimal forms. This is not a repeating-decimal recognizer for every possible expansion.',
      sections: [
        {
          heading: 'Simplification',
          paragraphs: [
            'Results are reduced by gcd. Mixed numbers are a display of the same rational, not a second calculation.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What is 1/2 plus 1/3?',
        answer: [
          '5/6 exactly. The decimal form is additional display, not a rounded substitute for the fraction.',
        ],
      },
    ],
    glossary: [
      { term: 'Mixed number', definition: 'A whole part plus a proper fraction equal to the same rational.' },
    ],
    tips: [
      'For unit conversions, use the conversion calculator; this page is rationals, not inches.',
    ],
    caveats: [
      'Exact integer arithmetic for the operators supported. Division by zero is rejected.',
    ],
  },
  {
    toolId: 'unit-conversion',
    guide: {
      heading: 'Conversions through canonical base units',
      lede: 'Length, mass, volume, area, temperature, and speed go through one tested path each. That avoids a mesh of pairwise factors that drift. Temperature is affine (offset), not a simple scale.',
      sections: [
        {
          heading: 'Why not 50 separate converters',
          paragraphs: [
            'Inch to cm and mile to km share a length base. A bug in a one-off factor would only show up on that pair. The shared path is the point of the engine.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How do I convert kg to lbs?',
        answer: [
          'Pick mass, kilograms to pounds. The factor is the same one used anywhere else on the site that converts mass.',
        ],
      },
    ],
    glossary: [
      { term: 'Canonical base unit', definition: 'The internal unit every conversion in a dimension passes through.' },
    ],
    tips: [
      'Culinary volume (cups) is not the same as SI volume if you care about density; this page converts units, not ingredients.',
    ],
    caveats: [
      'Exact for the factors in the engine. Not a lab calibration certificate.',
    ],
  },
];
