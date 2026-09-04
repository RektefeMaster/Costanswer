const PRODUCTION_ORIGIN = 'https://costanswer.com';

function httpOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    return undefined;
  }
  return undefined;
}

const configuredOrigin = httpOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  ?? httpOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  ?? (process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGIN : undefined);

export const siteConfig = {
  name: 'CostAnswer',
  /**
   * The catalogue outgrew the name.
   *
   * Health, math, education and date tools are not cost questions, so framing
   * the whole site as "how much will it cost" left a third of it outside its
   * own description. What actually holds these fifty pages together is that
   * each one shows the formula it used and names the dated official source
   * behind any figure the reader did not type.
   */
  seoTitle: 'Practical U.S. calculators with the math shown',
  tagline: 'Practical calculators with transparent math and real sources.',
  description: 'Free U.S. calculators for money, home, auto, health, math and everyday questions. Every answer shows the formula it used and the dated official source behind it.',
  origin: configuredOrigin ?? 'http://localhost:3000',
} as const;
