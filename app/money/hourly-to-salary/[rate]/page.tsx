import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/jsonld';
import { pageMetadata, buildSerpTitle } from '@/lib/seo';
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
  const description = `$${rateNumber} an hour is $${profile.annualGross.toLocaleString()} per year before taxes, $${profile.monthlyGross.toLocaleString()} per month, and $${profile.biweeklyGross.toLocaleString()} biweekly. Compare 50-state take-home pay, overtime, and budget guidelines.`;
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
      answer: `$${rateNumber} an hour equals ${money(profile.annualGross)} per year before taxes, assuming 40 hours per week across 52 weeks (2,080 working hours). If you take 2 weeks of unpaid vacation (50 weeks worked), your annual gross is ${money(rateNumber * 2000)}.`,
    },
    {
      question: `How much is $${rateNumber} an hour monthly and biweekly?`,
      answer: `At $${rateNumber} an hour, your gross monthly pay is ${money(profile.monthlyGross)} across 12 calendar months. Your biweekly paycheck (every two weeks, 26 paychecks per year) is ${money(profile.biweeklyGross, 2)} before deductions.`,
    },
    {
      question: `What is time and a half for $${rateNumber} an hour?`,
      answer: `Time and a half (1.5x) for $${rateNumber} an hour is ${money(profile.overtime.timeAndHalfRate, 2)} per overtime hour. Double time (2.0x) is ${money(profile.overtime.doubleTimeRate, 2)} per hour. Working 5 hours of overtime each week increases your annual income by ${money(profile.overtime.scenarios[0].extraAnnualGross)} to ${money(profile.overtime.scenarios[0].totalAnnualGross)}.`,
    },
    {
      question: `How much is $${rateNumber} an hour after taxes in 2026?`,
      answer: `For a single filer claiming the standard deduction in 2026, take-home pay on $${rateNumber}/hour ranges from approximately ${money(caTakeHome?.annualNet ?? profile.annualGross * 0.75)} per year (${money(caTakeHome?.monthlyNet ?? profile.monthlyGross * 0.75)}/month) in California to ${money(txTakeHome?.annualNet ?? profile.annualGross * 0.82)} per year (${money(txTakeHome?.monthlyNet ?? profile.monthlyGross * 0.82)}/month) in states with no state income tax like Texas and Florida.`,
    },
    {
      question: `How much rent can you afford on $${rateNumber} an hour?`,
      answer: `Under the standard 30% rule of thumb, you can safely spend up to ${money(profile.housingGuideline.maxRentMonthly)} per month on rent or total housing costs.`,
    },
    {
      question: `Can you buy a house on $${rateNumber} an hour?`,
      answer: `Yes, depending on debt and local property taxes, a ${money(profile.annualGross)} income commonly qualifies for a home between ${money(profile.housingGuideline.affordabilityHomeRange[0])} and ${money(profile.housingGuideline.affordabilityHomeRange[1])}, with a recommended maximum monthly mortgage payment around ${money(profile.housingDeep.frontEndMonthlyBudget)}.`,
    },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <JsonLd data={faqJsonLd(faqs)} />
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

                <p className="matrix-cta-link">
                  <Link href="/money/home-affordability">
                    Calculate your exact home affordability with today&apos;s mortgage rates →
                  </Link>
                </p>
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
