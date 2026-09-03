const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;

if (process.env.NODE_ENV === 'production' && !configuredOrigin) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required for production canonical, sitemap and social metadata.');
}

export const siteConfig = {
  name: 'CostAnswer',
  seoTitle: 'How much will it cost in the U.S.?',
  description: 'How much will it cost in the U.S.? Free calculators for pay, bills, home projects, and everyday prices.',
  origin: configuredOrigin ?? 'http://localhost:3000',
} as const;
