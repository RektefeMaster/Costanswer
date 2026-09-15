import type { Locale } from '@/lib/i18n/locales';
import { siteText, CATEGORY_ES } from '@/lib/i18n/site-copy';
import Link from '@/components/i18n/LocalizedLink';
import { calculateHomeAffordability } from '@/lib/calculations/home-affordability';
import { calculateMortgage } from '@/lib/calculations/mortgage';
import { calculatePaycheck } from '@/lib/calculations/tax/paycheck';
import { DEFAULT_TAX_YEAR } from '@/lib/calculations/tax/version';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { mortgageRateSnapshot } from '@/lib/data/mortgage-rate-snapshot';
import { categories, getTool } from '@/lib/tool-registry';

function money(value: number) {
  return formatMoney(value, 0);
}

/**
 * Homepage “try first” strip — mortgage (very high US volume), paycheck, and
 * “how much house” (~200k/mo class intent). Live figures so the block is content.
 */
function featuredAnswers(locale: Locale) {
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

  const paycheck = calculatePaycheck({
    payFrequency: 'biweekly',
    amount: 3_000,
    state: 'TX',
    filingStatus: 'single',
    taxYear: DEFAULT_TAX_YEAR,
    dependents: 0,
  });

  const afford = calculateHomeAffordability({
    mode: 'how-much-house',
    monthlyNetIncome: 6_000,
    monthlyExistingDebt: 400,
    monthlyOtherExpenses: 2_000,
    downPayment: 60_000,
    termYears: 30,
    annualRatePercent: rate,
    annualPropertyTax: 4_800,
    annualHomeInsurance: 1_800,
    monthlyHoa: 0,
    includePmiEstimate: true,
    maintenanceAnnualPercent: 1,
    closingCostPercent: 3,
  }, mortgageRateSnapshot.snapshotId);

  return [
    {
      tool: getTool('mortgage-payment'),
      question: 'What’s a $400,000 mortgage this week?',
      answer: money(mortgage.value.monthlyPrincipalAndInterest),
      unit: '/mo',
      note: locale === 'es-US' ? `30 años · ${formatNumber(rate, { maximumFractionDigits: 2 })}% Freddie Mac · capital e intereses` : `30-year · ${formatNumber(rate, { maximumFractionDigits: 2 })}% Freddie Mac · P&I only`,
    },
    {
      tool: getTool('paycheck'),
      question: 'What’s a $3,000 biweekly paycheck after tax in Texas?',
      answer: money(paycheck.value.netPaycheck),
      unit: 'net',
      note: locale === 'es-US' ? `Soltero · ${DEFAULT_TAX_YEAR} · impuesto federal, FICA y Texas (sin impuesto estatal sobre sueldos)` : `Single · ${DEFAULT_TAX_YEAR} · federal, FICA, Texas (no state wage tax)`,
    },
    {
      tool: getTool('home-affordability'),
      question: 'How much house on $6,000/mo take-home?',
      answer: money(afford.value.comfortableHomePrice),
      unit: 'comfortable',
      note: locale === 'es-US' ? `25% del ingreso para vivienda · ${formatNumber(rate, { maximumFractionDigits: 2 })}% · $60,000 de entrada` : `25% housing share · ${formatNumber(rate, { maximumFractionDigits: 2 })}% · $60k down`,
    },
  ] as const;
}

export function PopularPicks({ locale = 'en-US' }: { locale?: Locale }) {
  const t = (text: string) => siteText(text, locale);
  const answers = featuredAnswers(locale);

  return (
    <section id="popular" className="popular-section" aria-labelledby="popular-title">
      <div className="popular-head">
        <div>
          <p className="eyebrow"><span /> {t("Popular")}</p>
          <h2 id="popular-title">{t("A few to try first.")}</h2>
          <p className="popular-lede">{t("Real U.S. figures, already run. Change the inputs on the next page.")}</p>
        </div>
        <Link className="popular-all" href="/search">{t("See all calculators")} <span aria-hidden="true">→</span></Link>
      </div>

      <div className="popular-board">
        <div className="popular-board-topline">
          <span className="live-dot">{t("Already run")}</span>
          <span>{t("Freddie Mac · IRS · state wage tax")}</span>
        </div>
        <div className="popular-board-cols">
          {answers.map((pick, index) => (
            <Link className={`popular-col accent-${pick.tool.accent}`} href={pick.tool.path} key={pick.tool.id}>
              <span className="popular-col-topline">
                <span>0{index + 1} · {locale === 'es-US' ? CATEGORY_ES[pick.tool.category].name : categories[pick.tool.category].name}</span>
                <span className="popular-col-arrow" aria-hidden="true">→</span>
              </span>
              <span className="popular-col-answer">
                <b>{pick.answer}</b>
                <small>{t(pick.unit)}</small>
              </span>
              <strong className="popular-col-question">{t(pick.question)}</strong>
              <span className="popular-col-note">{pick.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
