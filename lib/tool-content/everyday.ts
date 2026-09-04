import type { ToolEditorial } from './types';

export const EVERYDAY_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'per-diem',
    guide: {
      heading: 'GSA per diem for a CONUS trip',
      lede: 'Federal travel per diem uses GSA lodging ceilings by locality and date, plus meals and incidental expenses (M&IE). Lodging is per night; M&IE is per calendar day, with first and last day at three-quarters. Type a city or ZIP. This is not travel authorization.',
      sections: [
        {
          heading: 'Nights are not days',
          paragraphs: [
            'A Tuesday–Thursday trip has two lodging nights and three M&IE days. Mixing those counts is the usual way a voucher estimate comes out wrong. Seasonal localities also change the lodging cap by month; the page prices each night in the month that night falls in.',
          ],
        },
        {
          heading: 'ZIP codes that sit in two GSA rates',
          paragraphs: [
            'A ZIP maps to a county. GSA sometimes carves a city out of that county. When that happens, the page quotes the county rate and offers the city rate. Pick the one that matches the trip. Unlisted counties use the state standard CONUS rate — that is a normal answer, not a failed lookup.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What is the standard CONUS rate?',
        answer: [
          'GSA’s default lodging and M&IE for locations in a state that are not separately listed. A ZIP whose county is not a named locality gets that state standard rate.',
        ],
      },
      {
        question: 'Can I use this on a federal travel voucher?',
        answer: [
          'Use it to see the ceiling before you file. It is not authorization, not agency policy, and not the voucher your travel office accepts. Lodging tax sits outside the GSA cap under those rules.',
        ],
      },
      {
        question: 'Does this cover Alaska or Hawaii?',
        answer: [
          'No. GSA CONUS rates do not set those locations. DoD and State Department tables are not in this dataset.',
        ],
      },
    ],
    glossary: [
      { term: 'M&IE', definition: 'Meals and incidental expenses, a daily GSA amount, reduced on first and last travel days.' },
      { term: 'CONUS', definition: 'Continental United States. This dataset does not cover OCONUS.' },
      { term: 'Locality', definition: 'A GSA-listed city or county with its own lodging ceiling.' },
    ],
    tips: [
      'If the hotel is over the cap, the page shows what fits under the ceiling and what sits above it. Your authorizing official still has to sign.',
      'Type the ZIP of the duty location, not the airport you flew through, unless that is where you slept.',
    ],
    caveats: [
      'GSA ceilings from a stored snapshot, not travel orders. Not legal advice for a voucher dispute.',
    ],
  },
  {
    toolId: 'business-days',
    guide: {
      heading: 'Counting U.S. federal business days',
      lede: 'Weekends are skipped. Federal holidays are optional using OPM’s holiday rules in the snapshot. State holidays, company shutdowns, and observed-versus-actual dates for a private employer are not inferred.',
      sections: [
        {
          heading: 'Add days versus between dates',
          paragraphs: [
            'Between two dates counts workdays in the span under the holiday toggle you picked. Add/subtract applies N business days to a start date. Those are different questions; the page keeps them as two modes.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Are state holidays included?',
        answer: [
          'No. Only weekends and optional U.S. federal holidays from the OPM rules in the snapshot.',
        ],
      },
    ],
    glossary: [
      { term: 'Business day', definition: 'A weekday that is not skipped as a federal holiday when that option is on.' },
      { term: 'Observed holiday', definition: 'When a holiday falls on a weekend, federal offices often observe it on Friday or Monday. The snapshot’s rules decide that, not your company handbook.', },
    ],
    tips: [
      'Contract language that says “business days” may mean federal, banking, or local. Check the contract.',
      'For calendar days including weekends, use the date or days-from-today calculators.',
    ],
    caveats: [
      'Exact under the holiday rules selected. Not a court-filing deadline calculator for every jurisdiction.',
    ],
  },
  {
    toolId: 'date',
    guide: {
      heading: 'Calendar offsets with month-end clamping',
      lede: 'Add or subtract days, weeks, months, or years from a date. Month ends clamp: January 31 plus one month is not a fictional February 31. Weekends still count; this is not business days.',
      sections: [
        {
          heading: 'Days between versus offset',
          paragraphs: [
            'The same engine can answer “what date is 90 days from June 1” and related offsets. Inclusive versus exclusive counting in contracts is a legal question; this page uses ordinary calendar arithmetic.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What date is 90 days from today?',
        answer: [
          'Use days-from-today for “today plus N,” or this page if the start date is not today. Weekends are included.',
        ],
      },
    ],
    glossary: [
      { term: 'Clamp', definition: 'If a month does not have the same day number, the engine uses the last valid day of that month.' },
    ],
    tips: [
      'Lease “months” and bank “days” are not always calendar months. Read the document.',
    ],
    caveats: [
      'Exact calendar arithmetic. Not a business-day or court-holiday engine.',
    ],
  },
  {
    toolId: 'days-from-today',
    guide: {
      heading: 'Today plus N calendar days',
      lede: 'The result is a calendar date N days from today, or N days ago. Weekends count. For workdays, use the business-days calculator.',
      sections: [
        {
          heading: 'Whose “today”',
          paragraphs: [
            'The date is computed from the calendar date in effect when the page runs in your browser. It is not a server timezone conversion for a federal deadline.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What day is 30 days from today?',
        answer: [
          'Type 30. The weekday is included. If you need to skip weekends and federal holidays, switch tools.',
        ],
      },
    ],
    glossary: [
      { term: 'Calendar day', definition: 'Every day on the calendar, including Saturday and Sunday.' },
    ],
    tips: [
      'Return policies that say “30 days” may be calendar days; confirm with the merchant.',
    ],
    caveats: [
      'Exact offset from the browser’s current date. Not a filing deadline.',
    ],
  },
  {
    toolId: 'age',
    guide: {
      heading: 'Completed years, months, and days',
      lede: 'Age is the completed time from a birth date to an as-of date, including leap-day rules. It is not a school cutoff, not a Medicare eligibility determination, and not a sports-league age group.',
      sections: [
        {
          heading: 'Leap days',
          paragraphs: [
            'People born on February 29 have a defined completion rule in this engine so the result stays a real calendar age. Institutions sometimes use a different convention; theirs wins for their program.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How old am I in years, months, and days?',
        answer: [
          'Enter birth date and as-of date. The page prints completed units, not a rounded “about 34.”',
        ],
      },
    ],
    glossary: [
      { term: 'Completed age', definition: 'How many full years, then leftover months, then leftover days, under this engine’s leap-day rule.' },
    ],
    tips: [
      'For a form that wants age in whole years on a certain day, set as-of to that day.',
    ],
    caveats: [
      'Exact under the engine’s calendar rules. Not legal proof of age.',
    ],
  },
  {
    toolId: 'time',
    guide: {
      heading: 'Duration arithmetic, not clock times in a time zone',
      lede: 'Add or subtract hours, minutes, and seconds as durations. Negative results stay signed and normalized. This is not a world-clock converter and not a timesheet.',
      sections: [
        {
          heading: 'Normalized output',
          paragraphs: [
            '90 minutes becomes 1 hour 30 minutes in the display. The engine keeps SI-style sexagesimal normalization so the parts stay in range.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Can I subtract two clock times?',
        answer: [
          'Convert each to a duration from midnight first, or use the time-card calculator for shifts. This page adds durations, not “3:15 PM minus 11:40 AM” as civil times.',
        ],
      },
    ],
    glossary: [
      { term: 'Duration', definition: 'A length of time, not a timestamp on a calendar.' },
    ],
    tips: [
      'For overnight shifts, time-card is the right tool.',
    ],
    caveats: [
      'Exact duration math. Not a timezone or DST engine.',
    ],
  },
  {
    toolId: 'time-card',
    guide: {
      heading: 'Hours worked after unpaid breaks',
      lede: 'Start, end, and unpaid break across one or more days, including overnight shifts. Overtime law, rounding rules, and meal-penalty statutes are not applied.',
      sections: [
        {
          heading: 'Overnight shifts',
          paragraphs: [
            'A shift that starts at 10 p.m. and ends at 6 a.m. is eight hours minus break, not a negative duration. The engine treats that as a crossing of midnight.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this calculate overtime at 1.5×?',
        answer: [
          'No. It totals hours. Whether those hours are overtime is a wage-and-hour question this page does not answer.',
        ],
      },
    ],
    glossary: [
      { term: 'Unpaid break', definition: 'Time subtracted from the shift. Paid breaks should be left at zero.' },
    ],
    tips: [
      'Use the hourly-to-salary page if you then need gross pay from those hours.',
    ],
    caveats: [
      'Exact time arithmetic. Not a payroll determination and not legal advice.',
    ],
  },
  {
    toolId: 'tip',
    guide: {
      heading: 'Tip amount, total, and a split',
      lede: 'The tip is a percent of the subtotal you type. The total is subtotal plus tip. An even split divides that total. Tax-on-tip customs and pre-tax versus post-tax tipping are whatever you decide before you enter the subtotal.',
      sections: [
        {
          heading: 'What to put in the subtotal',
          paragraphs: [
            'Some people tip on pre-tax food; some on the total after tax. Type the number you mean. The engine will not inspect a receipt.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is 20% on the pre-tax amount?',
        answer: [
          'Only if that is the number you typed as the subtotal. The page does not split tax out of a total.',
        ],
      },
    ],
    glossary: [
      { term: 'Gratuity', definition: 'The tip amount. Not a legal wage for the worker; that is employment law.' },
    ],
    tips: [
      'If the receipt already added a party gratuity, do not run 20% on top unless you intend to.',
    ],
    caveats: [
      'Exact percent math. Not a wage rule and not tax advice on deductible tips.',
    ],
  },
  {
    toolId: 'random-number',
    guide: {
      heading: 'Ordinary utility randomness',
      lede: 'One or more numbers in a range, optionally unique integers. This is not a cryptographic generator, not a lottery draw, and not a way to pick passwords or raffle winners that must be auditable.',
      sections: [
        {
          heading: 'What “random” means here',
          paragraphs: [
            'The page uses ordinary runtime randomness suitable for a classroom or a casual pick. It is not designed to resist prediction or to satisfy a gaming-commission draw.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Can I use this to pick a raffle winner?',
        answer: [
          'You can, but you should not treat it as a certified drawing. Use a process your group agrees is fair.',
        ],
      },
    ],
    glossary: [
      { term: 'Unique integers', definition: 'Sampling without replacement inside the range, until the range is exhausted.' },
    ],
    tips: [
      'For a password or a secret, use a password manager, not this page.',
    ],
    caveats: [
      'Generated numbers, not a calculation of a real-world quantity. Not for security keys or lotteries.',
    ],
  },
];
