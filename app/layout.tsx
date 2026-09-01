import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.origin),
  title: {
    default: 'HowMuchUSA — Clear answers for everyday decisions',
    template: '%s | HowMuchUSA',
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: siteConfig.name,
    title: 'HowMuchUSA — Make the numbers make sense.',
    description: siteConfig.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'HowMuchUSA — Make the numbers make sense.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HowMuchUSA — Make the numbers make sense.',
    description: siteConfig.description,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
