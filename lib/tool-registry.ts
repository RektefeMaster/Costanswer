import { COMPOUND_INTEREST_ENGINE_ID, DEBT_PAYOFF_ENGINE_ID, LOAN_ENGINE_ID, AUTO_LOAN_ENGINE_ID, INVESTMENT_ENGINE_ID, RETIREMENT_ENGINE_ID, AMORTIZATION_ENGINE_ID, CD_ENGINE_ID, INTEREST_ENGINE_ID, ROTH_IRA_ENGINE_ID, K401_ENGINE_ID, MORTGAGE_PAYOFF_ENGINE_ID, CREDIT_CARD_PAYOFF_ENGINE_ID } from './calculations/finance/version';
import { APPLIANCE_ENERGY_ENGINE_ID } from './calculations/energy/version';
import { CAR_AFFORDABILITY_ENGINE_ID } from './calculations/vehicle/version';
import { COST_OF_LIVING_ENGINE_ID } from './calculations/col/version';
import { PAYCHECK_ENGINE_ID, SALARY_AFTER_TAX_ENGINE_ID } from './calculations/tax/version';
import { BMI_ENGINE_ID, BMR_ENGINE_ID, BODY_FAT_ENGINE_ID, CALORIE_ENGINE_ID, TDEE_ENGINE_ID } from './calculations/health/formulas';
import { AGE_ENGINE_ID, DATE_ENGINE_ID, DAYS_FROM_TODAY_ENGINE_ID, TIME_CARD_ENGINE_ID, TIME_ENGINE_ID } from './calculations/datetime/version';
import { FRACTION_ENGINE_ID, PERCENT_CHANGE_ENGINE_ID, PERCENTAGE_ENGINE_ID, RANDOM_NUMBER_ENGINE_ID, SCIENTIFIC_ENGINE_ID, TIP_ENGINE_ID } from './calculations/math/version';
import { CONVERSION_ENGINE_ID } from './calculations/conversion/units';
import { GPA_ENGINE_ID, GRADE_ENGINE_ID, SQUARE_FOOTAGE_ENGINE_ID } from './calculations/education/formulas';
import { parsePublishingDate, PUBLISHING_SNAPSHOT_DATE } from './publishing';

export const CATEGORY_IDS = ['money', 'home', 'auto', 'everyday', 'food', 'shopping', 'health', 'math', 'education'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
/** Header stays at the original six categories. Health, math, and education are in the footer, homepage strip, and topic hubs. */
export const HEADER_CATEGORY_IDS: readonly CategoryId[] = ['money', 'home', 'auto', 'everyday', 'food', 'shopping'];

export type ToolRelationship = {
  toolId: string;
  type: 'sibling' | 'next-decision' | 'uses-dataset' | 'uses-engine';
};

export type IndexabilityEvidence = {
  scores: {
    searchIntentEvidence: number;
    uniqueDataOrFunction: number;
    answerDepth: number;
    provenanceAndFreshness: number;
    internalLinkValue: number;
    mobileAndPerformance: number;
    maintenanceConfidence: number;
  };
  hardGates: {
    realFunction: boolean;
    distinctIntent: boolean;
    methodologyVisible: boolean;
    sourceRequirementsMet: boolean;
    ymylOrSafetyReviewed: boolean;
    canonicalReady: boolean;
    crawlableInboundLinks: boolean;
  };
  provenanceStatus: 'verified' | 'not-required';
  reviewedAt: string;
  reviewValidUntil: string;
};

export type ToolDefinition = {
  id: string;
  path: `/${string}`;
  title: string;
  shortTitle: string;
  description: string;
  category: CategoryId;
  engine: string;
  searchTerms: string[];
  eyebrow: string;
  accent: 'mint' | 'amber' | 'blue' | 'rose' | 'violet' | 'coral';
  featured: boolean;
  indexability: IndexabilityEvidence;
  relationships: ToolRelationship[];
};

function launchIndexability(
  scores: IndexabilityEvidence['scores'],
  provenanceStatus: IndexabilityEvidence['provenanceStatus'],
): IndexabilityEvidence {
  return {
    scores,
    hardGates: {
      realFunction: true,
      distinctIntent: true,
      methodologyVisible: true,
      sourceRequirementsMet: true,
      ymylOrSafetyReviewed: true,
      canonicalReady: true,
      crawlableInboundLinks: true,
    },
    provenanceStatus,
    reviewedAt: '2026-09-01',
    reviewValidUntil: '2027-09-01',
  };
}

export const categories: Record<CategoryId, { name: string; description: string; blurb: string; accent: ToolDefinition['accent'] }> = {
  money: {
    name: 'Money',
    blurb: 'Pay, a mortgage payment, or buying power over time.',
    description: 'Pay, a loan or mortgage payment, whether a house fits take-home pay, savings growth, or buying power over time.',
    accent: 'mint',
  },
  home: {
    name: 'Home',
    blurb: 'An electric bill, an appliance, or bags of concrete.',
    description: 'A rough electric bill by state, what an appliance costs to run, or bags of concrete for a slab.',
    accent: 'amber',
  },
  auto: {
    name: 'Auto',
    blurb: 'Car vs take-home pay, EV charging, or trip fuel.',
    description: 'Whether a car fits your take-home pay, yearly EV charging versus gasoline, or fuel for a road trip.',
    accent: 'blue',
  },
  everyday: {
    name: 'Everyday',
    blurb: 'Workdays, ages, tips, and time on a timesheet.',
    description: 'Workdays between two dates, age, tips, duration math, or hours on a timesheet.',
    accent: 'rose',
  },
  food: {
    name: 'Food',
    blurb: 'Scale a recipe. Amounts stay in kitchen fractions.',
    description: 'Scale a recipe up or down. Amounts stay in kitchen fractions.',
    accent: 'coral',
  },
  shopping: {
    name: 'Shopping',
    blurb: 'Unit prices, or which states look cheaper.',
    description: 'Compare package prices, or see which states look cheaper on official averages.',
    accent: 'violet',
  },
  health: {
    name: 'Health',
    blurb: 'BMI, calories, and circumference estimates.',
    description: 'Adult formula estimates for BMI, BMR, TDEE, daily calories, and circumference body fat. Not diagnoses.',
    accent: 'rose',
  },
  math: {
    name: 'Math',
    blurb: 'Percents, fractions, units, and a scientific keypad.',
    description: 'Percentage relationships, percent change, fractions, unit conversion, and a bounded scientific calculator.',
    accent: 'violet',
  },
  education: {
    name: 'Education',
    blurb: 'Weighted grades and a 4.0 GPA scale you can see.',
    description: 'A weighted course grade or a GPA from credits, with the scale shown as an assumption.',
    accent: 'coral',
  },
};

export const tools: ToolDefinition[] = [
  {
    id: 'hourly-to-salary',
    path: '/money/hourly-to-salary',
    title: 'Hourly to Salary Calculator',
    shortTitle: 'Hourly to salary',
    description: 'Turn an hourly wage into weekly, monthly, and yearly pay before taxes. Overtime has its own line.',
    category: 'money',
    engine: 'compensation-v1',
    searchTerms: ['hourly wage to salary', 'hourly to annual salary', 'how much is 28 an hour a year', 'annual salary', 'overtime pay', 'how much per year', 'gross pay calculator'],
    eyebrow: 'Hourly wage to annual pay',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'salary-after-tax', type: 'next-decision' },
      { toolId: 'paycheck', type: 'next-decision' },
      { toolId: 'home-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'salary-after-tax',
    path: '/money/salary-after-tax',
    title: 'Salary After Tax Calculator',
    shortTitle: 'Salary after tax',
    description: 'Estimate federal income tax, FICA, and state income tax on a U.S. salary, then see take-home by year, month, and paycheck.',
    category: 'money',
    engine: SALARY_AFTER_TAX_ENGINE_ID,
    searchTerms: [
      'salary after tax',
      'take home salary calculator',
      'net salary calculator',
      'how much is 100k after taxes',
      'after tax income',
      'federal and state income tax calculator',
    ],
    eyebrow: 'Estimated take-home on a salary',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'paycheck', type: 'next-decision' },
      { toolId: 'home-affordability', type: 'next-decision' },
      { toolId: 'cost-of-living', type: 'next-decision' },
    ],
  },
  {
    id: 'paycheck',
    path: '/money/paycheck',
    title: 'Paycheck Calculator',
    shortTitle: 'Paycheck',
    description: 'Estimate a net paycheck from annualized federal, FICA, and state tax. This is not employer payroll withholding.',
    category: 'money',
    engine: PAYCHECK_ENGINE_ID,
    searchTerms: [
      'paycheck calculator',
      'net paycheck',
      'take home pay calculator',
      'biweekly paycheck',
      'hourly paycheck after tax',
      'estimated paycheck',
    ],
    eyebrow: 'Estimated net paycheck',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'salary-after-tax', type: 'uses-engine' },
      { toolId: 'home-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'mortgage-payment',
    path: '/money/mortgage-payment',
    title: 'Mortgage Payment Calculator',
    shortTitle: 'Mortgage payment',
    description: 'Monthly principal and interest from the home price, down payment, term, and this week’s Freddie Mac national average rate. You can type a quote instead.',
    category: 'money',
    engine: 'mortgage-amortization-v1',
    searchTerms: [
      'mortgage calculator',
      'mortgage payment calculator',
      'monthly mortgage payment',
      '30 year mortgage',
      '15 year mortgage',
      'home loan payment',
      'how much is my mortgage',
      'mortgage rate today',
    ],
    eyebrow: 'National average mortgage payment',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'home-affordability', type: 'next-decision' },
      { toolId: 'loan', type: 'sibling' },
      { toolId: 'mortgage-payoff', type: 'next-decision' },
      { toolId: 'amortization', type: 'sibling' },
    ],
  },
  {
    id: 'loan',
    path: '/money/loan',
    title: 'Loan Calculator',
    shortTitle: 'Loan payment',
    description: 'Monthly payment, total interest, and payoff time for a fixed-rate loan. Add extra principal if you want to see how much sooner it ends.',
    category: 'money',
    engine: LOAN_ENGINE_ID,
    searchTerms: [
      'loan calculator',
      'loan payment calculator',
      'monthly loan payment',
      'personal loan payment',
      'amortizing loan',
      'how much is my loan payment',
      'loan interest',
      'extra principal payment',
    ],
    eyebrow: 'Fixed-rate loan payment',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'mortgage-payment', type: 'sibling' },
      { toolId: 'amortization', type: 'next-decision' },
      { toolId: 'auto-loan', type: 'sibling' },
      { toolId: 'debt-payoff', type: 'next-decision' },
    ],
  },
  {
    id: 'compound-interest',
    path: '/money/compound-interest',
    title: 'Compound Interest Calculator',
    shortTitle: 'Compound interest',
    description: 'See how a starting balance and recurring deposits grow with compound interest. Contributions are added at the end of each period.',
    category: 'money',
    engine: COMPOUND_INTEREST_ENGINE_ID,
    searchTerms: [
      'compound interest calculator',
      'compound interest',
      'savings growth calculator',
      'interest on savings',
      'recurring deposit calculator',
      'how much will my savings grow',
    ],
    eyebrow: 'Savings growth over time',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'investment', type: 'next-decision' },
      { toolId: 'interest', type: 'sibling' },
      { toolId: 'hourly-to-salary', type: 'sibling' },
    ],
  },
  {
    id: 'debt-payoff',
    path: '/money/debt-payoff',
    title: 'Debt Payoff Calculator',
    shortTitle: 'Debt payoff',
    description: 'Compare snowball and avalanche payoff plans on the same debts. See which order saves more interest and how extra payments change the date.',
    category: 'money',
    engine: DEBT_PAYOFF_ENGINE_ID,
    searchTerms: [
      'debt payoff calculator',
      'debt snowball',
      'debt avalanche',
      'pay off credit cards',
      'extra payment debt',
      'debt free date',
      'which debt to pay first',
    ],
    eyebrow: 'Snowball vs avalanche',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'loan', type: 'sibling' },
      { toolId: 'credit-card-payoff', type: 'sibling' },
      { toolId: 'home-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'inflation',
    path: '/money/inflation',
    title: 'Inflation Calculator',
    shortTitle: 'Inflation',
    description: 'See what an amount in one U.S. month would buy in another, using the BLS CPI-U all-items index since 1913.',
    category: 'money',
    engine: 'cpi-u-inflation-v1',
    searchTerms: [
      'inflation calculator',
      'buying power calculator',
      'what is 100 dollars in 1990 worth today',
      'cpi calculator',
      'value of money over time',
      'inflation since 2000',
      'historical purchasing power',
    ],
    eyebrow: 'CPI-U buying power',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 19, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'hourly-to-salary', type: 'sibling' },
      { toolId: 'home-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'home-affordability',
    path: '/money/home-affordability',
    title: 'Can I Afford This House?',
    shortTitle: 'Afford this house',
    description: 'A planning screen for a specific house, or a comfortable / reasonable / aggressive price from take-home pay, debts, and this week’s national average rate.',
    category: 'money',
    engine: 'home-affordability-v1',
    searchTerms: [
      'can I afford this house',
      'how much house can I afford',
      'home affordability calculator',
      'should I buy this house',
      'how much home can I buy',
      'house I can afford',
      'mortgage affordability',
    ],
    eyebrow: 'Take-home pay vs. a house',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 14, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'mortgage-payment', type: 'uses-engine' },
      { toolId: 'hourly-to-salary', type: 'sibling' },
      { toolId: 'cost-of-living', type: 'next-decision' },
    ],
  },
  {
    id: 'cost-of-living',
    path: '/money/cost-of-living',
    title: 'Cost of Living Calculator',
    shortTitle: 'Cost of living',
    description: 'Estimated modeled monthly living costs for a U.S. city, metro, or state using HUD Fair Market Rent, USDA Food Plans, and official regional context. This is not a proprietary index.',
    category: 'money',
    engine: COST_OF_LIVING_ENGINE_ID,
    searchTerms: [
      'cost of living',
      'living cost',
      'cost to live',
      'living expenses',
      'city cost of living',
      'state cost of living',
      'how much to live',
      'monthly living costs',
      'cost of living calculator',
    ],
    eyebrow: 'Modeled monthly living costs',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 20, uniqueDataOrFunction: 25, answerDepth: 15, provenanceAndFreshness: 15, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'salary-after-tax', type: 'uses-engine' },
      { toolId: 'home-affordability', type: 'next-decision' },
      { toolId: 'car-affordability', type: 'sibling' },
      { toolId: 'electricity-cost', type: 'uses-dataset' },
    ],
  },
  {
    id: 'electricity-cost',
    path: '/home/electricity-cost',
    title: 'Electricity Cost Calculator by State',
    shortTitle: 'Electricity cost',
    description: 'A monthly electric bill from your kWh and the EIA average for your state. You can type the rate from your bill instead.',
    category: 'home',
    engine: 'energy-cost-v1',
    searchTerms: ['electric bill calculator', 'electricity cost by state', 'cost per kwh', 'electricity rate by state', 'kwh cost calculator', 'average electric bill'],
    eyebrow: 'State average electric bill',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'appliance-electricity', type: 'next-decision' },
      { toolId: 'ev-vs-gas', type: 'uses-dataset' },
      { toolId: 'where-cheaper', type: 'next-decision' },
      { toolId: 'cost-of-living', type: 'sibling' },
    ],
  },
  {
    id: 'appliance-electricity',
    path: '/home/appliance-electricity-cost',
    title: 'Appliance Electricity Cost Calculator',
    shortTitle: 'Appliance electricity',
    description: 'Estimate what a device costs to run from its wattage, hours of use, and the EIA average for your state. You can type the rate from your bill instead.',
    category: 'home',
    engine: APPLIANCE_ENERGY_ENGINE_ID,
    searchTerms: [
      'appliance electricity',
      'device electricity cost',
      'electricity usage',
      'appliance energy cost',
      'how much to run an appliance',
      'wattage electricity cost',
      'cost to run a dryer',
    ],
    eyebrow: 'What a device costs to run',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'uses-dataset' },
      { toolId: 'ev-vs-gas', type: 'next-decision' },
      { toolId: 'where-cheaper', type: 'uses-dataset' },
    ],
  },
  {
    id: 'concrete',
    path: '/home/concrete-calculator',
    title: 'Concrete Calculator',
    shortTitle: 'Concrete calculator',
    description: 'Cubic yards and bag counts for a rectangular slab. Waste is listed separately.',
    category: 'home',
    engine: 'material-volume-v1',
    searchTerms: ['how much concrete do I need', 'how much concrete', 'concrete calculator', 'concrete bags', 'cubic yards of concrete', 'slab calculator', '80 lb bags', 'concrete slab'],
    eyebrow: 'Slab volume and bag count',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'sibling' },
      { toolId: 'square-footage', type: 'next-decision' },
      { toolId: 'unit-price', type: 'next-decision' },
    ],
  },
  {
    id: 'ev-vs-gas',
    path: '/auto/ev-vs-gas',
    title: 'EV vs. Gas Energy Cost Calculator',
    shortTitle: 'EV vs. gas',
    description: 'Yearly charging versus gasoline, using your miles, MPG, a local gas price, and a state electricity average.',
    category: 'auto',
    engine: 'vehicle-energy-v1',
    searchTerms: ['ev vs gas cost', 'electric car vs gas cost', 'electric car savings', 'charging cost per mile', 'gas mileage comparison', 'ev charging cost calculator'],
    eyebrow: 'EV charging vs. gasoline',
    accent: 'blue',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'uses-dataset' },
      { toolId: 'appliance-electricity', type: 'sibling' },
      { toolId: 'road-trip-fuel', type: 'next-decision' },
      { toolId: 'car-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'road-trip-fuel',
    path: '/auto/road-trip-fuel',
    title: 'Road Trip Fuel Cost Calculator',
    shortTitle: 'Road-trip fuel',
    description: 'Fuel cost for a drive from your miles, MPG, and this week’s EIA regular-gas average for your state or region. You can type a pump price instead.',
    category: 'auto',
    engine: 'road-trip-fuel-v1',
    searchTerms: [
      'road trip fuel cost',
      'gas cost calculator',
      'trip gas calculator',
      'how much gas for a road trip',
      'fuel cost for a drive',
      'gas money for a trip',
      'road trip cost calculator',
    ],
    eyebrow: 'Fuel for the miles you drive',
    accent: 'blue',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 13, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'ev-vs-gas', type: 'sibling' },
      { toolId: 'where-cheaper', type: 'uses-dataset' },
      { toolId: 'car-affordability', type: 'next-decision' },
    ],
  },
  {
    id: 'car-affordability',
    path: '/auto/car-affordability',
    title: 'Car Affordability Calculator',
    shortTitle: 'Car affordability',
    description: 'The real monthly cost of a car \u2014 loan payment, fuel or charging, insurance, upkeep, registration \u2014 and how much of your take-home pay it would take.',
    category: 'auto',
    engine: CAR_AFFORDABILITY_ENGINE_ID,
    searchTerms: [
      'car affordability calculator',
      'how much car can i afford',
      'can i afford this car',
      'how much should i spend on a car',
      'true cost of owning a car',
      'monthly car cost',
      'car payment vs income',
      'cost of car ownership',
    ],
    eyebrow: 'True monthly cost vs. take-home pay',
    accent: 'blue',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 24, answerDepth: 15, provenanceAndFreshness: 12, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'loan', type: 'uses-engine' },
      { toolId: 'auto-loan', type: 'sibling' },
      { toolId: 'salary-after-tax', type: 'uses-engine' },
      { toolId: 'ev-vs-gas', type: 'sibling' },
      { toolId: 'home-affordability', type: 'next-decision' },
      { toolId: 'cost-of-living', type: 'sibling' },
    ],
  },
  {
    id: 'business-days',
    path: '/everyday/business-days',
    title: 'Business Days Calculator',
    shortTitle: 'Business days',
    description: 'Count workdays between two dates, or add workdays to a date. Federal holidays are optional.',
    category: 'everyday',
    engine: 'calendar-v1',
    searchTerms: ['business days between dates', 'working days calculator', 'how many business days', 'days from date', 'federal holidays', 'add workdays', 'skip weekends'],
    eyebrow: 'Workdays and federal holidays',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 13, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'date', type: 'sibling' },
      { toolId: 'days-from-today', type: 'sibling' },
      { toolId: 'age', type: 'sibling' },
    ],
  },
  {
    id: 'unit-price',
    path: '/shopping/unit-price',
    title: 'Unit Price Calculator',
    shortTitle: 'Unit price',
    description: 'See which package is cheaper per ounce, pound, or item, even if the labels use different units.',
    category: 'shopping',
    engine: 'unit-normalization-v1',
    searchTerms: ['unit price calculator', 'price per ounce', 'which is cheaper', 'bulk vs small', 'compare package sizes', 'price per pound', 'unit cost'],
    eyebrow: 'Price per ounce, pound, or item',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 12, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'recipe-scaler', type: 'uses-engine' },
      { toolId: 'where-cheaper', type: 'sibling' },
    ],
  },
  {
    id: 'where-cheaper',
    path: '/shopping/where-cheaper',
    title: 'Cheapest States for Electricity, Gas, and Groceries',
    shortTitle: 'Where it’s cheaper',
    description: 'Compare electricity, gasoline, and the grocery staples BLS splits by region. These are government averages, not store ads.',
    category: 'shopping',
    engine: 'where-cheaper-v1',
    searchTerms: [
      'where is it cheaper',
      'cheapest state for gas',
      'cheapest electricity state',
      'cheapest states',
      'grocery staple prices',
      'compare energy cost by state',
      'gas prices by state',
      'where are groceries cheaper',
      'cost of living by state',
    ],
    eyebrow: 'Compare two states',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 24, answerDepth: 14, provenanceAndFreshness: 15, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'verified'),
    relationships: [
      { toolId: 'electricity-cost', type: 'uses-dataset' },
      { toolId: 'appliance-electricity', type: 'sibling' },
      { toolId: 'ev-vs-gas', type: 'sibling' },
      { toolId: 'road-trip-fuel', type: 'next-decision' },
    ],
  },
  {
    id: 'recipe-scaler',
    path: '/food/recipe-scaler',
    title: 'Recipe Scaler',
    shortTitle: 'Recipe scaler',
    description: 'Scale a recipe to more or fewer servings. Amounts round to the nearest 1/16.',
    category: 'food',
    engine: 'quantity-scaling-v1',
    searchTerms: ['scale a recipe', 'recipe scaler', 'servings calculator', 'double a recipe', 'halve a recipe', 'recipe fractions', 'ingredient quantity'],
    eyebrow: 'Scale servings and ingredients',
    accent: 'coral',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'unit-price', type: 'uses-engine' },
      { toolId: 'business-days', type: 'sibling' },
    ],
  },
  {
    id: 'bmi',
    path: '/health/bmi',
    title: 'BMI Calculator',
    shortTitle: 'BMI',
    description: 'Estimate adult Body Mass Index from height and weight in metric or U.S. units. Category labels are secondary CDC screening ranges, not a diagnosis.',
    category: 'health',
    engine: BMI_ENGINE_ID,
    searchTerms: ['bmi calculator', 'body mass index calculator', 'calculate bmi', 'bmi metric', 'bmi pounds inches'],
    eyebrow: 'Height and weight ratio',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'bmr', type: 'sibling' },
      { toolId: 'body-fat', type: 'sibling' },
    ],
  },
  {
    id: 'calorie',
    path: '/health/calorie',
    title: 'Calorie Calculator',
    shortTitle: 'Daily calories',
    description: 'Estimate daily calories from adult BMR and a documented activity factor. Maintenance is the primary result; optional offsets stay small.',
    category: 'health',
    engine: CALORIE_ENGINE_ID,
    searchTerms: ['calorie calculator', 'calories per day', 'daily calorie calculator', 'maintenance calories', 'how many calories do I need'],
    eyebrow: 'Estimated daily calories',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'tdee', type: 'uses-engine' },
      { toolId: 'bmr', type: 'uses-engine' },
    ],
  },
  {
    id: 'tdee',
    path: '/health/tdee',
    title: 'TDEE Calculator',
    shortTitle: 'TDEE',
    description: 'Estimate Total Daily Energy Expenditure as adult BMR times a labeled activity multiplier. The factor is a planning assumption.',
    category: 'health',
    engine: TDEE_ENGINE_ID,
    searchTerms: ['tdee calculator', 'total daily energy expenditure', 'tdee sedentary', 'maintenance tdee'],
    eyebrow: 'BMR × activity factor',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'bmr', type: 'uses-engine' },
      { toolId: 'calorie', type: 'next-decision' },
    ],
  },
  {
    id: 'bmr',
    path: '/health/bmr',
    title: 'BMR Calculator',
    shortTitle: 'BMR',
    description: 'Estimate adult Basal Metabolic Rate with the Mifflin–St Jeor equation. This is not a measured metabolic rate.',
    category: 'health',
    engine: BMR_ENGINE_ID,
    searchTerms: ['bmr calculator', 'basal metabolic rate calculator', 'mifflin st jeor', 'resting calorie estimate'],
    eyebrow: 'Estimated basal calories',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'tdee', type: 'next-decision' },
      { toolId: 'calorie', type: 'next-decision' },
    ],
  },
  {
    id: 'body-fat',
    path: '/health/body-fat',
    title: 'Body Fat Calculator',
    shortTitle: 'Body fat',
    description: 'Estimate body-fat percentage from neck, waist, and hip circumferences using the documented U.S. Navy method. Not a DEXA scan.',
    category: 'health',
    engine: BODY_FAT_ENGINE_ID,
    searchTerms: ['body fat calculator', 'body fat percentage calculator', 'navy body fat', 'circumference body fat'],
    eyebrow: 'Circumference estimate',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'bmi', type: 'sibling' },
      { toolId: 'bmr', type: 'sibling' },
    ],
  },
  {
    id: 'tip',
    path: '/everyday/tip',
    title: 'Tip Calculator',
    shortTitle: 'Tip',
    description: 'Tip amount, bill total, and an even per-person split from the subtotal and tip percent you enter.',
    category: 'everyday',
    engine: TIP_ENGINE_ID,
    searchTerms: ['tip calculator', 'gratuity calculator', 'split the bill', '20 percent tip', 'tip per person'],
    eyebrow: 'Tip and split',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percentage', type: 'uses-engine' },
      { toolId: 'unit-price', type: 'sibling' },
    ],
  },
  {
    id: 'age',
    path: '/everyday/age',
    title: 'Age Calculator',
    shortTitle: 'Age',
    description: 'Completed years, months, and days from a birth date to a selected as-of date, including leap-day rules.',
    category: 'everyday',
    engine: AGE_ENGINE_ID,
    searchTerms: ['age calculator', 'how old am I', 'exact age calculator', 'age in years months days'],
    eyebrow: 'Exact completed age',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'date', type: 'sibling' },
      { toolId: 'business-days', type: 'sibling' },
    ],
  },
  {
    id: 'time',
    path: '/everyday/time',
    title: 'Time Calculator',
    shortTitle: 'Time durations',
    description: 'Add or subtract hours, minutes, and seconds as durations. Negative results stay signed and normalized.',
    category: 'everyday',
    engine: TIME_ENGINE_ID,
    searchTerms: ['time calculator', 'add time', 'subtract time', 'hours minutes seconds calculator', 'duration calculator'],
    eyebrow: 'Duration arithmetic',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'time-card', type: 'sibling' },
      { toolId: 'date', type: 'sibling' },
    ],
  },
  {
    id: 'random-number',
    path: '/everyday/random-number',
    title: 'Random Number Generator',
    shortTitle: 'Random number',
    description: 'Generate one or more numbers in a range, including unique integers. Ordinary utility randomness, not a cryptographic tool.',
    category: 'everyday',
    engine: RANDOM_NUMBER_ENGINE_ID,
    searchTerms: ['random number generator', 'random number', 'rng calculator', 'random integer', 'pick a random number'],
    eyebrow: 'Numbers in a range',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percentage', type: 'sibling' },
      { toolId: 'scientific', type: 'sibling' },
    ],
  },
  {
    id: 'time-card',
    path: '/everyday/time-card',
    title: 'Time Card Calculator',
    shortTitle: 'Time card',
    description: 'Add shift start, end, and unpaid break across one or more days, including overnight shifts. Overtime law is not applied.',
    category: 'everyday',
    engine: TIME_CARD_ENGINE_ID,
    searchTerms: ['time card calculator', 'hours worked calculator', 'work hours calculator', 'calculate work hours', 'timesheet hours'],
    eyebrow: 'Hours after breaks',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'time', type: 'sibling' },
      { toolId: 'hourly-to-salary', type: 'next-decision' },
    ],
  },
  {
    id: 'date',
    path: '/everyday/date',
    title: 'Date Calculator',
    shortTitle: 'Date offset',
    description: 'Find the calendar date a given number of days, weeks, months, or years before or after another date. Month ends are clamped.',
    category: 'everyday',
    engine: DATE_ENGINE_ID,
    searchTerms: ['date calculator', 'add days to a date', 'date plus months', 'what date is 90 days from', 'calendar date offset'],
    eyebrow: 'Calendar date offset',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'days-from-today', type: 'sibling' },
      { toolId: 'business-days', type: 'sibling' },
      { toolId: 'age', type: 'sibling' },
    ],
  },
  {
    id: 'days-from-today',
    path: '/everyday/days-from-today',
    title: 'Days From Today Calculator',
    shortTitle: 'Days from today',
    description: 'The calendar date that is N days from today, or N days ago. Weekends still count; this is not business days.',
    category: 'everyday',
    engine: DAYS_FROM_TODAY_ENGINE_ID,
    searchTerms: ['days from today', 'date in x days', 'x days from now', '30 days from today', 'what day is 90 days from now'],
    eyebrow: 'Today plus N days',
    accent: 'rose',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'date', type: 'sibling' },
      { toolId: 'business-days', type: 'sibling' },
    ],
  },
  {
    id: 'percentage',
    path: '/math/percentage',
    title: 'Percentage Calculator',
    shortTitle: 'Percentage',
    description: 'What is X% of Y, X is what percent of Y, or X is Y% of what. Division by zero is rejected.',
    category: 'math',
    engine: PERCENTAGE_ENGINE_ID,
    searchTerms: ['percentage calculator', 'percent calculator', 'calculate percentage', 'what is 15 percent of 200', 'x is what percent of y'],
    eyebrow: 'Three percent questions',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 21, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percent-change', type: 'sibling' },
      { toolId: 'tip', type: 'next-decision' },
      { toolId: 'fraction', type: 'sibling' },
    ],
  },
  {
    id: 'percent-change',
    path: '/math/percent-change',
    title: 'Percent Change Calculator',
    shortTitle: 'Percent change',
    description: 'Percentage increase or decrease from an original value to a new value. A zero baseline is not defined.',
    category: 'math',
    engine: PERCENT_CHANGE_ENGINE_ID,
    searchTerms: ['percent change calculator', 'percentage increase', 'percentage decrease', 'percent difference from original'],
    eyebrow: 'Old value to new value',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percentage', type: 'sibling' },
      { toolId: 'inflation', type: 'next-decision' },
    ],
  },
  {
    id: 'scientific',
    path: '/math/scientific',
    title: 'Scientific Calculator',
    shortTitle: 'Scientific',
    description: 'Safe scientific arithmetic with a keypad: powers, roots, logs, and trig in degrees or radians. No JavaScript evaluation.',
    category: 'math',
    engine: SCIENTIFIC_ENGINE_ID,
    searchTerms: ['scientific calculator', 'online scientific calculator', 'sin cos tan calculator', 'log calculator'],
    eyebrow: 'Bounded expression parser',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percentage', type: 'sibling' },
      { toolId: 'fraction', type: 'sibling' },
    ],
  },
  {
    id: 'fraction',
    path: '/math/fraction',
    title: 'Fraction Calculator',
    shortTitle: 'Fractions',
    description: 'Add, subtract, multiply, divide, and simplify fractions with exact integer arithmetic, then show mixed and decimal forms.',
    category: 'math',
    engine: FRACTION_ENGINE_ID,
    searchTerms: ['fraction calculator', 'add fractions', 'simplify fraction', 'mixed number calculator', '1/2 plus 1/3'],
    eyebrow: 'Exact fraction arithmetic',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'percentage', type: 'sibling' },
      { toolId: 'scientific', type: 'sibling' },
    ],
  },
  {
    id: 'unit-conversion',
    path: '/math/unit-conversion',
    title: 'Unit Conversion Calculator',
    shortTitle: 'Unit conversion',
    description: 'Convert length, mass, volume, area, temperature, and speed through canonical base units. One general converter, not thousands of pair pages.',
    category: 'math',
    engine: CONVERSION_ENGINE_ID,
    searchTerms: ['unit converter', 'conversion calculator', 'measurement converter', 'inch to cm', 'celsius to fahrenheit'],
    eyebrow: 'Base-unit conversions',
    accent: 'violet',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 23, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'square-footage', type: 'next-decision' },
      { toolId: 'bmi', type: 'sibling' },
    ],
  },
  {
    id: 'grade',
    path: '/education/grade',
    title: 'Grade Calculator',
    shortTitle: 'Weighted grade',
    description: 'Weighted category or item grades from earned, possible, and weight. Any letter shown uses an assumed 90/80/70/60 scale.',
    category: 'education',
    engine: GRADE_ENGINE_ID,
    searchTerms: ['grade calculator', 'weighted grade calculator', 'final grade calculator', 'category weight grade'],
    eyebrow: 'Weighted course grade',
    accent: 'coral',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'gpa', type: 'next-decision' },
      { toolId: 'percentage', type: 'sibling' },
    ],
  },
  {
    id: 'gpa',
    path: '/education/gpa',
    title: 'GPA Calculator',
    shortTitle: 'GPA',
    description: 'GPA from courses, letter grades, and credit hours on a visible unweighted 4.0 convenience scale. Not every school’s policy.',
    category: 'education',
    engine: GPA_ENGINE_ID,
    searchTerms: ['gpa calculator', 'grade point average calculator', 'college gpa', '4.0 gpa calculator'],
    eyebrow: 'Credits × grade points',
    accent: 'coral',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'grade', type: 'sibling' },
      { toolId: 'percentage', type: 'sibling' },
    ],
  },
  {
    id: 'square-footage',
    path: '/home/square-footage',
    title: 'Square Footage Calculator',
    shortTitle: 'Square footage',
    description: 'Add rectangular rooms or spaces and get total area in square feet, with square meters from the shared conversion engine.',
    category: 'home',
    engine: SQUARE_FOOTAGE_ENGINE_ID,
    searchTerms: ['square footage calculator', 'square feet calculator', 'room area calculator', 'how many square feet'],
    eyebrow: 'Length × width, then total',
    accent: 'amber',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'concrete', type: 'next-decision' },
      { toolId: 'unit-conversion', type: 'uses-engine' },
    ],
  },
  {
    id: 'auto-loan',
    path: '/money/auto-loan',
    title: 'Auto Loan Calculator',
    shortTitle: 'Auto loan',
    description: 'Monthly vehicle loan payment, total interest, and amount financed. Not insurance, fuel, or the true cost of owning the car.',
    category: 'money',
    engine: AUTO_LOAN_ENGINE_ID,
    searchTerms: [
      'auto loan calculator',
      'car loan calculator',
      'car loan',
      'vehicle loan calculator',
      'car payment calculator',
      'monthly auto payment',
      'auto loan payment',
    ],
    eyebrow: 'Vehicle loan payment',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 10, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'car-affordability', type: 'next-decision' },
      { toolId: 'loan', type: 'uses-engine' },
      { toolId: 'amortization', type: 'sibling' },
    ],
  },
  {
    id: 'investment',
    path: '/money/investment',
    title: 'Investment Calculator',
    shortTitle: 'Investment',
    description: 'Project an initial amount plus recurring contributions under an assumed return. The return is an assumption, not a guarantee.',
    category: 'money',
    engine: INVESTMENT_ENGINE_ID,
    searchTerms: ['investment calculator', 'investment growth calculator', 'recurring investment calculator', 'assumed return calculator'],
    eyebrow: 'Contributions and assumed return',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'compound-interest', type: 'sibling' },
      { toolId: 'retirement', type: 'next-decision' },
      { toolId: 'inflation', type: 'sibling' },
    ],
  },
  {
    id: 'retirement',
    path: '/money/retirement',
    title: 'Retirement Calculator',
    shortTitle: 'Retirement',
    description: 'Project a retirement balance from current savings, contributions, and an assumed return, then compare it with a goal you type.',
    category: 'money',
    engine: RETIREMENT_ENGINE_ID,
    searchTerms: ['retirement calculator', 'retirement savings calculator', 'retirement projection', 'how much will I have at retirement'],
    eyebrow: 'Modeled balance at retirement',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: '401k', type: 'sibling' },
      { toolId: 'roth-ira', type: 'sibling' },
      { toolId: 'investment', type: 'uses-engine' },
    ],
  },
  {
    id: 'amortization',
    path: '/money/amortization',
    title: 'Amortization Calculator',
    shortTitle: 'Amortization',
    description: 'See principal, interest, and remaining balance by payment for a fixed-rate loan. The payment uses the same engine as the Loan Calculator.',
    category: 'money',
    engine: AMORTIZATION_ENGINE_ID,
    searchTerms: ['amortization calculator', 'amortization schedule', 'loan amortization table', 'principal vs interest schedule'],
    eyebrow: 'Schedule of principal and interest',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'loan', type: 'uses-engine' },
      { toolId: 'mortgage-payment', type: 'sibling' },
      { toolId: 'mortgage-payoff', type: 'next-decision' },
    ],
  },
  {
    id: 'cd',
    path: '/money/cd',
    title: 'CD Calculator',
    shortTitle: 'CD',
    description: 'Ending balance and interest on a certificate of deposit from the APY you enter. Not a live bank offer.',
    category: 'money',
    engine: CD_ENGINE_ID,
    searchTerms: ['cd calculator', 'certificate of deposit calculator', 'cd apy calculator', 'cd interest'],
    eyebrow: 'APY you type, not a quote',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'interest', type: 'sibling' },
      { toolId: 'compound-interest', type: 'sibling' },
    ],
  },
  {
    id: 'interest',
    path: '/money/interest',
    title: 'Interest Calculator',
    shortTitle: 'Simple interest',
    description: 'Simple interest: principal × annual rate × time. For compounding or recurring deposits, use the dedicated calculators.',
    category: 'money',
    engine: INTEREST_ENGINE_ID,
    searchTerms: ['interest calculator', 'simple interest calculator', 'simple interest', 'principal times rate times time'],
    eyebrow: 'Simple interest only',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 16, uniqueDataOrFunction: 21, answerDepth: 13, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'compound-interest', type: 'next-decision' },
      { toolId: 'cd', type: 'sibling' },
    ],
  },
  {
    id: 'roth-ira',
    path: '/money/roth-ira',
    title: 'Roth IRA Calculator',
    shortTitle: 'Roth IRA',
    description: 'Project Roth IRA contribution growth under an assumed return. This does not determine MAGI eligibility.',
    category: 'money',
    engine: ROTH_IRA_ENGINE_ID,
    searchTerms: ['roth ira calculator', 'roth ira growth', 'roth contribution calculator', 'ira projection'],
    eyebrow: 'Roth contribution growth',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: '401k', type: 'sibling' },
      { toolId: 'retirement', type: 'next-decision' },
    ],
  },
  {
    id: '401k',
    path: '/money/401k',
    title: '401(k) Calculator',
    shortTitle: '401(k)',
    description: 'Project employee deferrals and a simple employer match over time at an assumed return. Catch-up and eligibility rules are not modeled.',
    category: 'money',
    engine: K401_ENGINE_ID,
    searchTerms: ['401k calculator', '401(k) calculator', 'employer match calculator', '401k contribution growth'],
    eyebrow: 'Deferral plus employer match',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'roth-ira', type: 'sibling' },
      { toolId: 'retirement', type: 'next-decision' },
      { toolId: 'salary-after-tax', type: 'sibling' },
    ],
  },
  {
    id: 'mortgage-payoff',
    path: '/money/mortgage-payoff',
    title: 'Mortgage Payoff Calculator',
    shortTitle: 'Mortgage payoff',
    description: 'See how extra principal changes the remaining payoff date and interest on the current mortgage balance.',
    category: 'money',
    engine: MORTGAGE_PAYOFF_ENGINE_ID,
    searchTerms: ['mortgage payoff calculator', 'pay off mortgage early', 'extra principal mortgage', 'mortgage interest saved'],
    eyebrow: 'Extra principal vs remaining interest',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 17, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'mortgage-payment', type: 'uses-engine' },
      { toolId: 'amortization', type: 'sibling' },
    ],
  },
  {
    id: 'credit-card-payoff',
    path: '/money/credit-card-payoff',
    title: 'Credit Card Payoff Calculator',
    shortTitle: 'Credit card payoff',
    description: 'Months and interest to pay off one credit-card balance at a stated monthly payment, or the payment needed for a target payoff time.',
    category: 'money',
    engine: CREDIT_CARD_PAYOFF_ENGINE_ID,
    searchTerms: ['credit card payoff calculator', 'credit card interest calculator', 'pay off credit card', 'credit card payment calculator'],
    eyebrow: 'One revolving balance',
    accent: 'mint',
    featured: true,
    indexability: launchIndexability({ searchIntentEvidence: 18, uniqueDataOrFunction: 22, answerDepth: 14, provenanceAndFreshness: 10, internalLinkValue: 9, mobileAndPerformance: 9, maintenanceConfidence: 5 }, 'not-required'),
    relationships: [
      { toolId: 'debt-payoff', type: 'next-decision' },
      { toolId: 'loan', type: 'sibling' },
    ],
  },
];

const toolById = new Map(tools.map((tool) => [tool.id, tool]));

export function assertToolRegistryIntegrity(): void {
  if (toolById.size !== tools.length) throw new Error('Tool registry contains duplicate IDs.');
  if (new Set(tools.map((tool) => tool.path)).size !== tools.length) throw new Error('Tool registry contains duplicate paths.');
  for (const tool of tools) {
    const targets = new Set<string>();
    for (const relationship of tool.relationships) {
      if (relationship.toolId === tool.id) throw new Error(`${tool.id} cannot relate to itself.`);
      if (!toolById.has(relationship.toolId)) throw new Error(`${tool.id} points to unknown tool ${relationship.toolId}.`);
      if (targets.has(relationship.toolId)) throw new Error(`${tool.id} repeats relationship target ${relationship.toolId}.`);
      targets.add(relationship.toolId);
    }
  }
}

assertToolRegistryIntegrity();

export function getTool(id: string): ToolDefinition {
  const tool = toolById.get(id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export function getToolsByCategory(category: CategoryId): ToolDefinition[] {
  return tools.filter((tool) => tool.category === category);
}

export function getRelatedTools(tool: ToolDefinition): ToolDefinition[] {
  return tool.relationships
    .map((relationship) => toolById.get(relationship.toolId))
    .filter((candidate): candidate is ToolDefinition => Boolean(candidate));
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId);
}

export function getToolQualityScore(tool: ToolDefinition): number {
  return Object.values(tool.indexability.scores).reduce((total, score) => total + score, 0);
}

export function evaluateToolIndexability(
  tool: ToolDefinition,
  asOfDate = PUBLISHING_SNAPSHOT_DATE,
): { indexable: boolean; score: number; reasons: string[] } {
  const score = getToolQualityScore(tool);
  const reasons: string[] = [];
  const maximumScores: Record<keyof IndexabilityEvidence['scores'], number> = {
    searchIntentEvidence: 20,
    uniqueDataOrFunction: 25,
    answerDepth: 15,
    provenanceAndFreshness: 15,
    internalLinkValue: 10,
    mobileAndPerformance: 10,
    maintenanceConfidence: 5,
  };
  for (const [dimension, value] of Object.entries(tool.indexability.scores) as Array<[keyof IndexabilityEvidence['scores'], number]>) {
    if (!Number.isInteger(value) || value < 0 || value > maximumScores[dimension]) {
      reasons.push(`${dimension} must be an integer from 0 to ${maximumScores[dimension]}.`);
    }
  }
  const failedGates = Object.entries(tool.indexability.hardGates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => gate);
  if (failedGates.length > 0) reasons.push(`Failed hard gates: ${failedGates.join(', ')}`);
  if (score < 75) reasons.push(`Quality score ${score} is below 75.`);
  if (tool.indexability.scores.uniqueDataOrFunction < 15) reasons.push('Unique data/function score is below 15.');
  if (tool.indexability.scores.provenanceAndFreshness < 10) reasons.push('Provenance/freshness score is below 10.');
  if (tool.indexability.provenanceStatus === 'not-required' && tool.indexability.scores.provenanceAndFreshness > 10) {
    reasons.push('A provenance/freshness score above 10 requires verified provenance.');
  }
  const reviewedAt = parsePublishingDate(tool.indexability.reviewedAt);
  const reviewValidUntil = parsePublishingDate(tool.indexability.reviewValidUntil);
  const asOf = parsePublishingDate(asOfDate);
  if (
    reviewedAt === null
    || reviewValidUntil === null
    || reviewValidUntil < reviewedAt
    || (reviewValidUntil - reviewedAt) / 86_400_000 > 400
  ) {
    reasons.push('Indexability review dates are invalid or cover more than 400 days.');
  }
  if (asOf === null || reviewedAt === null || reviewValidUntil === null || asOf < reviewedAt || asOf > reviewValidUntil) {
    reasons.push('Indexability review is not valid on the versioned publishing date.');
  }
  const validRelationshipTargets = new Set(tool.relationships
    .filter((relationship) => relationship.toolId !== tool.id && toolById.has(relationship.toolId))
    .map((relationship) => relationship.toolId));
  if (validRelationshipTargets.size < 2) reasons.push('At least two valid, distinct internal relationships are required.');
  return { indexable: reasons.length === 0, score, reasons };
}

export function isCategoryHubIndexable(category: CategoryId): boolean {
  return getToolsByCategory(category).filter((tool) => evaluateToolIndexability(tool).indexable).length >= 2;
}
