'use client';

import { useMemo, useState } from 'react';
import { calculateMedicareCost } from '@/lib/calculations/medicare';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney } from '@/lib/calculations/contracts';
import { medicareSnapshot } from '@/lib/data/medicare';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

type FilingStatus = 'single' | 'married-joint' | 'married-separate';
type Quarters = '40-or-more' | '30-to-39' | 'under-30';

export function MedicareCalculator() {
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [annualMagi, setAnnualMagi] = useState('75000');
  const [partAQuarters, setPartAQuarters] = useState<Quarters>('40-or-more');
  const [hasDrugCoverage, setHasDrugCoverage] = useState(true);
  const [monthlyDrugPlanPremium, setMonthlyDrugPlanPremium] = useState('40');
  const [monthlyMedigapPremium, setMonthlyMedigapPremium] = useState('0');
  const [coverageMonths, setCoverageMonths] = useState('12');

  const input = useMemo(() => {
    if (annualMagi.trim() === '' || coverageMonths.trim() === '') return null;
    if (hasDrugCoverage && monthlyDrugPlanPremium.trim() === '') return null;
    return {
      coverageYear: 2026 as const,
      filingStatus,
      annualMagi: Number(annualMagi),
      partAQuarters,
      hasDrugCoverage,
      monthlyDrugPlanPremium: hasDrugCoverage ? Number(monthlyDrugPlanPremium) : 0,
      monthlyMedigapPremium: monthlyMedigapPremium.trim() === '' ? 0 : Number(monthlyMedigapPremium),
      coverageMonths: Number(coverageMonths),
    };
  }, [filingStatus, annualMagi, partAQuarters, hasDrugCoverage, monthlyDrugPlanPremium, monthlyMedigapPremium, coverageMonths]);

  const calculation = useMemo(() => {
    if (!input) return { result: null, error: '' };
    try { return { result: calculateMedicareCost(input), error: '' }; }
    catch (error) { return { result: null, error: calculationErrorMessage(error) }; }
  }, [input]);

  const result = calculation.result;
  const value = result?.value;
  const ladder = medicareSnapshot.irmaaBrackets[filingStatus];

  return (
    <CalculatorPanel
      title="What Medicare costs you in 2026"
      intro="Premiums, the income adjustment that rides on top of them, and the deductibles owed before any of it pays."
      toolId="medicare-cost"
      category="money"
      calculationState={result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify(input)}
    >
      <div className="data-callout">
        <span>2026 RATES</span>
        <p>
          <strong>CMS published Part A and Part B premiums and deductibles</strong>
          <small>{medicareSnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label={`Modified adjusted gross income on your ${medicareSnapshot.irmaaIncomeTaxYear} return`} htmlFor="medicare-magi" hint={`Adjusted gross income plus tax-exempt interest, from ${medicareSnapshot.irmaaIncomeTaxYear}. Your ${medicareSnapshot.coverageYear} premium is set from that year, not this one.`}>
          <InputShell prefix="$">
            <input id="medicare-magi" type="number" min="0" step="1000" value={annualMagi} onChange={(event) => setAnnualMagi(event.target.value)} />
          </InputShell>
        </Field>
        <Field label={`How you filed in ${medicareSnapshot.irmaaIncomeTaxYear}`} htmlFor="medicare-filing" hint="Filing separately while married uses a much steeper ladder than either of the other two.">
          <span className="input-shell select-shell">
            <select id="medicare-filing" value={filingStatus} onChange={(event) => setFilingStatus(event.target.value as FilingStatus)}>
              <option value="single">Single, head of household, or qualifying widow(er)</option>
              <option value="married-joint">Married filing jointly</option>
              <option value="married-separate">Married filing separately</option>
            </select>
          </span>
        </Field>
        <Field label="Quarters of Medicare-taxed work" htmlFor="medicare-quarters" hint="Forty quarters is ten years and makes Part A free. A spouse's record can qualify you on its own.">
          <span className="input-shell select-shell">
            <select id="medicare-quarters" value={partAQuarters} onChange={(event) => setPartAQuarters(event.target.value as Quarters)}>
              <option value="40-or-more">40 or more, Part A is free</option>
              <option value="30-to-39">30 to 39 quarters</option>
              <option value="under-30">Fewer than 30 quarters</option>
            </select>
          </span>
        </Field>
        <Field label="Drug coverage" htmlFor="medicare-drug-coverage" hint="Part D IRMAA is owed only if you have a Part D or Medicare Advantage drug plan. A $0-premium plan still owes it.">
          <span className="input-shell select-shell">
            <select id="medicare-drug-coverage" value={hasDrugCoverage ? 'enrolled' : 'none'} onChange={(event) => setHasDrugCoverage(event.target.value === 'enrolled')}>
              <option value="enrolled">I have a Part D or Medicare Advantage drug plan</option>
              <option value="none">I do not have drug coverage</option>
            </select>
          </span>
        </Field>
        {hasDrugCoverage && (
          <Field label="Your drug plan premium, per month" htmlFor="medicare-drug" hint="What the plan charges before any income adjustment. $0 is a real premium on some plans and still owes the adjustment.">
            <InputShell prefix="$">
              <input id="medicare-drug" type="number" min="0" step="5" value={monthlyDrugPlanPremium} onChange={(event) => setMonthlyDrugPlanPremium(event.target.value)} />
            </InputShell>
          </Field>
        )}
      </div>

      <AdvancedSection
        id="medigap"
        title="Medigap, or a part year"
        hint="Only if they apply to you"
      >
        <div className="calc-form-grid">
          <Field label="Medigap premium, per month" htmlFor="medicare-medigap" hint="A supplement is priced by its insurer and appears in no federal table, so enter what you are quoted.">
            <InputShell prefix="$">
              <input id="medicare-medigap" type="number" min="0" step="10" value={monthlyMedigapPremium} onChange={(event) => setMonthlyMedigapPremium(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Months of coverage in 2026" htmlFor="medicare-months" hint="Twelve for a full year. Deductibles are not prorated with a shorter period.">
            <InputShell>
              <input id="medicare-months" type="number" min="1" max="12" step="1" value={coverageMonths} onChange={(event) => setCoverageMonths(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </AdvancedSection>

      {calculation.error && <InlineError message={calculation.error} />}
      {result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label="Monthly premium total"
            value={formatMoney(value.monthlyTotal)}
            note={`${formatMoney(value.coveragePeriodTotal)} over ${input?.coverageMonths ?? 12} month${(input?.coverageMonths ?? 12) === 1 ? '' : 's'} · ${value.irmaaApplies ? 'includes an income adjustment' : 'standard premium'}`}
          />

          {/*
            The cliff is the thing people are hurt by and the thing no premium
            table shows: one dollar of income applies a whole step for the year,
            and it is set from a return filed two years ago that cannot be changed.
          */}
          <div className={`health-status health-status-${value.irmaaApplies ? 'review' : 'estimate'}`} role="status">
            <span>{value.irmaaApplies ? `Income adjustment: rung ${value.irmaaBracketIndex} of ${ladder.length - 1}` : 'No income adjustment'}</span>
            <ul>
              {value.irmaaApplies ? (
                <li>
                  Your {medicareSnapshot.irmaaIncomeTaxYear} income adds {formatMoney(value.partBIrmaa)} to Part B
                  {value.hasDrugCoverage
                    ? ` and ${formatMoney(value.partDIrmaa)} to drug coverage every month, which is ${formatMoney((value.partBIrmaa + value.partDIrmaa) * 12)} over a full year on top of the standard premiums.`
                    : ` every month (${formatMoney(value.partBIrmaa * 12)} over a full year). A Part D plan would add ${formatMoney(value.partDIrmaa)} more per month, which is not in this total because you have no drug coverage.`}
                  {(input?.coverageMonths ?? 12) !== 12 ? ` This coverage period is ${input?.coverageMonths} months.` : ''}
                </li>
              ) : (
                <li>Your {medicareSnapshot.irmaaIncomeTaxYear} income is below the first threshold, so the standard {formatMoney(value.partBStandardPremium)} Part B premium applies.</li>
              )}
              {value.nextIrmaaThreshold !== null && value.annualCostOfNextThreshold !== null && (
                <li>
                  The next rung starts {value.nextIrmaaThresholdIsInclusive ? 'at' : 'above'} {formatMoney(value.nextIrmaaThreshold, 0)}, which is {formatMoney(value.distanceToNextThreshold ?? 0, 0)} away.
                  Crossing it by a single dollar costs {formatMoney(value.annualCostOfNextThreshold)} for a full year: this is a cliff, not a taper.
                </li>
              )}
              <li>Each spouse enrolled in Medicare pays their own adjustment, so a couple filing jointly can pay it twice. Retirement or another life-changing event can be reported on form SSA-44 to have a later year used instead.</li>
            </ul>
          </div>

          <StatGrid items={[
            { label: 'Part B premium', value: formatMoney(value.partBMonthlyPremium), note: value.irmaaApplies ? `${formatMoney(value.partBStandardPremium)} standard + ${formatMoney(value.partBIrmaa)} adjustment` : 'Standard premium' },
            { label: 'Part A premium', value: value.partAMonthlyPremium === 0 ? 'Free' : formatMoney(value.partAMonthlyPremium), note: value.partAMonthlyPremium === 0 ? '40+ quarters of Medicare-taxed work' : 'Voluntary enrollment premium' },
            { label: 'Owed before cover pays', value: formatMoney(value.partBDeductible, 0), note: `Part B a year, plus ${formatMoney(value.partADeductible, 0)} per hospital benefit period` },
          ]} />

          <div className="health-metal-table">
            <table>
              <caption>The {medicareSnapshot.irmaaIncomeTaxYear} income ladder for your filing status</caption>
              <thead><tr><th scope="col">{medicareSnapshot.irmaaIncomeTaxYear} income</th><th scope="col">Part B / month</th><th scope="col">Drug adjustment</th></tr></thead>
              <tbody>
                {ladder.map((bracket, index) => (
                  <tr key={index} className={index === value.irmaaBracketIndex ? 'is-current' : undefined}>
                    <th scope="row">
                      {bracket.threshold === null
                        ? `Up to ${formatMoney(ladder[1]?.threshold ?? 0, 0)}`
                        : `${bracket.thresholdIsInclusive ? 'From' : 'Over'} ${formatMoney(bracket.threshold, 0)}`}
                      {index === value.irmaaBracketIndex && ' · you'}
                    </th>
                    <td>{formatMoney(value.partBStandardPremium + bracket.partBMonthlyAdjustment)}</td>
                    <td>{bracket.partDMonthlyAdjustment === 0 ? '—' : `+${formatMoney(bracket.partDMonthlyAdjustment)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Part B pays 80% of the approved amount after its {formatMoney(value.partBDeductible, 0)} deductible, and there is no cap on the other 20%. That is what Medigap and Medicare Advantage exist to cover, and why these totals are premiums rather than a cost of care.</p>
          </div>

          <ResultDetails
            breakdown={result.breakdown}
            assumptions={result.assumptions}
            calculationVersion={result.calculationVersion}
            datasetSnapshotIds={result.datasetSnapshotIds}
          />
          <p className="health-range-note">
            A hospital stay adds {formatMoney(medicareSnapshot.partA.inpatientDeductiblePerBenefitPeriod, 0)} per benefit period, then{' '}
            {formatMoney(medicareSnapshot.partA.coinsuranceDays61To90, 0)} a day from day 61 and{' '}
            {formatMoney(medicareSnapshot.partA.coinsuranceLifetimeReserveDay, 0)} a day for the {medicareSnapshot.partA.lifetimeReserveDays} lifetime reserve days.
            A skilled nursing stay costs {formatMoney(medicareSnapshot.partA.skilledNursingCoinsuranceDays21To100, 0)} a day for days 21 to 100. None of these are premiums, and none are included above.
          </p>
        </div>
      )}
    </CalculatorPanel>
  );
}
