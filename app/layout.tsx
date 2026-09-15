import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { SiteAnalytics } from '@/components/analytics/SiteAnalytics';
import { AdvertisingScript } from '@/components/monetization/AdvertisingScript';
import { AttributionCapture } from '@/components/monetization/AttributionCapture';
import { chrome } from '@/lib/i18n/chrome';
import { htmlLang } from '@/lib/i18n/locales';
import { requestLocale } from '@/lib/i18n/request-locale';
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
  /*
   * A real icon set, not the placeholder "C".
   *
   * `/favicon.ico` carries 16, 32 and 48 for the browsers that ask for the
   * root path before they read any markup; the two PNGs are what a modern tab
   * actually picks; `apple-touch-icon` is the home-screen tile, full bleed
   * because iOS rounds and masks it itself.
   */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();
  return (
    <html lang={htmlLang(locale)}>
      <body>
        <LocaleProvider locale={locale}>
        <a className="skip-link" href="#main-content">{chrome('skip', locale)}</a>
        {/*
          Captured once per tab, in the layout, so the landing page recorded is
          the page the visit actually started on. Renders nothing, blocks
          nothing, and stores nothing in a cookie.
        */}
        <AttributionCapture />
        {/*
          Renders nothing unless a network is configured and its flag is on.
          Placed after the content it must never delay, and consent-gated
          inside `AdScript` rather than here.
        */}
        <AdvertisingScript />
        {/* Nothing unless analytics is enabled and a measurement id is set. */}
        <SiteAnalytics />
        {children}
              </LocaleProvider>
      </body>
    </html>
  );
}
