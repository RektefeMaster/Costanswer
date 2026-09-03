const PRODUCTION_ORIGIN = 'https://costanswer.com';

const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGIN : undefined);

export const siteConfig = {
  name: 'CostAnswer',
  seoTitle: 'How much will it cost in the U.S.?',
  description: 'How much will it cost in the U.S.? Free calculators for pay, bills, home projects, and everyday prices.',
  origin: configuredOrigin ?? 'http://localhost:3000',
} as const;
