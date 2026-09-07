import { describe, expect, it } from 'vitest';
import { assertVectorCoverage, type StateGoldenVector } from '@/lib/data/tax/verify-states';

const row = (basis: StateGoldenVector['basis']): StateGoldenVector => ({
  stateCode: 'MN', filingStatus: 'single', taxableIncome: 60_000, expectedTax: 1_000, basis,
  sourceName: 'test', sourceUrl: 'https://example.gov/x', verifiedAt: '2026-09-07T00:00:00.000Z',
});
/*
 * Padded to the three vectors the gate requires, so what these assert is the
 * evidence rule and not the count rule. The filler repeats the weakest basis
 * present, which is the case the rule has to survive.
 */
const warnings = (vectors: StateGoldenVector[], progressive = true) => {
  const padded = [...vectors];
  while (padded.length < 3) padded.push(row(vectors[vectors.length - 1].basis));
  return assertVectorCoverage(['MN'], padded, progressive ? ['MN'] : [])
    .map((issue) => issue.message)
    .filter((message) => !/golden vectors; 3 are required/.test(message));
};

describe('how strong a state evidence has to be', () => {
  it('accepts a bracket state that carries one figure the state printed', () => {
    expect(warnings([row('published-table'), row('worked-from-schedule')])).toEqual([]);
  });

  it('warns when a bracket state is only ever checked against its own transcription', () => {
    expect(warnings([row('worked-from-schedule')])[0]).toMatch(/no vector carries a figure the state itself published/i);
  });

  it('does not let a secondary source stand in for a published figure', () => {
    /*
     * The rule used to ask whether every row was worked-from-schedule, so a
     * bracket state resting entirely on somebody else's dataset — weaker
     * evidence, not stronger — slipped past it silently.
     */
    const messages = warnings([row('secondary-source')]);
    expect(messages.some((m) => /no vector carries a figure the state itself published/i.test(m))).toBe(true);
  });

  it('flags a state resting wholly on secondary sources even where the rate is flat', () => {
    // Flat states are excused the bracket rule because a rate is hard to
    // misread. That reasoning assumes somebody read the rate off the state.
    const messages = warnings([row('secondary-source')], false);
    expect(messages.some((m) => /rests entirely on secondary sources/i.test(m))).toBe(true);
  });

  it('stops flagging once one figure comes from the state', () => {
    expect(warnings([row('secondary-source'), row('published-threshold')], false)).toEqual([]);
  });
});
