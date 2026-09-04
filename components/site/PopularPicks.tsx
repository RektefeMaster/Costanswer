import Link from 'next/link';
import { calculateInflation } from '@/lib/calculations/inflation';
import { calculateMortgage } from '@/lib/calculations/mortgage';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { cpiPeriodBounds } from '@/lib/data/bls-cpi';
import { cpiSnapshot } from '@/lib/data/cpi-snapshot';
import { electricitySnapshot } from '@/lib/data/electricity-snapshot';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { categories, getTool } from '@/lib/tool-registry';

function money(value: number) {
  return formatMoney(value, 0);
}

function formatMonthYear(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(Date.UTC(year, month - 1, 1));
}

function featuredAnswers() {
  const rate = mortgageRateSnapshot.thirtyYearFixedPercent;
  const mortgage = calculateMortgage({
    homePrice: 400_000,
    downPayment: 80_000,
    termYears: 30,
    annualRatePercent: rate,
    annualPropertyTax: 0,
    annualHomeInsurance: 0,
    monthlyHoa: 0,
    includePmiEstimate: false,
  }, mortgageRateSnapshot.snapshotId);

  const lastPeriod = cpiPeriodBounds(cpiSnapshot.observations).lastPeriod;
  const inflation = calculateInflation(
    { amount: 100, startPeriod: '1990-01', endPeriod: lastPeriod },
    { observations: cpiSnapshot.observations, snapshotId: cpiSnapshot.snapshotId },
  );

  const rankedPower = [...electricitySnapshot.states].sort((left, right) => left.priceCentsPerKwh - right.priceCentsPerKwh);
  const cheapestPower = rankedPower[0];
  const dearestPower = rankedPower.at(-1);
  if (!cheapestPower || !dearestPower) {
    throw new Error('Electricity snapshot is missing state rates.');
  }

  return [
    {
      tool: getTool('mortgage-payment'),
      question: 'What’s a $400,000 mortgage this week?',
      answer: money(mortgage.value.monthlyPrincipalAndInterest),
      unit: '/mo',
      note: `30-year · ${formatNumber(rate, { maximumFractionDigits: 2 })}% Freddie Mac · P&I only`,
    },
    {
      tool: getTool('inflation'),
      question: 'What is $100 in 1990 worth today?',
      answer: money(inflation.value.equivalentAmount),
      unit: 'today',
      note: `January 1990 → ${formatMonthYear(lastPeriod)} · CPI-U`,
    },
    {
      tool: getTool('where-cheaper'),
      question: 'Where is residential power cheaper?',
      answer: `${formatNumber(cheapestPower.priceCentsPerKwh, { maximumFractionDigits: 1 })}¢`,
      unit: `/kWh in ${cheapestPower.stateName}`,
      note: `vs ${formatNumber(dearestPower.priceCentsPerKwh, { maximumFractionDigits: 1 })}¢ in ${dearestPower.stateName}`,
    },
  ] as const;
}

export function PopularPicks() {
  const answers = featuredAnswers();

  return (
    <section id="popular" className="popular-section" aria-labelledby="popular-title">
      <div className="popular-head">
        <div>
          <p className="eyebrow"><span /> Popular</p>
          <h2 id="popular-title">A few to try first.</h2>
          <p className="popular-lede">Real U.S. figures, already run. Change the inputs on the next page.</p>
        </div>
        <Link className="popular-all" href="/search">See all calculators <span aria-hidden="true">→</span></Link>
      </div>

      <div className="popular-board">
        <div className="popular-board-topline">
          <span className="live-dot">Already run</span>
          <span>Freddie Mac · BLS CPI-U · EIA</span>
        </div>
        <div className="popular-board-cols">
          {answers.map((pick, index) => (
            <Link className={`popular-col accent-${pick.tool.accent}`} href={pick.tool.path} key={pick.tool.id}>
              <span className="popular-col-topline">
                <span>0{index + 1} · {categories[pick.tool.category].name}</span>
                <span className="popular-col-arrow" aria-hidden="true">→</span>
              </span>
              <span className="popular-col-answer">
                <b>{pick.answer}</b>
                <small>{pick.unit}</small>
              </span>
              <strong className="popular-col-question">{pick.question}</strong>
              <span className="popular-col-note">{pick.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
