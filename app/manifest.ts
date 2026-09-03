import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CostAnswer',
    short_name: 'CostAnswer',
    description: 'How much will it cost in the U.S.? Free calculators for pay, bills, home projects, and everyday prices.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f1e8',
    theme_color: '#102a2a',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
