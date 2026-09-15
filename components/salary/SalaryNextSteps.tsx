import Link from '@/components/i18n/LocalizedLink';
import type { Locale } from '@/lib/i18n/locales';
import { wageUi } from '@/lib/salary/wage-ui';

/**
 * Calculators people open after a salary answer — take-home, hourly, COL.
 * Plain links, no cards; same pattern as tool "related" strips.
 */
const LINKS_EN = [
  { href: '/money/paycheck', label: 'Paycheck calculator', note: 'Net pay by week, biweekly, or month' },
  { href: '/money/salary-after-tax', label: 'Salary after tax', note: 'Federal, FICA, and state on a yearly salary' },
  { href: '/money/hourly-to-salary', label: 'Hourly to salary', note: 'Gross weekly, monthly, and yearly from an hourly wage' },
  { href: '/money/cost-of-living', label: 'Cost of living', note: 'Rent, food, and local price level by place' },
] as const;

const LINKS_ES = [
  { href: '/money/paycheck', label: 'Calculadora de nómina neta', note: 'Neto semanal, quincenal o mensual' },
  { href: '/money/salary-after-tax', label: 'Sueldo después de impuestos', note: 'Federal, FICA y estatal sobre un sueldo anual' },
  { href: '/money/hourly-to-salary', label: 'De salario por hora a sueldo anual', note: 'Bruto semanal, mensual y anual desde un salario por hora' },
  { href: '/money/cost-of-living', label: 'Costo de vida', note: 'Renta, alimentos y nivel de precios por lugar' },
] as const;

export function SalaryNextSteps({ locale = 'en-US' }: { locale?: Locale }) {
  const links = locale === 'es-US' ? LINKS_ES : LINKS_EN;
  return (
    <section className="engine-notes" aria-labelledby="salary-next-title">
      <h2 id="salary-next-title">{wageUi('nextStepsTitle', locale)}</h2>
      <p className="engine-notes-lede">{wageUi('nextStepsLede', locale)}</p>
      <div className="salary-next-steps-grid">
        {links.map((link) => (
          <Link href={link.href} className="salary-step-card" key={link.href}>
            <div className="salary-step-card-content">
              <strong className="salary-step-title">{link.label}</strong>
              <span className="salary-step-note">{link.note}</span>
            </div>
            <span className="salary-step-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
