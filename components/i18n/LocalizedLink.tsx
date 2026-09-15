'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useLocale } from './LocaleProvider';
import { localizedHref } from '@/lib/i18n/routing';

export default function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale();
  const translated = typeof href === 'string' ? localizedHref(href, locale) : href;
  return <Link {...props} href={translated} />;
}
