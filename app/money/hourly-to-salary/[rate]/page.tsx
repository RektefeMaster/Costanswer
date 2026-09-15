import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { TrackedNextStep } from '@/components/analytics/LinkSurface';
import { breadcrumbJsonLd, faqPageJsonLd, pageMetadata, buildSerpTitle } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import { HourlySalaryCalculator } from '@/components/calculators/money/HourlySalaryCalculator';
import {
  HOURLY_RATES,
  getHourlyWageProfile,
  hourlyToSlug,
  slugToHourly,
} from '@/lib/matrices/wage-matrix-data';

type Props = {
  params: Promise<{ rate: string }>;
};

export async function generateStaticParams() {
  return HOURLY_RATES.map((rate) => ({ rate: hourlyToSlug(rate) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rate: slug } = await params;
  const rateNumber = slugToHourly(slug);
  if (!rateNumber) return {};

  const profile = getHourlyWageProfile(rateNumber);
  const title = buildSerpTitle(`$${rateNumber} an Hour Is How Much a Year?`, 'evergreen');
  const description = `$${rateNumber} an hour is $${profile.annualGross.toLocaleString()} per year before taxes, $${profile.monthlyGross.toLocaleString()} per month, and $${profile.biweeklyGross.toLocaleString()} biweekly. Compare 50-state take-home pay, overtime, cost of living purchasing power, and budget guidelines.`;
  const path = `/money/hourly-to-salary/${slug}` as `/${string}`;

  return pageMetadata(title, description, path);
}

function money(val: number, decimals = 0): string {
  return val.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function HourlyRateMatrixPage({ params }: Props) {
  const { rate: slug } = await params;
  const rateNumber = slugToHourly(slug);
  if (!rateNumber) notFound();

  const profile = getHourlyWageProfile(rateNumber);
  const pagePath = `/money/hourly-to-salary/${slug}` as `/${string}`;

  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Money', path: '/topics/money' },
    { name: 'Hourly to Salary', path: '/money/hourly-to-salary' },
    { name: `$${rateNumber} an Hour`, path: pagePath },
  ];

  const txTakeHome = profile.stateTaxes.find((s) => s.stateCode === 'TX');
  const caTakeHome = profile.stateTaxes.find((s) => s.stateCode === 'CA');

  const faqs = [
    {
      question: `How much is $${rateNumber} an hour annually?`,
      answer: `$${rateNumber} an hour equals ${money(profile.annualGross)} per year before taxes for a full-time schedule of 40 hours per week and 52 weeks worked (2,080 hours). With 2 weeks of unpaid vacation (50 weeks worked), it equals ${money(rateNumber * 2000)}.`,
    },
    {
      question: `How much is $${rateNumber} an hour monthly and biweekly?`,
      answer: `At $${rateNumber} an hour, gross monthly pay is ${money(profile.monthlyGross)} across 12 calendar months. Your biweekly paycheck (every two weeks, 26 paychecks per year) is ${money(profile.biweeklyGross, 2)} before deductions.`,
    },
    {
      question: `Is $${rateNumber} an hour a good wage in 2026?`,
      answer: `At ${money(profile.annualGross)} per year, $${rateNumber} an hour puts you in approximately the ${profile.percentileData.percentile}th percentile of individual wage earners in the United States, placing you in the ${profile.percentileData.classStatus}. It ${profile.percentileData.isLivingWageSingle ? 'comfortably exceeds' : 'approaches'} the living wage for a single adult in most U.S. states.`,
    },
    {
      question: `What is time and a half for $${rateNumber} an hour?`,
      answer: `Time and a half (1.5x) for $${rateNumber} an hour is ${money(profile.overtime.timeAndHalfRate, 2)} per overtime hour. Double time (2.0x) is ${money(profile.overtime.doubleTimeRate, 2)} per hour. Working 5 hours of overtime each week adds ${money(profile.overtime.scenarios[0].extraAnnualGross)} per year, raising your gross income to ${money(profile.overtime.scenarios[0].totalAnnualGross)}.`,
    },
    {
      question: `How much is $${rateNumber} an hour after taxes in 2026?`,
      answer: `For a single filer claiming the standard deduction in 2026, estimated take-home pay on $${rateNumber}/hour ranges from approximately ${money(caTakeHome?.annualNet ?? profile.annualGross * 0.75)} per year in California to ${money(txTakeHome?.annualNet ?? profile.annualGross * 0.82)} per year in states with no state income tax like Texas and Florida.`,
    },
    {
      question: `How much rent can you afford on $${rateNumber} an hour?`,
      answer: `Following the standard 30% rule of thumb, you can safely spend up to ${money(profile.housingGuideline.maxRentMonthly)} per month on rent or total housing costs.`,
    },
    {
      question: `Can you buy a house on $${rateNumber} an hour?`,
      answer: `Yes, depending on debt and local property taxes, a ${money(profile.annualGross)} income commonly qualifies for a home between ${money(profile.housingGuideline.affordabilityHomeRange[0])} and ${money(profile.housingGuideline.affordabilityHomeRange[1])}, keeping your monthly mortgage payment below the 28% front-end guideline of ${money(profile.housingDeep.frontEndMonthlyBudget)}/month.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          faqPageJsonLd(
            faqs.map((f) => ({ question: f.question, answer: [f.answer] })),
            `/money/hourly-to-salary/${hourlyToSlug(rateNumber)}`,
          ),
        ]}
      />
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="wage-matrix-page">
        {/* Direct Answer Hero Section (Top 300-500px) */}
        <header className="tool-hero accent-mint">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={item.path}>
                {index > 0 && <b aria-hidden="true">/</b>}
                {index === breadcrumbs.length - 1
                  ? <span aria-current="page">{item.name}</span>
                  : <Link href={item.path}>{item.name}</Link>}
              </span>
            ))}
          </nav>

          <div className="tool-hero-grid">
            <div>
              <p className="eyebrow"><span /> Hourly to Salary Wage Conversion</p>
              <h1>${rateNumber} an Hour Is How Much a Year?</h1>
            </div>
            <div className="tool-intro">
              <p className="matrix-direct-answer">
                <strong>${rateNumber} an hour</strong> equals <strong>{money(profile.annualGross)} per year</strong> before taxes,
                assuming a full-time schedule of 40 hours per week across 52 weeks (2,080 working hours per year).
              </p>

              <div className="matrix-reciprocal-badge">
                <span>Looking for after-tax take-home pay?</span>
                <Link href={`/money/salary-after-tax/${profile.closestSalarySlug}`}>
                  See ${Math.round(profile.closestSalaryAmount / 1000)}k Salary After Tax Breakdown →
                </Link>
              </div>

              <dl className="matrix-hero-highlights">
                <div>
                  <dt>Annual Gross</dt>
                  <dd>{money(profile.annualGross)}</dd>
                </div>
                <div>
                  <dt>Monthly Gross</dt>
                  <dd>{money(profile.monthlyGross)}</dd>
                </div>
                <div>
                  <dt>Biweekly Paycheck</dt>
                  <dd>{money(profile.biweeklyGross, 2)}</dd>
                </div>
                <div>
                  <dt>Overtime (1.5x)</dt>
                  <dd>{money(profile.overtime.timeAndHalfRate, 2)}/hr</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        {/* Quick-Jump Neighboring Wages Bar */}
        <nav className="matrix-quick-bar" aria-label="Quick jump to other hourly wages">
          <span className="matrix-quick-label">Jump to rate:</span>
          <div className="matrix-quick-pills">
            {profile.neighboringRates.nearby.map((r) => (
              <Link
                key={r}
                href={`/money/hourly-to-salary/${hourlyToSlug(r)}`}
                className={`matrix-quick-pill ${r === rateNumber ? 'is-active' : ''}`}
                aria-current={r === rateNumber ? 'page' : undefined}
              >
                ${r}/hr
              </Link>
            ))}
          </div>
        </nav>

        <div className="tool-layout">
          <section className="tool-primary-flow">
            {/* Pay Frequency Breakdown Table */}
            <article className="matrix-card">
              <h2>${rateNumber} an Hour Pay Frequency Breakdown</h2>
              <p className="matrix-card-desc">
                Here is how <strong>${rateNumber} per hour</strong> translates across standard pay periods before taxes:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Pay Period</th>
                      <th scope="col">Working Hours</th>
                      <th scope="col">Gross Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Hourly</th>
                      <td>1 hour</td>
                      <td><strong>{money(profile.rate, 2)}</strong></td>
                    </tr>
                    <tr>
                      <th scope="row">Daily</th>
                      <td>8 hours</td>
                      <td>{money(profile.dailyGross, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Weekly</th>
                      <td>40 hours</td>
                      <td>{money(profile.weeklyGross, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Biweekly (Every 2 Weeks)</th>
                      <td>80 hours</td>
                      <td><strong>{money(profile.biweeklyGross, 2)}</strong></td>
                    </tr>
                    <tr>
                      <th scope="row">Semi-Monthly (Twice a Month)</th>
                      <td>86.67 hours</td>
                      <td>{money(profile.semiMonthlyGross, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Monthly</th>
                      <td>173.33 hours</td>
                      <td><strong>{money(profile.monthlyGross, 2)}</strong></td>
                    </tr>
                    <tr>
                      <th scope="row">Annual (52 Weeks)</th>
                      <td>2,080 hours</td>
                      <td><strong>{money(profile.annualGross)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* Income Percentile & Middle Class Benchmark */}
            <article className="matrix-card">
              <h2>Is ${rateNumber} an Hour Good? Income Percentile & Status</h2>
              <p className="matrix-card-desc">
                How a <strong>{money(profile.annualGross)}/year</strong> income compares against all individual workers in the United States:
              </p>
              <div className="matrix-percentile-grid">
                <div className="matrix-percentile-box is-highlight">
                  <span className="matrix-stat-eyebrow">Income Percentile</span>
                  <strong>{profile.percentileData.percentile}th Percentile</strong>
                  <p>{profile.percentileData.nationalComparison}</p>
                </div>
                <div className="matrix-percentile-box">
                  <span className="matrix-stat-eyebrow">Socioeconomic Class</span>
                  <strong>{profile.percentileData.classStatus}</strong>
                  <p>Based on Pew Research and U.S. Census median household income definitions.</p>
                </div>
                <div className="matrix-percentile-box">
                  <span className="matrix-stat-eyebrow">Living Wage Benchmark</span>
                  <strong>{profile.percentileData.isLivingWageSingle ? 'Above Living Wage' : 'Near Threshold'}</strong>
                  <p>
                    {profile.percentileData.isLivingWageSingle
                      ? `Exceeds the national living wage threshold for a single adult (${money(38000)}/yr).`
                      : `Meets entry-level living costs in low-to-moderate cost regions.`}
                  </p>
                </div>
              </div>
            </article>

            {/* Regional Cost of Living & Real Purchasing Power */}
            <article className="matrix-card">
              <h2>Cost of Living on ${rateNumber}/Hour: What It Buys by State</h2>
              <p className="matrix-card-desc">
                A dollar does not buy the same amount everywhere. Based on official Bureau of Economic Analysis (BEA) Regional Price Parities (RPP), here is the real purchasing power of ${rateNumber}/hour:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">State</th>
                      <th scope="col">Cost of Living Tier</th>
                      <th scope="col">BEA Price Index</th>
                      <th scope="col">Effective Purchasing Power</th>
                      <th scope="col">Real Annual Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.purchasingPower.map((rpp) => (
                      <tr key={rpp.stateCode}>
                        <th scope="row"><strong>{rpp.stateName}</strong></th>
                        <td>
                          <span className={rpp.costOfLivingTier === 'Low Cost' ? 'matrix-tag-green' : rpp.costOfLivingTier === 'High Cost' ? 'matrix-tag-rose' : 'matrix-tag-neutral'}>
                            {rpp.costOfLivingTier}
                          </span>
                        </td>
                        <td>{rpp.rppIndex.toFixed(1)}</td>
                        <td><strong>{money(rpp.adjustedEquivalentWage, 2)}/hr</strong></td>
                        <td><strong>{money(rpp.adjustedEquivalentAnnual)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="matrix-footnote">
                Source: U.S. Bureau of Economic Analysis Regional Price Parities. Indices above 100 represent higher-than-average living costs.
              </p>
            </article>

            {/* Work Schedule & Unpaid Vacation Scenarios */}
            <article className="matrix-card">
              <h2>Work Hours & Vacation Scenarios for ${rateNumber}/Hour</h2>
              <p className="matrix-card-desc">
                Not everyone works exactly 2,080 hours. Here is your projected gross earnings across common work schedules and unpaid leave:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Schedule Scenario</th>
                      <th scope="col">Annual Hours</th>
                      <th scope="col">Biweekly</th>
                      <th scope="col">Monthly</th>
                      <th scope="col">Annual Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.workScenarios.map((sc) => (
                      <tr key={sc.label}>
                        <th scope="row">
                          <strong>{sc.label}</strong>
                          <small className="matrix-subtext">{sc.description}</small>
                        </th>
                        <td>{sc.annualHours.toLocaleString()} hrs</td>
                        <td>{money(sc.biweeklyGross, 2)}</td>
                        <td>{money(sc.monthlyGross, 2)}</td>
                        <td><strong>{money(sc.annualGross)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Overtime & Time-and-a-Half Calculator Table */}
            <article className="matrix-card">
              <h2>Overtime Pay & Time and a Half for ${rateNumber}/Hour</h2>
              <p className="matrix-card-desc">
                Under the Fair Labor Standards Act (FLSA), non-exempt employees earn 1.5 times their regular hourly rate for hours worked over 40 in a workweek:
              </p>
              <div className="matrix-overtime-summary">
                <div className="matrix-rate-pill">
                  <span>Regular Rate</span>
                  <strong>{money(profile.overtime.baseRate, 2)}/hr</strong>
                </div>
                <div className="matrix-rate-pill is-highlight">
                  <span>Time and a Half (1.5x)</span>
                  <strong>{money(profile.overtime.timeAndHalfRate, 2)}/hr</strong>
                </div>
                <div className="matrix-rate-pill">
                  <span>Double Time (2.0x)</span>
                  <strong>{money(profile.overtime.doubleTimeRate, 2)}/hr</strong>
                </div>
              </div>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Overtime Schedule</th>
                      <th scope="col">Weekly Gross</th>
                      <th scope="col">Monthly Gross</th>
                      <th scope="col">Extra Annual Pay</th>
                      <th scope="col">Total Annual Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.overtime.scenarios.map((ot) => (
                      <tr key={ot.overtimeHoursPerWeek}>
                        <th scope="row">
                          <strong>+{ot.overtimeHoursPerWeek} hrs Overtime / week</strong>
                          <small className="matrix-subtext">{40 + ot.overtimeHoursPerWeek} total weekly hours</small>
                        </th>
                        <td>{money(ot.totalWeeklyGross, 2)}</td>
                        <td>{money(ot.totalMonthlyGross, 2)}</td>
                        <td><span className="matrix-positive-tag">+{money(ot.extraAnnualGross)}</span></td>
                        <td><strong>{money(ot.totalAnnualGross)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Single vs Married Filing Jointly vs Head of Household */}
            <article className="matrix-card">
              <h2>Take-Home Pay by Tax Filing Status (2026)</h2>
              <p className="matrix-card-desc">
                Your federal income tax liability and standard deduction change significantly based on your filing status:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Filing Status</th>
                      <th scope="col">Federal Tax</th>
                      <th scope="col">FICA (SS & Medicare)</th>
                      <th scope="col">Biweekly Take-Home</th>
                      <th scope="col">Monthly Net</th>
                      <th scope="col">Annual Net</th>
                      <th scope="col">Tax Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.filingStatuses.map((fs) => (
                      <tr key={fs.filingStatus}>
                        <th scope="row"><strong>{fs.filingStatus}</strong></th>
                        <td>{money(fs.federalTax)}</td>
                        <td>{money(fs.ficaTax)}</td>
                        <td>{money(fs.estimatedNetBiweekly, 2)}</td>
                        <td><strong>{money(fs.estimatedNetMonthly)}</strong></td>
                        <td><strong>{money(fs.estimatedNetAnnual)}</strong></td>
                        <td>
                          {fs.taxSavingsVsSingle > 0 ? (
                            <span className="matrix-positive-tag">+{money(fs.taxSavingsVsSingle)}/yr</span>
                          ) : (
                            <span className="matrix-subtext">Baseline</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TrackedNextStep href="/money/paycheck" target="paycheck">
                Run this against your own W-4 and pre-tax deductions &rarr;
              </TrackedNextStep>
            </article>

            {/* Long-Term Compound Wealth & Retirement Projection */}
            <article className="matrix-card">
              <h2>Can You Become a Millionaire on ${rateNumber}/Hour?</h2>
              <p className="matrix-card-desc">
                Assuming a historical 7% real annual return (S&P 500 index fund after inflation), here is how saving 10% or 15% of a <strong>{money(profile.annualGross)}</strong> salary compounds over time:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Investment Horizon</th>
                      <th scope="col">10% Savings Rate ({money(profile.retirementWealth.monthlySavings10)}/mo)</th>
                      <th scope="col">15% Savings Rate ({money(profile.retirementWealth.monthlySavings15)}/mo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.retirementWealth.milestones.map((m) => (
                      <tr key={m.years}>
                        <th scope="row"><strong>{m.years} Years</strong></th>
                        <td><strong>{money(m.totalSaved10Percent)}</strong></td>
                        <td><strong className="matrix-wealth-highlight">{money(m.totalSaved15Percent)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="matrix-footnote">
                Assumes monthly contributions invested in low-cost, diversified index funds compounding at 7% real annual return. Employer 401(k) matches accelerate these totals significantly.
              </p>
              <TrackedNextStep href="/money/401k" target="retirement">
                Put a real contribution rate and employer match against it &rarr;
              </TrackedNextStep>
            </article>

            {/* Top 6 States Quick Comparison Cards */}
            <article className="matrix-card">
              <h2>${rateNumber} an Hour Take-Home Pay in Major States (2026)</h2>
              <p className="matrix-card-desc">
                Estimated net take-home pay on a <strong>{money(profile.annualGross)}</strong> salary for single filers claiming the standard deduction:
              </p>
              <div className="matrix-top-states-grid">
                {profile.topStates.map((st) => (
                  <div key={st.stateCode} className="matrix-state-card">
                    <div className="matrix-state-header">
                      <strong>{st.stateName}</strong>
                      <span className={st.stateTax === 0 ? 'matrix-tag-green' : 'matrix-tag-neutral'}>
                        {st.stateTax === 0 ? '0% State Tax' : `${st.effectiveRate.toFixed(1)}% Total Tax`}
                      </span>
                    </div>
                    <div className="matrix-state-amounts">
                      <div>
                        <span>Net Monthly</span>
                        <strong>{money(st.monthlyNet)}</strong>
                      </div>
                      <div>
                        <span>Net Annual</span>
                        <strong>{money(st.annualNet)}</strong>
                      </div>
                    </div>
                    <div className="matrix-state-taxes">
                      <small>Fed: {money(st.federalTax)} • FICA: {money(st.ficaTax)} • State: {st.stateTax === 0 ? '$0' : money(st.stateTax)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* 50-State After-Tax Take-Home Table */}
            <article className="matrix-card">
              <h2>${rateNumber} an Hour After Taxes in All 50 States (2026)</h2>
              <p className="matrix-card-desc">
                Full 50-state + D.C. breakdown for a single filer with no dependents taking the standard deduction in 2026:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">State</th>
                      <th scope="col">Federal Tax</th>
                      <th scope="col">FICA</th>
                      <th scope="col">State Tax</th>
                      <th scope="col">Effective Rate</th>
                      <th scope="col">Net Monthly</th>
                      <th scope="col">Net Annual Take-Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.stateTaxes.map((row) => (
                      <tr key={row.stateCode}>
                        <th scope="row">
                          <Link href={`/salary/states/${row.stateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                            {row.stateName}
                          </Link>
                        </th>
                        <td>{money(row.federalTax)}</td>
                        <td>{money(row.ficaTax)}</td>
                        <td>{row.stateTax === 0 ? '$0' : money(row.stateTax)}</td>
                        <td>{row.effectiveRate.toFixed(1)}%</td>
                        <td><strong>{money(row.monthlyNet)}</strong></td>
                        <td><strong>{money(row.annualNet)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Knowledge Bridge: Matching BLS Occupations */}
            {profile.matchedOccupations.length > 0 && (
              <article className="matrix-card">
                <h2>Occupations That Pay Around ${rateNumber} an Hour</h2>
                <p className="matrix-card-desc">
                  Based on published U.S. Bureau of Labor Statistics (BLS) survey data, these occupations have a national median wage near <strong>{money(profile.annualGross)} per year</strong>:
                </p>
                <ul className="matrix-job-grid">
                  {profile.matchedOccupations.map((job) => (
                    <li key={job.code} className="matrix-job-card">
                      <Link href={job.path}>
                        <strong>{job.title}</strong>
                        <span>Median: {money(job.medianAnnual)}/year</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {/* Secondary: Itemized Budget & Housing Guidelines */}
            <article className="matrix-card">
              <h2>Budgeting on ${rateNumber} an Hour: 50/30/20 Rule</h2>
              <p className="matrix-card-desc">
                A realistic itemized monthly living allocation on a gross income of <strong>{money(profile.monthlyGross)}/month</strong> ({money(profile.annualGross)}/year):
              </p>
              <div className="matrix-budget-grid">
                <div className="matrix-budget-item">
                  <span className="matrix-budget-tag">Needs (50%)</span>
                  <strong>{money(profile.itemizedBudget.needsMonthly)}/mo</strong>
                  <ul className="matrix-itemized-list">
                    <li><span>Max Recommended Rent (30%):</span> <b>{money(profile.itemizedBudget.needsBreakdown.housingMax)}</b></li>
                    <li><span>Groceries & Food:</span> <b>{money(profile.itemizedBudget.needsBreakdown.groceries)}</b></li>
                    <li><span>Utilities, Phone & Internet:</span> <b>{money(profile.itemizedBudget.needsBreakdown.utilitiesPhone)}</b></li>
                    <li><span>Auto & Transportation:</span> <b>{money(profile.itemizedBudget.needsBreakdown.transportation)}</b></li>
                    <li><span>Healthcare & Medical:</span> <b>{money(profile.itemizedBudget.needsBreakdown.healthcare)}</b></li>
                  </ul>
                </div>
                <div className="matrix-budget-item">
                  <span className="matrix-budget-tag">Wants (30%)</span>
                  <strong>{money(profile.itemizedBudget.wantsMonthly)}/mo</strong>
                  <p className="matrix-budget-detail">
                    {money(profile.itemizedBudget.wantsAnnual)}/year for dining out, streaming, travel, entertainment, and personal hobbies.
                  </p>
                </div>
                <div className="matrix-budget-item">
                  <span className="matrix-budget-tag">Savings & Debt (20%)</span>
                  <strong>{money(profile.itemizedBudget.savingsMonthly)}/mo</strong>
                  <p className="matrix-budget-detail">
                    {money(profile.itemizedBudget.savingsAnnual)}/year for emergency fund, 401(k) / IRA contributions, and paying down debt.
                  </p>
                </div>
              </div>

              <div className="matrix-housing-note">
                <h3>Home Purchasing Power & Mortgage Affordability</h3>
                <p>
                  At ${rateNumber}/hour ({money(profile.annualGross)}/year), standard mortgage lending guidelines suggest:
                </p>
                <div className="matrix-mortgage-limits">
                  <div>
                    <span>Front-End Limit (28%)</span>
                    <strong>{money(profile.housingDeep.frontEndMonthlyBudget)}/mo</strong>
                    <small>Maximum recommended monthly mortgage (P&I, taxes, insurance)</small>
                  </div>
                  <div>
                    <span>Back-End Limit (36%)</span>
                    <strong>{money(profile.housingDeep.backEndMonthlyBudget)}/mo</strong>
                    <small>Maximum total debt payments (mortgage + student loans + auto)</small>
                  </div>
                </div>

                <div className="matrix-table-wrap">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th scope="col">Down Payment</th>
                        <th scope="col">Estimated Home Price</th>
                        <th scope="col">Down Payment Amount</th>
                        <th scope="col">Loan Amount</th>
                        <th scope="col">Est. Monthly Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.housingDeep.scenarios.map((sc) => (
                        <tr key={sc.downPaymentPercent}>
                          <th scope="row"><strong>{sc.downPaymentPercent}% Down</strong></th>
                          <td>{money(sc.estimatedHomePrice)}</td>
                          <td>{money(sc.downPaymentAmount)}</td>
                          <td>{money(sc.loanAmount)}</td>
                          <td><strong>{money(sc.estimatedMonthlyPayment)}/mo</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TrackedNextStep href="/money/home-affordability" target="housing">
                  Calculate your exact home affordability with today&apos;s mortgage rates &rarr;
                </TrackedNextStep>
              </div>
            </article>

            {/* Adjacent Micro-Wage Step Table */}
            <article className="matrix-card">
              <h2>Nearby Hourly Wage Conversions</h2>
              <p className="matrix-card-desc">
                Quick comparison of pay across adjacent hourly rates:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Hourly Rate</th>
                      <th scope="col">Weekly Gross</th>
                      <th scope="col">Biweekly Gross</th>
                      <th scope="col">Monthly Gross</th>
                      <th scope="col">Annual Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.microSteps.map((ms) => (
                      <tr key={ms.rate} className={ms.isCurrent ? 'is-current-row' : ''}>
                        <th scope="row">
                          {ms.isCurrent ? (
                            <strong>${ms.rate}/hr (Current)</strong>
                          ) : (
                            <Link href={`/money/hourly-to-salary/${hourlyToSlug(ms.rate)}`}>
                              ${ms.rate}/hr
                            </Link>
                          )}
                        </th>
                        <td>{money(ms.weeklyGross, 2)}</td>
                        <td>{money(ms.biweeklyGross, 2)}</td>
                        <td>{money(ms.monthlyGross, 2)}</td>
                        <td><strong>{money(ms.annualGross)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Interactive Calculator Pre-filled */}
            <article className="matrix-card">
              <h2>Customize Your Hours & Overtime</h2>
              <p className="matrix-card-desc">
                Adjust work hours, overtime rate, or unpaid vacation weeks to see your custom annual projection:
              </p>
              <HourlySalaryCalculator initialRate={String(rateNumber)} />
            </article>

            {/* FAQs */}
            <article className="matrix-card">
              <h2>Frequently Asked Questions About ${rateNumber} an Hour</h2>
              <dl className="matrix-faq-list">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt><strong>{faq.question}</strong></dt>
                    <dd><p>{faq.answer}</p></dd>
                  </div>
                ))}
              </dl>
            </article>

            {/* Sibling Hourly Rates Navigation */}
            <nav className="matrix-rates-nav" aria-label="Other hourly rates">
              <h3>Compare Other Hourly Wages</h3>
              <ul>
                {HOURLY_RATES.map((rate) => (
                  <li key={rate}>
                    {rate === rateNumber ? (
                      <span aria-current="page">${rate}/hr</span>
                    ) : (
                      <Link href={`/money/hourly-to-salary/${hourlyToSlug(rate)}`}>
                        ${rate}/hr
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
