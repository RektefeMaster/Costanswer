import { describe, expect, it } from 'vitest';
import { calculateCapitalGains } from '@/lib/calculations/tax/capital-gains';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { CAPITAL_GAINS_ENGINE_ID } from '@/lib/calculations/tax/version';

const snapshot = getTaxYearSnapshot(2026);

describe('long-term capital gains and NIIT', () => {
  it('taxes a $20,000 long-term gain at 15% once ordinary taxable income is already above the 0% ceiling', () => {
    const { value, calculationVersion } = calculateCapitalGains({
      otherTaxableIncome: 80_000,
      longTermGains: 20_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(calculationVersion).toBe(CAPITAL_GAINS_ENGINE_ID);
    expect(snapshot.federalCredits.longTermCapitalGains.zeroRateMaxByFilingStatus.single).toBe(49_450);
    expect(value.amountAtZero).toBe(0);
    expect(value.amountAtFifteen).toBe(20_000);
    expect(value.amountAtTwenty).toBe(0);
    expect(value.capitalGainsTax).toBe(3_000);
    expect(value.netInvestmentIncomeTax).toBe(0);
  });

  it('uses the 0% band when ordinary income leaves room under the ceiling', () => {
    const { value } = calculateCapitalGains({
      otherTaxableIncome: 30_000,
      longTermGains: 10_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(value.amountAtZero).toBe(10_000);
    expect(value.capitalGainsTax).toBe(0);
  });

  it('reproduces the IRS NIIT Q&A example of $2,660', () => {
    // IRS Q&A #20: single, MAGI $270,000, NII $90,000, threshold $200,000.
    // Lesser of $70,000 and $90,000 × 3.8% = $2,660.
    const { value } = calculateCapitalGains({
      otherTaxableIncome: 180_000,
      longTermGains: 90_000,
      modifiedAgi: 270_000,
      netInvestmentIncome: 90_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(value.netInvestmentIncomeTax).toBe(2_660);
  });

  it('starts the 20% band above the 15% ceiling', () => {
    const { value } = calculateCapitalGains({
      otherTaxableIncome: 540_000,
      longTermGains: 20_000,
      filingStatus: 'single',
      taxYear: 2026,
    });
    expect(snapshot.federalCredits.longTermCapitalGains.fifteenRateMaxByFilingStatus.single).toBe(545_500);
    expect(value.amountAtFifteen).toBe(5_500);
    expect(value.amountAtTwenty).toBe(14_500);
    expect(value.capitalGainsTax).toBe(3_725);
  });
});
