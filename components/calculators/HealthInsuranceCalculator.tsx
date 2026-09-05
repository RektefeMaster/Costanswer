'use client';

import { useMemo, useState } from 'react';
import { calculateAcaSubsidy, type AcaSubsidyStatus } from '@/lib/calculations/aca-subsidy';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { acaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type Eligibility = 'assumed-eligible' | 'unknown' | 'ineligible';

/**
 * How firmly each outcome may be stated.
 *
 * Only `estimated` produces a credit this page is willing to put in a headline.
 * The two null-credit outcomes are not zero-credit outcomes: someone below the
 * income range may qualify for Medicaid at no premium, and someone who has not
 * checked the coverage and filing conditions has no answer yet. Printing $0 of
 * assistance for either would be a claim the calculation did not make.
 */
const STATUS_LABELS: Record<AcaSubsidyStatus, { tag: string; tone: 'estimate' | 'review' }> = {
  estimated: { tag: 'Conditional estimate', tone: 'estimate' },
  'eligibility-unconfirmed': { tag: 'Eligibility not confirmed', tone: 'review' },
  'below-income-range': { tag: 'Below the subsidy income range', tone: 'review' },
  'above-income-range': { tag: 'Above the 400% FPL ceiling', tone: 'review' },
  ineligible: { tag: 'No credit in this scenario', tone: 'review' },
};

export function HealthInsuranceCalculator() {
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [householdSize, setHouseholdSize] = useState('1');
  const [annualHouseholdMagi, setAnnualHouseholdMagi] = useState('42000');
  const [monthlyBenchmarkPremium, setMonthlyBenchmarkPremium] = useState('550');
  const [monthlyPlanPremium, setMonthlyPlanPremium] = useState('480');
  const [eligibility, setEligibility] = useState<Eligibility>('assumed-eligible');
  const [monthlyEligiblePlanPremium, setMonthlyEligiblePlanPremium] = useState('');
  const [coverageMonths, setCoverageMonths] = useState('12');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateAcaSubsidy({
          coverageYear: 2026,
          stateCode,
          householdSize: Number(householdSize),
          annualHouseholdMagi: Number(annualHouseholdMagi),
          monthlyBenchmarkPremium: Number(monthlyBenchmarkPremium),
          monthlyPlanPremium: Number(monthlyPlanPremium),
          // An empty advanced field means "no separate eligible premium", not zero.
          monthlyEligiblePlanPremium: monthlyEligiblePlanPremium.trim() === '' ? undefined : Number(monthlyEligiblePlanPremium),
          eligibility,
          coverageMonths: Number(coverageMonths),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [stateCode, householdSize, annualHouseholdMagi, monthlyBenchmarkPremium, monthlyPlanPremium, monthlyEligiblePlanPremium, eligibility, coverageMonths]);

  const result = calculation.result;
  const value = result?.value;
  const status = value ? STATUS_LABELS[value.status] : null;
  const hasCredit = value?.monthlyNetPremium !== null && value?.monthlyNetPremium !== undefined;
  const guidelineRegion = stateCode === 'AK' ? 'Alaska' : stateCode === 'HI' ? 'Hawaii' : 'the contiguous states and DC';

  return (
    <CalculatorPanel
      title="Your 2026 premium after the credit"
      intro="Enter your expected 2026 household income and the two premiums the Marketplace shows you. This applies the published federal formula; it does not determine eligibility."
      toolId="health-insurance"
      category="money"
      calculationState={result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([stateCode, householdSize, annualHouseholdMagi, monthlyBenchmarkPremium, monthlyPlanPremium, monthlyEligiblePlanPremium, eligibility, coverageMonths])}
    >
      <div className="data-callout">
        <span>2026 COVERAGE</span>
        <p>
          <strong>IRS contribution table · HHS {acaSubsidySnapshot.povertyGuidelineYear} poverty guidelines</strong>
          <small>{acaSubsidySnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="State" htmlFor="health-state" hint={`Sets the poverty guideline for ${guidelineRegion}. It does not price plans: Alaska and Hawaii have separate guidelines, every other state and DC share one.`}>
          <span className="input-shell select-shell">
            <select id="health-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option key={code} value={code}>{US_STATES[code]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="People in your tax household" htmlFor="health-household" hint="You, your spouse if filing jointly, and everyone you claim as a dependent, whether or not they are enrolling.">
          <InputShell>
            <input id="health-household" type="number" min="1" max="30" step="1" value={householdSize} onChange={(event) => setHouseholdSize(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Expected 2026 household income (MAGI)" htmlFor="health-magi" hint="Modified adjusted gross income for the whole tax household, for the coverage year. Not take-home pay and not last year's return.">
          <InputShell prefix="$">
            <input id="health-magi" type="number" min="0" step="1000" value={annualHouseholdMagi} onChange={(event) => setAnnualHouseholdMagi(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Other eligibility conditions" htmlFor="health-eligibility" hint="Coverage, tax-filing, and no disqualifying employer or government coverage. This calculator cannot check these.">
          <span className="input-shell select-shell">
            <select id="health-eligibility" value={eligibility} onChange={(event) => setEligibility(event.target.value as Eligibility)}>
              <option value="assumed-eligible">Assume they are met</option>
              <option value="unknown">I have not checked them</option>
              <option value="ineligible">They are not met</option>
            </select>
          </span>
        </Field>
      </div>
      {/*
        The benchmark and the plan are different premiums doing different jobs:
        the benchmark sizes the credit and the selected plan is what the credit
        is subtracted from. Reading the same number into both is the mistake
        this section exists to prevent.
      */}
      <div className="health-premiums">
        <h3>The two premiums from the Marketplace</h3>
        <div className="calc-form-grid compact-grid">
          <Field label="Second-lowest-cost Silver, per month" htmlFor="health-benchmark" hint="The benchmark that sizes your credit, for your county and the people enrolling, before any tobacco surcharge. Marketplace plan previews list it; last year's is on Form 1095-A, column B.">
            <InputShell prefix="$">
              <input id="health-benchmark" type="number" min="0" step="25" value={monthlyBenchmarkPremium} onChange={(event) => setMonthlyBenchmarkPremium(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="The plan you want, per month" htmlFor="health-plan" hint="Full price of the plan you are choosing, before any credit. It can be any metal level, cheaper or dearer than the benchmark.">
            <InputShell prefix="$">
              <input id="health-plan" type="number" min="0" step="25" value={monthlyPlanPremium} onChange={(event) => setMonthlyPlanPremium(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </div>
      <details className="health-advanced">
        <summary>Partial year or non-covered extras <span>Only if they apply to you</span></summary>
        <div className="calc-form-grid">
          <Field label="Months of coverage in 2026" htmlFor="health-months" hint="Twelve for a full year. A shorter period is totalled separately; your annual income is not reduced to match.">
            <InputShell>
              <input id="health-months" type="number" min="1" max="12" step="1" value={coverageMonths} onChange={(event) => setCoverageMonths(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Credit-eligible part of that premium" htmlFor="health-eligible-premium" hint="Leave blank unless your plan bundles benefits outside the essential health benefits. The credit cannot exceed this amount, and the rest stays in your net cost.">
            <InputShell prefix="$">
              <input id="health-eligible-premium" type="number" min="0" step="25" placeholder={monthlyPlanPremium} value={monthlyEligiblePlanPremium} onChange={(event) => setMonthlyEligiblePlanPremium(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </details>
      {calculation.error && <InlineError message={calculation.error} />}
      {result && value && status && (
        <div className="calculation-output">
          {/*
            Three different things can put the full premium in this headline, and
            "after the credit" is only honest for one of them. A calculated zero
            (over the ceiling, or conditions not met) is a finding; a null is the
            absence of one. Saying "after the credit" over an unchanged $900 reads
            as though assistance was applied and came to nothing.
          */}
          <PrimaryResult
            label={!hasCredit ? 'Full monthly premium, no credit estimated'
              : value.monthlyPremiumTaxCredit === 0 ? 'Your monthly premium, with no credit in this scenario'
                : 'Your monthly premium after the credit'}
            value={formatMoney(hasCredit ? value.monthlyNetPremium! : value.monthlyPlanPremium)}
            note={hasCredit
              ? `${formatMoney(value.coveragePeriodNetPremium!)} over ${value.coverageMonths} month${value.coverageMonths === 1 ? '' : 's'} · ${US_STATES[stateCode]}`
              : 'The credit is not estimated in this scenario. Read why below.'}
          />
          <div className={`health-status health-status-${status.tone}`} role="status">
            <span>{status.tag}</span>
            <ul>{value.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
          <StatGrid items={[
            {
              label: 'Monthly premium tax credit',
              value: value.monthlyPremiumTaxCredit === null ? 'Not estimated' : formatMoney(value.monthlyPremiumTaxCredit),
              note: value.monthlyPremiumTaxCredit === null ? 'Needs a Marketplace eligibility review' : `${formatMoney(value.annualPremiumTaxCredit!)} across twelve identical months`,
            },
            {
              label: 'Income vs poverty guideline',
              value: `${formatNumber(value.incomePercentFpl, { maximumFractionDigits: 1 })}%`,
              note: `${formatMoney(value.povertyGuideline, 0)} guideline for ${householdSize} ${Number(householdSize) === 1 ? 'person' : 'people'}`,
            },
            {
              label: 'Your expected contribution',
              value: value.expectedMonthlyContribution === null ? 'Outside the table' : formatMoney(value.expectedMonthlyContribution),
              note: value.applicableContributionPercent === null
                ? 'The federal table runs from 100% to 400% of the guideline'
                // The IRS table is published to two decimals and this value is
                // interpolated between two of its entries, so 8.9985% must not
                // collapse to a bare "9%" that looks like a table entry.
                : `${formatNumber(value.applicableContributionPercent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% of household income, per month`,
            },
          ]} />
          <ResultDetails
            breakdown={result.breakdown}
            assumptions={result.assumptions}
            calculationVersion={result.calculationVersion}
            datasetSnapshotIds={result.datasetSnapshotIds}
          />
          {/*
            The subsidy range is a property of the household, not of the plan, so
            it stays visible whichever plan is priced above.
          */}
          <p className="health-range-note">
            At {householdSize} {Number(householdSize) === 1 ? 'person' : 'people'} in {US_STATES[stateCode]}, the 2026 credit runs from{' '}
            <strong>{formatMoney(value.minimumAnnualIncome, 0)}</strong> to <strong>{formatMoney(value.maximumAnnualIncome, 0)}</strong> of household income.
            Below that range, check Medicaid; above it, the plan is priced at full cost for 2026.
          </p>
        </div>
      )}
    </CalculatorPanel>
  );
}
