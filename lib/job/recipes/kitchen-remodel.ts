import type { JobRecipe } from '../types';
import { BUSINESS_RATES, REVIEWED_AT, REVIEWED_BY, SHARED_SOURCES, opt, sv } from './common';

const hours: JobRecipe['sources'][string] = {
  kind: 'model_assumption',
  rationale: '80 hours of mixed-trade crew time for a same-layout kitchen: hang stock cabinets, set a drop-in sink, lay ceramic floor tile, and paint. Countertops and appliances are not in this recipe. Composite recipes cannot be high confidence.',
  confidenceImpact: 'lowers_to_low',
  reviewedBy: REVIEWED_BY,
  reviewedAt: REVIEWED_AT,
};

export const kitchenRemodel: JobRecipe = {
  jobId: 'kitchen-remodel',
  version: '1.0.0',
  unit: 'each',
  trade: 'multi',
  crew: [
    { socCode: '47-2031', role: 'Carpenters', count: sv(1.2, 'crew') },
    { socCode: '47-2152', role: 'Plumbers', count: sv(0.5, 'crew') },
    { socCode: '47-2044', role: 'Tile and stone setters', count: sv(0.6, 'crew') },
    { socCode: '47-2141', role: 'Painters', count: sv(0.5, 'crew') },
  ],
  laborHoursPerUnit: sv(80, 'hours'),
  materials: [
    { componentId: 'kitchen-base-cabinet', quantityPerUnit: sv(8, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'kitchen-wall-cabinet', quantityPerUnit: sv(6, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'kitchen-sink', quantityPerUnit: sv(1, 'qty'), wastePercent: sv(0, 'qty'), critical: true },
    { componentId: 'bath-tile', quantityPerUnit: sv(120, 'qty'), wastePercent: sv(0.12, 'waste'), critical: true },
    { componentId: 'interior-paint', quantityPerUnit: sv(3, 'qty'), wastePercent: sv(0.05, 'waste'), critical: false },
  ],
  equipment: [{ rateId: '8801', hoursPerUnit: sv(10, 'equip-hours'), label: 'Pickup truck' }],
  permit: { kind: 'excluded', note: 'Plumbing and building permits are not included.' },
  disposal: { kind: 'excluded', note: 'Demo dumpster is not included.' },
  modifiers: [
    { id: 'size', label: 'Size', defaultOptionId: 'standard', options: [opt('small', 'Small galley', 0.78, 'named'), opt('standard', 'Standard (~10×12)', 1, 'identity'), opt('large', 'Large / with island run', 1.32, 'named')] },
    { id: 'finish', label: 'Cabinet finish', defaultOptionId: 'stock', options: [opt('stock', 'Stock shaker', 1, 'identity'), opt('mid', 'Mid upgrade', 1.2, 'named')] },
    { id: 'layout', label: 'Layout', defaultOptionId: 'same', options: [opt('same', 'Same layout', 1, 'identity'), opt('move', 'Move plumbing', 1.4, 'named', true)] },
  ],
  ...BUSINESS_RATES,
  baseConfidence: 'low',
  sources: {
    ...SHARED_SOURCES,
    hours,
    qty: {
      kind: 'model_assumption',
      rationale: 'One standard kitchen uses eight Hampton Bay 30-inch base cabinets, six wall cabinets, one drop-in sink, about 120 sq ft of ceramic floor tile, and three gallons of interior paint. Countertops, appliances, and faucets are not priced. Size modifiers scale the modeled total.',
      confidenceImpact: 'none',
      reviewedBy: REVIEWED_BY,
      reviewedAt: REVIEWED_AT,
    },
    waste: { kind: 'model_assumption', rationale: '12% tile waste; 5% paint waste.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
    'equip-hours': hours,
    named: { kind: 'model_assumption', rationale: 'Named site modifiers scale the modeled total.', confidenceImpact: 'lowers_to_medium', reviewedBy: REVIEWED_BY, reviewedAt: REVIEWED_AT },
  },
};
