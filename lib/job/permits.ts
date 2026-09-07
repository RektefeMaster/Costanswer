import type { DisposalRule, NamedMoneyStep, PermitRule } from './types';

export function pricePermit(rule: PermitRule, directCents: number): NamedMoneyStep | null {
  switch (rule.kind) {
    case 'excluded':
      return null;
    case 'flat':
      return { id: 'permit', label: 'Permit', cents: rule.amountCents.value, detail: 'Recipe permit allowance' };
    case 'percent_of_direct':
      return {
        id: 'permit',
        label: 'Permit',
        cents: Math.round(directCents * rule.rate.value),
        detail: `${(rule.rate.value * 100).toFixed(1)}% of direct cost`,
      };
    default: {
      const exhaustive: never = rule;
      throw new Error(`Unhandled permit rule: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function priceDisposal(rule: DisposalRule): NamedMoneyStep | null {
  switch (rule.kind) {
    case 'excluded':
      return null;
    case 'flat':
      return { id: 'disposal', label: 'Disposal', cents: rule.amountCents.value };
    default: {
      const exhaustive: never = rule;
      throw new Error(`Unhandled disposal rule: ${JSON.stringify(exhaustive)}`);
    }
  }
}
