import { describe, expect, it } from 'vitest';
import { localizedHref, spanishRewritePath } from '@/lib/i18n/routing';
import { languageSwitcherHref } from '@/lib/i18n/alternates';

describe('same-page language navigation', () => {
  it.each(['/topics/money', '/money/hourly-to-salary', '/cost/kitchen-remodel', '/search'])('keeps the page when switching %s', (path) => {
    expect(languageSwitcherHref(path, 'es-US')).toBe(`/es${path}`);
    expect(languageSwitcherHref(`/es${path}`, 'en-US')).toBe(path);
  });
  it('retains query parameters and anchors in localized internal links', () => {
    expect(localizedHref('/search?q=loan#results', 'es-US')).toBe('/es/search?q=loan#results');
    expect(localizedHref('/es/search?q=loan#results', 'en-US')).toBe('/search?q=loan#results');
  });
  it('preserves existing Spanish occupation URLs', () => {
    expect(languageSwitcherHref('/salary/registered-nurse/texas', 'es-US')).toBe('/es/salario/enfermero-registrado/texas');
    expect(languageSwitcherHref('/es/salario/enfermero-registrado/texas', 'en-US')).toBe('/salary/registered-nurse/texas');
    expect(spanishRewritePath('/es/salario/enfermero-registrado/texas')).toBeNull();
  });
  it('rewrites shared pages without treating APIs or external links as translated content', () => {
    expect(spanishRewritePath('/es/money/hourly-to-salary')).toBe('/money/hourly-to-salary');
    expect(spanishRewritePath('/es/api/cost/estimate')).toBeNull();
    expect(localizedHref('/api/cost/estimate', 'es-US')).toBe('/api/cost/estimate');
    expect(localizedHref('//example.com/page', 'es-US')).toBe('//example.com/page');
    expect(localizedHref('https://example.com', 'es-US')).toBe('https://example.com');
    expect(localizedHref('#result', 'es-US')).toBe('#result');
  });
});
