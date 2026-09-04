/**
 * Topic definitions, split out from the tool registry.
 *
 * The header, footer, and topic art need only these nine categories, while the
 * registry carries every tool's copy, relationships, and indexability evidence.
 * Keeping them apart is what stops that whole table from being bundled into the
 * client on every page — only the search page, which searches it, pulls it in.
 */
export const CATEGORY_IDS = ['money', 'home', 'car', 'everyday', 'food', 'shopping', 'health', 'math', 'education'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Header stays at the original six categories. Health, math, and education are in the footer, homepage strip, and topic hubs. */
export const HEADER_CATEGORY_IDS: readonly CategoryId[] = ['money', 'home', 'car', 'everyday', 'food', 'shopping'];

export type CategoryAccent = 'mint' | 'amber' | 'blue' | 'rose' | 'violet' | 'coral';

export const categories: Record<CategoryId, { name: string; description: string; blurb: string; accent: CategoryAccent }> = {
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
  car: {
    name: 'Car',
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
