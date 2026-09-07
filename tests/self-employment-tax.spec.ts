import { describe, expect, it } from 'vitest';
import { calculateSelfEmploymentTax } from '@/lib/calculations/tax/self-employment';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { SELF_EMPLOYMENT_TAX_ENGINE_ID } from '@/lib/calculations/tax/version';
import { round } from '@/lib/calculations/contracts';

const snapshot = getTaxYearSnapshot(2026);
const fica = snapshot.fica;

const run = (netProfit: number, socialSecurityWages = 0, medicareWages?: number) =>
  calculateSelfEmploymentTax({
    netProfit,
    socialSecurityWages,
    medicareWages,
    filingStatus: 'single',
    taxYear: 2026,
  });

describe('self-employment tax', () => {
  it('reproduces Schedule SE arithmetic on $50,000 of net profit with no W-2 wages', () => {
    // 2026 Schedule SE draft: line 4a = profit × 0.9235; line 10 = 12.4%; line 11 = 2.9%.
    const netEarnings = round(50_000 * 0.9235);
    expect(netEarnings).toBe(46_175);
    const { value, calculationVersion, datasetSnapshotIds } = run(50_000);
    expect(calculationVersion).toBe(SELF_EMPLOYMENT_TAX_ENGINE_ID);
    expect(datasetSnapshotIds).toEqual([snapshot.snapshotId]);
    expect(value.netEarnings).toBe(46_175);
    expect(value.socialSecurityTax).toBe(round(46_175 * 0.124));
    expect(value.medicareTax).toBe(round(46_175 * 0.029));
    expect(value.scheduleSeTax).toBe(round(value.socialSecurityTax + value.medicareTax));
    expect(value.deductibleHalf).toBe(round(value.scheduleSeTax * 0.5));
    expect(value.additionalMedicare).toBe(0);
    expect(value.scheduleSeTax).toBe(7_064.78);
  });

  it('uses twice the snapshot employee FICA rates, matching Schedule SE 12.4% and 2.9%', () => {
    expect(fica.socialSecurityRate * 2).toBe(0.124);
    expect(fica.medicareRate * 2).toBe(0.029);
    expect(fica.selfEmploymentNetEarningsFactor).toBe(0.9235);
    expect(fica.selfEmploymentMinimumNetEarnings).toBe(400);
    expect(fica.socialSecurityWageBase).toBe(184_500);
  });

  it('charges no Social Security once W-2 wages have used the wage base', () => {
    const { value } = run(50_000, 184_500);
    expect(value.remainingSocialSecurityBase).toBe(0);
    expect(value.socialSecurityTax).toBe(0);
    expect(value.medicareTax).toBe(round(46_175 * 0.029));
    expect(value.scheduleSeTax).toBe(value.medicareTax);
  });

  it('stops below the $400 net-earnings threshold', () => {
    const { value } = run(300);
    expect(value.belowFilingThreshold).toBe(true);
    expect(value.scheduleSeTax).toBe(0);
    expect(value.totalPayrollTax).toBe(0);
  });

  it('files Schedule SE at exactly $400 of net earnings after the 92.35% factor', () => {
    const profit = 400 / 0.9235;
    expect(run(profit - 1).value.belowFilingThreshold).toBe(true);
    expect(run(profit).value.belowFilingThreshold).toBe(false);
    expect(run(profit).value.scheduleSeTax).toBeGreaterThan(0);
  });

  it('charges Additional Medicare on combined wages and net earnings, not on Schedule SE', () => {
    // Single threshold $200,000. Medicare wages $180,000 + net earnings $46,175 = $226,175.
    const { value } = run(50_000, 180_000, 180_000);
    expect(value.additionalMedicare).toBe(round((180_000 + 46_175 - 200_000) * 0.009));
    expect(value.totalPayrollTax).toBe(round(value.scheduleSeTax + value.additionalMedicare));
    expect(value.deductibleHalf).toBe(round(value.scheduleSeTax * 0.5));
  });

  it('treats a loss as $0 SE tax', () => {
    const { value } = run(-20_000);
    expect(value.scheduleSeTax).toBe(0);
    expect(value.belowFilingThreshold).toBe(true);
  });
});
