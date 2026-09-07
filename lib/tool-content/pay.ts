import type { ToolEditorial } from './types';

export const PAY_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'hourly-to-salary',
    guide: {
      heading: 'How hourly wages become a salary on this page',
      lede: 'This calculator converts an hourly rate into weekly, monthly, and yearly gross pay. Overtime is a separate line at time-and-a-half unless you change it. Nothing here withholds tax.',
      sections: [
        {
          heading: 'What the numbers mean',
          paragraphs: [
            'Annual pay is hourly rate × hours per week × weeks per year. Monthly is that annual figure divided by 12, not a calendar-month average of hours. Weekly is rate × hours. If you work 40 hours for 52 weeks at $28, the annual line is $58,240 before tax.',
            'Overtime is added only for the extra hours you type. The default extra rate is 1.5× the hourly wage, which matches common U.S. FLSA time-and-a-half, not every union contract or exempt-salary arrangement.',
          ],
        },
        {
          heading: 'When to use take-home instead',
          paragraphs: [
            'Gross pay is the number a job posting usually quotes. Rent, a car payment, and a 401(k) contribution come out of take-home. After you have an annual figure, the salary-after-tax and paycheck calculators apply federal income tax, FICA, and a state wage-tax schedule when this site has a verified table.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much is $28 an hour a year before taxes?',
        answer: [
          'At 40 hours a week and 52 weeks a year, $28 an hour is $58,240 gross. Change the hours or weeks if you do not work a full year. Overtime is extra, not baked into that line.',
        ],
      },
      {
        question: 'Does this include overtime, bonuses, or tips?',
        answer: [
          'Overtime is its own input. Bonuses, tips, commissions, and differential pay are not modeled here. Convert those separately or use the bonus-tax calculator for a separately paid bonus.',
        ],
      },
      {
        question: 'Is this my take-home pay?',
        answer: [
          'No. This page stops at gross pay. Federal income tax, Social Security, Medicare, and state wage tax are on the salary-after-tax page.',
        ],
      },
      {
        question: 'Do salaried exempt jobs still use this math?',
        answer: [
          'If you already have an annual salary, you do not need this conversion. This page is for hourly wages. Exempt status changes overtime rules; it does not change rate × hours × weeks.',
        ],
      },
    ],
    glossary: [
      { term: 'Gross pay', definition: 'Pay before income tax, FICA, and other withholdings.' },
      { term: 'Time-and-a-half', definition: 'A common overtime rate: 1.5 times the regular hourly wage for extra hours.' },
      { term: 'FLSA', definition: 'The federal Fair Labor Standards Act, which sets a baseline overtime rule for many non-exempt jobs. Contracts can be more generous.' },
      { term: 'Weeks per year', definition: 'How many weeks you actually get paid. 52 is a full year with no unpaid time off.' },
    ],
    tips: [
      'If you only work 48 weeks, type 48. Leaving 52 in place overstates annual pay.',
      'Compare two job offers on the same hours and weeks before you look at the headline hourly rate.',
      'After you have an annual number, run salary after tax for the state you would actually work in.',
    ],
    caveats: [
      'This is gross pay, not a net paycheck and not tax advice.',
      'Overtime law varies by job classification and state. The 1.5× default is a convenience, not a determination that you are owed overtime.',
    ],
    longTail: [
      {
        heading: 'Hourly examples people look up',
        paragraphs: [
          'A school paraprofessional at $18 an hour for 37.5 hours and 42 weeks has a different annual line than a warehouse role at the same hourly rate for 40 hours and 52 weeks. Type the schedule you were offered, not a generic full-time year.',
        ],
      },
    ],
  },
  {
    toolId: 'salary-after-tax',
    guide: {
      heading: 'How this salary-after-tax estimate is built',
      lede: 'The page starts from the annual salary you type, then applies federal income tax, Social Security, Medicare, and a state wage-tax schedule when CostAnswer has a verified table for that year. It is take-home arithmetic, not a filed return.',
      sections: [
        {
          heading: 'Federal, FICA, and state',
          paragraphs: [
            'Federal income tax uses the IRS brackets and standard deduction in the tax-year snapshot. FICA is Social Security up to the wage base and Medicare on all wages, using the SSA and IRS rates stored for that year. Additional Medicare tax is applied when wages cross the statutory threshold.',
            'State income tax is only applied when this snapshot includes a verified wage-tax schedule for the state you pick. If it does not, the page will not invent a rate. Local city or school taxes are omitted unless a field asks for them.',
          ],
        },
        {
          heading: 'What a W-2 still does differently',
          paragraphs: [
            'Employers withhold from IRS tables and your W-4, not from this annual estimate spread evenly across months. Pretax 401(k), health insurance, HSA, and cafeteria deductions change both taxable wages and take-home. Type those only if the page asks; otherwise treat the result as a starting point.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much is $100,000 after taxes in the U.S.?',
        answer: [
          'It depends on filing status and state. Federal income tax plus FICA come out first. A state with a wage-tax table in this snapshot takes more; a state without a verified table on this copy is not guessed. Run the salary and state you actually have.',
        ],
      },
      {
        question: 'Does this work for a Texas teacher salary after taxes?',
        answer: [
          'Texas has no state wage income tax in the usual sense, so the state line should be zero when the snapshot says so. A teacher salary still faces federal income tax and FICA. District stipends, summer pay, and TRS contributions are not modeled unless you fold them into the salary you type.',
        ],
      },
      {
        question: 'Is this the same as my paycheck calculator result?',
        answer: [
          'They share the annual tax estimate. The paycheck page then divides that estimate across the pay frequency you pick. A real stub still uses withholding tables, so the two will differ from a live paycheck.',
        ],
      },
      {
        question: 'Can I use this to file Form 1040?',
        answer: [
          'No. Credits, itemized deductions, capital gains, and most local taxes are out of scope. File with the IRS, your state, or software built to produce a return.',
        ],
      },
    ],
    glossary: [
      { term: 'Take-home pay', definition: 'What remains after the taxes this page models. Not the same as disposable income after rent and debt.' },
      { term: 'FICA', definition: 'Federal Insurance Contributions Act taxes: Social Security and Medicare withheld from wages.' },
      { term: 'Standard deduction', definition: 'The IRS amount subtracted from income before brackets if you do not itemize. This page uses the snapshot’s figure.' },
      { term: 'Wage base', definition: 'The Social Security maximum earnings subject to the OASDI tax in that year.' },
      { term: 'W-4', definition: 'The form that tells an employer how to withhold. This calculator does not read a W-4.' },
    ],
    tips: [
      'Match filing status to how you actually file, not to how you wish you filed.',
      'If you contribute to a traditional 401(k), lower the taxable salary you type or use a dedicated 401(k) page for the deferral math.',
      'Compare two states only when both have verified schedules in this snapshot.',
    ],
    caveats: [
      'Not tax advice and not a substitute for a prepared return.',
      'The tax year on the page is the schedule in the snapshot, not the date on your clock.',
    ],
    longTail: [
      {
        heading: 'Occupation and state examples (2026 schedules)',
        paragraphs: [
          'A Texas public-school teacher and a California software employee at the same gross salary will not take home the same amount. California has a state wage tax in the snapshot; Texas does not. Neither result includes a district pension pickup, a union due, or a city payroll tax unless you typed it.',
          'If you are comparing a $75,000 offer in Florida with the same offer in New York, run both states here, then look at rent on the cost-of-living page. Tax is only one line of a move.',
        ],
      },
    ],
  },
  {
    toolId: 'paycheck',
    guide: {
      heading: 'How the estimated paycheck is split from an annual tax bill',
      lede: 'CostAnswer estimates a full-year federal, FICA, and state tax total, then divides it across the pay periods you choose. Your employer withholds from IRS tables and a W-4, so a live stub will differ.',
      sections: [
        {
          heading: 'Pay frequency is just division',
          paragraphs: [
            'Weekly, biweekly, semimonthly, and monthly options take the same annual estimate and split it. Biweekly is 26 checks, not two per calendar month. Semimonthly is 24. That is why two “twice a month” settings are not interchangeable.',
            'Hourly mode converts hours and rate to an annual gross first, then follows the same tax path as a salary.',
          ],
        },
        {
          heading: 'Why your stub looks different',
          paragraphs: [
            'Withholding tables are not “annual tax ÷ periods.” Extra withholding, a recent raise, a bonus in the same check, and pretax benefits all move the federal line. Use this page to see the arithmetic, then compare a real stub if you have one.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How do I estimate a biweekly paycheck after tax?',
        answer: [
          'Enter annual pay or hourly wage, pick the state, then choose biweekly. The net line is the annual estimate divided by 26, not a live IRS table lookup.',
        ],
      },
      {
        question: 'Why is my real stub higher or lower?',
        answer: [
          'Employers use Publication 15-T methods and your W-4. This page annualizes. Benefits, garnishments, and local taxes that the page does not ask for will also move the number.',
        ],
      },
      {
        question: 'Does a separately paid bonus use this paycheck math?',
        answer: [
          'Usually no. Supplemental wages often use a flat IRS rate when paid apart from regular wages. That is the bonus-tax calculator.',
        ],
      },
    ],
    glossary: [
      { term: 'Biweekly', definition: '26 pay periods a year, every other week.' },
      { term: 'Semimonthly', definition: '24 pay periods a year, typically the 15th and last day of the month.' },
      { term: 'Withholding', definition: 'What an employer sends to tax agencies from a paycheck. It is not the final tax due.' },
      { term: 'Net pay', definition: 'The estimated amount after the taxes this page models.' },
    ],
    tips: [
      'If you are paid every other Friday, use biweekly, not semimonthly.',
      'A raise mid-year will not match an annualized estimate until the extra pay has been in a few checks.',
      'Open Technical details if you are comparing this number with another site; the Method version is the formula.',
    ],
    caveats: [
      'This is an estimated paycheck, not a payroll run and not tax advice.',
      'Local occupational taxes are omitted unless the page asks for them.',
    ],
    longTail: [
      {
        heading: 'Biweekly versus a school-year schedule',
        paragraphs: [
          'Teachers and other roles that are paid over nine or ten months still have a tax year. This page annualizes the gross you type, then splits by the frequency you pick. If the contract is “paid over 10 months,” type the actual checks-per-year, not a generic 26, or the per-check line will not match the stub.',
          'A state with no wage-tax table in this snapshot will not invent one. Florida and Texas are examples of that pattern when the stored schedule says so; New York is not. Run the state on the offer letter.',
        ],
      },
    ],
  },
  {
    toolId: 'bonus-tax',
    guide: {
      heading: 'Why a bonus can look over-taxed on the stub',
      lede: 'When a bonus is paid separately from regular wages, employers often withhold a flat IRS supplemental rate instead of the rate your salary implies. This page shows that withholding, not your eventual refund or bill.',
      sections: [
        {
          heading: 'Supplemental wage withholding',
          paragraphs: [
            'The IRS lets employers withhold a flat percentage on separately paid bonuses, commissions, and similar supplemental wages (up to a high-dollar threshold that uses a different method). That flat rate is often higher than your average tax rate, which is why the deposit looks small.',
            'When you file, the bonus is just more ordinary income in your bracket. Withholding is not the tax. A large bonus can still increase your total tax; it does not stay taxed at the flat supplemental rate forever.',
          ],
        },
        {
          heading: 'What this page does not do',
          paragraphs: [
            'It does not model aggregate supplemental wages over the IRS threshold method, state supplemental rates in every jurisdiction, or a bonus added to a regular paycheck (which may use the aggregate method instead). Signing bonuses, severance, and commissions follow the same idea only when they are paid as supplemental wages.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is my bonus taxed so much?',
        answer: [
          'The stub is usually flat supplemental withholding, not your marginal rate applied forever. Compare the Method version with the rate printed on the stub. Your tax return will recompute the whole year.',
        ],
      },
      {
        question: 'Is a signing bonus withheld the same way?',
        answer: [
          'Often yes if it is paid separately as supplemental wages. If it is rolled into a regular paycheck, the employer may use a different method. This page models the flat separate-payment case.',
        ],
      },
      {
        question: 'Does state tax use the same flat rate?',
        answer: [
          'Not always. Some states piggyback on federal supplemental rules; others have their own. The page uses the state treatment in the snapshot, and will not invent a rate it does not have.',
        ],
      },
    ],
    glossary: [
      { term: 'Supplemental wages', definition: 'Bonuses, commissions, overtime paid separately, and similar amounts the IRS distinguishes from regular wages for withholding.' },
      { term: 'Flat withholding', definition: 'A single percentage taken from a separately paid bonus, not a full annualized bracket calculation.' },
      { term: 'Aggregate method', definition: 'Adding the bonus to regular wages and withholding as if the total were a single paycheck.' },
    ],
    tips: [
      'If the bonus hits the same check as regular pay, this flat-rate picture may not match the stub.',
      'Plan cash around withholding, then wait for the return to settle the real tax.',
      'A traditional 401(k) deferral on the bonus, if your plan allows it, changes taxable wages; this page only models what you type.',
    ],
    caveats: [
      'Withholding is not your final tax. This is not tax advice.',
      'High-dollar supplemental wages can switch IRS methods. That switch is not fully modeled.',
    ],
  },
  {
    toolId: 'effective-tax-rate',
    guide: {
      heading: 'Why your tax rate is lower than your tax bracket',
      lede: 'Being "in the 22% bracket" does not mean 22% of your pay goes to federal tax. It means the last slice of it does. This page separates the two numbers and shows the gap between them.',
      sections: [
        {
          heading: 'What the bracket actually applies to',
          paragraphs: [
            'US federal income tax is charged in bands. The standard deduction comes off first, and what is left is taxed a slice at a time: the lowest band at its rate, the next band at its rate, and so on. Your bracket is the rate on the final slice — never on all of it.',
            'That is why someone on $100,000 sits in the 22% bracket while paying about 13% of their pay in federal income tax. Nothing has been avoided; the lower bands were charged at their own rates and the deduction was not charged at all.',
          ],
        },
        {
          heading: 'The number that matters for a raise',
          paragraphs: [
            'Neither figure answers "what happens if I earn more". The effective rate is an average of everything already earned, and the federal bracket ignores Social Security, Medicare and state tax.',
            'The rate on your next $1,000 is the one that answers it, and this page measures it by running the whole calculation again a thousand dollars higher. In a state with no wage tax that comes to your bracket plus 7.65%. In a state with its own brackets it is higher, and above the Social Security wage base it drops, because that part of FICA has stopped.',
          ],
        },
        {
          heading: 'Effective against gross, not against taxable income',
          paragraphs: [
            'There are two ways to write an effective rate and they give different answers. Dividing by taxable income produces a bigger number, because the standard deduction has already been taken out of the denominator.',
            'This page divides by gross pay, which is what people mean when they ask what share of their money goes to tax. If you compare against a figure published elsewhere, check which denominator it used before concluding one of them is wrong.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is my effective tax rate so much lower than my bracket?',
        answer: [
          'Because the bracket only applies to your top slice of income. The standard deduction is taxed at nothing, and every band below your bracket is charged at its own lower rate.',
          'The gap widens as income rises through a band and narrows as you approach the next one.',
        ],
      },
      {
        question: 'Does a raise push all of my income into a higher bracket?',
        answer: [
          'No. Only the part above the threshold is taxed at the higher rate. Crossing into a new bracket never reduces your take-home pay.',
          'The next-$1,000 figure on this page is what the extra money is actually taxed at, including FICA and state tax.',
        ],
      },
      {
        question: 'Why does the next-$1,000 rate fall at high incomes?',
        answer: [
          'Social Security stops at the yearly wage base, so once your pay is past it that 6.2% is no longer charged on additional earnings. Medicare continues, and an extra 0.9% starts once you pass its threshold.',
        ],
      },
      {
        question: 'Is this what I will owe on my return?',
        answer: [
          'No. This is wage income under the published schedules. Credits, itemised deductions, retirement contributions and any income that is not salary all change the answer, and none of them are modelled here.',
        ],
      },
    ],
    glossary: [
      { term: 'Effective tax rate', definition: 'Total tax divided by gross pay. An average across everything you earned.' },
      { term: 'Marginal rate', definition: 'The rate charged on the next dollar you earn. Higher than the effective rate whenever the brackets are progressive.' },
      { term: 'Tax bracket', definition: 'A band of taxable income and the rate charged on the part of your income inside it.' },
      { term: 'Taxable income', definition: 'Gross pay less the standard or itemised deduction. What the brackets are applied to.' },
    ],
    tips: [
      'Compare two states on the same salary to see how much of the difference is state tax rather than pay.',
      'If you are deciding whether extra work is worth it, the next-$1,000 rate is the number to use, not the effective rate.',
      'A traditional 401(k) contribution reduces taxable income, so it comes off at your bracket rate rather than your effective rate.',
    ],
    caveats: [
      'Wage income only. This is not a tax return and not tax advice.',
      'Local income taxes are named where a state has them but never estimated, so real take-home in those places is lower.',
      'Where a state has not published its current schedule, the page uses the latest one it did publish and says which year that is.',
    ],
  },
];
