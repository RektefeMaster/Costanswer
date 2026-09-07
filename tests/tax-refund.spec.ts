import { describe, expect, it } from 'vitest';
import { formatMoney, round } from '@/lib/calculations/contracts';
import { calculateTaxRefund } from '@/lib/calculations/tax/tax-refund';
import { calculateFederalIncomeTax } from '@/lib/calculations/tax/federal';
import { calculateSelfEmploymentTax } from '@/lib/calculations/tax/self-employment';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { TAX_REFUND_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);

describe('tax refund', () => {
  it('returns withholding minus federal income tax when there are no credits or SE tax', () => {
    const federal = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'single',
      grossIncome: 100_000,
      federal: snapshot.federal,
    });
    expect(federal.tax).toBe(13_170);
    const { value, calculationVersion } = calculateTaxRefund({
      grossIncome: 100_000,
      federalWithholding: 15_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(calculationVersion).toBe(TAX_REFUND_ENGINE_ID);
    expect(value.federalIncomeTax).toBe(13_170);
    expect(value.selfEmploymentTax).toBe(0);
    expect(value.refund).toBe(1_830);
    expect(value.amountOwed).toBe(0);
  });

  it('reports an amount owed when withholding is short', () => {
    const { value } = calculateTaxRefund({
      grossIncome: 100_000,
      federalWithholding: 5_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(value.amountOwed).toBe(8_170);
    expect(value.refund).toBe(0);
  });

  it('adds the additional child tax credit when tax is wiped out', () => {
    const { value } = calculateTaxRefund({
      grossIncome: 20_000,
      qualifyingChildren: 1,
      federalWithholding: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(value.federalIncomeTax).toBeLessThan(2_200);
    expect(value.refundableCredits).toBeGreaterThan(0);
    expect(value.refund).toBe(value.refundableCredits);
  });

  it('taxes self-employment profit as income after the deductible half of Schedule SE tax', () => {
    const se = calculateSelfEmploymentTax({
      netProfit: 50_000,
      socialSecurityWages: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    const federal = calculateFederalIncomeTax({
      taxYear: 2026,
      filingStatus: 'single',
      grossIncome: 50_000 + 50_000 - se.value.deductibleHalf,
      federal: snapshot.federal,
    });
    const wagesOnly = calculateTaxRefund({
      grossIncome: 50_000,
      federalWithholding: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    const { value, breakdown } = calculateTaxRefund({
      grossIncome: 50_000,
      netSelfEmploymentProfit: 50_000,
      federalWithholding: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(value.selfEmploymentTax).toBe(7_064.78);
    expect(value.federalIncomeTax).toBe(round(federal.tax));
    expect(value.federalIncomeTax).toBeGreaterThan(wagesOnly.value.federalIncomeTax);
    expect(value.amountOwed).toBe(round(federal.tax + se.value.scheduleSeTax + se.value.additionalMedicare));
    const afterCredits = breakdown.find((row) => row.label === 'Tax after nonrefundable credits');
    const totalTaxRow = breakdown.find((row) => row.label === 'Total tax');
    expect(afterCredits?.value).toBe(formatMoney(federal.tax));
    expect(totalTaxRow?.value).toBe(formatMoney(federal.tax + se.value.scheduleSeTax + se.value.additionalMedicare));
  });

  it('lets a Schedule C loss reduce earned income for the earned income credit', () => {
    const wagesOnly = calculateTaxRefund({
      grossIncome: 20_000,
      qualifyingChildren: 1,
      federalWithholding: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    const withLoss = calculateTaxRefund({
      grossIncome: 20_000,
      netSelfEmploymentProfit: -8_000,
      qualifyingChildren: 1,
      federalWithholding: 0,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(withLoss.value.refundableCredits).toBeLessThan(wagesOnly.value.refundableCredits);
  });
});
