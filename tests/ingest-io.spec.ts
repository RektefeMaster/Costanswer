import { describe, expect, it } from 'vitest';
import { compareObservationPeriod, evaluateRefreshDecision } from '../scripts/ingest-io';

describe('snapshot refresh period compare', () => {
  it('orders ISO weeks and months without treating a repeat as newer', () => {
    expect(compareObservationPeriod('2026-09-07', '2026-08-31')).toBe('newer');
    expect(compareObservationPeriod('2026-08-31', '2026-08-31')).toBe('same');
    expect(compareObservationPeriod('2026-08-24', '2026-08-31')).toBe('older');
    expect(compareObservationPeriod('2026-08', '2026-07')).toBe('newer');
    expect(evaluateRefreshDecision({ nextPeriod: '2026-07', payloadUnchanged: true })).toBe('promote');
  });
});
