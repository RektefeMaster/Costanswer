/**
 * Site-level FAQ copy, used both on /faq and in FAQPage JSON-LD so the
 * visible questions and the structured data cannot drift apart.
 */
import { examplePartnerNames } from './affiliates';

export type SiteFaqEntry = {
  id: string;
  question: string;
  rail: string;
  answer: string[];
  related?: Array<{ href: `/${string}`; label: string }>;
};

export const SITE_FAQ: SiteFaqEntry[] = [
  {
    id: 'what-is-costanswer',
    question: 'What is CostAnswer?',
    rail: 'What is CostAnswer?',
    answer: [
      'CostAnswer is independently built and maintained by a software builder and researcher, not a licensed financial advisor, CPA, attorney, or clinician. There is no fabricated CFA roster. Trust the Method version, the hashed snapshot, and the about page — not a fake credential.',
      'The catalogue covers pay and tax, mortgages and loans, whether a house or a car fits take-home pay, energy and fuel, home projects, health formulas, date and time math, unit conversion, school grades, and federal travel per diem. It is not a bank, a tax preparer, a clinic, or a government office.',
    ],
    related: [
      { href: '/about', label: 'About' },
      { href: '/methodology', label: 'Methodology' },
    ],
  },
  {
    id: 'who-maintains-costanswer',
    question: 'Who maintains CostAnswer? Are you financial advisors?',
    rail: 'Who maintains this?',
    answer: [
      'CostAnswer is independently built and maintained. The person who writes the methodology and keeps the engines current is a software builder and researcher, not a licensed financial advisor, CPA, attorney, or clinician.',
      'There is no fabricated CFA or CPA roster. Trust the Method version, the hashed snapshot, and the about page — not a fake credential. If you need advice that has to hold up at a bank, the IRS, or a clinic, use a person licensed to give it.',
    ],
    related: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    id: 'is-it-free',
    question: 'Is CostAnswer free to use?',
    rail: 'Is it free?',
    answer: [
      `Yes. The calculators do not need an account and do not charge to run. Some layouts reserve advertising space, and some money tools can show a partner-comparison slot next to the result. No ad network and no affiliate link loads until a public contact address, a dated privacy policy, and the matching flag are set in the software. Example names in configuration (${examplePartnerNames().join(', ')}) are placeholders until a real program URL exists. Offers, when live, are advertising, not the calculator’s answer. Disclosure appears only if a partner link is actually on the page.`,
    ],
    related: [{ href: '/privacy', label: 'Privacy' }],
  },
  {
    id: 'do-i-need-an-account',
    question: 'Do I need an account to use the calculators?',
    rail: 'Do I need an account?',
    answer: [
      'No. You open a page, type numbers, and read the result. There is no sign-in, no saved profile, and no folder of past calculations on our servers. If you want a copy, use your browser to print or screenshot the page. The Method version and Data snapshot under Technical details are what make that copy checkable later.',
    ],
  },
  {
    id: 'is-this-advice',
    question: 'Is CostAnswer financial, tax, legal, or medical advice?',
    rail: 'Is this advice?',
    answer: [
      'No. A result is an estimate from the formula and data named on that page. A mortgage number is not a lender quote. A paycheck or salary-after-tax number is not a filed return. A BMI, BMR, or calorie number is not a diagnosis or a meal plan. A GSA per diem number is not travel authorization.',
      'If you need a decision that has to hold up at a bank, the IRS, a clinic, or an employer, use the official source the page cites, or a person licensed to give that advice. The user agreement says the same thing for every page.',
    ],
    related: [{ href: '/terms', label: 'User agreement' }],
  },
  {
    id: 'can-i-file-taxes-with-it',
    question: 'Can I use CostAnswer to file my taxes?',
    rail: 'Can I file taxes with it?',
    answer: [
      'No. The tax and paycheck calculators estimate federal income tax, FICA, and state wage tax where this site has a verified schedule for that year. They do not prepare Form 1040, state returns, or payroll filings. They do not apply every credit, deduction, or local rule.',
      'Use them to see the arithmetic under a withholding or take-home question. File with the IRS, your state, or software built to produce a return.',
    ],
    related: [
      { href: '/money/salary-after-tax', label: 'Salary after tax' },
      { href: '/money/paycheck', label: 'Paycheck' },
    ],
  },
  {
    id: 'is-it-a-government-site',
    question: 'Is CostAnswer a government website?',
    rail: 'Is it a government site?',
    answer: [
      'No. CostAnswer stores copies of U.S. public data and runs formulas against those copies. Freddie Mac, EIA, BLS, IRS, SSA, HUD, Census, BEA, USDA, and GSA publish the underlying series. They do not operate this site, do not endorse the calculators, and are not responsible for how a stored copy is used here.',
      'When a page cites an agency, it is naming the table we hashed, not claiming to speak for that agency.',
    ],
    related: [{ href: '/methodology/data', label: 'Data sources' }],
  },
  {
    id: 'where-do-mortgage-rates-come-from',
    question: 'Where do the mortgage rates on CostAnswer come from?',
    rail: 'Where do mortgage rates come from?',
    answer: [
      'The mortgage payment and home affordability pages start from the Freddie Mac Primary Mortgage Market Survey weekly national averages for 30-year and 15-year fixed rates. That is a U.S. average, not the rate a lender will offer you. You can type a different rate if you have a quote.',
      'The copy on the site is a stored snapshot with a publication date. It is not pulled live from Freddie Mac while you type. The data sources page lists the period and when this site last verified it.',
    ],
    related: [
      { href: '/money/mortgage-payment', label: 'Mortgage payment' },
      { href: '/money/home-affordability', label: 'Home affordability' },
    ],
  },
  {
    id: 'does-mortgage-include-taxes',
    question: 'Does the mortgage payment include property tax and insurance?',
    rail: 'Does it include tax and insurance?',
    answer: [
      'The headline mortgage payment is principal and interest on the loan you typed, at the rate on the page. Property tax, homeowners insurance, and HOA are optional amounts you type. PMI is an optional rough estimate if the down payment is under 20%. None of that is an escrow statement from a lender.',
      'A payment that looks lower than a lender quote is often missing those escrow items, points, or a different rate. Compare the Method version and the rate source before you treat the two numbers as the same thing.',
    ],
    related: [{ href: '/money/mortgage-payment', label: 'Mortgage payment' }],
  },
  {
    id: 'how-is-take-home-pay-calculated',
    question: 'How does CostAnswer estimate take-home pay?',
    rail: 'How is take-home pay calculated?',
    answer: [
      'Salary-after-tax and paycheck pages start from the gross pay you type, then apply federal income tax, Social Security, Medicare, and a state wage-tax schedule when this site has a verified table for that year. They are not a full Form 1040. Local taxes, many credits, and employer-specific pretax deductions are omitted unless the page asks for them.',
      'The tax year on the page is the schedule in the snapshot, not whatever year it happens to be on your clock. If your state has no verified schedule in this copy, the page will not invent one.',
    ],
    related: [
      { href: '/money/salary-after-tax', label: 'Salary after tax' },
      { href: '/money/paycheck', label: 'Paycheck' },
    ],
  },
  {
    id: 'how-does-cost-of-living-work',
    question: 'How does the cost of living calculator work?',
    rail: 'How does cost of living work?',
    answer: [
      'The cost of living page builds a monthly total from official local figures where they exist, and from national planning values where they do not. HUD Fair Market Rents, Census and BEA local income and price data, and BLS item prices each cover a different part of a household budget. The page labels which line is a local official number, which is a national baseline, and which you typed.',
      'It is a planning total, not your lease, not your grocery receipt, and not a metropolitan ranking from a magazine. Two metros can look close on rent and far apart once utilities and groceries are in the same frame.',
    ],
    related: [{ href: '/money/cost-of-living', label: 'Cost of living' }],
  },
  {
    id: 'why-is-my-electric-bill-different',
    question: 'Why is my electric bill different from the CostAnswer estimate?',
    rail: 'Why is my electric bill different?',
    answer: [
      'The electricity pages use Energy Information Administration state average retail prices. Your utility’s rate, time-of-use plan, fixed charges, and taxes are not in that average. If you type your own cents-per-kWh, the page uses that instead and drops the EIA snapshot from the result.',
      'The same pattern holds for gasoline and grocery staples: government averages for a geography, not the price on your last receipt.',
    ],
    related: [
      { href: '/home/electricity-cost', label: 'Electricity cost' },
      { href: '/home/appliance-electricity-cost', label: 'Appliance electricity' },
    ],
  },
  {
    id: 'how-current-is-the-data',
    question: 'How current is the data on CostAnswer?',
    rail: 'How current is the data?',
    answer: [
      'Each dataset has a known release schedule. Freddie Mac publishes weekly. EIA electricity prices move on a monthly cycle. CPI, tax tables, HUD rents, and GSA per diem follow their own calendars. The site stores a copy after a fetch, hashes it, and refuses to build if that file no longer matches the hash it was reviewed under.',
      'When a provider is due to publish again and this site has not caught up, the page says so. It does not present an older figure as the current one.',
    ],
    related: [{ href: '/methodology/data', label: 'Data sources' }],
  },
  {
    id: 'what-do-method-and-data-mean',
    question: 'What do Method version and Data snapshot mean on a calculator?',
    rail: 'What do Method and Data mean?',
    answer: [
      'Technical details under every result prints two strings. Method version names the engine that ran: the formula, the rounding, and the omissions. If that engine changes, the string changes. Data snapshot names the hashed copy of a public dataset that fed the page, or says the result used only what you typed.',
      'Those two lines are how a screenshot stays checkable. A report without them usually cannot be matched to a test or a file. The same inputs and the same Method version should produce the same answer.',
    ],
    related: [
      { href: '/methodology', label: 'Methodology' },
      { href: '/contact', label: 'How to report a mistake' },
    ],
  },
  {
    id: 'does-costanswer-save-what-i-type',
    question: 'Does CostAnswer save the numbers I type?',
    rail: 'Does it save what I type?',
    answer: [
      'No. Calculators run in the page itself. Pay, balances, dates, ZIP codes, and quantities are used on your computer to produce the result. They are not posted to CostAnswer to store, profile, or sell.',
      'A few tools ask the server only for a mapping, such as which county a ZIP sits in. That request is not a profile. The privacy page states from the live configuration whether analytics or advertising are on. Both are off unless that page says otherwise.',
    ],
    related: [{ href: '/privacy', label: 'Privacy' }],
  },
  {
    id: 'does-it-cover-every-state',
    question: 'Does CostAnswer work for every U.S. state?',
    rail: 'Does it cover every state?',
    answer: [
      'Money, energy, and housing pages are written for the United States. A state picker is that state’s table in the snapshot, not a guess for a neighboring state. If this site does not have a verified wage-tax schedule for a state, the paycheck math will not invent one.',
      'GSA per diem covers the continental United States. Alaska, Hawaii, territories, and foreign locations use Defense and State Department rates, which are not in this dataset. A ZIP that is not a listed GSA locality returns that state’s standard CONUS rate.',
    ],
    related: [{ href: '/everyday/per-diem', label: 'Per diem' }],
  },
  {
    id: 'why-nights-and-days-differ',
    question: 'Why don’t lodging nights and meal days match on the per diem calculator?',
    rail: 'Why don’t nights and days match?',
    answer: [
      'GSA lodging is a nightly ceiling. Meals and incidentals are paid per calendar day, with the first and last day at three quarters of the daily rate. A three-day trip therefore has two nights of lodging and three days of meals. Mixing those two counts is the usual way a per diem estimate comes out wrong.',
      'The page also prices each night against the month that night falls in, because many destinations change rate in season.',
    ],
    related: [{ href: '/everyday/per-diem', label: 'Per diem' }],
  },
  {
    id: 'what-is-standard-conus',
    question: 'What is the standard CONUS rate?',
    rail: 'What is the standard CONUS rate?',
    answer: [
      'GSA lists a few hundred localities by name and gives every state one standard continental U.S. rate for everywhere else in that state. If you type a ZIP whose county is not listed on its own, CostAnswer uses that state standard rate. That is the normal answer, not a failed lookup.',
      'The page says so in plain language. Alaska, Hawaii, territories, and foreign locations are set by the Department of Defense and the State Department, not GSA, and are not in this dataset.',
    ],
    related: [{ href: '/everyday/per-diem', label: 'Per diem' }],
  },
  {
    id: 'why-two-per-diem-rates',
    question: 'Why does a ZIP code show two GSA per diem rates?',
    rail: 'Why two per diem rates?',
    answer: [
      'A ZIP code maps to a county through the Census ZCTA file. GSA sometimes carves a city out of that county, for example Cambridge inside Middlesex or Sedona inside Yavapai. A ZIP cannot tell the city from the rest of the county, so the page quotes the county rate and offers the city rate as a choice. Pick the one that matches where the trip actually is.',
    ],
    related: [{ href: '/everyday/per-diem', label: 'Per diem' }],
  },
  {
    id: 'can-i-use-perdiem-for-a-voucher',
    question: 'Can I use the per diem calculator for a federal travel voucher?',
    rail: 'Can I use it on a travel voucher?',
    answer: [
      'Use it to see the GSA ceiling for a ZIP, a date range, and a room rate before you file. It is not authorization to travel, not your agency’s policy, and not a substitute for the voucher your travel office accepts.',
      'Lodging tax sits outside the GSA cap and is reimbursed separately under those rules. If the room is over the ceiling, the page shows what is reimbursable under the cap and how much sits above it. Your authorizing official still has to sign the trip.',
    ],
    related: [
      { href: '/everyday/per-diem', label: 'Per diem' },
      { href: '/terms', label: 'User agreement' },
    ],
  },
  {
    id: 'why-different-from-another-site',
    question: 'Why is my result different from another website?',
    rail: 'Why a different result than another site?',
    answer: [
      'Other sites often flatten a seasonal rate into one number, fetch a live feed that later gets revised, or hide the assumptions. CostAnswer prints the formula version, the snapshot id, and the things the model leaves out next to the answer. Compare those, not just the headline.',
      'A typed rate, a different tax year, or a state with no verified schedule on this snapshot will also change the figure. Open Technical details on both pages if the other site shows any.',
    ],
    related: [{ href: '/methodology', label: 'Methodology' }],
  },
  {
    id: 'can-i-reuse-the-calculators',
    question: 'Can I copy, embed, or republish the calculators?',
    rail: 'Can I reuse the calculators?',
    answer: [
      'You may use the pages for your own questions and you may link to any public URL. A short quotation with a link back is fine. You may not copy the calculators and present them as your own product, wrap the pages so they look like yours, or send automated traffic that knocks the service over. The user agreement is the document that applies.',
    ],
    related: [{ href: '/terms', label: 'User agreement' }],
  },
  {
    id: 'can-i-request-a-calculator',
    question: 'Can I request a calculator CostAnswer does not have?',
    rail: 'Can I request a calculator?',
    answer: [
      'Yes. The contact page has a form for that. Pick Calculator I want and say what it should compute, who it is for, and which official table it should use if you know one. The closest page already on the site helps.',
      'A request is read. Building it is a separate decision. There is no queue you can check and no promised date. If it is built, it shows up in the catalogue with its own Method version.',
    ],
    related: [{ href: '/contact', label: 'Contact' }],
  },
  {
    id: 'how-do-i-report-a-mistake',
    question: 'How do I report a wrong number on CostAnswer?',
    rail: 'How do I report a mistake?',
    answer: [
      'Open Technical details under the answer and copy the Method version and the Data snapshot id. Put those in the contact form with the page URL, what you typed, what the page showed, and the official table you expected, if you have it. Pick Wrong figure. Do not send paystubs, tax returns, account numbers, or medical records.',
      'A report with those two strings can be checked against the tests and the hashed copy of the data. The same form takes a complaint or a suggestion. Mix a wrong figure with a feature request and the Method line gets lost.',
    ],
    related: [{ href: '/contact', label: 'Contact' }],
  },
];
