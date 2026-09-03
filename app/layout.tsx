import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/site-config';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#f5f1e8',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.origin),
  title: {
    default: `${siteConfig.seoTitle} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: siteConfig.name,
    title: `${siteConfig.seoTitle} | ${siteConfig.name}`,
    description: siteConfig.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: `${siteConfig.seoTitle} ${siteConfig.name} calculators for the U.S.` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.seoTitle} | ${siteConfig.name}`,
    description: siteConfig.description,
    images: ['/og.png'],
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
