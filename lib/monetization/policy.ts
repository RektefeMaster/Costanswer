/**
 * Which pages may carry which commercial modules.
 *
 * Data, not logic. Eligibility is never inferred from a keyword, a category or
 * a URL pattern, because inference is how a site ends up with a lead form under
 * a BMI calculator: nobody decided it, a rule matched. Every entry here was
 * written on purpose, and a calculator with no entry gets the conservative
 * default — ads only, no lead capture, no affiliate offers.
 *
 * Section 6 of the monetization brief asks for exactly this and it is worth
 * restating why: at 101 calculators a wrong default is 101 wrong pages, and the
 * ones that would be wrong are the health, tax and financial pages where being
 * wrong costs the most.
 */
import type { MonetizationVertical, RiskClass } from './context';

export type AffiliateCategoryId =
  | 'concrete_tools' | 'masonry' | 'measuring_tools' | 'paint_supplies' | 'flooring_tools'
  | 'roofing_tools' | 'plumbing_tools' | 'electrical_tools' | 'hvac_filters' | 'tile_tools'
  | 'fencing_materials' | 'deck_materials' | 'kitchen_scales' | 'ev_charging' | 'car_care'
  | 'home_energy' | 'bathroom_tools';

export type LeadVerticalId =
  | 'roofing' | 'hvac' | 'plumbing' | 'electrical' | 'windows' | 'flooring' | 'painting'
  | 'bath_remodeling' | 'kitchen_remodeling' | 'general_remodeling' | 'concrete_driveway'
  | 'fencing' | 'decking' | 'tree_service' | 'garage_doors' | 'restoration' | 'pest_control';

export type MonetizationPolicy = {
  readonly pageId: string;
  readonly vertical: MonetizationVertical;
  readonly riskClass: RiskClass;
  readonly ads: { readonly enabled: boolean };
  readonly affiliate: {
    readonly enabled: boolean;
    readonly categories: readonly AffiliateCategoryId[];
  };
  readonly lead: {
    readonly enabled: boolean;
    readonly vertical?: LeadVerticalId;
  };
  /** Show the hire/DIY/researching switch. Only where both paths genuinely exist. */
  readonly intentSwitch: boolean;
};

const NO_AFFILIATE = { enabled: false, categories: [] } as const;
const NO_LEAD = { enabled: false } as const;

function policy(
  pageId: string,
  vertical: MonetizationVertical,
  riskClass: RiskClass,
  overrides: Partial<Omit<MonetizationPolicy, 'pageId' | 'vertical' | 'riskClass'>> = {},
): MonetizationPolicy {
  return Object.freeze({
    pageId,
    vertical,
    riskClass,
    ads: overrides.ads ?? { enabled: riskClass !== 'restricted' },
    affiliate: overrides.affiliate ?? NO_AFFILIATE,
    lead: overrides.lead ?? NO_LEAD,
    intentSwitch: overrides.intentSwitch ?? false,
  });
}

/**
 * The conservative default for anything not listed.
 *
 * Ads on, everything else off. Advertising eligibility can follow a page-type
 * policy — the brief allows that — but lead capture and affiliate offers are
 * per-page decisions and stay off until someone makes one.
 */
export const DEFAULT_POLICY: MonetizationPolicy = policy('__default__', 'general', 'low');

/**
 * Pages where no commercial module of any kind may render.
 *
 * Health estimates are `restricted` rather than `high`: BMI and body fat are
 * pages people arrive at feeling bad about themselves, and the site's answer to
 * that should not be adjacent to something being sold. Legal and privacy pages
 * are restricted because a compensation disclosure that itself carries an ad is
 * not a disclosure.
 */
const RESTRICTED_PAGES = [
  'bmi', 'bmr', 'tdee', 'calorie', 'body-fat',
] as const;

const RESTRICTED_ROUTES = ['/privacy', '/terms', '/disclosure', '/contact', '/methodology', '/methodology/data'];

export const MONETIZATION_POLICIES: readonly MonetizationPolicy[] = Object.freeze([
  // ---- Health: restricted. No ads, no affiliate, no leads. ----
  ...RESTRICTED_PAGES.map((id) => policy(id, 'health', 'restricted')),

  // ---- Home projects: the real DIY affiliate surface that exists today. ----
  policy('concrete', 'diy', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['concrete_tools', 'masonry', 'measuring_tools'] },
    // Concrete flatwork is a genuine home-services vertical, but the lead
    // campaign stays off until a provider is approved for it. The entry exists
    // so enabling it is configuration, not a code change.
    lead: { enabled: false, vertical: 'concrete_driveway' },
    intentSwitch: true,
  }),
  policy('square-footage', 'diy', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['measuring_tools', 'flooring_tools'] },
  }),
  policy('electricity-cost', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['home_energy'] },
  }),
  policy('appliance-electricity', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['home_energy'] },
  }),

  // ---- Vehicle: consumer goods only. No automotive lead campaigns at launch. ----
  policy('ev-vs-gas', 'automotive', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['ev_charging'] },
  }),
  policy('road-trip-fuel', 'travel', 'low', { ads: { enabled: true } }),
  policy('car-affordability', 'automotive', 'medium', { ads: { enabled: true } }),
  policy('auto-coverage', 'insurance', 'high', { ads: { enabled: true } }),

  // ---- Financial: ads only. Section 42 keeps lead generation off here. ----
  ...(['hourly-to-salary', 'salary-after-tax', 'paycheck', 'bonus-tax', 'effective-tax-rate',
    'federal-tax-bracket', 'self-employment-tax', 'eitc', 'child-tax-credit', 'capital-gains',
    'quarterly-estimated-tax', 'tax-refund', 'mortgage-payment',
    'loan', 'compound-interest', 'debt-payoff', 'inflation', 'home-affordability',
    'cost-of-living', 'car-loan', 'investment', 'retirement', 'amortization', 'cd',
    'interest', 'roth-ira', '401k', 'refinance', 'mortgage-payoff', 'credit-card-payoff',
  ] as const).map((id) => policy(id, 'financial', 'high', { ads: { enabled: true } })),

  // ---- Insurance and health coverage: high risk, ads only. ----
  ...(['insurance-cost', 'health-insurance', 'marketplace-plans', 'medicare-cost'] as const)
    .map((id) => policy(id, 'insurance', 'high', { ads: { enabled: true } })),

  // ---- Everything else: general, ads only. ----
  ...(['per-diem', 'business-days', 'tip', 'age', 'time', 'random-number', 'time-card',
    'date', 'days-from-today', 'unit-price', 'where-cheaper', 'recipe-scaler',
    'percentage', 'percent-change', 'scientific', 'fraction', 'unit-conversion',
    'grade', 'gpa',
  ] as const).map((id) => policy(id, 'general', 'low')),

  // ---- Job Cost Engine. One entry per published surface. Enabling a lead   ----
  // ---- campaign is configuration, never a calculator change.               ----
  policy('job-cost-hub', 'home_services', 'low', { ads: { enabled: true } }),
  policy('job-cost-estimate', 'home_services', 'low', { ads: { enabled: true } }),
  policy('job-quote-check', 'home_services', 'low', { ads: { enabled: true } }),
  policy('job-hvac-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['hvac_filters'] },
    lead: { enabled: false, vertical: 'hvac' },
    intentSwitch: true,
  }),
  policy('job-water-heater-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['plumbing_tools'] },
    lead: { enabled: false, vertical: 'plumbing' },
    intentSwitch: true,
  }),
  policy('job-electrical-panel-upgrade', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['electrical_tools'] },
    lead: { enabled: false, vertical: 'electrical' },
    intentSwitch: true,
  }),
  policy('job-tree-removal', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: NO_AFFILIATE,
    lead: { enabled: false, vertical: 'tree_service' },
    intentSwitch: false,
  }),
  policy('job-deck-build', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['deck_materials'] },
    lead: { enabled: false, vertical: 'decking' },
    intentSwitch: true,
  }),
  policy('job-fence-install', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['fencing_materials'] },
    lead: { enabled: false, vertical: 'fencing' },
    intentSwitch: true,
  }),
  policy('job-concrete-driveway', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['concrete_tools', 'masonry'] },
    lead: { enabled: false, vertical: 'concrete_driveway' },
    intentSwitch: true,
  }),
  policy('job-interior-painting', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['paint_supplies'] },
    lead: { enabled: false, vertical: 'painting' },
    intentSwitch: true,
  }),
  policy('job-bathroom-remodel', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['bathroom_tools', 'tile_tools'] },
    lead: { enabled: false, vertical: 'bath_remodeling' },
    intentSwitch: true,
  }),
  policy('job-heat-pump-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['hvac_filters'] },
    lead: { enabled: false, vertical: 'hvac' },
    intentSwitch: true,
  }),
  policy('job-window-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['measuring_tools'] },
    lead: { enabled: false, vertical: 'windows' },
    intentSwitch: true,
  }),
  policy('job-exterior-door-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['measuring_tools'] },
    lead: { enabled: false, vertical: 'general_remodeling' },
    intentSwitch: true,
  }),
  policy('job-siding-replacement', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['measuring_tools'] },
    lead: { enabled: false, vertical: 'general_remodeling' },
    intentSwitch: true,
  }),
  policy('job-drywall-install', 'home_services', 'low', {
    ads: { enabled: true },
    affiliate: { enabled: true, categories: ['measuring_tools'] },
    lead: { enabled: false, vertical: 'general_remodeling' },
    intentSwitch: true,
  }),
]);

const byPageId = new Map(MONETIZATION_POLICIES.map((entry) => [entry.pageId, entry]));

export function getMonetizationPolicy(pageId: string): MonetizationPolicy {
  return byPageId.get(pageId) ?? DEFAULT_POLICY;
}

export function isRestrictedRoute(path: string): boolean {
  return RESTRICTED_ROUTES.includes(path);
}

export function listPoliciesWithLeadVertical(): MonetizationPolicy[] {
  return MONETIZATION_POLICIES.filter((entry) => entry.lead.vertical !== undefined);
}

/**
 * Every policy is written once.
 *
 * Called from the tests rather than at module load — a duplicate is a
 * publication defect to catch before release, not a crash on a live page.
 */
export function assertPoliciesAreUnique(): void {
  const seen = new Set<string>();
  for (const entry of MONETIZATION_POLICIES) {
    if (seen.has(entry.pageId)) throw new Error(`Duplicate monetization policy for ${entry.pageId}.`);
    seen.add(entry.pageId);
  }
}
