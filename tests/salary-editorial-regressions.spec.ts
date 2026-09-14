import { describe, expect, it } from 'vitest';
import { occupationWageProfile } from '@/lib/calculations/salary';
import { salaryQuestions } from '@/lib/salary-content';
import { salaryQuestionsEs } from '@/lib/salary-content-es';

describe('salary answer accuracy', () => {
  it('does not describe a zero liability in North Dakota as a tax-free state', () => {
    const profile = occupationWageProfile({ area: 'ND', occupationCode: '11-9081' })!.value;
    expect(profile.takeHome?.stateIncomeTax).toBe(0);
    const en = salaryQuestions(profile).flatMap(q => q.answer).join(' ');
    const es = salaryQuestionsEs(profile).flatMap(q => q.answer).join(' ');
    expect(en).toContain('Estimated state income tax is $0');
    expect(en).not.toContain('levies no state income tax');
    expect(es).toContain('impuesto estatal estimado es $0');
    expect(es).not.toContain('no cobra impuesto estatal');
    expect(en).toContain('2026 standard deduction');
    expect(es).toContain('deducción estándar de 2026');
  });

  it('never substitutes a median for a withheld lower percentile', () => {
    const original = occupationWageProfile({ area: 'TX', occupationCode: '29-1141' })!.value;
    const profile = { ...original, wage: { ...original.wage, annual: { ...original.wage.annual, p10: null } } };
    expect(salaryQuestions(profile).flatMap(q => q.answer).join(' ')).toContain('BLS did not publish the 10th-percentile wage.');
    expect(salaryQuestionsEs(profile).flatMap(q => q.answer).join(' ')).toContain('BLS no publicó el salario del percentil 10.');
  });
});
