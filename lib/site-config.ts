const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;

if (process.env.NODE_ENV === 'production' && !configuredOrigin) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required for production canonical, sitemap and social metadata.');
}

export const siteConfig = {
  name: 'HowMuchUSA',
  description: 'Practical calculators and transparent answers for costs, pay, home projects, cars, shopping, food and everyday life in the USA.',
  origin: configuredOrigin ?? 'http://localhost:3000',
} as const;
