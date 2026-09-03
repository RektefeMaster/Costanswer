import { type CompoundingFrequency } from '@/lib/calculations/investment';

export function money(value: number, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
}

export function frequencyLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'annually': return 'Annually';
    case 'semiannually': return 'Twice a year';
    case 'quarterly': return 'Quarterly';
    case 'monthly': return 'Monthly';
    case 'weekly': return 'Weekly';
    default: {
      const exhaustive: never = frequency;
      throw new Error(`Unhandled frequency: ${exhaustive}`);
    }
  }
}
