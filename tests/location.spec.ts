import { describe, expect, it } from 'vitest';
import { parseCanonicalLocationId, placeId, countyId, cbsaId, hudFmrId, stateId } from '@/lib/location/ids';
import { searchLocations } from '@/lib/location/search';
import { resolveLocationCoverage } from '@/lib/location/resolve';
import { geographySnapshot } from '@/lib/data/geography-snapshot';
import { resolveHudFmrSnapshot, uniqueHudAreaForCounty } from '@/lib/data/hud-fmr-snapshot';
import { hudSnapshotIsEffectiveOn, resolveEffectiveHudRelease, type HudRelease } from '@/lib/data/hud-fmr';
import { getAcsRow } from '@/lib/data/acs-snapshot';
import { getBeaMetroRpp, getBeaStateRpp } from '@/lib/data/bea-rpp-snapshot';
import { beaRppSnapshot } from '@/lib/data/bea-rpp-snapshot';
import { PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';

const HUD_RELEASES: HudRelease[] = [
  {
    snapshotId: 'hud-fmr-fy2026-revised-2026-05-21-v1',
    fiscalYear: 2026,
    publishedAt: '2026-05-21T00:00:00.000Z',
    effectiveFrom: '2025-10-01',
    effectiveTo: '2026-09-30',
    revisionId: 'revised-2026-05-21',
    latestPublished: false,
  },
  {
    snapshotId: 'hud-fmr-fy2027-v1',
    fiscalYear: 2027,
    publishedAt: '2026-09-01T00:00:00.000Z',
    effectiveFrom: '2026-10-01',
    effectiveTo: '2027-09-30',
    revisionId: 'original',
    latestPublished: true,
  },
];

describe('canonical location identity', () => {
  it('namespaces official codes and never uses a bare city name as identity', () => {
    expect(stateId('TX')).toBe('state:TX');
    expect(countyId('48453')).toBe('county:48453');
    expect(placeId('4805000')).toBe('place:4805000');
    expect(cbsaId('12420')).toBe('cbsa:12420');
    expect(hudFmrId('METRO12420M12420')).toBe('hud-fmr:METRO12420M12420');
    expect(parseCanonicalLocationId('place:4805000')).toEqual({ kind: 'place', key: '4805000' });
    expect(() => parseCanonicalLocationId('Austin')).toThrow(/Invalid canonical location ID/);
    expect(() => parseCanonicalLocationId('place:4805000')).not.toThrow();
    expect(() => countyId('4845')).toThrow(/Invalid county GEOID/);
    expect(() => placeId('480500')).toThrow(/Invalid place GEOID/);
  });

  it('rejects duplicate canonical IDs in the geography snapshot', () => {
    const ids = [
      ...geographySnapshot.states.map((row) => row.id),
      ...geographySnapshot.counties.map((row) => row.id),
      ...geographySnapshot.places.map((row) => row.id),
      ...geographySnapshot.cbsas.map((row) => row.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('location search disambiguation', () => {
  it('keeps every Springfield until the user picks one', () => {
    const hits = searchLocations('Springfield');
    const states = hits.filter((hit) => hit.kind === 'place').map((hit) => hit.state);
    expect(states).toEqual(expect.arrayContaining(['IL', 'MO']));
    expect(new Set(states).size).toBeGreaterThan(1);
    expect(hits.some((hit) => hit.displayName === 'Springfield')).toBe(false);
  });

  it('parses Austin TX, Austin, TX, and Austin, Texas to the same Texas place', () => {
    const queries = ['Austin TX', 'Austin, TX', 'Austin, Texas'];
    for (const query of queries) {
      const hits = searchLocations(query);
      expect(hits[0]?.id).toBe('place:4805000');
      expect(hits[0]?.state).toBe('TX');
    }
  });

  it('does not treat every New York state city as a hit for New York, and maps NY to the state', () => {
    const named = searchLocations('New York');
    expect(named[0]?.id).toBe('state:NY');
    expect(named.some((hit) => hit.id === 'place:3651000')).toBe(true);
    expect(named.some((hit) => hit.id === 'place:3601000')).toBe(false);
    expect(searchLocations('NY')[0]?.id).toBe('state:NY');
  });

  it('does not prefix-match the whole index on 1–2 character queries', () => {
    expect(searchLocations('a')).toEqual([]);
    expect(searchLocations('au')).toEqual([]);
    expect(searchLocations('st')).toEqual([]);
    const austin = searchLocations('aus');
    expect(austin.some((hit) => hit.id === 'place:4805000')).toBe(true);
    expect(austin[0]?.kind).toBe('place');
    expect(searchLocations('san').some((hit) => hit.displayName.startsWith('San Antonio'))).toBe(true);
    expect(searchLocations('LA')[0]?.id).toBe('state:LA');
    expect(searchLocations('Saint Louis')[0]?.displayName).toBe('St. Louis, MO');
    expect(searchLocations('St. Louis')[0]?.displayName).toBe('St. Louis, MO');
    expect(searchLocations('Saint Louis').some((hit) => hit.displayName.startsWith('St. Louis, MO'))).toBe(true);
  });
});

describe('crosswalks and vintages', () => {
  it('maps Austin place to the official Austin HUD FMR area via unique in-state metro counties', () => {
    const coverage = resolveLocationCoverage({ locationId: 'place:4805000', asOf: '2026-09-02' });
    expect(coverage.hud.status).toBe('uniqueDerived');
    if (coverage.hud.status !== 'uniqueDerived') throw new Error('expected unique HUD mapping');
    expect(coverage.hud.area.hudAreaCode).toBe('METRO12420M12420');
    expect(coverage.hud.area.bedrooms.br2).toBe(1852);
    expect(coverage.bea.fallback).toBe('exactMetro');
    expect(coverage.bea.allItems).toBeCloseTo(98.066, 3);
    expect(coverage.census.row?.medianHouseholdIncome).toBe(93658);
    expect(coverage.census.row?.medianHouseholdIncomeMoe).toBe(1670);
  });

  it('does not invent a HUD area when a county is officially split', () => {
    const fy2026 = resolveHudFmrSnapshot('2026-09-02');
    const split = fy2026.ambiguousCounties[0];
    expect(uniqueHudAreaForCounty(fy2026, split.countyGeoid)).toBe('ambiguous');
    const coverage = resolveLocationCoverage({ locationId: `county:${split.countyGeoid}`, asOf: '2026-09-02' });
    expect(coverage.hud.status).toBe('ambiguous');
  });

  it('keeps multi-state metros from silently choosing a state, including an invalid extra state', () => {
    const multi = geographySnapshot.cbsas.find((row) => row.cbsaCode === '35620');
    expect(multi).toBeTruthy();
    const coverage = resolveLocationCoverage({ locationId: `cbsa:${multi!.cbsaCode}`, asOf: '2026-09-02' });
    expect(coverage.stateAmbiguous).toBe(true);
    expect(coverage.state).toBeNull();
    expect(coverage.eiaElectricity.status).toBe('unavailable');
    const wrong = resolveLocationCoverage({ locationId: `cbsa:${multi!.cbsaCode}`, residentialState: 'FL', asOf: '2026-09-02' });
    expect(wrong.stateAmbiguous).toBe(true);
    expect(wrong.state).toBeNull();
    expect(wrong.eligibleStates).toEqual(expect.arrayContaining(['NY', 'NJ']));
    expect(wrong.eligibleStates).not.toContain('FL');
  });

  it('does not pretend New York City spans Long Island HUD areas, and resolves after a borough is chosen', () => {
    const city = resolveLocationCoverage({ locationId: 'place:3651000', asOf: '2026-09-02' });
    expect(city.hud.status).toBe('ambiguous');
    expect(city.countyChoices.some((row) => row.geoid === '36061')).toBe(true);
    const manhattan = resolveLocationCoverage({ locationId: 'place:3651000', countyGeoid: '36061', asOf: '2026-09-02' });
    expect(manhattan.hud.status).toBe('uniqueDerived');
    if (manhattan.hud.status !== 'uniqueDerived') throw new Error('expected Manhattan HUD mapping');
    expect(manhattan.hud.area.hudAreaCode).toBe('METRO35620MM5600');
  });

  it('ignores a county that is not in the selected place metro', () => {
    const coverage = resolveLocationCoverage({ locationId: 'place:4805000', countyGeoid: '36061', asOf: '2026-09-02' });
    expect(coverage.hud.status).toBe('uniqueDerived');
    if (coverage.hud.status !== 'uniqueDerived') throw new Error('expected Austin HUD mapping');
    expect(coverage.hud.area.hudAreaCode).toBe('METRO12420M12420');
  });

  it('does not keep asking for a county when the selected county is itself HUD-split', () => {
    const county = resolveLocationCoverage({ locationId: 'county:25017', asOf: '2026-09-02' });
    expect(county.hud.status).toBe('ambiguous');
    expect(county.countyChoices).toEqual([]);
    if (county.hud.status === 'ambiguous') {
      expect(county.hud.message).toMatch(/whole county/i);
      expect(county.hud.message).not.toMatch(/Choose a county/i);
    }
    const cambridge = resolveLocationCoverage({ locationId: 'place:2511000', countyGeoid: '25017', asOf: '2026-09-02' });
    expect(cambridge.hud.status).toBe('ambiguous');
    if (cambridge.hud.status === 'ambiguous') {
      expect(cambridge.hud.message).toMatch(/whole county/i);
    }
    expect(cambridge.countyChoices.length).toBeGreaterThan(1);
  });

  it('uses BEA state RPP when a metro code from another vintage is absent', () => {
    expect(getBeaMetroRpp('00000')).toBeUndefined();
    const texas = geographySnapshot.states.find((row) => row.state === 'TX')!;
    const stateRpp = getBeaStateRpp('TX', texas.stateFips);
    expect(stateRpp?.value).toBeCloseTo(97.057, 3);
    const coverage = resolveLocationCoverage({ locationId: 'state:TX', asOf: '2026-09-02' });
    expect(coverage.bea.fallback).toBe('stateFallback');
    expect(coverage.hud.status).toBe('unavailable');
  });
});

describe('HUD effective dates', () => {
  it('keeps FY2026 effective before October 1, 2026 even though FY2027 is published', () => {
    expect(resolveEffectiveHudRelease(HUD_RELEASES, '2026-09-02').fiscalYear).toBe(2026);
    expect(resolveEffectiveHudRelease(HUD_RELEASES, '2026-09-30').fiscalYear).toBe(2026);
    expect(resolveEffectiveHudRelease(HUD_RELEASES, '2026-10-01').fiscalYear).toBe(2027);
    expect(hudSnapshotIsEffectiveOn(resolveHudFmrSnapshot('2026-09-02'), '2026-09-02')).toBe(true);
    expect(resolveHudFmrSnapshot('2026-09-02').fiscalYear).toBe(2026);
    expect(resolveHudFmrSnapshot('2026-10-01').fiscalYear).toBe(2027);
    const austin2026 = uniqueHudAreaForCounty(resolveHudFmrSnapshot('2026-09-02'), '48453');
    const austin2027 = uniqueHudAreaForCounty(resolveHudFmrSnapshot('2026-10-01'), '48453');
    expect(austin2026 === 'ambiguous' || !austin2026 ? null : austin2026.bedrooms.br2).toBe(1852);
    expect(austin2027 === 'ambiguous' || !austin2027 ? null : austin2027.bedrooms.br2).toBe(1817);
  });

  it('uses the publishing clock for calculators so methodology and COL stay on the same FY', () => {
    const published = resolveHudFmrSnapshot(PUBLISHING_SNAPSHOT_DATE);
    expect(hudSnapshotIsEffectiveOn(published, PUBLISHING_SNAPSHOT_DATE)).toBe(true);
    expect(resolveHudFmrSnapshot()).toEqual(published);
  });
});

describe('Census ACS fixtures', () => {
  it('preserves Austin ACS estimates and MOE without turning sentinels into zero', () => {
    const austin = getAcsRow('1600000US4805000');
    expect(austin?.medianHouseholdIncome).toBe(93658);
    expect(austin?.medianHouseholdIncomeMoe).toBe(1670);
    const texas = getAcsRow('0400000US48');
    expect(texas?.medianHouseholdIncome).toBe(78476);
    const metro = getAcsRow('310M700US12420');
    expect(metro?.medianHouseholdIncome).toBe(100431);
    expect(austin?.population).not.toBe(0);
  });
});

describe('BEA RPP is a spatial index', () => {
  it('keeps national at 100 and does not treat vintage changes as inflation', () => {
    expect(beaRppSnapshot.national).toBe(100);
    expect(beaRppSnapshot.notInflation).toBe(true);
    expect(beaRppSnapshot.referenceYear).toBe(2024);
    const austin = getBeaMetroRpp('12420', 'housingRents');
    expect(austin?.value).toBeCloseTo(120.361, 3);
    expect(austin && austin.value > 10).toBe(true);
  });
});
