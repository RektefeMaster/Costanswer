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
  seoTitle: 'How much will it cost in the U.S.?',
  description: 'How much will it cost in the U.S.? Free calculators for pay, bills, home projects, and everyday prices.',
  origin: configuredOrigin ?? 'http://localhost:3000',
} as const;
