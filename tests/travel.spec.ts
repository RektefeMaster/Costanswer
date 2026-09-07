import { describe, expect, it } from 'vitest';
import { calculatePerDiem } from '@/lib/calculations/travel/per-diem';
import { gsaPerDiemSnapshot, getMieBreakdown, listPerDiemDestinations, resolveGsaPerDiemSnapshot, gsaPerDiemReleases } from '@/lib/data/gsa-perdiem-snapshot';
import { parseMieBreakdowns, formatPerDiemDestinationLabel, resolveEffectivePerDiemRelease, resolveLatestPublishedPerDiemRelease, findEffectivePerDiemRelease, gsaFiscalYearsToDiscover, markLatestPublishedPerDiemReleases, type PerDiemRelease } from '@/lib/data/gsa-perdiem';

const gulfShores = 'AL:gulf-shores:baldwin';

describe('GSA per diem dataset', () => {
  it('keeps FY2026 effective before October 1 even if FY2027 is already published', () => {
    const releases: PerDiemRelease[] = [
      {
        snapshotId: 'gsa-perdiem-conus-fy2026-v1',
        fiscalYear: 2026,
        announcementPublishedAt: '2025-08-13T00:00:00.000Z',
        datasetPublishedAt: '2025-08-13T00:00:00.000Z',
        effectiveFrom: '2025-10-01',
        effectiveTo: '2026-09-30',
        latestPublished: false,
      },
      {
        snapshotId: 'gsa-perdiem-conus-fy2027-v1',
        fiscalYear: 2027,
        announcementPublishedAt: '2026-08-12T00:00:00.000Z',
        datasetPublishedAt: '2026-08-12T00:00:00.000Z',
        effectiveFrom: '2026-10-01',
        effectiveTo: '2027-09-30',
        latestPublished: true,
      },
    ];
    expect(resolveLatestPublishedPerDiemRelease(releases).fiscalYear).toBe(2027);
    expect(resolveEffectivePerDiemRelease(releases, '2026-09-30').fiscalYear).toBe(2026);
    expect(resolveEffectivePerDiemRelease(releases, '2026-10-01').fiscalYear).toBe(2027);
  });

  it('resolves the shipped catalog to FY2026 through 30 September 2026 and has no FY2027 rates on file', () => {
    expect(resolveGsaPerDiemSnapshot('2026-09-07').fiscalYear).toBe(2026);
    expect(resolveGsaPerDiemSnapshot('2026-09-30').fiscalYear).toBe(2026);
    expect(() => resolveGsaPerDiemSnapshot('2026-10-01')).toThrow(/No GSA per diem release is effective/);
    expect(findEffectivePerDiemRelease(gsaPerDiemReleases, '2026-10-01')).toBeUndefined();
  });

  it('discovers next fiscal year before 1 October and ranks latestPublished by year, not fetch time', () => {
    expect(gsaFiscalYearsToDiscover(new Date(Date.UTC(2026, 7, 12)))).toEqual([2027, 2026]);
    expect(gsaFiscalYearsToDiscover(new Date(Date.UTC(2026, 8, 7)))).toEqual([2027, 2026]);
    expect(gsaFiscalYearsToDiscover(new Date(Date.UTC(2026, 9, 1)))).toEqual([2027]);
    const ranked = markLatestPublishedPerDiemReleases([
      {
        snapshotId: 'fy2027',
        fiscalYear: 2027,
        announcementPublishedAt: '2026-08-12T00:00:00.000Z',
        datasetPublishedAt: '2026-08-12T00:00:00.000Z',
        effectiveFrom: '2026-10-01',
        effectiveTo: '2027-09-30',
        latestPublished: false,
      },
      {
        snapshotId: 'fy2026',
        fiscalYear: 2026,
        announcementPublishedAt: '2025-08-13T00:00:00.000Z',
        datasetPublishedAt: '2026-09-07T12:00:00.000Z',
        effectiveFrom: '2025-10-01',
        effectiveTo: '2026-09-30',
        latestPublished: true,
      },
    ]);
    expect(ranked.find((row) => row.latestPublished)?.snapshotId).toBe('fy2027');
  });

  it('covers CONUS only and gives every state a standard rate', () => {
    const destinations = listPerDiemDestinations();
    const states = new Set(destinations.map((row) => row.state));
    // Alaska, Hawaii and the territories are set by DoD and State, not GSA.
    for (const outside of ['AK', 'HI']) expect(states.has(outside as never)).toBe(false);
    expect(states.size).toBe(49);
    const standardStates = new Set(destinations.filter((row) => row.isStandardRate).map((row) => row.state));
    expect(standardStates.size).toBe(48);
    expect(destinations.filter((row) => row.city === 'District of Columbia' && row.state !== 'DC')).toHaveLength(0);
    expect(formatPerDiemDestinationLabel(destinations.find((row) => row.key.startsWith('CA:santa-monica:'))!)).toBe('Santa Monica, CA');
    for (const row of destinations) {
      expect(formatPerDiemDestinationLabel(row)).not.toMatch(/ ,/);
    }
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

  it('compares a real room rate with the ceiling night by night', () => {
    const under = calculatePerDiem({
      destinationKey: gulfShores,
      startDate: '2026-06-15',
      endDate: '2026-06-17',
      actualNightlyRate: 200,
    });
    expect(under.value.hotelCheck?.withinLimit).toBe(true);
    expect(under.value.hotelCheck?.overBy).toBe(0);
    expect(under.value.hotelCheck?.nightsOverLimit).toBe(0);
    expect(under.value.hotelCheck?.actualLodgingCost).toBe(400);
    expect(under.value.hotelCheck?.tripTotalAtActualRate).toBe(400 + under.value.mieTotal);
    expect(under.value.hotelCheck?.reimbursableTripTotal).toBe(under.value.hotelCheck?.tripTotalAtActualRate);

    const over = calculatePerDiem({
      destinationKey: gulfShores,
      startDate: '2026-06-15',
      endDate: '2026-06-17',
      actualNightlyRate: 250,
    });
    const juneCap = listPerDiemDestinations().find((row) => row.key === gulfShores)!.lodgingByMonth.jun;
    expect(over.value.hotelCheck?.withinLimit).toBe(false);
    expect(over.value.hotelCheck?.nightsOverLimit).toBe(2);
    expect(over.value.hotelCheck?.overBy).toBe((250 - juneCap) * 2);
    expect(over.breakdown.some((step) => step.label === 'Your room, over the limit')).toBe(true);

    // July $216, August $134. $180 is under in July and over in August.
    const mixed = calculatePerDiem({
      destinationKey: gulfShores,
      startDate: '2026-07-31',
      endDate: '2026-08-02',
      actualNightlyRate: 180,
    });
    expect(mixed.value.seasonalRates).toBe(true);
    expect(mixed.value.hotelCheck?.nightsWithinLimit).toBe(1);
    expect(mixed.value.hotelCheck?.nightsOverLimit).toBe(1);
    expect(mixed.value.hotelCheck?.overBy).toBe(180 - mixed.value.nights[1]!.lodgingCap);
    expect(mixed.value.hotelCheck?.withinLimit).toBe(false);
    expect(mixed.value.hotelCheck?.allowedLodgingCost).toBe(
      Math.min(180, mixed.value.nights[0]!.lodgingCap) + Math.min(180, mixed.value.nights[1]!.lodgingCap),
    );
    expect(mixed.value.hotelCheck?.reimbursableTripTotal).toBe(
      mixed.value.hotelCheck!.allowedLodgingCost + mixed.value.mieTotal,
    );
    expect(mixed.value.hotelCheck!.reimbursableTripTotal).toBeLessThan(mixed.value.grandTotal);
  });

  it('does not compare a room rate on a same-day trip', () => {
    const sameDay = calculatePerDiem({
      destinationKey: gulfShores,
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      actualNightlyRate: 300,
    });
    expect(sameDay.value.lodgingNights).toBe(0);
    expect(sameDay.value.hotelCheck).toBeNull();
  });
});

describe('ZIP to GSA destination', () => {
  it('maps a listed county, a standard CONUS fallback, DC metro, and outside CONUS', async () => {
    const { resolveZipToDestination } = await import('@/lib/calculations/travel/zip-destination');

    const gulf = resolveZipToDestination('36542');
    expect(gulf.status).toBe('resolved');
    if (gulf.status !== 'resolved') return;
    expect(gulf.destinationKey).toBe(gulfShores);
    expect(gulf.usesStandardRate).toBe(false);
    expect(gulf.summary).toMatch(/Baldwin/);
    expect(gulf.summary).toMatch(/Gulf Shores/);

    const montgomery = resolveZipToDestination('36104');
    expect(montgomery.status).toBe('resolved');
    if (montgomery.status !== 'resolved') return;
    expect(montgomery.usesStandardRate).toBe(true);
    expect(montgomery.destinationKey).toBe('AL:standard-rate');
    expect(montgomery.summary).toMatch(/standard CONUS rate/);
    expect(montgomery.destinationLabel).toMatch(/Alabama standard CONUS rate/);

    const dc = resolveZipToDestination('20001');
    expect(dc.status).toBe('resolved');
    if (dc.status !== 'resolved') return;
    expect(dc.usesStandardRate).toBe(false);
    expect(dc.destinationKey).toMatch(/^DC:/);
    expect(dc.destinationLabel).toBe('Washington, DC');
    expect(dc.summary).toMatch(/Washington/);
    expect(dc.summary).not.toMatch(/GSA lists as District of Columbia/);

    const arlington = resolveZipToDestination('22201');
    expect(arlington.status).toBe('resolved');
    if (arlington.status !== 'resolved') return;
    expect(arlington.destinationKey).toBe(dc.destinationKey);
    expect(arlington.destinationLabel).toBe('Washington, DC');
    expect(arlington.summary).toMatch(/Arlington/);

    const fairfax = resolveZipToDestination('22030');
    expect(fairfax.status).toBe('resolved');
    if (fairfax.status !== 'resolved') return;
    expect(fairfax.destinationKey).toBe(dc.destinationKey);
    expect(fairfax.destinationLabel).toBe('Washington, DC');
    expect(fairfax.countyLabel).toMatch(/Fairfax/);

    const bethesda = resolveZipToDestination('20814');
    expect(bethesda.status).toBe('resolved');
    if (bethesda.status !== 'resolved') return;
    expect(bethesda.destinationKey).toBe(dc.destinationKey);

    const alexandria = resolveZipToDestination('22314');
    expect(alexandria.status).toBe('resolved');
    if (alexandria.status !== 'resolved') return;
    expect(alexandria.destinationKey).toBe(dc.destinationKey);
    expect(alexandria.destinationLabel).toBe('Washington, DC');

    const birmingham = resolveZipToDestination('35203');
    expect(birmingham.status).toBe('resolved');
    if (birmingham.status !== 'resolved') return;
    expect(birmingham.destinationKey).toBe('AL:birmingham:jefferson');
    expect(birmingham.usesStandardRate).toBe(false);

    const honolulu = resolveZipToDestination('96813');
    expect(honolulu.status).toBe('outside-conus');
    if (honolulu.status !== 'outside-conus') return;
    expect(honolulu.message).toMatch(/Alaska, Hawaii/);

    const missing = resolveZipToDestination('00000');
    expect(missing.status).toBe('not-a-zcta');
    expect(resolveZipToDestination('12').status).toBe('not-a-zcta');
  });

  it('keeps city carve-outs as alternates because a ZIP cannot tell the city from the county', async () => {
    const { resolveZipToDestination } = await import('@/lib/calculations/travel/zip-destination');

    const cambridge = resolveZipToDestination('02138');
    expect(cambridge.status).toBe('resolved');
    if (cambridge.status !== 'resolved') return;
    expect(cambridge.destinationKey).toBe('MA:burlington-woburn:middlesex-less-the-city-of-cambridge');
    expect(cambridge.splitByCity).toBe(true);
    expect(cambridge.citySplitDestinationKeys).toEqual(['MA:boston-cambridge:suffolk-city-of-cambridge']);
    expect(cambridge.destinationLabel).toMatch(/Burlington/);
    expect(cambridge.citySplitLabels[0]).toMatch(/Cambridge/);
    expect(cambridge.summary).toMatch(/cannot tell them apart/);

    const cambridgeEast = resolveZipToDestination('02139');
    expect(cambridgeEast.status).toBe('resolved');
    if (cambridgeEast.status !== 'resolved') return;
    expect(cambridgeEast.destinationKey).toBe(cambridge.destinationKey);
    expect(cambridgeEast.splitByCity).toBe(true);

    const boston = resolveZipToDestination('02108');
    expect(boston.status).toBe('resolved');
    if (boston.status !== 'resolved') return;
    expect(boston.destinationKey).toBe('MA:boston-cambridge:suffolk-city-of-cambridge');
    expect(boston.splitByCity).toBe(false);

    const burlington = resolveZipToDestination('01803');
    expect(burlington.status).toBe('resolved');
    if (burlington.status !== 'resolved') return;
    expect(burlington.destinationKey).toBe(cambridge.destinationKey);
    expect(burlington.splitByCity).toBe(true);

    const sedona = resolveZipToDestination('86336');
    expect(sedona.status).toBe('resolved');
    if (sedona.status !== 'resolved') return;
    expect(sedona.destinationKey).toBe('AZ:grand-canyon-flagstaff:coconino-yavapai-less-the-city-of-sedona');
    expect(sedona.splitByCity).toBe(true);
    expect(sedona.citySplitDestinationKeys).toEqual(['AZ:sedona:city-limits-of-sedona']);
    expect(sedona.citySplitLabels[0]).toBe('Sedona, AZ');

    const santaMonica = resolveZipToDestination('90401');
    expect(santaMonica.status).toBe('resolved');
    if (santaMonica.status !== 'resolved') return;
    expect(santaMonica.destinationKey).toBe('CA:los-angeles:los-angeles-orange-ventura-edwards-afb-less-the-city-of-santa-monica');
    expect(santaMonica.splitByCity).toBe(true);
    expect(santaMonica.citySplitDestinationKeys).toEqual(['CA:santa-monica:city-limits-of-santa-monica']);
    expect(santaMonica.citySplitLabels[0]).toBe('Santa Monica, CA');

    const falmouth = resolveZipToDestination('02540');
    expect(falmouth.status).toBe('resolved');
    if (falmouth.status !== 'resolved') return;
    expect(falmouth.destinationKey).toBe('MA:hyannis:barnstable-less-the-city-of-falmouth');
    expect(falmouth.splitByCity).toBe(true);
    expect(falmouth.citySplitDestinationKeys).toEqual(['MA:falmouth:city-limits-of-falmouth']);
  });

  it('maps independent cities that GSA writes as city limits, not county names', async () => {
    const { resolveZipToDestination } = await import('@/lib/calculations/travel/zip-destination');

    const richmond = resolveZipToDestination('23219');
    expect(richmond.status).toBe('resolved');
    if (richmond.status !== 'resolved') return;
    expect(richmond.destinationKey).toBe('VA:richmond:city-of-richmond');
    expect(richmond.usesStandardRate).toBe(false);

    const roanoke = resolveZipToDestination('24011');
    expect(roanoke.status).toBe('resolved');
    if (roanoke.status !== 'resolved') return;
    expect(roanoke.destinationKey).toBe('VA:roanoke:city-limits-of-roanoke');

    const virginiaBeach = resolveZipToDestination('23451');
    expect(virginiaBeach.status).toBe('resolved');
    if (virginiaBeach.status !== 'resolved') return;
    expect(virginiaBeach.destinationKey).toBe('VA:virginia-beach:city-of-virginia-beach');

    const charlottesville = resolveZipToDestination('22902');
    expect(charlottesville.status).toBe('resolved');
    if (charlottesville.status !== 'resolved') return;
    expect(charlottesville.destinationKey).toBe('VA:charlottesville:city-of-charlottesville-albemarle');

    const roanokeCounty = resolveZipToDestination('24018');
    expect(roanokeCounty.status).toBe('resolved');
    if (roanokeCounty.status !== 'resolved') return;
    expect(roanokeCounty.destinationKey).not.toBe('VA:roanoke:city-limits-of-roanoke');
    expect(roanokeCounty.usesStandardRate).toBe(true);
  });
});
