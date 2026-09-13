import { describe, expect, it } from 'vitest';
import snapshotJson from '@/data/va-funding-fee/current.json';
import { calculateVaFundingFee } from '@/lib/calculations/va-funding-fee';
import { vaFundingFeeSnapshot } from '@/lib/data/va-funding-fee';
import { validateVaFundingFeeSnapshot } from '@/lib/data/verify';

describe('VA funding fee charts', () => {
  it('keeps VA’s published $2,850 worked example', () => {
    const result = calculateVaFundingFee({
      loanType: 'purchase',
      loanAmount: 190_000,
      firstUse: true,
      downPaymentPercent: 5,
      exempt: false,
      financeFee: false,
    });
    expect(result.value.ratePercent).toBe(1.5);
    expect(result.value.fee).toBe(2_850);
    expect(result.value.loanAmountAfterFee).toBe(190_000);
  });

  it('steps subsequent-use purchase from 3.3% to 1.5% at 5% down', () => {
    const zero = calculateVaFundingFee({
      loanType: 'purchase', loanAmount: 300_000, firstUse: false, downPaymentPercent: 4.99, exempt: false, financeFee: false,
    });
    const five = calculateVaFundingFee({
      loanType: 'purchase', loanAmount: 300_000, firstUse: false, downPaymentPercent: 5, exempt: false, financeFee: false,
    });
    expect(zero.value.ratePercent).toBe(3.3);
    expect(five.value.ratePercent).toBe(1.5);
  });

  it('finances the fee by adding the same chart amount to the note', () => {
    const cash = calculateVaFundingFee({
      loanType: 'purchase', loanAmount: 190_000, firstUse: true, downPaymentPercent: 5, exempt: false, financeFee: false,
    });
    const financed = calculateVaFundingFee({
      loanType: 'purchase', loanAmount: 190_000, firstUse: true, downPaymentPercent: 5, exempt: false, financeFee: true,
    });
    expect(financed.value.fee).toBe(cash.value.fee);
    expect(financed.value.fee).toBe(2_850);
    expect(financed.value.loanAmountAfterFee).toBe(192_850);
    expect(financed.value.loanAmountAfterFee).not.toBeCloseTo(190_000 / (1 - 0.015), 0);
  });

  it('zeros an exemption and leaves cash-out independent of down payment', () => {
    const exempt = calculateVaFundingFee({
      loanType: 'purchase', loanAmount: 400_000, firstUse: true, downPaymentPercent: 0, exempt: true, financeFee: true,
    });
    expect(exempt.value.fee).toBe(0);
    const cashOut = calculateVaFundingFee({
      loanType: 'cash-out', loanAmount: 200_000, firstUse: false, downPaymentPercent: 50, exempt: false, financeFee: false,
    });
    expect(cashOut.value.ratePercent).toBe(3.3);
  });

  it('fails the build on an edited rate the schema would still accept', () => {
    expect(() => validateVaFundingFeeSnapshot(snapshotJson)).not.toThrow();
    const mistyped = structuredClone(snapshotJson);
    mistyped.irrrlPercent = 0.6;
    expect(() => validateVaFundingFeeSnapshot(mistyped)).toThrow(/integrity check/);
  });

  it('still uses the April 2023 charts', () => {
    expect(vaFundingFeeSnapshot.effectiveFrom).toBe('2023-04-07');
  });
});
