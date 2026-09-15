import { LocaleProvider } from '@/components/i18n/LocaleProvider';

export default function SpanishSegmentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LocaleProvider locale="es-US">{children}</LocaleProvider>;
}

