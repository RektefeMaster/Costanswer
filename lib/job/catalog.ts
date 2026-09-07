export const JOB_IDS = [
  'hvac-replacement',
  'water-heater-replacement',
  'electrical-panel-upgrade',
  'tree-removal',
  'deck-build',
  'fence-install',
  'concrete-driveway',
  'interior-painting',
  'bathroom-remodel',
  'heat-pump-replacement',
  'window-replacement',
  'exterior-door-replacement',
  'siding-replacement',
  'drywall-install',
] as const;

export type JobId = (typeof JOB_IDS)[number];

export type ScopeField = {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
};

export type PublicModifierOption = {
  id: string;
  label: string;
};

export type PublicModifier = {
  id: string;
  label: string;
  options: PublicModifierOption[];
  defaultOptionId: string;
};

export type JobPublicMeta = {
  jobId: JobId;
  title: string;
  shortTitle: string;
  description: string;
  tradeLabel: string;
  unitLabel: string;
  scope: ScopeField;
  intakeFields?: ScopeField[];
  modifiers: PublicModifier[];
  searchTerms: string[];
};

export const COST_RESERVED_SEGMENTS = ['estimate', 'check-quote'] as const;

export const JOB_CATALOG: Record<JobId, JobPublicMeta> = {
  'hvac-replacement': {
    jobId: 'hvac-replacement',
    title: 'HVAC replacement cost',
    shortTitle: 'HVAC replacement',
    description: 'A CostAnswer estimated range for replacing a residential split system (outdoor AC plus indoor furnace/air handler), using HVAC mechanic wages and named crew time.',
    tradeLabel: 'HVAC',
    unitLabel: 'systems',
    scope: { id: 'units', label: 'Systems', hint: 'Count complete outdoor + indoor replacements. One typical house is one system.', min: 1, max: 4, step: 1, defaultValue: 1 },
    intakeFields: [
      { id: 'units', label: 'Systems', hint: 'Count complete outdoor + indoor replacements. One typical house is one system.', min: 1, max: 4, step: 1, defaultValue: 1, suffix: 'systems' },
      { id: 'tons', label: 'System size', hint: 'Nameplate cooling tons. Equipment dollars scale from EIA’s 3-ton baseline. Labor hours stay per system.', min: 1.5, max: 5, step: 0.5, defaultValue: 3, suffix: 'tons' },
    ],
    modifiers: [
      { id: 'efficiency', label: 'Equipment tier', defaultOptionId: 'standard', options: [{ id: 'standard', label: 'Standard efficiency' }, { id: 'high', label: 'High efficiency' }] },
      { id: 'ducts', label: 'Ductwork', defaultOptionId: 'reuse', options: [{ id: 'reuse', label: 'Reuse existing ducts' }, { id: 'revise', label: 'Revise or add ducts' }] },
      { id: 'access', label: 'Install access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Crawlspace, attic, or tight mechanical room' }] },
    ],
    searchTerms: ['hvac replacement cost', 'ac replacement cost', 'new furnace and ac cost'],
  },
  'water-heater-replacement': {
    jobId: 'water-heater-replacement',
    title: 'Water heater replacement cost',
    shortTitle: 'Water heater',
    description: 'A CostAnswer estimated range for swapping a residential tank water heater, using plumber wages and named install time. Equipment is EIA’s typical 40-gallon gas or 36-gallon electric tank.',
    tradeLabel: 'Plumbing',
    unitLabel: 'heaters',
    scope: { id: 'units', label: 'Water heaters', hint: 'Most homes replace one tank. Gas is modeled as EIA’s typical 40-gallon tank; electric as the typical 36-gallon tank.', min: 1, max: 3, step: 1, defaultValue: 1 },
    modifiers: [
      { id: 'fuel', label: 'Fuel', defaultOptionId: 'gas', options: [{ id: 'gas', label: 'Natural gas' }, { id: 'electric', label: 'Electric' }] },
      { id: 'location', label: 'Location', defaultOptionId: 'garage', options: [{ id: 'garage', label: 'Garage or utility room' }, { id: 'attic', label: 'Attic or tight closet' }] },
      { id: 'code', label: 'Code upgrades', defaultOptionId: 'like-for-like', options: [{ id: 'like-for-like', label: 'Like-for-like swap' }, { id: 'upgrades', label: 'Pan, expansion tank, or venting upgrades' }] },
    ],
    searchTerms: ['water heater replacement cost', 'new water heater cost', 'install water heater'],
  },
  'electrical-panel-upgrade': {
    jobId: 'electrical-panel-upgrade',
    title: 'Electrical panel upgrade cost',
    shortTitle: 'Panel upgrade',
    description: 'A CostAnswer estimated range for a residential service panel upgrade, using electrician wages and named crew time.',
    tradeLabel: 'Electrical',
    unitLabel: 'panels',
    scope: { id: 'units', label: 'Panels', hint: 'One main panel is typical. Count subpanels separately only if they are part of this job.', min: 1, max: 2, step: 1, defaultValue: 1 },
    modifiers: [
      { id: 'service', label: 'Service size', defaultOptionId: 'to-200', options: [{ id: 'to-200', label: 'Upgrade to 200 amp' }, { id: 'same', label: 'Replace like-for-like' }] },
      { id: 'location', label: 'Panel location', defaultOptionId: 'easy', options: [{ id: 'easy', label: 'Accessible interior or exterior' }, { id: 'hard', label: 'Finished wall or long feeder run' }] },
    ],
    searchTerms: ['electrical panel upgrade cost', '200 amp panel cost', 'breaker box replacement'],
  },
  'tree-removal': {
    jobId: 'tree-removal',
    title: 'Tree removal cost',
    shortTitle: 'Tree removal',
    description: 'A CostAnswer estimated range for removing one tree, using tree-trimmer wages and FEMA equipment cost proxies.',
    tradeLabel: 'Tree work',
    unitLabel: 'trees',
    scope: { id: 'units', label: 'Trees', hint: 'Count trees of similar size. Very large or hazard trees belong in the height and proximity modifiers.', min: 1, max: 10, step: 1, defaultValue: 1 },
    modifiers: [
      { id: 'height', label: 'Height', defaultOptionId: 'medium', options: [{ id: 'small', label: 'Under 30 ft' }, { id: 'medium', label: '30–60 ft' }, { id: 'large', label: 'Over 60 ft' }] },
      { id: 'proximity', label: 'Near structures', defaultOptionId: 'clear', options: [{ id: 'clear', label: 'Open yard' }, { id: 'near', label: 'Near a house, wires, or fence' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Truck access' }, { id: 'tight', label: 'Backyard or no truck access' }] },
      { id: 'stump', label: 'Stump', defaultOptionId: 'leave', options: [{ id: 'leave', label: 'Leave stump' }, { id: 'grind', label: 'Grind stump' }] },
    ],
    searchTerms: ['tree removal cost', 'how much to cut down a tree', 'tree cutting price'],
  },
  'deck-build': {
    jobId: 'deck-build',
    title: 'Deck building cost',
    shortTitle: 'Deck',
    description: 'A CostAnswer estimated range for a pressure-treated deck, using carpenter wages and named production rates.',
    tradeLabel: 'Carpentry',
    unitLabel: 'square feet of deck',
    scope: { id: 'units', label: 'Deck area', hint: 'Length × width of the walking surface, in square feet.', min: 40, max: 800, step: 10, defaultValue: 200 },
    modifiers: [
      { id: 'height', label: 'Height', defaultOptionId: 'low', options: [{ id: 'low', label: 'Close to grade' }, { id: 'elevated', label: 'Elevated with stairs' }] },
      { id: 'railing', label: 'Railing', defaultOptionId: 'wood', options: [{ id: 'wood', label: 'Wood railing' }, { id: 'premium', label: 'Cable or metal railing' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Tight side yard' }] },
    ],
    searchTerms: ['deck cost calculator', 'how much to build a deck', 'pressure treated deck cost'],
  },
  'fence-install': {
    jobId: 'fence-install',
    title: 'Fence installation cost',
    shortTitle: 'Fence',
    description: 'A CostAnswer estimated range for a residential wood privacy fence, using fence-erector wages and a named lumber package per linear foot.',
    tradeLabel: 'Fencing',
    unitLabel: 'linear feet',
    scope: { id: 'units', label: 'Fence length', hint: 'Measure the run in linear feet. Gates are a modifier, not extra footage.', min: 20, max: 800, step: 5, defaultValue: 150 },
    modifiers: [
      { id: 'height', label: 'Height', defaultOptionId: 'six', options: [{ id: 'four', label: '4 ft' }, { id: 'six', label: '6 ft' }] },
      { id: 'slope', label: 'Grade', defaultOptionId: 'flat', options: [{ id: 'flat', label: 'Mostly flat' }, { id: 'sloped', label: 'Sloped or stepped' }] },
      { id: 'gates', label: 'Gates', defaultOptionId: 'one', options: [{ id: 'none', label: 'No gate' }, { id: 'one', label: 'One walk gate' }, { id: 'drive', label: 'Drive gate' }] },
    ],
    searchTerms: ['fence installation cost', 'cost to install a fence', 'privacy fence cost per foot'],
  },
  'concrete-driveway': {
    jobId: 'concrete-driveway',
    title: 'Concrete driveway cost',
    shortTitle: 'Concrete driveway',
    description: 'A CostAnswer estimated range for a residential concrete driveway, using cement-mason wages and named slab production.',
    tradeLabel: 'Concrete',
    unitLabel: 'square feet of slab',
    scope: { id: 'units', label: 'Slab area', hint: 'Length × width of the pour, in square feet. Thickness changes the concrete quantity, not only a lump factor.', min: 100, max: 2000, step: 10, defaultValue: 400 },
    modifiers: [
      { id: 'thickness', label: 'Thickness', defaultOptionId: 'four', options: [{ id: 'four', label: '4 inches' }, { id: 'five', label: '5 inches' }] },
      { id: 'finish', label: 'Finish', defaultOptionId: 'broom', options: [{ id: 'broom', label: 'Broom finish' }, { id: 'stamped', label: 'Stamped or colored' }] },
      { id: 'access', label: 'Truck access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Chute reach' }, { id: 'pump', label: 'Needs a pump or long wheelbarrow run' }] },
    ],
    searchTerms: ['concrete driveway cost', 'how much for a concrete driveway', 'driveway pour cost'],
  },
  'interior-painting': {
    jobId: 'interior-painting',
    title: 'Interior painting cost',
    shortTitle: 'Interior painting',
    description: 'A CostAnswer estimated range for painting interior walls, using painter wages and named coverage rates.',
    tradeLabel: 'Painting',
    unitLabel: 'rooms',
    scope: { id: 'units', label: 'Wall area', hint: 'Square feet of wall. The form asks for rooms and typical room size, then converts.', min: 80, max: 16000, step: 20, defaultValue: 1200 },
    intakeFields: [
      { id: 'rooms', label: 'Rooms to paint', hint: 'Count rooms of similar size. Closets can be ignored or counted as a small extra room.', min: 1, max: 20, step: 1, defaultValue: 4, suffix: 'rooms' },
      { id: 'roomFloorSqFt', label: 'Typical room floor area', hint: 'Length × width of a typical room in this job. A 12×12 bedroom is 144 sq ft.', min: 80, max: 400, step: 10, defaultValue: 144, suffix: 'sq ft' },
    ],
    modifiers: [
      { id: 'prep', label: 'Prep', defaultOptionId: 'standard', options: [{ id: 'standard', label: 'Standard prep' }, { id: 'heavy', label: 'Heavy patching or popcorn' }] },
      { id: 'coats', label: 'Coats', defaultOptionId: 'two', options: [{ id: 'two', label: 'Two coats' }, { id: 'three', label: 'Primer plus two coats' }] },
      { id: 'height', label: 'Ceiling height', defaultOptionId: 'eight', options: [{ id: 'eight', label: 'About 8 ft' }, { id: 'tall', label: 'About 9 ft' }] },
      { id: 'occupied', label: 'House', defaultOptionId: 'empty', options: [{ id: 'empty', label: 'Mostly empty' }, { id: 'lived-in', label: 'Furniture and protection' }] },
    ],
    searchTerms: ['interior painting cost', 'cost to paint a house inside', 'painter cost per square foot'],
  },
  'bathroom-remodel': {
    jobId: 'bathroom-remodel',
    title: 'Bathroom remodel cost',
    shortTitle: 'Bathroom remodel',
    description: 'A CostAnswer estimated range for a full bathroom on the same layout. Priced fixtures are a toilet, a 36-inch vanity, and ceramic tile for floor plus shower walls. A separate tub or shower pan is not a priced line. Composite recipes start at low confidence.',
    tradeLabel: 'Multiple trades',
    unitLabel: 'bathrooms',
    scope: { id: 'units', label: 'Bathrooms', hint: 'Count full bathrooms of similar size. A powder room is not this recipe.', min: 1, max: 2, step: 1, defaultValue: 1 },
    modifiers: [
      { id: 'size', label: 'Size', defaultOptionId: 'standard', options: [{ id: 'small', label: 'Small (about 40 sq ft)' }, { id: 'standard', label: 'Standard (about 60 sq ft)' }, { id: 'large', label: 'Large (about 100 sq ft)' }] },
      { id: 'finish', label: 'Finish', defaultOptionId: 'builder', options: [{ id: 'builder', label: 'Builder grade' }, { id: 'mid', label: 'Mid grade' }] },
      { id: 'layout', label: 'Layout', defaultOptionId: 'same', options: [{ id: 'same', label: 'Same layout' }, { id: 'move', label: 'Move plumbing' }] },
    ],
    searchTerms: ['bathroom remodel cost', 'bathroom renovation cost', 'gut bathroom cost'],
  },
  'heat-pump-replacement': {
    jobId: 'heat-pump-replacement',
    title: 'Heat pump replacement cost',
    shortTitle: 'Heat pump',
    description: 'A CostAnswer estimated range for replacing a residential air-source heat pump (blower-coil split system), using HVAC mechanic wages and named crew time.',
    tradeLabel: 'HVAC',
    unitLabel: 'systems',
    scope: { id: 'units', label: 'Systems', hint: 'Count complete outdoor + indoor heat-pump replacements. One typical house is one system.', min: 1, max: 4, step: 1, defaultValue: 1 },
    intakeFields: [
      { id: 'units', label: 'Systems', hint: 'Count complete outdoor + indoor heat-pump replacements. One typical house is one system.', min: 1, max: 4, step: 1, defaultValue: 1, suffix: 'systems' },
      { id: 'tons', label: 'System size', hint: 'Nameplate cooling tons. Equipment dollars scale from EIA’s 3-ton blower-coil baseline. Labor hours stay per system.', min: 1.5, max: 5, step: 0.5, defaultValue: 3, suffix: 'tons' },
    ],
    modifiers: [
      { id: 'efficiency', label: 'Equipment tier', defaultOptionId: 'standard', options: [{ id: 'standard', label: 'Standard efficiency' }, { id: 'high', label: 'High efficiency' }] },
      { id: 'ducts', label: 'Ductwork', defaultOptionId: 'reuse', options: [{ id: 'reuse', label: 'Reuse existing ducts' }, { id: 'revise', label: 'Revise or add ducts' }] },
      { id: 'access', label: 'Install access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Crawlspace, attic, or tight mechanical room' }] },
    ],
    searchTerms: ['heat pump replacement cost', 'air source heat pump cost', 'install a heat pump'],
  },
  'window-replacement': {
    jobId: 'window-replacement',
    title: 'Window replacement cost',
    shortTitle: 'Windows',
    description: 'A CostAnswer estimated range for replacing residential vinyl windows, using glazier wages and a sourced retail intercept per square foot of window. Interior casing is not a priced line.',
    tradeLabel: 'Windows',
    unitLabel: 'square feet of window',
    scope: { id: 'units', label: 'Window area', hint: 'Width × height × count, in square feet of window unit.', min: 6, max: 1600, step: 1, defaultValue: 120 },
    intakeFields: [
      { id: 'windows', label: 'Windows', hint: 'Count vinyl units of similar size.', min: 1, max: 40, step: 1, defaultValue: 8, suffix: 'windows' },
      { id: 'typicalWindowSqFt', label: 'Typical window size', hint: 'Width × height of one typical unit. A 3×5 window is 15 sq ft.', min: 6, max: 40, step: 1, defaultValue: 15, suffix: 'sq ft' },
    ],
    modifiers: [
      { id: 'stories', label: 'Stories', defaultOptionId: 'one', options: [{ id: 'one', label: 'Mostly first story' }, { id: 'two', label: 'Second story or higher' }] },
      { id: 'removal', label: 'Existing windows', defaultOptionId: 'standard', options: [{ id: 'standard', label: 'Standard tear-out' }, { id: 'full-frame', label: 'Full-frame or structural opening' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Tight lot or limited staging' }] },
    ],
    searchTerms: ['window replacement cost', 'vinyl window cost', 'how much to replace windows'],
  },
  'exterior-door-replacement': {
    jobId: 'exterior-door-replacement',
    title: 'Exterior door replacement cost',
    shortTitle: 'Exterior door',
    description: 'A CostAnswer estimated range for replacing a prehung exterior door, using carpenter wages and a sourced retail intercept for a 36-inch by 80-inch leaf. Sidelights and storm doors are not priced.',
    tradeLabel: 'Carpentry',
    unitLabel: 'doors',
    scope: { id: 'units', label: 'Doors', hint: 'Count prehung exterior doors of similar size. Each door is modeled as a 36-inch by 80-inch (20 sq ft) leaf.', min: 1, max: 8, step: 1, defaultValue: 1 },
    modifiers: [
      { id: 'material', label: 'Door material', defaultOptionId: 'fiberglass', options: [{ id: 'fiberglass', label: 'Fiberglass prehung' }, { id: 'metal', label: 'Metal prehung' }, { id: 'wood', label: 'Wood prehung' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Tight stoop or finished trim' }] },
      { id: 'hardware', label: 'Hardware', defaultOptionId: 'reuse', options: [{ id: 'reuse', label: 'Reuse lockset' }, { id: 'new', label: 'New lockset and closer work' }] },
    ],
    searchTerms: ['exterior door replacement cost', 'prehung door cost', 'front door installation cost'],
  },
  'siding-replacement': {
    jobId: 'siding-replacement',
    title: 'Siding replacement cost',
    shortTitle: 'Siding',
    description: 'A CostAnswer estimated range for replacing residential siding with vinyl or wood, using carpenter wages and a sourced retail intercept per square foot of wall. Housewrap and trim packages are not separate priced lines.',
    tradeLabel: 'Carpentry',
    unitLabel: 'square feet of wall',
    scope: { id: 'units', label: 'Wall area', hint: 'Length × height of the walls to cover, in square feet. Openings can be left in or deducted; waste is modeled separately.', min: 200, max: 4000, step: 20, defaultValue: 1200 },
    modifiers: [
      { id: 'material', label: 'Siding', defaultOptionId: 'vinyl', options: [{ id: 'vinyl', label: 'Vinyl' }, { id: 'wood', label: 'Wood' }] },
      { id: 'stories', label: 'Stories', defaultOptionId: 'one', options: [{ id: 'one', label: 'Mostly one story' }, { id: 'two', label: 'Two stories or scaffolding' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Tight lot or limited staging' }] },
    ],
    searchTerms: ['siding replacement cost', 'vinyl siding cost', 'how much to reside a house'],
  },
  'drywall-install': {
    jobId: 'drywall-install',
    title: 'Drywall hanging cost',
    shortTitle: 'Drywall',
    description: 'A CostAnswer estimated range for hanging residential drywall board, using drywall-installer wages and a sourced board intercept. Tape, mud, texture, and paint are not priced.',
    tradeLabel: 'Drywall',
    unitLabel: 'square feet of board',
    scope: { id: 'units', label: 'Board area', hint: 'Square feet of drywall to hang. This is board only — finishing is not in the range.', min: 80, max: 4000, step: 10, defaultValue: 400 },
    modifiers: [
      { id: 'location', label: 'Location', defaultOptionId: 'walls', options: [{ id: 'walls', label: 'Walls' }, { id: 'ceilings', label: 'Ceilings or both' }] },
      { id: 'occupied', label: 'House', defaultOptionId: 'empty', options: [{ id: 'empty', label: 'Mostly empty' }, { id: 'lived-in', label: 'Furniture and protection' }] },
      { id: 'access', label: 'Access', defaultOptionId: 'normal', options: [{ id: 'normal', label: 'Normal access' }, { id: 'tight', label: 'Tight stairs or finished rooms' }] },
    ],
    searchTerms: ['drywall cost', 'cost to hang drywall', 'drywall installation cost'],
  },
};

export function jobFormFields(job: JobPublicMeta): ScopeField[] {
  return job.intakeFields ?? [job.scope];
}

export function isJobId(value: string): value is JobId {
  return (JOB_IDS as readonly string[]).includes(value);
}

export function jobPath(jobId: JobId): `/cost/${JobId}` {
  return `/cost/${jobId}`;
}

export function jobSearchIndex(): Array<{ jobId: JobId; name: string; path: `/cost/${JobId}`; terms: string[] }> {
  return JOB_IDS.map((jobId) => {
    const job = JOB_CATALOG[jobId];
    return {
      jobId,
      name: job.shortTitle,
      path: jobPath(jobId),
      terms: [job.title, job.shortTitle, ...job.searchTerms].map((term) => term.toLowerCase()),
    };
  });
}
