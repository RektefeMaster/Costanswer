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
  {
    toolId: 'federal-tax-bracket',
    guide: {
      heading: 'What being "in the 22% bracket" actually means',
      lede: 'A bracket is a rate charged on a slice of your income, not on all of it. This page shows which slice you are in, what every band below it costs, and how much room is left before the next one starts.',
      sections: [
        {
          heading: 'Income is taxed in bands, not all at one rate',
          paragraphs: [
            'The standard deduction comes off first and is taxed at nothing. What is left is cut into bands, and each band is charged at its own rate — the lowest slice at the lowest rate, and so on upward.',
            'Your bracket is the rate on the final slice. Someone with $100,000 of pay is in the 22% band, but the 22% applies only to the part of their taxable income above the threshold. Everything below is charged less, and the deduction is charged nothing.',
          ],
        },
        {
          heading: 'Crossing into a higher bracket never costs you money',
          paragraphs: [
            'This is the fear behind most bracket questions: that a raise pushes all of your income to a higher rate and leaves you worse off. It does not. Only the amount above the threshold takes the higher rate.',
            'The room shown on this page is the practical version of that. It tells you how much more taxable income you can have before any of it is charged at the next rate — which is the number worth having when weighing overtime or a bonus.',
          ],
        },
        {
          heading: 'Which "income" you are entering',
          paragraphs: [
            'People mean two different things by income and the two land in different brackets. Pay before deductions is what an offer letter says; taxable income is what line 15 of Form 1040 says, after the deduction has already come out.',
            'The page asks which one you have rather than guessing, because guessing wrong moves the answer by a whole band for a lot of people.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'What tax bracket am I in?',
        answer: [
          'The one your last dollar of taxable income falls in. Enter your income above and the band is shown, along with how much of your income sits in each of the bands below it.',
          'If your figure lands exactly on a threshold you are in the lower band — the dollar at the edge is charged at the lower rate.',
        ],
      },
      {
        question: 'Does moving into a higher bracket mean I take home less?',
        answer: [
          'No. Only the income above the threshold is taxed at the higher rate. A raise always leaves you with more after tax, even when it crosses a band.',
          'What can genuinely fall at a threshold is a credit or a benefit with an income cliff, but that is not the bracket doing it.',
        ],
      },
      {
        question: 'Why is my tax so much less than my bracket times my income?',
        answer: [
          'Because the bracket only applies to the top slice. The standard deduction is taxed at nothing and every lower band is charged at its own lower rate.',
          'The band-by-band table on this page shows exactly where the difference comes from.',
        ],
      },
      {
        question: 'Does this include Social Security, Medicare or state tax?',
        answer: [
          'No. This page is federal income tax only, so the brackets shown are the federal ones. For the share of a whole salary that goes to tax across all of those, use the effective tax rate calculator.',
        ],
      },
    ],
    glossary: [
      { term: 'Tax bracket', definition: 'A band of taxable income and the rate charged on the part of your income inside it.' },
      { term: 'Taxable income', definition: 'What is left after the standard or itemised deduction. The figure the brackets are applied to.' },
      { term: 'Standard deduction', definition: 'A flat amount subtracted from income before the brackets apply. It is taxed at nothing.' },
      { term: 'Threshold', definition: 'The income at which one band ends and the next begins. Income exactly on it stays in the lower band.' },
    ],
    tips: [
      'If you are weighing extra work, the room left in your bracket is the number to look at, not the rate itself.',
      'A traditional 401(k) contribution reduces taxable income, so it comes off at the top band first.',
      'Filing jointly widens every band, which is why the same income can sit in a lower bracket on a joint return.',
    ],
    caveats: [
      'Federal income tax only, and ordinary income only. Long-term capital gains use a separate rate schedule.',
      'Credits, the alternative minimum tax and itemised deductions are not modelled.',
      'This is not tax advice and not a filed return.',
    ],
  },
  {
    toolId: 'self-employment-tax',
    guide: {
      heading: 'Why self-employment tax is 15.3% of something smaller than profit',
      lede: 'Schedule SE does not take 15.3% of whatever Schedule C printed. It first knocks the profit down by 7.65%, then splits what is left between Social Security that shares a wage base with any W-2 job and Medicare that does not.',
      sections: [
        {
          heading: 'The 92.35% factor is the deductible half coming out first',
          paragraphs: [
            'An employee and employer each pay 7.65% of FICA. A self-employed person pays both sides, then deducts one-half of the Schedule SE tax on Form 1040. The form approximates that deduction up front by taxing only 92.35% of net profit when profit is positive.',
            'If that figure is under $400, Schedule SE is not filed and the tax is zero. The optional methods that can create Social Security credits on a loss or a tiny profit are not on this page.',
          ],
        },
        {
          heading: 'W-2 wages use the Social Security wage base first',
          paragraphs: [
            'Social Security on self-employment is 12.4%, but only on net earnings that fit in the remaining wage base after Form W-2 box 3. Someone already at the cap from a job pays Medicare on the profit and no more Social Security.',
            'Additional Medicare Tax is a different 0.9% on Form 8959 once combined Medicare wages and net SE earnings pass a filing-status threshold. It is not deductible.',
          ],
        },
        {
          heading: 'This is not income tax on the profit',
          paragraphs: [
            'Schedule SE is a payroll tax. Ordinary income tax on the same profit is a separate line, and so is any state tax. Using this number as “what I owe on my gig work” understates the return.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is self-employment tax not 15.3% of my profit?',
        answer: [
          'Because Schedule SE first multiplies a positive profit by 92.35%, then charges 12.4% Social Security only up to the remaining wage base and 2.9% Medicare on all net earnings.',
          'The 15.3% figure is the sum of those two rates before the factor and the wage base do any work.',
        ],
      },
      {
        question: 'Can I deduct self-employment tax?',
        answer: [
          'One-half of Schedule SE tax is deductible in figuring adjusted gross income. Additional Medicare Tax on Form 8959 is not part of that half.',
        ],
      },
      {
        question: 'Do W-2 wages change my Schedule SE tax?',
        answer: [
          'They reduce the Social Security wage base left for the profit. They do not reduce Medicare on net earnings, and they can start Additional Medicare Tax sooner when combined with those earnings.',
        ],
      },
    ],
    glossary: [
      { term: 'Net earnings from self-employment', definition: 'Positive net profit multiplied by 92.35%, which is the base Schedule SE taxes.' },
      { term: 'Schedule SE', definition: 'The Form 1040 schedule that figures Social Security and Medicare tax on self-employment income.' },
      { term: 'Deductible one-half', definition: '50% of Schedule SE tax, allowed as an adjustment to income. Additional Medicare Tax is excluded.' },
      { term: 'Wage base', definition: 'The annual cap on earnings subject to Social Security tax, shared between W-2 box 3 and Schedule SE.' },
    ],
    tips: [
      'If you also have a job, enter W-2 Social Security wages or the page will charge Social Security on profit that may already sit against a used-up wage base.',
      'The deductible half lowers AGI, which can change other credits; this page does not rerun those credits.',
      'Quarterly estimated tax is how this bill is usually paid during the year.',
    ],
    caveats: [
      'Church employee income, optional methods, ministers and Form 4361 are not modelled.',
      'A filed Schedule SE rounds to whole dollars.',
      'This is not income tax on the profit and not tax advice.',
    ],
  },
  {
    toolId: 'eitc',
    guide: {
      heading: 'The earned income credit is a curve, then a cliff',
      lede: 'The federal EITC is not a flat amount per child. It rises with earned income, sits at a published maximum, then phases out against the larger of AGI and earned income — unless investment income is high enough to disallow it entirely.',
      sections: [
        {
          heading: 'Three numbers decide the credit',
          paragraphs: [
            'Revenue Procedure 2025-32 publishes an earned-income amount, a maximum credit, and phase-out thresholds that differ for joint filers. This page uses those amounts rather than the IRS $50 lookup tables, so a table cell can differ by a few dollars.',
            'A joint return starts phasing out later. Married filing separately is treated like every other non-joint status; the narrow separated-spouse rule is not tested.',
          ],
        },
        {
          heading: 'Investment income is a cliff',
          paragraphs: [
            'If certain investment income is over the year’s limit, the credit is zero. That is not a phase-out. Interest, dividends, capital gain distributions and rental income in the statutory mix all count.',
          ],
        },
        {
          heading: 'Eligibility is more than the math',
          paragraphs: [
            'A credit with no qualifying children also requires the filer to be at least 25 and under 65. Qualifying children have relationship, age, residency and joint-return tests. This page takes the child count as given and does not apply those tests.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How many qualifying children does the EITC count?',
        answer: [
          'Zero, one, two, or three or more. The credit does not keep rising after three.',
          'A qualifying child for EITC is not always a qualifying child for the child tax credit. The two tests differ on age.',
        ],
      },
      {
        question: 'Why is a joint return’s EITC larger at the same income?',
        answer: [
          'The maximum credit is the same. The phase-out starts later on a joint return, so income that is already phasing out if you file single can still sit at the maximum if you file jointly.',
        ],
      },
      {
        question: 'Does the EITC reduce the tax I owe, or can it be refunded?',
        answer: [
          'It is refundable. If it is larger than the tax, the extra can come back as a refund.',
        ],
      },
    ],
    glossary: [
      { term: 'Earned income amount', definition: 'The earned income at which the EITC reaches its maximum for a given child count.' },
      { term: 'Completed phase-out', definition: 'The AGI or earned income at or above which the EITC is zero.' },
      { term: 'Investment-income limit', definition: 'A cliff above which no earned income credit is allowed for the year.' },
      { term: 'Schedule EIC', definition: 'The schedule used to claim the earned income credit with qualifying children on Form 1040.' },
    ],
    tips: [
      'Enter both earned income and AGI. The phase-out uses the larger of the two.',
      'If you have capital gains or rental income, check the investment-income box before trusting a non-zero credit.',
      'State earned-income credits are separate and are not on this page.',
    ],
    caveats: [
      'Age, residency and separated-spouse tests are not applied.',
      'IRS tables round in $50 bands; this page uses the Revenue Procedure amounts.',
      'This is not a filed return and not tax advice.',
    ],
  },
  {
    toolId: 'child-tax-credit',
    guide: {
      heading: 'The child tax credit is $2,200 until MAGI and tax say otherwise',
      lede: 'For 2026 the maximum child tax credit is $2,200 per qualifying child under 17, with up to $1,700 of that able to come back as the additional child tax credit. MAGI and the tax already on the return decide how much of either figure you actually keep.',
      sections: [
        {
          heading: 'Phase-out is a 5% haircut on rounded-up thousands',
          paragraphs: [
            'Schedule 8812 subtracts $400,000 of MAGI on a joint return, or $200,000 otherwise, rounds any remainder up to the next $1,000, and multiplies by 5%. A $425 excess is treated as $1,000 and costs $50.',
            'That reduction hits the combined child tax credit and credit for other dependents. Other dependents are $500 each and that piece is never refundable.',
          ],
        },
        {
          heading: 'The additional credit has its own cap',
          paragraphs: [
            'Whatever is left after tax takes the nonrefundable amount can become the additional child tax credit, but only up to $1,700 per qualifying child and only up to 15% of earned income over $2,500.',
            'Filers with three or more children sometimes get a higher additional credit from withheld Social Security and Medicare on Part II-B. That worksheet is not here, so those refunds can be understated.',
          ],
        },
        {
          heading: 'A qualifying child is under 17 with an SSN',
          paragraphs: [
            'The count you enter is taken as given. Children 17 and older, and children without the required Social Security number, belong on the other-dependent line if they qualify at all.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Is the 2026 child tax credit fully refundable?',
        answer: [
          'No. Up to $1,700 per qualifying child can be refunded as the additional child tax credit, and that amount is also limited by earned income.',
          'The $500 credit for other dependents cannot be refunded.',
        ],
      },
      {
        question: 'When does the child tax credit start to phase out?',
        answer: [
          'When modified AGI is over $400,000 on a joint return, or $200,000 for every other filing status. Those thresholds are not inflation-adjusted the way the $2,200 maximum is.',
        ],
      },
      {
        question: 'Why do I have to enter tax before this credit?',
        answer: [
          'The nonrefundable piece cannot exceed the tax on the return. Entering a salary instead of that tax figure would pretend the credit always offsets income tax it may not reach.',
        ],
      },
    ],
    glossary: [
      { term: 'Additional child tax credit', definition: 'The refundable remainder of the child tax credit, capped per child and by an earned-income worksheet.' },
      { term: 'Credit for other dependents', definition: 'A $500 nonrefundable credit for dependents who are not qualifying children under 17 with the required SSN.' },
      { term: 'Modified AGI for Schedule 8812', definition: 'AGI plus certain excluded income. This page treats the figure you enter as already modified.' },
      { term: 'Credit Limit Worksheet A', definition: 'The worksheet that caps the nonrefundable child tax credit at the tax on the return.' },
    ],
    tips: [
      'If tax before this credit is zero, look at the additional child tax credit line rather than the $2,200 maximum.',
      'Joint filers can have twice the MAGI of a single filer before any phase-out starts.',
      'Form 2555 filers cannot take the additional child tax credit; that bar is not applied here.',
    ],
    caveats: [
      'The 2026 Schedule 8812 used for the phase-out worksheet is a draft marked not for filing.',
      'Part II-B for three or more children is not modelled, so the refundable amount can be too low.',
      'This is not a filed return and not tax advice.',
    ],
  },
  {
    toolId: 'capital-gains',
    guide: {
      heading: 'Long-term gains are not taxed at your ordinary bracket',
      lede: 'A long-term capital gain sits in 0%, 15% or 20% bands that are stacked on top of your other taxable income. Crossing into 15% does not re-tax the wages underneath, and a separate 3.8% Net Investment Income Tax can still apply once MAGI is high enough.',
      sections: [
        {
          heading: 'The gain uses the room left in each preferential band',
          paragraphs: [
            'Other taxable income fills the 0% and 15% ceilings first. Only the leftover room is available to the gain. That is why two people with the same $20,000 gain can owe different tax on it: one still had 0% room, the other did not.',
            'The 2026 ceilings come from Revenue Procedure 2025-32. Amounts above the 15% ceiling are taxed at 20%.',
          ],
        },
        {
          heading: 'NIIT looks at MAGI and net investment income',
          paragraphs: [
            'The tax is 3.8% of the smaller of net investment income or MAGI over $200,000 single / $250,000 joint / $125,000 married filing separately. Those thresholds are not inflation-indexed.',
            'Wages are not net investment income. They still raise MAGI, which is how a high salary can cause NIIT on a gain that would otherwise sit below the threshold.',
          ],
        },
        {
          heading: 'Short-term is a different tax',
          paragraphs: [
            'A holding period of one year or less is ordinary income. Enter it with other taxable income, not as a long-term gain, or this page will understate the tax.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Do capital gains push my wages into a higher bracket?',
        answer: [
          'Ordinary brackets apply to ordinary taxable income. Long-term gains use a separate 0%/15%/20% schedule stacked on top of that income.',
          'The gains can still fill preferential bands that your wages already reached, which is why the same gain is taxed differently at different ordinary-income levels.',
        ],
      },
      {
        question: 'Is the Net Investment Income Tax the same as Additional Medicare Tax?',
        answer: [
          'No. Additional Medicare Tax is 0.9% on wages and self-employment income over a threshold. NIIT is 3.8% on net investment income over a MAGI threshold. They do not apply to the same kind of income.',
        ],
      },
      {
        question: 'Does selling my main home count here?',
        answer: [
          'Only the gain that is not excluded under section 121. This page does not apply that exclusion, so entering a home-sale figure as a long-term gain can overstate the tax.',
        ],
      },
    ],
    glossary: [
      { term: 'Long-term capital gain', definition: 'Gain on an asset held more than one year, generally taxed at 0%, 15% or 20% rather than ordinary rates.' },
      { term: 'Preferential rate ceiling', definition: 'The taxable-income level at which the 0% long-term rate ends and the 15% rate begins, or the 15% rate ends and 20% begins.' },
      { term: 'Net Investment Income Tax', definition: 'A 3.8% tax on the lesser of net investment income or MAGI over a statutory threshold.' },
      { term: 'Qualified dividend', definition: 'A dividend eligible for the same 0%/15%/20% schedule as long-term gains, if it meets holding-period rules this page does not test.' },
    ],
    tips: [
      'Enter other taxable income, not gross wages, or the 0% room will look larger than it is.',
      'If you have interest and rental income as well as a gain, put the combined net investment income in the advanced field so NIIT is not understated.',
      'Losses you already netted should be reflected in the gain figure you type; this page does not apply the $3,000 ordinary-income loss limit.',
    ],
    caveats: [
      'Collectibles (28%) and unrecaptured section 1250 gain (25%) are not modelled.',
      'The section 121 home-sale exclusion is not applied.',
      'This is not a filed Form 8949 or Form 8960, and not tax advice.',
    ],
  },
  {
    toolId: 'quarterly-estimated-tax',
    guide: {
      heading: 'Estimated tax is a safe harbor, not a guess at the final bill',
      lede: 'Form 1040-ES asks whether withholding will cover the smaller of 90% of this year’s tax or 100% of last year’s (110% if last year’s AGI was high). If it will not, and you still expect to owe at least $1,000, the shortfall is split into four dated installments.',
      sections: [
        {
          heading: 'Two percentages, one required payment',
          paragraphs: [
            'The required annual payment is the smaller of those two safe harbors. Paying that amount on time, together with withholding, is how most people avoid an underpayment penalty — not by matching the final tax to the dollar.',
            'If last year’s AGI was more than $150,000 ($75,000 if you will file married separately), last year’s tax is multiplied by 110% instead of 100%.',
          ],
        },
        {
          heading: 'Equal installments assume even income',
          paragraphs: [
            'This page splits whatever is still required into four equal payments on the Form 1040-ES dates. Income that arrives early in the year can still leave a penalty under the annualized income method even when the annual total is enough. That method is not modelled.',
          ],
        },
        {
          heading: 'The $1,000 rule is after withholding',
          paragraphs: [
            'You generally do not have to make estimated payments if you expect to owe less than $1,000 after withholding and refundable credits, or if those payments already cover the required annual payment. Having no tax last year can also remove the requirement; that exception is named and not tested here.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'When are 2026 estimated tax payments due?',
        answer: [
          'For calendar-year filers: April 15, June 15, September 15, 2026, and January 15, 2027.',
          'The January 15 payment is not required if you file by February 1 and pay the balance with the return.',
        ],
      },
      {
        question: 'What is the 110% estimated tax rule?',
        answer: [
          'If last year’s AGI was more than $150,000, or $75,000 if you will file married separately, the prior-year safe harbor is 110% of last year’s tax instead of 100%.',
        ],
      },
      {
        question: 'Does this page tell me the underpayment penalty?',
        answer: [
          'No. Form 2210 figures that penalty, including relief for annualized income and certain disasters. This page only shows the required annual payment and equal installments.',
        ],
      },
    ],
    glossary: [
      { term: 'Required annual payment', definition: 'The smaller of 90% of current-year tax or 100% (or 110%) of prior-year tax, used to test estimated-tax payments.' },
      { term: 'Safe harbor', definition: 'A published percentage of tax that, if paid on time through withholding and estimates, generally avoids an underpayment penalty.' },
      { term: 'Form 1040-ES', definition: 'The IRS package used to figure and pay estimated tax for individuals.' },
      { term: 'Annualized income installment', definition: 'An optional method that matches payments to when income was earned during the year. Not used on this page.' },
    ],
    tips: [
      'If most of your tax is withheld from wages, raise withholding before writing four checks.',
      'Enter last year’s AGI even when you think you are under $150,000. Crossing that line changes the math.',
      'Self-employment tax belongs in the expected-tax figure; this page does not add it for you.',
    ],
    caveats: [
      'Farming and fishing may use 66⅔% instead of 90%. That substitution is not applied.',
      'This is not Form 2210 and not a penalty calculation.',
      'This is not tax advice.',
    ],
  },
  {
    toolId: 'tax-refund',
    guide: {
      heading: 'A refund is withholding minus tax, not a W-4 promise',
      lede: 'The number on a refund is the difference between what was already paid and what the return actually owes. This page estimates that gap from 2026 published income tax, the child tax credit and the EITC, using the withholding you type rather than Publication 15-T tables that are not in the snapshot.',
      sections: [
        {
          heading: 'Why this is not a W-4 calculator',
          paragraphs: [
            'Employers withhold from Form W-4 and IRS percentage-method tables in Publication 15-T. Those tables have not been transcribed here, so inventing a withholding figure from filing status and a paycheck would be a guess dressed as a schedule.',
            'Enter what was actually withheld — Form W-2 box 2 — and the page compares it with tax from the ordinary brackets, Schedule SE if you enter a profit, and the same credit engines as the dedicated pages.',
          ],
        },
        {
          heading: 'Credits can turn tax due into a refund',
          paragraphs: [
            'Nonrefundable child tax credit reduces tax. The additional child tax credit and the earned income credit can be paid even when tax is already zero. Wages plus self-employment profit, minus the deductible half of Schedule SE tax, stand in for AGI and MAGI, which can still mis-time a phase-out if you have other adjustments the page does not ask for.',
          ],
        },
        {
          heading: 'What usually makes a real refund different',
          paragraphs: [
            'Itemised deductions, retirement contributions, education credits, state refunds, NIIT, and Additional Medicare Tax on W-2 wages all move the answer. Most of those omissions overstate tax; omitting W-2 Additional Medicare can understate it.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why can’t this page start from my W-4 instead of box 2?',
        answer: [
          'Publication 15-T percentage-method tables are not in the tax snapshot. Without those tables, a W-4 withholding estimate would not be an official-data figure.',
          'Box 2 is what was actually withheld. That is the number a refund compares against.',
        ],
      },
      {
        question: 'Does a larger withholding always mean a larger refund?',
        answer: [
          'Yes for a fixed tax. It also means less money in each paycheck. The return settles the difference; it does not change the year’s tax.',
        ],
      },
      {
        question: 'Are state refunds included?',
        answer: [
          'No. This page is federal income tax, federal withholding, Schedule SE, the child tax credit and the EITC only.',
        ],
      },
    ],
    glossary: [
      { term: 'Federal withholding', definition: 'Income tax already taken from pay, typically Form W-2 box 2, credited against the year’s federal tax.' },
      { term: 'Refundable credit', definition: 'A credit that can be paid even when it exceeds the tax on the return, such as EITC and the additional child tax credit.' },
      { term: 'Amount owed', definition: 'Tax after nonrefundable credits minus withholding, estimated payments and refundable credits, when that difference is negative.' },
      { term: 'Publication 15-T', definition: 'The IRS percentage-method withholding tables. They are not in this snapshot, so this page does not estimate W-4 withholding.' },
    ],
    tips: [
      'If you had more than one job, add box 2 from every W-2.',
      'Open the advanced section if you had self-employment profit or qualifying children; both change the refund.',
      'Use the quarterly estimated tax page if the result is an amount owed and the income is not all from wages.',
    ],
    caveats: [
      'Publication 15-T W-4 tables are not modelled. Withholding is the amount you enter.',
      'AGI is wages plus SE profit minus the deductible half of Schedule SE tax. Other adjustments are omitted, so credit phase-outs can be off.',
      'This is not a filed return and not tax advice.',
    ],
  },
];
