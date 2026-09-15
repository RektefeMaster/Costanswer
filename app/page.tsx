import type { Metadata } from 'next';
import { HomePage } from '@/components/site/HomePage';
import { pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = pageMetadata(
  siteConfig.seoTitle,
  siteConfig.description,
  '/',
);

export default function Home() { return <HomePage />; }
