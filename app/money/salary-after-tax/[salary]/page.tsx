import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/jsonld';
import { pageMetadata, buildSerpTitle } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import { SalaryAfterTaxCalculator } from '@/components/calculators/money/SalaryAfterTaxCalculator';
import {
  ANNUAL_SALARIES,
  getAnnualSalaryProfile,
  salaryToSlug,
  slugToSalary,
} from '@/lib/matrices/wage-matrix-data';

type Props = {
  params: Promise<{ salary: string }>;
};

export async function generateStaticParams() {
  return ANNUAL_SALARIES.map((salary) => ({ salary: salaryToSlug(salary) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { salary: slug } = await params;
  const salaryNumber = slugToSalary(slug);
  if (!salaryNumber) return {};

  const profile = getAnnualSalaryProfile(salaryNumber);
  const formattedK = `${Math.round(salaryNumber / 1000)}k`;
  const title = buildSerpTitle(`$${formattedK} Salary After Tax: Take-Home Pay & Paycheck`, 'tax-freshness', 2026);
  const description = `$${salaryNumber.toLocaleString()} per year after taxes in 2026: see your estimated biweekly paycheck, hourly rate equivalent ($${profile.hourlyEquivalent}/hr), and state-by-state take-home pay across all 50 states.`;
  const path = `/money/salary-after-tax/${slug}` as `/${string}`;

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

export default async function SalaryMatrixPage({ params }: Props) {
  const { salary: slug } = await params;
  const salaryNumber = slugToSalary(slug);
  if (!salaryNumber) notFound();

  const profile = getAnnualSalaryProfile(salaryNumber);
  const formattedK = `${Math.round(salaryNumber / 1000)}k`;
  const pagePath = `/money/salary-after-tax/${slug}` as `/${string}`;

  const breadcrumbs = [
    { name: siteConfig.name, path: '/' },
    { name: 'Money', path: '/topics/money' },
    { name: 'Salary After Tax', path: '/money/salary-after-tax' },
    { name: `$${formattedK} a Year`, path: pagePath },
  ];

  const txTakeHome = profile.stateTaxes.find((s) => s.stateCode === 'TX');
  const caTakeHome = profile.stateTaxes.find((s) => s.stateCode === 'CA');

  const faqs = [
    {
      question: `How much is $${salaryNumber.toLocaleString()} a year an hour?`,
      answer: `$${salaryNumber.toLocaleString()} a year is approximately $${profile.hourlyEquivalent} per hour, based on 2,080 working hours per year (40 hours per week for 52 weeks). On a 35-hour week, it equals $${round(salaryNumber / 1820, 2)} per hour.`,
    },
    {
      question: `What is the biweekly paycheck for a $${salaryNumber.toLocaleString()} salary?`,
      answer: `Before taxes, your biweekly paycheck is ${money(profile.biweeklyGross, 2)}. After federal income tax, Social Security, and Medicare (FICA), a single filer takes home roughly ${money(txTakeHome?.biweeklyNet ?? profile.biweeklyGross * 0.80, 2)} in states with no income tax like Texas or Florida, and approximately ${money(caTakeHome?.biweeklyNet ?? profile.biweeklyGross * 0.74, 2)} in California.`,
    },
    {
      question: `How much is a $${salaryNumber.toLocaleString()} salary after taxes in 2026?`,
      answer: `For a single filer claiming the standard deduction in 2026, take-home pay on $${salaryNumber.toLocaleString()} ranges from approximately ${money(caTakeHome?.annualNet ?? salaryNumber * 0.73)} per year (${money(caTakeHome?.monthlyNet ?? (salaryNumber * 0.73) / 12)}/month) in California to ${money(txTakeHome?.annualNet ?? salaryNumber * 0.81)} per year (${money(txTakeHome?.monthlyNet ?? (salaryNumber * 0.81) / 12)}/month) in no-income-tax states like Texas, Florida, and Washington.`,
    },
    {
      question: `How much rent can you afford on $${salaryNumber.toLocaleString()} a year?`,
      answer: `Following the standard 30% rule of thumb, you can safely spend up to ${money(profile.housingGuideline.maxRentMonthly)} per month on rent or total housing costs.`,
    },
    {
      question: `How much house can I afford on a $${salaryNumber.toLocaleString()} salary?`,
      answer: `Assuming standard 30-year fixed mortgage rates, a $${salaryNumber.toLocaleString()} income commonly qualifies for homes between ${money(profile.housingGuideline.affordabilityHomeRange[0])} and ${money(profile.housingGuideline.affordabilityHomeRange[1])}, keeping your monthly mortgage payment below the 28% front-end guideline of ${money(profile.housingDeep.frontEndMonthlyBudget)}/month.`,
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
              <p className="eyebrow"><span /> 2026 Salary & Paycheck Analysis</p>
              <h1>${salaryNumber.toLocaleString()} Salary After Tax: Take-Home Pay & Hourly Rate</h1>
            </div>
            <div className="tool-intro">
              <p className="matrix-direct-answer">
                A salary of <strong>{money(profile.salary)} per year</strong> equals <strong>${profile.hourlyEquivalent} per hour</strong>,
                <strong>{money(profile.monthlyGross)} per month</strong>, and a biweekly paycheck of <strong>{money(profile.biweeklyGross, 2)}</strong> before taxes.
                After federal and payroll taxes, single filers take home between <strong>{money(caTakeHome?.annualNet ?? profile.salary * 0.73)}</strong> and <strong>{money(txTakeHome?.annualNet ?? profile.salary * 0.81)}</strong> per year depending on state of residence.
              </p>

              <div className="matrix-reciprocal-badge">
                <span>Want to see the hourly wage calculation?</span>
                <Link href={`/money/hourly-to-salary/${profile.closestHourlySlug}`}>
                  See ${profile.closestHourlyRate} an Hour Wage & Overtime Breakdown →
                </Link>
              </div>

              <dl className="matrix-hero-highlights">
                <div>
                  <dt>Hourly Equivalent</dt>
                  <dd>${profile.hourlyEquivalent}/hr</dd>
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
                  <dt>Max Safe Rent</dt>
                  <dd>{money(profile.housingGuideline.maxRentMonthly)}/mo</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        {/* Quick-Jump Neighboring Salaries Bar */}
        <nav className="matrix-quick-bar" aria-label="Quick jump to other annual salaries">
          <span className="matrix-quick-label">Jump to salary:</span>
          <div className="matrix-quick-pills">
            {profile.neighboringSalaries.nearby.map((s) => (
              <Link
                key={s}
                href={`/money/salary-after-tax/${salaryToSlug(s)}`}
                className={`matrix-quick-pill ${s === salaryNumber ? 'is-active' : ''}`}
                aria-current={s === salaryNumber ? 'page' : undefined}
              >
                ${Math.round(s / 1000)}k/yr
              </Link>
            ))}
          </div>
        </nav>

        <div className="tool-layout">
          <section className="tool-primary-flow">
            {/* Paycheck Frequency Breakdown */}
            <article className="matrix-card">
              <h2>${salaryNumber.toLocaleString()} Paycheck & Frequency Breakdown</h2>
              <p className="matrix-card-desc">
                Here is what a <strong>{money(profile.salary)} annual gross salary</strong> looks like broken down across every common pay period before deductions:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Pay Period</th>
                      <th scope="col">Working Hours</th>
                      <th scope="col">Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Hourly Equivalent</th>
                      <td>1 hour</td>
                      <td><strong>${profile.hourlyEquivalent}</strong></td>
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
                      <td>{money(profile.monthlyGross, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Annual Salary</th>
                      <td>2,080 hours</td>
                      <td><strong>{money(profile.salary)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* Schedule Equivalents */}
            <article className="matrix-card">
              <h2>Hourly Rate by Schedule for a ${salaryNumber.toLocaleString()} Salary</h2>
              <p className="matrix-card-desc">
                Depending on your work hours and vacation weeks, here is your effective hourly rate on a ${salaryNumber.toLocaleString()} salary:
              </p>
              <div className="matrix-table-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Schedule Scenario</th>
                      <th scope="col">Annual Hours</th>
                      <th scope="col">Biweekly</th>
                      <th scope="col">Monthly</th>
                      <th scope="col">Effective Hourly Rate</th>
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
                        <td><strong>${round(salaryNumber / sc.annualHours, 2)}/hr</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Top 6 States Quick Comparison Cards */}
            <article className="matrix-card">
              <h2>${salaryNumber.toLocaleString()} Take-Home Pay in Major States (2026)</h2>
              <p className="matrix-card-desc">
                Comparison of net take-home pay on a <strong>{money(profile.salary)}</strong> salary across the largest U.S. states for a single filer with standard deduction:
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
                        <span>Monthly Net</span>
                        <strong>{money(st.monthlyNet)}</strong>
                      </div>
                      <div>
                        <span>Annual Net</span>
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

            {/* State-by-State After-Tax Comparison */}
            <article className="matrix-card">
              <h2>${salaryNumber.toLocaleString()} Salary After Taxes in All 50 States (2026)</h2>
              <p className="matrix-card-desc">
                Estimated take-home pay on {money(profile.salary)} for a single filer with standard deduction.
                Federal income tax and FICA (Social Security + Medicare) are applied uniformly, while state income tax varies from 0% to over 9%:
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
                      <th scope="col">Monthly Take-Home</th>
                      <th scope="col">Annual Net Pay</th>
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

            {/* Knowledge Bridge: Matching Occupations */}
            {profile.matchedOccupations.length > 0 && (
              <article className="matrix-card">
                <h2>U.S. Occupations Earning Around ${salaryNumber.toLocaleString()} a Year</h2>
                <p className="matrix-card-desc">
                  According to official Bureau of Labor Statistics (BLS) surveys, these occupations have a national median wage near <strong>{money(profile.salary)}</strong>:
                </p>
                <ul className="matrix-job-grid">
                  {profile.matchedOccupations.map((job) => (
                    <li key={job.code} className="matrix-job-card">
                      <Link href={job.path}>
                        <strong>{job.title}</strong>
                        <span>National Median: {money(job.medianAnnual)}/year</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {/* Budget & Housing Affordability */}
            <article className="matrix-card">
              <h2>Budgeting a ${salaryNumber.toLocaleString()} Salary: 50/30/20 Guideline</h2>
              <p className="matrix-card-desc">
                Using the 50/30/20 rule, here is a realistic monthly spending plan on a {money(profile.salary)} annual gross income ({money(profile.monthlyGross)}/month):
              </p>
              <div className="matrix-budget-grid">
                <div className="matrix-budget-item">
                  <span className="matrix-budget-tag">Needs (50%)</span>
                  <strong>{money(profile.itemizedBudget.needsMonthly)}/mo</strong>
                  <ul className="matrix-itemized-list">
                    <li><span>Max Safe Rent (30%):</span> <b>{money(profile.itemizedBudget.needsBreakdown.housingMax)}</b></li>
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
                    {money(profile.itemizedBudget.wantsAnnual)}/year for dining out, entertainment, shopping, travel, and lifestyle.
                  </p>
                </div>
                <div className="matrix-budget-item">
                  <span className="matrix-budget-tag">Savings & Debt (20%)</span>
                  <strong>{money(profile.itemizedBudget.savingsMonthly)}/mo</strong>
                  <p className="matrix-budget-detail">
                    {money(profile.itemizedBudget.savingsAnnual)}/year for 401(k), IRA contributions, emergency fund, and accelerated debt payoff.
                  </p>
                </div>
              </div>

              <div className="matrix-housing-note">
                <h3>Housing & Mortgage Power on ${salaryNumber.toLocaleString()}</h3>
                <p>
                  At a {money(profile.salary)} annual income, standard mortgage underwriting guidelines suggest:
                </p>
                <div className="matrix-mortgage-limits">
                  <div>
                    <span>Front-End Housing Limit (28%)</span>
                    <strong>{money(profile.housingDeep.frontEndMonthlyBudget)}/mo</strong>
                    <small>Maximum recommended monthly mortgage payment (P&I, taxes, insurance)</small>
                  </div>
                  <div>
                    <span>Back-End Debt Limit (36%)</span>
                    <strong>{money(profile.housingDeep.backEndMonthlyBudget)}/mo</strong>
                    <small>Maximum total monthly debt (mortgage, auto, student loans, cards)</small>
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
                    Explore exact home affordability scenarios and mortgage stress tests →
                  </Link>
                </p>
              </div>
            </article>

            {/* Pre-filled Interactive Calculator */}
            <article className="matrix-card">
              <h2>Customize Deductions & Filing Status</h2>
              <p className="matrix-card-desc">
                Run custom filing scenarios (married filing jointly, dependents, 401(k) contributions) for {money(profile.salary)}:
              </p>
              <SalaryAfterTaxCalculator initialSalary={String(salaryNumber)} />
            </article>

            {/* FAQs */}
            <article className="matrix-card">
              <h2>Frequently Asked Questions About a ${salaryNumber.toLocaleString()} Salary</h2>
              <dl className="matrix-faq-list">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt><strong>{faq.question}</strong></dt>
                    <dd><p>{faq.answer}</p></dd>
                  </div>
                ))}
              </dl>
            </article>

            {/* Sibling Salaries Navigation */}
            <nav className="matrix-rates-nav" aria-label="Other annual salaries">
              <h3>Compare Other Annual Salaries</h3>
              <ul>
                {ANNUAL_SALARIES.map((salary) => (
                  <li key={salary}>
                    {salary === salaryNumber ? (
                      <span aria-current="page">${Math.round(salary / 1000)}k/yr</span>
                    ) : (
                      <Link href={`/money/salary-after-tax/${salaryToSlug(salary)}`}>
                        ${Math.round(salary / 1000)}k/yr
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
