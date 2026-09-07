import Link from 'next/link';

const POLICIES = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/terms', label: 'User agreement' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/disclosure', label: 'Disclosure' },
  { href: '/contact', label: 'Contact' },
  { href: '/methodology', label: 'Methodology' },
] as const;

export function PolicyNav({
  current,
  stacked = false,
}: {
  current?: (typeof POLICIES)[number]['href'];
  stacked?: boolean;
}) {
  return (
    <nav className={stacked ? 'policy-nav policy-nav-stacked' : 'policy-nav'} aria-label="Related pages">
      {POLICIES.map((policy) => (
        policy.href === current
          ? <span key={policy.href} aria-current="page">{policy.label}</span>
          : <Link key={policy.href} href={policy.href}>{policy.label}</Link>
      ))}
    </nav>
  );
}
