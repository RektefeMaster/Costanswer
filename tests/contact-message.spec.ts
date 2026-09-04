import { describe, expect, it } from 'vitest';
import {
  composeContactBody,
  composeContactMailto,
  parseContactDraft,
} from '@/lib/contact-message';

const base = {
  kind: 'request',
  message: 'A student-loan refinance calculator that starts from the current balance and a federal rate.',
};

describe('contact notes', () => {
  it('accepts a calculator request and omits blank optional fields', () => {
    const parsed = parseContactDraft(base);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.draft).toEqual({
      kind: 'request',
      message: base.message,
    });
    expect(composeContactBody(parsed.draft)).toBe(
      `Kind: Calculator request\n\n${base.message}`,
    );
  });

  it('keeps correction identifiers in the composed note', () => {
    const parsed = parseContactDraft({
      kind: 'correction',
      message: 'The ZIP 24018 should be Roanoke County standard CONUS, not the city rate.',
      pageUrl: '/everyday/per-diem',
      methodVersion: 'per-diem-v4',
      dataSnapshot: 'gsa-fy2026-09-01',
      replyEmail: 'reader@example.com',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(composeContactBody(parsed.draft)).toContain('Page: /everyday/per-diem');
    expect(composeContactBody(parsed.draft)).toContain('Method: per-diem-v4');
    expect(composeContactBody(parsed.draft)).toContain('Data: gsa-fy2026-09-01');
    expect(composeContactBody(parsed.draft)).toContain('Reply-to: reader@example.com');
    expect(composeContactMailto('inbox@example.com', parsed.draft)).toMatch(/^mailto:inbox%40example\.com\?subject=.*body=/);
    expect(decodeURIComponent(composeContactMailto('inbox@example.com', parsed.draft))).toContain('CostAnswer: Wrong figure');
  });

  it('rejects short notes, unknown kinds, and non-http URLs', () => {
    expect(parseContactDraft({ ...base, message: 'too short' }).ok).toBe(false);
    expect(parseContactDraft({ ...base, kind: 'praise' }).ok).toBe(false);
    expect(parseContactDraft({ ...base, pageUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseContactDraft({ ...base, replyEmail: 'not-an-email' }).ok).toBe(false);
    expect(parseContactDraft({ ...base, pageUrl: 'https://gsa.gov/perdiem' }).ok).toBe(true);
  });
});
