import { describe, expect, it } from 'vitest';
import { calculatePerDiem } from '@/lib/calculations/travel/per-diem';
import { gsaPerDiemSnapshot, getMieBreakdown, listPerDiemDestinations } from '@/lib/data/gsa-perdiem-snapshot';
import { parseMieBreakdowns } from '../scripts/ingest-gsa-perdiem';

const gulfShores = 'AL:gulf-shores:baldwin';

describe('GSA per diem dataset', () => {
  it('covers CONUS only and gives every state a standard rate', () => {
    const destinations = listPerDiemDestinations();
    const states = new Set(destinations.map((row) => row.state));
    // Alaska, Hawaii and the territories are set by DoD and State, not GSA.
    for (const outside of ['AK', 'HI']) expect(states.has(outside as never)).toBe(false);
    expect(states.size).toBe(49);
    const standardStates = new Set(destinations.filter((row) => row.isStandardRate).map((row) => row.state));
    expect(standardStates.size).toBe(48);
    expect(gsaPerDiemSnapshot.effectiveFrom).toBe(`${gsaPerDiemSnapshot.fiscalYear - 1}-10-01`);
    expect(gsaPerDiemSnapshot.effectiveTo).toBe(`${gsaPerDiemSnapshot.fiscalYear}-09-30`);
  });

  it('keeps every published M&IE tier internally consistent', () => {
    for (const tier of gsaPerDiemSnapshot.mieBreakdowns) {
      expect(tier.breakfast + tier.lunch + tier.dinner + tier.incidentals).toBeCloseTo(tier.total, 5);
      // GSA publishes the reduced amount rather than leaving it to be derived.
      expect(tier.firstLastDay).toBeCloseTo(tier.total * 0.75, 5);
    }
    expect(getMieBreakdown(gsaPerDiemSnapshot.mieBreakdowns[0].total)).toBeDefined();
  });

  it('reads the M&IE table off the page and rejects a layout it does not recognise', () => {
    const page = `<table><tr><td>$68</td><td>$16</td><td>$19</td><td>$28</td><td>$5</td><td>$51.00</td></tr>
      <tr><td>$74</td><td>$18</td><td>$20</td><td>$31</td><td>$5</td><td>$55.50</td></tr>
      <tr><td>$80</td><td>$20</td><td>$22</td><td>$33</td><td>$5</td><td>$60.00</td></tr>
      <tr><td>$99</td><td>$1</td><td>$1</td><td>$1</td><td>$1</td><td>$1.00</td></tr></table>`;
    const tiers = parseMieBreakdowns(page);
    expect(tiers.map((row) => row.total)).toEqual([68, 74, 80]);
    // A row whose parts do not add up is not an M&IE tier and is skipped.
    expect(tiers.some((row) => row.total === 99)).toBe(false);
    expect(() => parseMieBreakdowns('<p>no table here</p>')).toThrow(/layout has probably changed/);
  });
});

describe('per diem trip', () => {
  it('counts nights and meal days separately and reduces the travel days', () => {
    const trip = calculatePerDiem({ destinationKey: gulfShores, startDate: '2026-06-15', endDate: '2026-06-17' });
    const mie = getMieBreakdown(trip.value.fullDayMie);
    // Three days is two nights of lodging and three days of meals.
    expect(trip.value.totalDays).toBe(3);
    expect(trip.value.lodgingNights).toBe(2);
    expect(trip.value.lodgingTotal).toBe(trip.value.nights.reduce((sum, night) => sum + night.lodgingCap, 0));
    expect(trip.value.mieTotal).toBe(mie.firstLastDay * 2 + mie.total);
    expect(trip.value.grandTotal).toBe(trip.value.lodgingTotal + trip.value.mieTotal);
    expect(trip.value.days.filter((day) => day.isTravelDay)).toHaveLength(2);
    expect(trip.datasetSnapshotIds).toEqual([gsaPerDiemSnapshot.snapshotId]);
  });

  it('prices each night against the month it falls in', () => {
    // Gulf Shores is a seasonal destination, so a stay crossing out of high
    // season cannot be flattened to a single nightly rate.
    const crossing = calculatePerDiem({ destinationKey: gulfShores, startDate: '2026-07-31', endDate: '2026-08-02' });
    const destination = listPerDiemDestinations().find((row) => row.key === gulfShores)!;
    expect(destination.lodgingByMonth.jul).not.toBe(destination.lodgingByMonth.aug);
    expect(crossing.value.nights.map((night) => night.lodgingCap))
      .toEqual([destination.lodgingByMonth.jul, destination.lodgingByMonth.aug]);
    expect(crossing.value.seasonalRates).toBe(true);
    expect(crossing.value.lodgingTotal).toBe(destination.lodgingByMonth.jul + destination.lodgingByMonth.aug);
  });

  it('pays no lodging and a reduced meal rate on a same-day trip', () => {
    const sameDay = calculatePerDiem({ destinationKey: gulfShores, startDate: '2026-06-15', endDate: '2026-06-15' });
    expect(sameDay.value.lodgingNights).toBe(0);
    expect(sameDay.value.lodgingTotal).toBe(0);
    expect(sameDay.value.mieTotal).toBe(getMieBreakdown(sameDay.value.fullDayMie).firstLastDay);
  });

  it('falls back to the state standard rate and says so', () => {
    const standard = listPerDiemDestinations().find((row) => row.isStandardRate && row.state === 'AL')!;
    const trip = calculatePerDiem({ destinationKey: standard.key, startDate: '2026-06-15', endDate: '2026-06-17' });
    expect(trip.value.usesStandardRate).toBe(true);
    expect(trip.assumptions.join(' ')).toMatch(/does not list this locality separately/);
    expect(trip.assumptions.join(' ')).toMatch(/Alaska, Hawaii, U.S. territories and foreign locations/);
  });

  it('flags dates outside the loaded fiscal year and refuses a backwards trip', () => {
    const outside = calculatePerDiem({ destinationKey: gulfShores, startDate: '2027-11-01', endDate: '2027-11-03' });
    expect(outside.value.outsideRateYear).toBe(true);
    expect(outside.assumptions.join(' ')).toMatch(/fall partly outside that year/);

    expect(() => calculatePerDiem({ destinationKey: gulfShores, startDate: '2026-06-17', endDate: '2026-06-15' }))
      .toThrow(/cannot be before/);
    expect(() => calculatePerDiem({ destinationKey: 'nope', startDate: '2026-06-15', endDate: '2026-06-16' }))
      .toThrow(/Choose a destination/);
  });
});
