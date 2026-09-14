/**
 * What a contractor's business costs add to a job, observed rather than assumed.
 *
 * Direct cost — crew hours at a loaded wage, materials, equipment — is not what
 * a homeowner is quoted. Between the two sit the office, the truck fleet's
 * depreciation, the estimator who came out to measure, licensing, insurance and
 * the profit the firm needs to exist. The engine used to price all of that with
 * two numbers we chose (12% overhead, then a 20% markup) and applied the same
 * pair to a painter and a concrete crew.
 *
 * The 2022 Economic Census asks every construction establishment what it took
 * in and what it spent, by trade. The gap between direct cost and the value of
 * work sold is therefore measurable, and it is not flat: 1.41× on poured
 * concrete, 1.65× on painting. The flat 1.34× the recipes used was below every
 * trade in the file, which means the engine was under-pricing every job it
 * priced, most severely the labour-heavy ones.
 *
 * A job whose trade the census does not describe keeps the recipe's assumption
 * and says so. Tree removal is the one in this catalogue: arborists are
 * landscaping services, and that sector's census file reports revenue and
 * payroll but not materials, hours or benefits, so the residual cannot be
 * computed the same way and is not guessed at from a neighbouring industry.
 */
import type { JobId } from './catalog';
import type { CensusConstructionSnapshot, JobRecipe, NamedMoneyStep } from './types';

export type IndustryMapping = {
  naics: string;
  /** Why this industry, when the match is not exact. */
  note?: string;
};

/**
 * Job to census industry.
 *
 * Exhaustive by construction: a new job cannot ship without someone deciding
 * whether the census describes its trade, which is the decision that matters.
 * `null` is a legitimate answer and keeps the modelled rate.
 */
export const JOB_INDUSTRY: Record<JobId, IndustryMapping | null> = {
  'hvac-replacement': { naics: '238220' },
  'heat-pump-replacement': { naics: '238220' },
  'water-heater-replacement': { naics: '238220' },
  'electrical-panel-upgrade': { naics: '238210' },
  'window-replacement': { naics: '238150' },
  'exterior-door-replacement': {
    naics: '238350',
    note: 'Door hanging is finish carpentry work; there is no door-replacement industry of its own.',
  },
  'siding-replacement': { naics: '238170' },
  'drywall-install': { naics: '238310' },
  'interior-painting': { naics: '238320' },
  'bathroom-remodel': {
    naics: '236118',
    note: 'A bathroom remodel crosses plumbing, electrical, tile and carpentry, which is what the residential remodelers industry is.',
  },
  'kitchen-remodel': {
    naics: '236118',
    note: 'A kitchen cabinet and finish refresh is residential remodeling work under the same census industry as bathroom remodels.',
  },
  'concrete-driveway': {
    naics: '238110',
    note: 'Poured concrete contractors form, place and finish the slab this recipe prices. Census files residential driveway paving under all other specialty trade contractors instead, whose business cost is higher (1.533× against 1.418×), so this mapping takes the lower of the two.',
  },
  'deck-build': {
    naics: '238990',
    note: 'Deck building is not a named census industry; all other specialty trade contractors is the residual aggregate it falls into.',
  },
  'fence-install': {
    naics: '238990',
    note: 'Census lists fence installation under all other specialty trade contractors.',
  },
  'tree-removal': null,
};

export type BusinessRates = {
  source: 'census-observed' | 'recipe-modeled';
  /** Multiply direct cost by this to reach the price before named modifiers. */
  multiplier: number;
  overhead: NamedMoneyStep;
  profit: NamedMoneyStep;
  /** Null when the observed multiplier already carries the trade's own risk pricing. */
  contingencyRate: number | null;
  /** Reasons that belong in the estimate's confidence explanation. */
  notes: string[];
  snapshotId: string | null;
};

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * The observed shares are shares *of price*, so they cannot be multiplied onto
 * direct cost directly. Direct is `directShare` of the price; the price is
 * therefore `direct / directShare`, and overhead and profit are their own
 * shares of that price. Dividing rather than marking up is the whole difference
 * between a 33.5% margin and a 33.5% markup, which on a $10,000 direct cost is
 * $1,700.
 */
export function priceBusinessCost(input: {
  recipe: JobRecipe;
  jobId: JobId;
  directCents: number;
  census: CensusConstructionSnapshot | null;
}): BusinessRates {
  const mapping = JOB_INDUSTRY[input.jobId];
  const industry = mapping && input.census
    ? input.census.industries.find((row) => row.naics === mapping.naics)
    : undefined;

  if (mapping && industry) {
    const priceCents = Math.round(input.directCents / industry.directShare);
    /*
     * Overhead is rounded and profit takes the remainder, so the two named
     * lines and the direct cost add to exactly the price the shares imply.
     * The floor matters only for a direct cost of a few cents, where rounding
     * could otherwise print a negative profit line.
     */
    const overheadCents = Math.min(
      Math.max(0, Math.round(priceCents * industry.overheadShare)),
      Math.max(0, priceCents - input.directCents),
    );
    const profitCents = Math.max(0, priceCents - input.directCents - overheadCents);
    return {
      source: 'census-observed',
      multiplier: industry.directToPriceMultiplier,
      overhead: {
        id: 'overhead',
        label: 'Contractor overhead',
        cents: overheadCents,
        detail: `${percent(industry.overheadShare)} of price — office payroll, depreciation, insurance, licensing and other operating costs reported by ${industry.label.toLowerCase()} (${input.census?.observationPeriod} Economic Census).`,
      },
      profit: {
        id: 'profit-markup',
        label: 'Contractor profit',
        cents: profitCents,
        detail: `${percent(industry.profitShare)} of price — what is left for ${industry.label.toLowerCase()} after every cost the census enumerates. A residual, not a reported margin.`,
      },
      contingencyRate: null,
      notes: [
        `Overhead and profit are the observed ${input.census?.observationPeriod} shares for ${industry.label.toLowerCase()}, not a CostAnswer assumption.`,
        ...(mapping.note ? [mapping.note] : []),
        'Scope uncertainty widens the range rather than being added to the expected figure, because the observed share already reflects how contractors price risk on average.',
      ],
      snapshotId: input.census?.snapshotId ?? null,
    };
  }

  const overheadCents = Math.round(input.directCents * input.recipe.overheadRate.value);
  const subtotalCents = input.directCents + overheadCents;
  const profitCents = Math.round(subtotalCents * input.recipe.profitMarkupRate.value);
  return {
    source: 'recipe-modeled',
    multiplier: (subtotalCents + profitCents) / Math.max(input.directCents, 1),
    overhead: {
      id: 'overhead',
      label: 'Business overhead',
      cents: overheadCents,
      detail: `${(input.recipe.overheadRate.value * 100).toFixed(0)}% of direct cost, a CostAnswer assumption. Does not re-include ECEC labor burden.`,
    },
    profit: {
      id: 'profit-markup',
      label: 'Profit markup',
      cents: profitCents,
      detail: `${(input.recipe.profitMarkupRate.value * 100).toFixed(0)}% markup on (direct + overhead), a CostAnswer assumption. Markup on cost, not a margin on the selling price.`,
    },
    contingencyRate: input.recipe.contingencyRate.value,
    notes: mapping
      ? ['The observed cost structure for this trade is not in the loaded census snapshot, so the modelled overhead and markup are used.']
      : ['No census construction industry describes this trade, so overhead and profit stay CostAnswer assumptions.'],
    snapshotId: null,
  };
}
