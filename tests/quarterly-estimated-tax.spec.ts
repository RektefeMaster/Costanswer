import { describe, expect, it } from 'vitest';
import { calculateQuarterlyEstimatedTax } from '@/lib/calculations/tax/quarterly-estimated';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { QUARTERLY_ESTIMATED_TAX_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);

const run = (extras: Partial<{
  current: number;
  prior: number;
  agi: number;
  withholding: number;
  filingStatus: 'single' | 'marriedFilingSeparately';
}> = {}) =>
  calculateQuarterlyEstimatedTax({
    expectedCurrentYearTax: extras.current ?? 12_000,
    priorYearTax: extras.prior ?? 10_000,
    priorYearAgi: extras.agi ?? 80_000,
    expectedWithholdingAndRefundableCredits: extras.withholding ?? 2_000,
    filingStatus: extras.filingStatus ?? 'single',
    taxYear: 2026,
  });

describe('quarterly estimated tax', () => {
  it('takes the smaller of 90% of this year and 100% of last year', () => {
    const { value, calculationVersion } = run();
    expect(calculationVersion).toBe(QUARTERLY_ESTIMATED_TAX_ENGINE_ID);
    expect(value.requiredAnnualPayment).toBe(10_000);
    expect(value.paymentsRequired).toBe(true);
    expect(value.quarterlyPayment).toBe(2_000);
    expect(value.installments.map((row) => row.dueOn)).toEqual([
      '2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15',
    ]);
  });

  it('uses 110% of last year when prior-year AGI is over $150,000', () => {
    const { value } = run({ current: 20_000, prior: 16_000, agi: 160_000, withholding: 0 });
    expect(value.usedHighIncomeSafeHarbor).toBe(true);
    expect(value.requiredAnnualPayment).toBe(17_600);
  });

  it('uses the $75,000 AGI threshold for married filing separately', () => {
    const { value } = run({
      current: 20_000, prior: 10_000, agi: 80_000, withholding: 0, filingStatus: 'marriedFilingSeparately',
    });
    expect(value.usedHighIncomeSafeHarbor).toBe(true);
    expect(value.requiredAnnualPayment).toBe(11_000);
  });

  it('does not require payments when the amount owed after withholding is under $1,000', () => {
    const { value } = run({ current: 10_000, prior: 12_000, withholding: 9_500 });
    expect(value.owedAfterWithholding).toBe(500);
    expect(value.paymentsRequired).toBe(false);
    expect(value.quarterlyPayment).toBe(0);
  });

  it('does not require payments when withholding already covers the required annual payment', () => {
    const { value } = run({ current: 10_000, prior: 8_000, withholding: 8_000 });
    expect(value.requiredAnnualPayment).toBe(8_000);
    expect(value.paymentsRequired).toBe(false);
  });

  it('keeps the Form 1040-ES $1,000 and due-date figures in the snapshot', () => {
    expect(snapshot.estimatedTax.minimumTaxToOwe).toBe(1_000);
    expect(snapshot.estimatedTax.currentYearSafeHarborRate).toBe(0.9);
    expect(snapshot.estimatedTax.sourceUrl).toContain('f1040es.pdf');
  });

  it('puts leftover cents on the last installment so four payments sum to the annual remainder', () => {
    const { value } = run({ current: 12_000, prior: 10_000, withholding: 1_999.99 });
    const sum = value.installments.reduce((total, row) => total + row.amount, 0);
    expect(sum).toBe(value.amountStillToPay);
  });
});
