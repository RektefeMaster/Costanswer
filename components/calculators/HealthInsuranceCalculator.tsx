'use client';

import { useMemo, useState } from 'react';
import { calculateAcaSubsidy, type AcaSubsidyStatus } from '@/lib/calculations/aca-subsidy';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { acaSubsidySnapshot } from '@/lib/data/aca-subsidy';
import { costSharingLevelForIncome, parseEnrollingAges } from '@/lib/data/cms-marketplace';
import type { CmsReleaseSummary } from '@/lib/data/cms-marketplace-client';
import { useCmsQuote } from './useCmsQuote';
import { US_STATES, type StateCode } from '@/lib/location/states';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type Eligibility = 'assumed-eligible' | 'unknown' | 'ineligible';

/**
 * How firmly each outcome may be stated.
 *
 * Only `estimated` produces a credit this page will put in a headline. The two
 * null-credit outcomes are not zero-credit outcomes: someone below the income
 * range may qualify for Medicaid at no premium, and someone who has not checked
 * the coverage and filing conditions has no answer yet. Printing $0 of
 * assistance for either would be a claim the calculation did not make.
 */
const STATUS_LABELS: Record<AcaSubsidyStatus, { tag: string; tone: 'estimate' | 'review' }> = {
  estimated: { tag: 'Conditional estimate', tone: 'estimate' },
  'eligibility-unconfirmed': { tag: 'Eligibility not confirmed', tone: 'review' },
  'below-income-range': { tag: 'Below the subsidy income range', tone: 'review' },
  'above-income-range': { tag: 'Above the 400% FPL ceiling', tone: 'review' },
  ineligible: { tag: 'No credit in this scenario', tone: 'review' },
};

export function HealthInsuranceCalculator({ release }: { release: CmsReleaseSummary }) {
  const [zip, setZip] = useState('77002');
  const [chosenFips, setChosenFips] = useState('');
  const [enrollingAges, setEnrollingAges] = useState('40, 38, 10');
  const [householdSize, setHouseholdSize] = useState('3');
  const [annualHouseholdMagi, setAnnualHouseholdMagi] = useState('62000');
  const [eligibility, setEligibility] = useState<Eligibility>('assumed-eligible');
  const [benchmarkOverride, setBenchmarkOverride] = useState('');
  const [planOverride, setPlanOverride] = useState('');
  const [coverageMonths, setCoverageMonths] = useState('12');

  /*
   * Priced on the server. This page needs one county; the file covers 2,055,
   * and shipping all of them to answer for one was 3.8 MB in the browser.
   */
  const quote = useCmsQuote(zip, enrollingAges, chosenFips || undefined);
  const covered = quote.data?.status === 'covered' ? quote.data : null;
  const lookup = quote.data && 'lookup' in quote.data ? quote.data.lookup : null;
  const matches = covered?.lookup.counties ?? [];
  const county = matches.find((entry) => entry.countyFips === chosenFips) ?? matches[0];
  const parsedAges = useMemo(() => parseEnrollingAges(enrollingAges), [enrollingAges]);
  const ages = parsedAges.invalidTokens.length === 0 ? parsedAges.ages : [];
  /*
   * The poverty guideline depends on the state, and Alaska and Hawaii have their
   * own. Defaulting to a contiguous state when the ZIP names none would move the
   * credit by tens of dollars a month without saying so, so the calculation is
   * withheld instead.
   */
  const resolvedStateCode = county?.stateCode ?? lookup?.stateCodes[0] ?? null;

  /**
   * The benchmark and the sticker price of each metal level, for these ages in
   * this county. A typed override replaces the benchmark and, with it, the claim
   * that the figure came from the published file.
   */
  const quotes = useMemo(() => {
    if (!covered?.benchmark || ages.length === 0) return null;
    return {
      benchmark: covered.benchmark,
      bronze: covered.metals.bronze?.quote ?? null,
      silver: covered.metals.silver?.quote ?? null,
      gold: covered.metals.gold?.quote ?? null,
    };
  }, [covered, ages]);

  const overrideBenchmark = benchmarkOverride.trim() === '' ? null : Number(benchmarkOverride);
  const usedBenchmark = overrideBenchmark ?? quotes?.benchmark.premium ?? null;
  // Default the plan being priced to the cheapest Silver, the plan most people compare against.
  const usedPlan = planOverride.trim() !== '' ? Number(planOverride) : quotes?.silver?.premium ?? usedBenchmark;

  const calculation = useMemo(() => {
    if (usedBenchmark === null || usedPlan === null || usedPlan === undefined || resolvedStateCode === null) {
      return { result: null, error: '' };
    }
    if (annualHouseholdMagi.trim() === '' || householdSize.trim() === '' || coverageMonths.trim() === '') {
      return { result: null, error: '' };
    }
    try {
      return {
        result: calculateAcaSubsidy({
          coverageYear: 2026,
          stateCode: resolvedStateCode,
          householdSize: Number(householdSize),
          annualHouseholdMagi: Number(annualHouseholdMagi),
          monthlyBenchmarkPremium: usedBenchmark,
          monthlyPlanPremium: usedPlan,
          eligibility,
          coverageMonths: Number(coverageMonths),
          benchmarkSnapshotId: overrideBenchmark === null ? release.snapshotId : undefined,
          benchmarkAgesExact: overrideBenchmark === null ? quotes?.benchmark.exactForAges : undefined,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [resolvedStateCode, householdSize, annualHouseholdMagi, usedBenchmark, usedPlan, eligibility, coverageMonths, overrideBenchmark, quotes]);

  const result = calculation.result;
  const value = result?.value;
  const status = value ? STATUS_LABELS[value.status] : null;
  const hasCredit = value?.monthlyNetPremium !== null && value?.monthlyNetPremium !== undefined;
  const credit = value?.monthlyPremiumTaxCredit ?? null;
  const csrLevel = value && value.status === 'estimated' ? costSharingLevelForIncome(value.incomePercentFpl) : null;
  const csr = covered && csrLevel ? covered.costSharing[csrLevel] ?? null : null;
  const standardSilver = covered?.metals.silver?.summary ?? null;
  const afterCredit = (full: number | null | undefined) =>
    full === null || full === undefined || credit === null ? null : Math.max(0, Math.round((full - credit) * 100) / 100);

  return (
    <CalculatorPanel
      title="Your 2026 premium after the credit"
      intro="Enter a ZIP code and who is enrolling. The benchmark that sizes your credit is read from the plan-year file CMS published for your county."
      toolId="health-insurance"
      category="money"
      calculationState={result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([zip, chosenFips, enrollingAges, householdSize, annualHouseholdMagi, eligibility, benchmarkOverride, planOverride, coverageMonths])}
    >
      <div className="data-callout">
        <span>2026 PLAN YEAR</span>
        <p>
          <strong>CMS county plan filings · IRS contribution table · HHS {acaSubsidySnapshot.povertyGuidelineYear} guidelines</strong>
          <small>{release.snapshotId} · {acaSubsidySnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="ZIP code" htmlFor="health-zip" hint={`Premiums are filed by county. ${release.countyCount.toLocaleString('en-US')} counties across ${release.coveredStateCount} HealthCare.gov states are priced here.`}>
          <InputShell>
            <input id="health-zip" type="text" inputMode="numeric" maxLength={5} value={zip} onChange={(event) => { setZip(event.target.value); setChosenFips(''); }} />
          </InputShell>
        </Field>
        <Field label="Ages of everyone enrolling" htmlFor="health-ages" hint="Separate with commas. Premiums are per person; at most the three oldest children under 21 are charged.">
          <InputShell>
            <input id="health-ages" type="text" inputMode="numeric" value={enrollingAges} onChange={(event) => setEnrollingAges(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="People in your tax household" htmlFor="health-household" hint="Everyone on the return, whether or not they are enrolling. This sets the poverty guideline, not the premium.">
          <InputShell>
            <input id="health-household" type="number" min="1" max="30" step="1" value={householdSize} onChange={(event) => setHouseholdSize(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Expected 2026 household income (MAGI)" htmlFor="health-magi" hint="Modified adjusted gross income for the coverage year. Not take-home pay and not last year's return.">
          <InputShell prefix="$">
            <input id="health-magi" type="number" min="0" step="1000" value={annualHouseholdMagi} onChange={(event) => setAnnualHouseholdMagi(event.target.value)} />
          </InputShell>
        </Field>
      </div>

      {/*
        A ZIP that straddles a county line has to be resolved by the reader:
        two counties in one ZIP can file different benchmarks and so different
        credits, and picking one silently would hide that.
      */}
      {lookup?.status === 'covered' && matches.length > 1 && (
        <div className="health-county-choice">
          <p>ZIP {zip} spans {matches.length} counties, which file separately.</p>
          <div className="mode-tabs">
            {matches.map((entry) => (
              <button key={entry.countyFips} type="button" aria-pressed={entry.countyFips === county?.countyFips}
                className={entry.countyFips === county?.countyFips ? 'active' : ''}
                onClick={() => setChosenFips(entry.countyFips)}>{entry.countyName}</button>
            ))}
          </div>
        </div>
      )}
      {lookup?.status === 'not-in-this-release' && (
        <div className="health-status health-status-review" role="status">
          <span>Priced by a state exchange</span>
          <ul>
            <li>
              {lookup?.stateCodes.map((code) => US_STATES[code as StateCode]).join(' and ') || 'This state'} runs its own Marketplace and files premiums separately, so this release carries no plans for it.
              The credit rules below are federal and still apply: enter your own benchmark premium to use them.
            </li>
          </ul>
        </div>
      )}
      {lookup?.status === 'unknown-zip' && zip.trim() !== '' && (
        <div className="health-status health-status-review" role="status">
          <span>ZIP not recognised</span>
          <ul><li>Enter a five-digit ZIP code that the Census ZCTA file maps to a county.</li></ul>
        </div>
      )}
      {county && (
        <p className="data-footnote">
          Pricing {county.countyName} County, {US_STATES[county.stateCode]} · rating area {county.ratingArea} · {county.planCount} plans filed, {county.silverPlanCount} of them Silver
          {county.ageCurve === 'state-filed' && ' · this state files its own adult age curve, so adult premiums are quoted at the nearest published age'}
          {county.childAgeCurve === 'state-filed' && ' · under-21 rates are filed separately here, so an age between the published ones is quoted at the nearest of them'}
        </p>
      )}
      {quotes && !quotes.benchmark.exactForAges && (
        <p className="data-footnote">
          Premiums for this county are published at set ages only, so an age between them is quoted at the nearest published one on the same side of 21.
          The credit below is sized from that quoted figure, not from an unpublished exact premium.
        </p>
      )}
      {quotes && quotes.benchmark.unbilledChildCount > 0 && (
        <p className="data-footnote">
          {quotes.benchmark.unbilledChildCount} {quotes.benchmark.unbilledChildCount === 1 ? 'child is' : 'children are'} not charged a premium: the federal rules bill at most the three oldest children under 21.
        </p>
      )}

      <AdvancedSection
        id="own-premiums"
        title="Use your own premiums, or a partial year"
        hint="Only if they apply to you"
      >
        <div className="calc-form-grid">
          <Field label="Your own benchmark premium" htmlFor="health-benchmark" hint={quotes ? `Leave blank to use the ${formatMoney(quotes.benchmark.premium)} filed for this county${quotes.benchmark.exactForAges ? ' and these ages' : ', quoted at the nearest published ages'}.` : 'The second-lowest-cost Silver premium for the people enrolling.'}>
            <InputShell prefix="$">
              <input id="health-benchmark" type="number" min="0" step="25" placeholder={quotes ? String(quotes.benchmark.premium) : ''} value={benchmarkOverride} onChange={(event) => setBenchmarkOverride(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="The plan you want, per month" htmlFor="health-plan" hint={quotes?.silver ? `Leave blank to price the cheapest Silver plan, ${formatMoney(quotes.silver.premium)}.` : 'Full price before any credit.'}>
            <InputShell prefix="$">
              <input id="health-plan" type="number" min="0" step="25" placeholder={quotes?.silver ? String(quotes.silver.premium) : ''} value={planOverride} onChange={(event) => setPlanOverride(event.target.value)} />
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
          <Field label="Months of coverage in 2026" htmlFor="health-months" hint="Twelve for a full year. A shorter period is totalled separately; your annual income is not reduced to match.">
            <InputShell>
              <input id="health-months" type="number" min="1" max="12" step="1" value={coverageMonths} onChange={(event) => setCoverageMonths(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </AdvancedSection>

      {calculation.error && <InlineError message={calculation.error} />}
      {parsedAges.invalidTokens.length > 0 && (
        <InlineError message={`Ages must be whole numbers of years. “${parsedAges.invalidTokens.join(', ')}” is not an age.`} />
      )}
      {county && ages.length === 0 && parsedAges.invalidTokens.length === 0 && (
        <InlineError message="Enter the ages of everyone enrolling, as whole numbers separated by commas." />
      )}
      {result && value && status && (
        <div className="calculation-output">
          <PrimaryResult
            label={!hasCredit ? 'Full monthly premium, no credit estimated'
              : credit === 0 ? 'Your monthly premium, with no credit in this scenario'
                : 'Your monthly premium after the credit'}
            value={formatMoney(hasCredit ? value.monthlyNetPremium! : value.monthlyPlanPremium)}
            note={hasCredit
              ? `${formatMoney(value.coveragePeriodNetPremium!)} over ${value.coverageMonths} month${value.coverageMonths === 1 ? '' : 's'}${county ? ` · ${county.countyName} County, ${US_STATES[county.stateCode]}` : ''}`
              : 'The credit is not estimated in this scenario. Read why below.'}
          />
          <div className={`health-status health-status-${status.tone}`} role="status">
            <span>{status.tag}</span>
            <ul>{value.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
          <StatGrid items={[
            {
              label: 'Monthly premium tax credit',
              value: credit === null ? 'Not estimated' : formatMoney(credit),
              note: credit === null ? 'Needs a Marketplace eligibility review' : `${formatMoney(value.annualPremiumTaxCredit!)} across twelve identical months`,
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

          {/*
            The credit is a fixed number of dollars, so it buys down a cheap plan
            further than an expensive one. Showing all three metal levels against
            the same credit is the comparison the sticker prices hide.
          */}
          {quotes && credit !== null && credit > 0 && (
            <div className="health-metal-table">
              <table>
                <caption>Cheapest plan at each metal level, before and after your {formatMoney(credit)} credit</caption>
                <thead><tr><th scope="col">Level</th><th scope="col">Full premium</th><th scope="col">After credit</th></tr></thead>
                <tbody>
                  {([['Bronze', quotes.bronze], ['Silver', quotes.silver], ['Gold', quotes.gold]] as const).map(([label, quote]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{quote ? formatMoney(quote.premium) : 'None filed'}</td>
                      <td>{quote ? formatMoney(afterCredit(quote.premium)!) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>A credit is a fixed dollar amount, not a percentage off. It cannot exceed the plan you enrol in, so a plan cheaper than your credit costs nothing rather than paying you.</p>
            </div>
          )}

          {/*
            Cost-sharing reductions are the half of the answer a premium hides.
            They arrive only on a Silver plan and only by income, so someone who
            buys Bronze for the lower premium can be giving up a much lower
            deductible without ever being told.
          */}
          {csr && csrLevel && (
            <div className="health-status health-status-estimate" role="status">
              <span>Extra savings on Silver: the {csrLevel}% variant</span>
              <ul>
                <li>
                  At {formatNumber(value.incomePercentFpl, { maximumFractionDigits: 1 })}% of the poverty guideline, a Silver plan is upgraded to its {csrLevel}% cost-sharing variant at no extra premium.
                  In this county those variants carry a median deductible of {formatMoney(csr.individualDeductible.median, 0)}
                  {standardSilver && ` against ${formatMoney(standardSilver.individualDeductible.median, 0)} on standard Silver`}, and a median out-of-pocket maximum of {formatMoney(csr.individualMaximumOutOfPocket.median, 0)}
                  {standardSilver && ` against ${formatMoney(standardSilver.individualMaximumOutOfPocket.median, 0)}`}.
                </li>
                <li>This applies to Silver only. Choosing Bronze for the lower premium gives it up, which is the trade-off a premium comparison alone does not show.</li>
              </ul>
            </div>
          )}

          {/*
            The audit names every release that put a number on this screen. The
            engine claims the county filing only when the benchmark came from it,
            but a typed benchmark leaves the plan premium still read from CMS, and
            a reader checking that figure has to be able to find its source.
          */}
          <ResultDetails
            breakdown={result.breakdown}
            assumptions={result.assumptions}
            calculationVersion={result.calculationVersion}
            datasetSnapshotIds={quotes
              ? [...new Set([...result.datasetSnapshotIds, release.snapshotId])]
              : result.datasetSnapshotIds}
          />
          <p className="health-range-note">
            At {householdSize} {Number(householdSize) === 1 ? 'person' : 'people'}, the 2026 credit runs from{' '}
            <strong>{formatMoney(value.minimumAnnualIncome, 0)}</strong> to <strong>{formatMoney(value.maximumAnnualIncome, 0)}</strong> of household income.
            Below that range, check Medicaid; above it, the plan is priced at full cost for 2026.
          </p>
        </div>
      )}
    </CalculatorPanel>
  );
}
