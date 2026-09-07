/** Human labels for recipe component ids. Safe for client UI. */
const MATERIAL_LABELS: Record<string, string> = {
  'split-system': 'split-system equipment',
  'tank-water-heater': 'gas tank water heater',
  'tank-water-heater-electric': 'electric tank water heater',
  'service-panel-200a': '200A service panel',
  'ready-mix-concrete': 'ready-mix concrete',
  'interior-paint': 'interior paint',
  'pressure-treated-lumber': 'pressure-treated deck package',
  'wood-privacy-fence': 'wood privacy-fence package',
  'bath-tile': 'ceramic tile',
  toilet: 'toilet',
  vanity: 'vanity',
  'air-source-heat-pump': 'air-source heat pump',
  'vinyl-window': 'vinyl window',
  'exterior-door-fiberglass': 'fiberglass prehung door',
  'exterior-door-metal': 'metal prehung door',
  'exterior-door-wood': 'wood prehung door',
  'vinyl-siding': 'vinyl siding',
  'wood-siding': 'wood siding',
  'drywall-board': 'drywall board',
};

export function materialLabel(componentId: string): string {
  return MATERIAL_LABELS[componentId] ?? componentId.replace(/-/g, ' ');
}

export function materialDisplayName(componentId: string): string {
  const label = materialLabel(componentId);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function materialList(componentIds: readonly string[]): string {
  return componentIds.map(materialLabel).join(', ');
}
