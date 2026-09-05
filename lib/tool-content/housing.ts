import type { ToolEditorial } from './types';

export const HOUSING_EDITORIAL: ToolEditorial[] = [
  {
    toolId: 'mortgage-payment',
    guide: {
      heading: 'How this U.S. mortgage payment is calculated',
      lede: 'The headline is principal and interest on the loan amount, using a fixed-rate formula and either the latest Freddie Mac national average or a rate you type. Property tax, insurance, HOA, and PMI are only what you add. This is not a lender quote.',
      sections: [
        {
          heading: 'Loan amount and the payment formula',
          paragraphs: [
            'Home price minus down payment is the amount amortized. The monthly principal-and-interest payment is the standard fixed-rate formula. A 0% rate splits the balance evenly across the months. A 30-year term is 360 payments; a 15-year term is 180.',
            'The default rate is the Freddie Mac Primary Mortgage Market Survey weekly national average stored on this site, not the rate a lender will offer in your ZIP. Credit, points, occupancy, and property type all move a real quote.',
          ],
        },
        {
          heading: 'Escrow items you type yourself',
          paragraphs: [
            'Property tax, homeowners insurance, and HOA dues are optional monthly amounts. They are not looked up by county. PMI is an optional rough add-on when the down payment is under 20%. None of that is an escrow statement.',
            'A $400,000 purchase with 20% down is a $320,000 loan. The P&I on that loan at a mid-6% 30-year rate is a different number than the same price with 5% down, PMI, and taxes. Type the structure you are actually considering.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Does the mortgage payment include taxes and insurance?',
        answer: [
          'Only if you type them. The headline is principal and interest. Escrow lines are optional. A lender quote that looks higher is often including taxes, insurance, or a different rate.',
        ],
      },
      {
        question: 'What rate does CostAnswer use in 2026?',
        answer: [
          'The stored Freddie Mac PMMS weekly national averages for 30-year and 15-year fixed loans, with the observation period printed on the page. You can replace that with a quote. It is a U.S. average, not a Florida or California local rate.',
        ],
      },
      {
        question: 'Can this estimate an FHA payment in Florida?',
        answer: [
          'You can type an FHA down payment and a quoted FHA rate. The page does not apply FHA mortgage insurance premiums, county loan limits, or Florida property-tax millage. For 2026 FHA limits, use HUD’s published county limits, then type the loan amount those limits allow.',
        ],
      },
      {
        question: 'Is this a refinance calculator?',
        answer: [
          'It will price a new payment if you enter the new balance, rate, and term. Break-even against closing costs is on the refinance calculator.',
        ],
      },
    ],
    glossary: [
      { term: 'Principal and interest (P&I)', definition: 'The amortizing loan payment. It does not include tax, insurance, HOA, or PMI unless you add them.' },
      { term: 'PMMS', definition: 'Freddie Mac’s Primary Mortgage Market Survey, a weekly national average of 30-year and 15-year fixed rates.' },
      { term: 'PMI', definition: 'Private mortgage insurance, often required when you put down less than 20% on a conventional loan. The optional line here is a rough estimate.' },
      { term: 'Escrow', definition: 'A lender-held account for tax and insurance. This page does not build an escrow analysis.' },
      { term: 'FHA loan limit', definition: 'The maximum FHA-insured loan HUD publishes by county and year. Not computed on this page.' },
    ],
    tips: [
      'If you have a quote, type that rate. The national average is a starting point only.',
      'Compare 15-year and 30-year on the same price and down payment before you chase a lower monthly number.',
      'Open the amortization calculator if you want principal vs. interest by payment.',
    ],
    caveats: [
      'Not a lender decision, not a Good Faith Estimate, and not financial advice.',
      'Points, origination fees, and prepaid interest are outside the monthly P&I.',
    ],
    longTail: [
      {
        heading: 'Loan type and state notes for 2026',
        paragraphs: [
          'Conventional, FHA, VA, and USDA loans can share the same amortization math and still differ on insurance, funding fees, and limits. An FHA purchase in a high-cost Florida county in 2026 is capped by HUD’s county limit, not by this calculator. Type the loan amount that actually fits the program.',
          'Property tax in Texas, New Jersey, or Illinois can rival the P&I on a modest house. If you leave tax at zero, the “payment” is incomplete for budgeting.',
        ],
      },
    ],
  },
  {
    toolId: 'home-affordability',
    guide: {
      heading: 'How “can I afford this house?” is modeled here',
      lede: 'CostAnswer compares a house payment with take-home pay, or works backward from take-home pay to a comfortable / stretch / aggressive price. The bands are our planning thresholds, not a debt-to-income underwrite.',
      sections: [
        {
          heading: 'Take-home, not the 28/36 gross rule',
          paragraphs: [
            'Classic affordability rules use gross income. This page uses take-home because that is the money that actually pays the mortgage, tax, insurance, and remaining debts. A household with a large 401(k) deferral has less take-home than the salary implies.',
            'Comfortable, stretch, and aggressive bands are CostAnswer thresholds on net pay. A lender may approve a loan that this page labels aggressive, or deny one this page labels comfortable. Credit, reserves, and property type are not in the model.',
          ],
        },
        {
          heading: 'The payment inside the band',
          paragraphs: [
            'The housing cost uses the same amortizing math as the mortgage calculator, plus the tax, insurance, HOA, and debt payments you type. The rate starts from the Freddie Mac national average unless you override it.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much house can I afford on my take-home pay?',
        answer: [
          'Enter take-home (or a salary the page can estimate), debts, down payment, and rate. The page prints comfortable, stretch, and aggressive prices from those inputs. They are planning bands, not an approval.',
        ],
      },
      {
        question: 'Why not use 28% of gross income?',
        answer: [
          'Gross-pay rules ignore tax and pretax deductions. Two households with the same salary can have very different take-home. This model starts from net pay on purpose.',
        ],
      },
      {
        question: 'Does a lender use these bands?',
        answer: [
          'No. Underwriters use their own DTI, credit, and residual-income tests. Treat this as a household cash test.',
        ],
      },
    ],
    glossary: [
      { term: 'Take-home pay', definition: 'Pay after the taxes this site models, or a net amount you type.' },
      { term: 'DTI', definition: 'Debt-to-income ratio used by lenders on gross income. This page does not compute a lender DTI.' },
      { term: 'Stretch band', definition: 'A CostAnswer planning range above comfortable and below aggressive. Not a product name from a bank.' },
    ],
    tips: [
      'Include car payments and minimum credit-card payments in debts, or the house will look cheaper than it is.',
      'If you only have a salary, estimate take-home first on the salary-after-tax page.',
      'Run a higher rate as a stress case before you bid.',
    ],
    caveats: [
      'Planning model, not a pre-approval or financial advice.',
      'Maintenance, utilities, and closing costs are not the monthly housing cost unless you added them.',
    ],
  },
  {
    toolId: 'refinance',
    guide: {
      heading: 'When a refinance saves money on this page',
      lede: 'The calculator compares the mortgage you have with a replacement loan: the new payment, months of payment savings to cover closing costs, and whether a lower payment still costs more interest overall.',
      sections: [
        {
          heading: 'Break-even is not the whole story',
          paragraphs: [
            'If the new payment is $200 lower and closing costs are $6,000, a simple break-even is 30 months. If you sell in year two, you did not recoup the costs. If the new loan is longer than the remaining term, total interest can rise even when the payment falls.',
            'The page uses amortizing math on both loans. It does not price points, cash-out tax treatment, or a change from ARM to fixed beyond the rates you type.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How do I know if refinancing is worth it?',
        answer: [
          'Look at break-even months and total interest, not only the new payment. If you will not keep the loan past break-even, the refinance is a cost. This is still not advice for your loan.',
        ],
      },
      {
        question: 'Should I refinance to a 15-year loan?',
        answer: [
          'A shorter term usually raises the payment and cuts interest. Run both terms with the same closing costs. The “better” choice depends on cash flow, not on this page’s headline.',
        ],
      },
    ],
    glossary: [
      { term: 'Break-even', definition: 'Closing costs divided by monthly payment savings. Ignores how long you keep the loan if you stop there.' },
      { term: 'Closing costs', definition: 'Fees to originate the new loan. Type the quote, not a national average.' },
      { term: 'Cash-out refinance', definition: 'Replacing a loan and taking cash from equity. Tax and PMI effects are not fully modeled.' },
    ],
    tips: [
      'Use remaining term and remaining balance on the current loan, not the original 30-year numbers.',
      'If the new term resets to 30 years, check total interest before you celebrate the payment.',
    ],
    caveats: [
      'Not a lender comparison and not financial advice.',
      'Prepayment penalties, discount points, and ARM margins are only in the numbers you type.',
    ],
    longTail: [
      {
        heading: 'A lower payment that resets the clock',
        paragraphs: [
          'Type the remaining balance and remaining term on the loan you have, not the original 30-year note. A refinance that starts a new 30-year term can cut the monthly figure and still increase total interest. The break-even line is closing costs divided by monthly savings. It does not know when you will sell.',
          'Cash-out, points, and ARM-to-fixed conversions are only in the rates and costs you enter. The page does not look up today’s market quotes or a county’s FHA limit.',
        ],
      },
    ],
  },
  {
    toolId: 'mortgage-payoff',
    guide: {
      heading: 'What extra principal does to a mortgage',
      lede: 'Extra principal shortens the remaining schedule and cuts interest. The page uses the current balance, rate, and remaining term, then applies the extra amount you type. It does not decide whether you should prepay versus invest.',
      sections: [
        {
          heading: 'Interest saved is not a rate of return',
          paragraphs: [
            'Paying extra is a guaranteed reduction in interest at your mortgage rate, after any tax deduction you actually itemize. That is not automatically better than a retirement contribution or an emergency fund. The calculator only shows the loan math.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How much interest do I save by paying extra each month?',
        answer: [
          'Type the remaining balance, rate, remaining term, and extra principal. The page prints a new payoff date and interest saved versus the original remaining schedule.',
        ],
      },
      {
        question: 'Is extra principal better than refinancing?',
        answer: [
          'They solve different problems. Extra principal keeps the same rate and cuts term. A refinance changes the rate and usually resets fees. Run both pages; neither is advice.',
        ],
      },
    ],
    glossary: [
      { term: 'Extra principal', definition: 'An amount applied to the balance on top of the required payment. It is not a fee to the lender.' },
      { term: 'Remaining term', definition: 'Payments left, not the original 30 years.' },
    ],
    tips: [
      'Confirm with the servicer that extra amounts are applied to principal, not held as a cushion.',
      'A one-time lump sum and a monthly extra are different inputs; do not mix them in one field.',
    ],
    caveats: [
      'Not investment advice. Prepaying a 3% mortgage while carrying 20% credit-card debt is a different decision than the math on this page.',
    ],
  },
  {
    toolId: 'amortization',
    guide: {
      heading: 'How to read an amortization schedule',
      lede: 'Each payment is split into interest on the current balance and principal that reduces it. Early payments are mostly interest; later payments are mostly principal. The payment formula is the same engine as the loan calculator.',
      sections: [
        {
          heading: 'Why the interest column shrinks',
          paragraphs: [
            'Interest each month is rate/12 × remaining balance. After principal is applied, the next month’s interest is calculated on a smaller balance. That is the entire mechanism. Extra principal, if you model it on the loan page, accelerates the shift.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is so little principal paid in year one?',
        answer: [
          'A long amortizing loan keeps a large balance for years, so interest stays large. That is expected, not a billing error.',
        ],
      },
      {
        question: 'Does this include escrow?',
        answer: [
          'No. The schedule is P&I only unless you have folded other amounts into the payment you typed, which would misstate principal.',
        ],
      },
    ],
    glossary: [
      { term: 'Amortization', definition: 'Paying a loan down with level payments that shift from interest toward principal over time.' },
      { term: 'Remaining balance', definition: 'What is left after the principal portion of payments (and any extra principal).' },
    ],
    tips: [
      'Use this when a lender quote shows only a payment and you want the interest share.',
      'For mortgages, pair it with the mortgage payment page so tax and insurance stay separate.',
    ],
    caveats: [
      'Exact arithmetic for the inputs. It is still not a servicing statement if the lender uses a different day-count or rounding.',
    ],
  },
  {
    toolId: 'loan',
    guide: {
      heading: 'Fixed-rate loan payments, interest, and extra principal',
      lede: 'This is a general amortizing loan: personal loans, student loans you treat as fixed, or any installment loan with a stated rate and term. Car-specific fees belong on the car-loan page. Mortgages belong on the mortgage page if you need escrow lines.',
      sections: [
        {
          heading: 'Extra principal',
          paragraphs: [
            'An extra monthly amount is applied to principal after the regular payment. The page reprints payoff time and total interest. It assumes the lender allows prepayment without a penalty.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Can I use this for a student loan payment?',
        answer: [
          'If the loan is a fixed-rate installment loan and you know the rate and term, the payment math matches. Income-driven federal plans, IDR forgiveness, and variable rates are not this formula.',
        ],
      },
      {
        question: 'How is this different from the car-loan calculator?',
        answer: [
          'Car loan adds vehicle-price, tax, title, and down-payment structure. This page starts from an amount financed you already know.',
        ],
      },
    ],
    glossary: [
      { term: 'Amount financed', definition: 'The principal that is amortized. Not the sticker price if taxes and down payment are involved.' },
      { term: 'APR vs. rate', definition: 'This page uses the rate you type. APR can include fees this formula never sees.' },
    ],
    tips: [
      'If a lender quotes APR and a fee, the payment on this page may not match the contract payment.',
      'Use extra principal only if the loan has no prepayment penalty you care about.',
    ],
    caveats: [
      'Not a credit decision and not financial advice.',
    ],
  },
  {
    toolId: 'car-loan',
    guide: {
      heading: 'How the car-loan payment is built',
      lede: 'Price, taxes and fees, down payment, and trade-in become an amount financed. That amount is amortized at the rate and term you type. Insurance, fuel, and depreciation are not in this payment. They are on the car-affordability page.',
      sections: [
        {
          heading: 'Amount financed',
          paragraphs: [
            'A $35,000 car with 8% tax and fees, $4,000 down, and a $2,000 trade-in does not finance $35,000. The page shows the financed amount before it shows the payment. Dealer add-ons you did not type are not included.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Why is my dealer payment different?',
        answer: [
          'Extended warranties, GAP, prepaid maintenance, a different day-count, or a rate based on a different credit tier will move the payment. Compare the amount financed, not only the monthly number.',
        ],
      },
      {
        question: 'Does this include sales tax?',
        answer: [
          'Only the tax and fees you enter. State motor-vehicle tax rules vary; this is not a DMV calculator.',
        ],
      },
    ],
    glossary: [
      { term: 'Amount financed', definition: 'Price plus tax/fees, minus down payment and trade-in, as you typed them.' },
      { term: 'Money factor', definition: 'A lease concept. This page is a loan, not a lease.' },
    ],
    tips: [
      'A longer term lowers the payment and raises total interest. Check both.',
      'If the payment looks affordable but the car is not, use car affordability for fuel and insurance.',
    ],
    caveats: [
      'Not a dealer contract and not financial advice.',
    ],
    longTail: [
      {
        heading: 'Term length versus the payment',
        paragraphs: [
          'A longer term lowers the monthly figure and raises total interest on the same amount financed. Type the rate from the dealer worksheet, not a national average this page does not fetch. Sales tax is only the percent or dollars you enter, not a DMV table for your county.',
          'Insurance, fuel, and registration sit on the car-affordability page. Comparing two terms here and then ignoring those lines will make the cheaper payment look like the cheaper car.',
        ],
      },
    ],
  },
  {
    toolId: 'credit-card-payoff',
    guide: {
      heading: 'Paying off one revolving credit-card balance',
      lede: 'The page models a single balance at a stated APR and a fixed monthly payment, or the payment needed to hit a target payoff time. It is not a minimum-payment forecast from a card issuer.',
      sections: [
        {
          heading: 'Interest is charged on the revolving balance',
          paragraphs: [
            'Each month, interest accrues on the remaining balance, then your payment is applied. If the payment does not cover interest, the balance grows and the page will say so. Multiple cards belong on the debt-payoff calculator.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'How long to pay off a credit card at $200 a month?',
        answer: [
          'Type the balance, APR, and $200. The page prints months and total interest. A 0% promo rate is only valid if you type 0 and the promo actually applies.',
        ],
      },
      {
        question: 'Does this use my card’s minimum payment formula?',
        answer: [
          'No. You choose a fixed payment. Issuer minimums often shrink with the balance, which lengthens payoff. That formula is not in this engine.',
        ],
      },
    ],
    glossary: [
      { term: 'APR', definition: 'Annual percentage rate. Monthly interest uses APR/12 on this page.' },
      { term: 'Revolving credit', definition: 'A balance that can persist and accrue interest until paid. Not an installment loan.' },
    ],
    tips: [
      'If you keep charging, this payoff date is fiction. Model a frozen balance.',
      'A 0% transfer still has a fee; add the fee to the balance if you want it in the math.',
    ],
    caveats: [
      'Not credit advice. Late fees, penalty APRs, and grace periods are omitted.',
    ],
  },
  {
    toolId: 'debt-payoff',
    guide: {
      heading: 'Snowball versus avalanche on the same debts',
      lede: 'Snowball pays the smallest balance first. Avalanche pays the highest APR first. Both apply extra money to one debt at a time while minimums continue on the others. The page compares interest and the debt-free date.',
      sections: [
        {
          heading: 'Which method “wins”',
          paragraphs: [
            'Avalanche usually saves more interest. Snowball usually clears the first account sooner. The better method for a household is often the one they will follow. This page only shows the arithmetic of the two orders.',
          ],
        },
      ],
    },
    faq: [
      {
        question: 'Should I use snowball or avalanche?',
        answer: [
          'Avalanche minimizes interest if you stick to it. Snowball minimizes the number of open accounts faster. The page will not pick for you; it is not counseling.',
        ],
      },
      {
        question: 'Do I include my mortgage?',
        answer: [
          'You can, but a 30-year mortgage will dominate the timeline. Many people run consumer debts here and keep the mortgage on its own page.',
        ],
      },
    ],
    glossary: [
      { term: 'Snowball', definition: 'Smallest balance first, regardless of rate.' },
      { term: 'Avalanche', definition: 'Highest interest rate first, regardless of balance.' },
      { term: 'Minimum payment', definition: 'What you keep paying on debts that are not the current target.' },
    ],
    tips: [
      'Use real minimums from statements, not round numbers, if you want the date to be close.',
      'If a 0% card is about to expire, avalanche on the post-promo APR may matter more than the current 0.',
    ],
    caveats: [
      'Not credit counseling or bankruptcy advice.',
    ],
  },
];
