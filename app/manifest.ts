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
    /*
     * `any` is the rounded tile as drawn; `maskable` is the same art full bleed
     * with the mark pulled in to 46%, so the circle an Android launcher crops
     * to never clips it.
     */
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
