import { describe, expect, it } from 'vitest';
import { getToolEditorial, listToolEditorial } from '@/lib/tool-content';
import { EDITORIAL_ES } from '@/lib/tool-content/es/editorial-es';

describe('Spanish tool editorial content (es-US)', () => {
  it('loads Spanish editorial for supported high-traffic tools', () => {
    for (const entry of EDITORIAL_ES) {
      const editorial = getToolEditorial(entry.toolId, 'es-US');
      expect(editorial.toolId).toBe(entry.toolId);
      expect(editorial.guide.heading).toBe(entry.guide.heading);
      expect(editorial.guide.lede.length).toBeGreaterThan(20);
      expect(editorial.guide.sections.length).toBeGreaterThan(0);
      expect(editorial.faq.length).toBeGreaterThanOrEqual(2);
      expect(editorial.glossary.length).toBeGreaterThanOrEqual(2);
      expect(editorial.tips.length).toBeGreaterThan(0);
      expect(editorial.caveats.length).toBeGreaterThan(0);
    }
  });

  it('falls back to English when no Spanish editorial is authored yet', () => {
    const en = getToolEditorial('recipe-scaler', 'en-US');
    const es = getToolEditorial('recipe-scaler', 'es-US');
    expect(es).toEqual(en);
  });

  it('preserves English editorial when locale is en-US or omitted', () => {
    const enExplicit = getToolEditorial('paycheck', 'en-US');
    const enDefault = getToolEditorial('paycheck');
    const es = getToolEditorial('paycheck', 'es-US');
    expect(enExplicit).toEqual(enDefault);
    expect(es.guide.heading).not.toBe(enExplicit.guide.heading);
  });

  it('lists editorial for all tools without error', () => {
    const listEn = listToolEditorial('en-US');
    const listEs = listToolEditorial('es-US');
    expect(listEn.length).toBeGreaterThan(50);
    expect(listEs.length).toBe(listEn.length);
  });
});
