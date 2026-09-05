import type { ToolEditorial } from './types';

export const WEALTH_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'compound-interest',
    guide: {
      heading: 'How compound interest is projected here',
      lede: 'A starting balance and optional recurring deposits grow at the rate and compounding frequency you type. Contributions are added at the end of each period. The result is a projection from those assumptions, not a forecast of a bank or market.',
      sections: [
        {
          heading: 'Compounding frequency',
          paragraphs: [
            'Annual, monthly, and daily compounding change how often interest is credited. The same stated rate produces slightly different balances. Recurring deposits are applied at period ends, so a deposit does not earn a full period of interest on the day it is added.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this use APY or APR?',
        answer: [
          'It uses the rate and compounding frequency you enter. If you have an APY from a bank, that APY already includes compounding; do not also pick a faster compounding frequency unless you know the bank’s nominal rate.',
        ],
      },
      {
        question: 'Are deposits at the beginning or end of the period?',
        answer: [
          'End of period. That is slightly more conservative than beginning-of-period deposits.',
        ],
      },
    ],
    glossary: [
      { term: 'Compounding', definition: 'Interest credited on a balance that already includes past interest.' },
      { term: 'APY', definition: 'Annual percentage yield, which already reflects compounding. Not the same as a nominal APR.' },
    ],
    tips: [
      'For a CD with a published APY, the CD calculator is the more honest fit.',
      'Inflation is not subtracted here; use the inflation calculator if you want buying power.',
    ],
    caveats: [
      'Projection, not a guaranteed return. Markets and banks do not pay a smooth rate.',
    ],
  },
  {
    toolId: 'interest',
    guide: {
      heading: 'Simple interest, with no compounding',
      lede: 'Interest = principal × annual rate × time in years. There is no compounding and no recurring deposit. For those, use compound interest or the CD calculator.',
      sections: [
        {
          heading: 'When simple interest is the right tool',
          paragraphs: [
            'Some short-term notes and classroom problems are defined as simple interest. A savings account that advertises APY is not simple interest. If you are not sure, the product’s disclosure is the authority, not this page.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is this lower than compound interest?',
        answer: [
          'Simple interest never earns interest on interest. Over several years that gap grows.',
        ],
      },
    ],
    glossary: [
      { term: 'Simple interest', definition: 'Principal × rate × time. The principal never changes in the formula.' },
    ],
    tips: [
      'Keep time in years (18 months is 1.5, not 18).',
    ],
    caveats: [
      'Exact for the formula. Not a loan amortization and not a savings APY.',
    ],
  },
  {
    toolId: 'cd',
    guide: {
      heading: 'Certificate of deposit math from the APY you type',
      lede: 'The ending balance uses the APY you enter for the term you enter. It is not a live bank offer, not a brokered-CD quote, and not a comparison of early-withdrawal penalties.',
      sections: [
        {
          heading: 'APY already includes compounding',
          paragraphs: [
            'Banks publish APY so you do not have to guess compounding. This page applies that APY over the term. If you type a promotional APY that only lasts three months, do not run it for five years.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Where are today’s CD rates?',
        answer: [
          'Not on this page. Type a rate from a bank or a comparison site. CostAnswer does not fetch live offers.',
        ],
      },
      {
        question: 'What if I withdraw early?',
        answer: [
          'Penalties are not modeled. The ending balance assumes you hold to term.',
        ],
      },
    ],
    glossary: [
      { term: 'APY', definition: 'Annual percentage yield. The rate this page applies.' },
      { term: 'Term', definition: 'How long the CD is assumed to stay open.' },
    ],
    tips: [
      'Compare APYs for the same term. A 6-month APY is not a 5-year APY.',
      'Treasuries and high-yield savings are different products; this page will not rank them.',
    ],
    caveats: [
      'Projection from your APY. Not an FDIC lookup and not investment advice.',
    ],
  },
  {
    toolId: 'investment',
    guide: {
      heading: 'Investment growth under an assumed return',
      lede: 'An initial amount plus recurring contributions grows at the annual return you type. That return is an assumption you supplied. It is not a forecast, not a historical average unless you chose one, and not a guarantee.',
      sections: [
        {
          heading: 'What “assumed return” hides',
          paragraphs: [
            'Real portfolios move year to year. Sequence of returns, fees, taxes, and contributions that stop in a recession are not in a smooth compounding line. Use the result to see sensitivity: 5% versus 8% is more honest than treating 8% as a plan.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What return should I type?',
        answer: [
          'There is no CostAnswer default that is “the market.” Pick an assumption you can defend, then try a lower one. This is not advice to expect any particular return.',
        ],
      },
    ],
    glossary: [
      { term: 'Assumed return', definition: 'A constant annual rate you typed. Not a predicted market outcome.' },
      { term: 'Recurring contribution', definition: 'An amount added on a schedule. Timing is a model simplification.' },
    ],
    tips: [
      'Run inflation beside this if the goal is future buying power.',
      'Fees of 1% a year are a different assumed return; subtract them yourself.',
    ],
    caveats: [
      'Projection, not a forecast, and not investment advice.',
    ],
  },
  {
    toolId: 'retirement',
    guide: {
      heading: 'A retirement balance from savings, contributions, and an assumed return',
      lede: 'The page compounds current savings and ongoing contributions to a retirement age you type, then compares that with a goal. It is a planning model. It does not compute Social Security, RMDs, or a safe withdrawal rate.',
      sections: [
        {
          heading: 'The goal line is yours',
          paragraphs: [
            'A “number” you type is not a CostAnswer recommendation. Healthcare, housing, and longevity can dominate. Treat a shortfall or surplus as a prompt to change assumptions, not as a pass/fail from a fiduciary.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this include Social Security?',
        answer: [
          'No. Add a Social Security estimate yourself if you want it in the goal, or keep this page as portfolio-only.',
        ],
      },
      {
        question: 'Is this a 4% rule calculator?',
        answer: [
          'No. There is no withdrawal-rate engine here.',
        ],
      },
    ],
    glossary: [
      { term: 'Assumed return', definition: 'A constant growth rate you entered for the accumulation years.' },
      { term: 'Retirement age', definition: 'The year-count this projection runs. Not a Social Security claiming age unless you made it so.' },
    ],
    tips: [
      'Use the 401(k) and Roth IRA pages if employer match or account type matters.',
      'Try a lower return and a later start date before you treat a surplus as real.',
    ],
    caveats: [
      'Not investment, tax, or retirement advice. Markets are not a straight line.',
    ],
  },
  {
    toolId: 'roth-ira',
    guide: {
      heading: 'Roth IRA contribution growth, not eligibility',
      lede: 'The page projects contributions growing at an assumed return. It does not test MAGI limits, earned-income rules, or conversion math. A projection can look healthy for someone who is not allowed to contribute.',
      sections: [
        {
          heading: 'Contribution limits are annual and personal',
          paragraphs: [
            'IRS Roth IRA limits (and catch-up ages) change by year. Type only what you can actually contribute. This snapshot may mention a limit in copy; it does not enforce your MAGI.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Can I contribute to a Roth IRA?',
        answer: [
          'This page will not say. Eligibility depends on earned income and MAGI. Use IRS Publication 590-A or a tax professional.',
        ],
      },
    ],
    glossary: [
      { term: 'MAGI', definition: 'Modified adjusted gross income, used in Roth IRA eligibility. Not computed here.' },
      { term: 'Roth IRA', definition: 'A retirement account with after-tax contributions and potentially tax-free qualified withdrawals. This page only grows contributions.' },
    ],
    tips: [
      'If you are near an income limit, do not treat a maxed projection as a plan.',
      'Employer plans are on the 401(k) page; they have different limits.',
    ],
    caveats: [
      'Not tax advice and not an eligibility determination.',
    ],
  },
  {
    toolId: '401k',
    guide: {
      heading: 'Employee deferrals plus a simple employer match',
      lede: 'The page grows your contribution and a simplified match at an assumed return. Catch-up contributions, after-tax mega backdoors, vesting, and loans are not modeled. The match formula is only as complete as the fields you fill.',
      sections: [
        {
          heading: 'Match is not free money until it vests',
          paragraphs: [
            'A 50% match on 6% of pay is a common pattern and still depends on plan documents. Unvested match can leave with a job change. This engine does not vest.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does this use 2026 IRS 401(k) limits?',
        answer: [
          'You type the contribution. The page does not stop you at the IRS cap. Check the limit for your age and year before you treat a large deferral as legal.',
        ],
      },
      {
        question: 'Traditional or Roth 401(k)?',
        answer: [
          'Growth math can look similar; tax treatment does not. This page does not compute the tax difference. Salary-after-tax is the place to see current take-home if you change a deferral.',
        ],
      },
    ],
    glossary: [
      { term: 'Deferral', definition: 'The employee contribution. Traditional deferrals are pretax; Roth 401(k) deferrals are after-tax. The engine grows the amount you type.' },
      { term: 'Employer match', definition: 'A simplified additional contribution based on what you entered, not a full plan document.' },
      { term: 'Vesting', definition: 'When match becomes yours. Not modeled.' },
    ],
    tips: [
      'If the goal is to capture the full match, compute that percentage of pay first, then type it.',
      'A job change resets match and vesting; the projection assumes you stay.',
    ],
    caveats: [
      'Not investment or tax advice. Catch-up and highly compensated employee tests are omitted.',
    ],
    longTail: [
      {
        heading: 'Match, limits, and a job change',
        paragraphs: [
          'Type the match the plan actually uses. A common classroom example is 50% of the first 6% of pay; your document may differ, and this engine will not read the SPD. IRS employee deferral and catch-up limits change by year and age. Check the official cap for the year you mean. The page will not stop a contribution that exceeds it.',
          'Unvested match can leave with a job change. The projection assumes you stay and that the return you typed is constant. Neither is a forecast.',
        ],
      },
    ],
  },
  {
    toolId: 'inflation',
    guide: {
      heading: 'CPI-U buying power since 1913',
      lede: 'The calculator restates an amount from one U.S. month in another month’s prices using the BLS CPI-U all-items index stored on this site. It is an official-index estimate of purchasing power, not a personal inflation rate.',
      sections: [
        {
          heading: 'All-items CPI is a national average basket',
          paragraphs: [
            'Your rent, medical care, or college costs can move faster or slower than all-items CPI-U. The index is still the standard way to compare a 1990 dollar with a 2026 dollar in general terms.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What is $100 in 1990 worth today?',
        answer: [
          'Pick January 1990 (or the month you care about) and a recent month in the snapshot. The page uses CPI-U, not a forecast of next year.',
        ],
      },
      {
        question: 'Is this the inflation rate used for Social Security COLAs?',
        answer: [
          'Social Security uses CPI-W, a related but different series. This page is CPI-U all items.',
        ],
      },
    ],
    glossary: [
      { term: 'CPI-U', definition: 'Consumer Price Index for All Urban Consumers, published by BLS.' },
      { term: 'Buying power', definition: 'How much of the CPI basket an amount would buy in another month.' },
    ],
    tips: [
      'Use the same month type (both January, or both annual averages if you are comparing published annual figures).',
      'For wages, pair this with hourly-to-salary if you are converting a historical hourly rate.',
    ],
    caveats: [
      'National average prices, not your city. Not a COLA determination.',
    ],
  },
  {
    toolId: 'cost-of-living',
    guide: {
      heading: 'Modeled monthly living costs from official pieces',
      lede: 'The total is assembled from HUD Fair Market Rent, USDA food plans, and other official regional context stored on this site, plus lines you type. It is not a proprietary “index score” and not your lease.',
      sections: [
        {
          heading: 'What is local versus national',
          paragraphs: [
            'Rent uses HUD FMRs for the geography you pick when that geography exists in the snapshot. Some other lines are national planning values. The page labels which is which. Two metros can look close on rent and diverge once utilities and groceries are in the same frame.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is this like a magazine cost-of-living index?',
        answer: [
          'No. Those products often use private surveys and a 100-based index. This page adds labeled official components into a monthly dollar total.',
        ],
      },
      {
        question: 'Can I compare Austin and Chicago?',
        answer: [
          'Yes, as two modeled totals. They are not a ranking of “best places” and they omit healthcare and childcare unless you typed them.',
        ],
      },
    ],
    glossary: [
      { term: 'Fair Market Rent', definition: 'HUD’s published rent estimates by bedroom count and area. Not your apartment’s rent.' },
      { term: 'USDA Food Plans', definition: 'USDA’s monthly food-cost plans used as a grocery planning line.' },
    ],
    tips: [
      'If you already have a lease, type that rent instead of treating FMR as your bill.',
      'After a move, rerun salary after tax for the new state; this page is spending, not tax.',
    ],
    caveats: [
      'Planning estimate from mixed official sources. Not a budget you can hand to a lender as proof of expenses.',
    ],
    longTail: [
      {
        heading: 'Moving for a job in 2026',
        paragraphs: [
          'A teacher moving from a Texas suburb to a coastal California metro should not compare salaries alone. Run salary after tax in both states, then this page for rent and groceries. Neither page includes a pension pickup or a signing bonus.',
        ],
      },
    ],
  },
];
