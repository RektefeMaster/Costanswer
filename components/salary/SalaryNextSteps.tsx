import Link from 'next/link';
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
  { href: '/money/paycheck', label: 'Calculadora de cheque', note: 'Neto semanal, quincenal o mensual' },
  { href: '/money/salary-after-tax', label: 'Sueldo después de impuestos', note: 'Federal, FICA y estatal sobre un sueldo anual' },
  { href: '/money/hourly-to-salary', label: 'De hora a sueldo anual', note: 'Bruto semanal, mensual y anual desde un salario por hora' },
  { href: '/money/cost-of-living', label: 'Costo de vida', note: 'Renta, comida y precios locales por lugar' },
] as const;

export function SalaryNextSteps({ locale = 'en-US' }: { locale?: Locale }) {
  const links = locale === 'es-US' ? LINKS_ES : LINKS_EN;
  return (
    <section className="engine-notes" aria-labelledby="salary-next-title">
      <h2 id="salary-next-title">{wageUi('nextStepsTitle', locale)}</h2>
      <p className="engine-notes-lede">{wageUi('nextStepsLede', locale)}</p>
      <ul className="salary-next-steps">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
            <small>{link.note}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
