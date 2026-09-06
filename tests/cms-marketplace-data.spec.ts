import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateAcaSubsidy } from '@/lib/calculations/aca-subsidy';
// Declared `unknown` so the compiler does not infer literal types for 1.7 MB
// of premium columns on every run. Cast to the schema types here, which is what
// the ingest already proves at write time and `verify:cms` proves by hash.
import indexRaw from '@/data/cms-marketplace/index.json';
import premiumsRaw from '@/data/cms-marketplace/premiums.json';
import {
  CMS_ABSENT, CMS_AGE_COUNT, CMS_COLUMNS_PER_COUNTY, CMS_COST_SHARING_LEVELS, CMS_METALS, CMS_PUBLISHED_AGES,
  FEDERAL_DEFAULT_AGE_CURVE, cmsMarketplaceIndexSchema, cmsMarketplacePremiumsSchema,
  costSharingLevelForIncome, householdPremium, nearestPublishedAge, parseEnrollingAges, premiumForAge,
} from '@/lib/data/cms-marketplace';
import {
  benchmarkForHousehold, benchmarkSilverByAge, cmsCountiesForState, cmsCountiesForZip, cmsMarketplaceIndex,
  costSharingVariant, getCmsCounty, isCmsCoveredState, lowestMetalForHousehold, metalSummary,
} from '@/lib/data/cms-marketplace-snapshot';
import { assertNormalizedHash } from '@/lib/data/envelope';
import { sha256 } from '@/lib/data/sha256';

const AGE_21 = CMS_PUBLISHED_AGES.indexOf(21);
const BOTH_FEDERAL = { ageCurve: 'federal-default', childAgeCurve: 'federal-default' } as const;
const BOTH_FILED = { ageCurve: 'state-filed', childAgeCurve: 'state-filed' } as const;

const indexJson = indexRaw as import('@/lib/data/cms-marketplace').CmsMarketplaceIndex;
const premiumsJson = premiumsRaw as import('@/lib/data/cms-marketplace').CmsMarketplacePremiums;

describe('CMS Marketplace landscape snapshot', () => {
  it('matches its own digests, its manifest, and its immutable copy', async () => {
    const directory = path.join(process.cwd(), 'data', 'cms-marketplace');
    const indexText = await readFile(path.join(directory, 'index.json'), 'utf8');
    assertNormalizedHash(JSON.parse(indexText), 'CMS index');
    const premiumsText = await readFile(path.join(directory, 'premiums.json'), 'utf8');
    expect(sha256(premiumsText)).toBe(cmsMarketplaceIndex.premiumsSha256);
    expect(() => cmsMarketplaceIndexSchema.parse(indexJson)).not.toThrow();
    expect(() => cmsMarketplacePremiumsSchema.parse(premiumsJson)).not.toThrow();

    const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
    expect(manifest.currentSnapshotId).toBe(cmsMarketplaceIndex.snapshotId);
    expect(manifest.normalizedSha256).toBe(cmsMarketplaceIndex.normalizedSha256);
    const immutable = await readFile(path.join(directory, 'snapshots', `${cmsMarketplaceIndex.snapshotId}.json`), 'utf8');
    expect(immutable).toBe(indexText);
    const recordedDigest = (await readFile(path.join(directory, 'raw', '2026-medical.sha256'), 'utf8')).trim();
    expect(recordedDigest).toBe(cmsMarketplaceIndex.rawSha256);
  });

  it('covers only the HealthCare.gov states and says so rather than reading as no plans', () => {
    expect(cmsMarketplaceIndex.observationPeriod).toBe('2026');
    expect(cmsMarketplaceIndex.counties.length).toBeGreaterThanOrEqual(2_000);
    expect(cmsMarketplaceIndex.coveredStateCodes).toHaveLength(30);
    expect(isCmsCoveredState('TX')).toBe(true);
    // California and New York run their own exchanges and publish separately.
    expect(isCmsCoveredState('CA')).toBe(false);
    expect(isCmsCoveredState('NY')).toBe(false);
    expect(cmsCountiesForState('CA')).toHaveLength(0);
    expect(cmsMarketplaceIndex.caveats.join(' ')).toContain('run their own exchanges');
    for (const county of cmsMarketplaceIndex.counties) {
      expect(cmsMarketplaceIndex.coveredStateCodes).toContain(county.stateCode);
      // A benchmark is the second-lowest Silver plan, so two is the minimum.
      expect(county.silverPlanCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('packs every county losslessly and keeps the figures ordered', () => {
    expect(premiumsJson.values.length).toBe(premiumsJson.countyCount * CMS_COLUMNS_PER_COUNTY);
    expect(premiumsJson.countyCount).toBe(cmsMarketplaceIndex.counties.length);
    for (const county of cmsMarketplaceIndex.counties) {
      const benchmark = benchmarkSilverByAge(county.countyFips);
      const silver = metalSummary(county.countyFips, 'silver');
      expect(benchmark).toHaveLength(CMS_AGE_COUNT);
      expect(silver).not.toBeNull();
      benchmark.forEach((value, index) => {
        expect(value).toBeGreaterThan(0);
        // The second-lowest Silver can never undercut the lowest.
        expect(value).toBeGreaterThanOrEqual(silver!.lowestByAge[index] - 0.005);
      });
      for (const metal of CMS_METALS) {
        const summary = metalSummary(county.countyFips, metal);
        if (!summary) continue;
        summary.lowestByAge.forEach((low, index) => expect(low).toBeLessThanOrEqual(summary.medianByAge[index] + 0.005));
        expect(summary.individualDeductible.low).toBeLessThanOrEqual(summary.individualDeductible.high);
        expect(summary.individualMaximumOutOfPocket.low).toBeLessThanOrEqual(summary.individualMaximumOutOfPocket.high);
      }
      for (const level of CMS_COST_SHARING_LEVELS) {
        const variant = costSharingVariant(county.countyFips, level);
        if (!variant) continue;
        // Richer cost sharing cannot raise the out-of-pocket ceiling.
        expect(variant.individualMaximumOutOfPocket.median).toBeLessThanOrEqual(silver!.individualMaximumOutOfPocket.median);
      }
    }
  });

  it('reproduces the federal age curve for every county that files on it', () => {
    const conforming = cmsMarketplaceIndex.counties.filter((county) => county.ageCurve === 'federal-default');
    const stateFiled = cmsMarketplaceIndex.counties.filter((county) => county.ageCurve === 'state-filed');
    expect(conforming.length).toBeGreaterThan(1_900);
    // Utah is the one state that files its own adult curve for this plan year.
    expect([...new Set(stateFiled.map((county) => county.stateCode))]).toEqual(['UT']);

    for (const county of conforming.slice(0, 200)) {
      const benchmark = benchmarkSilverByAge(county.countyFips);
      for (const age of [27, 30, 40, 50, 60] as const) {
        const quote = premiumForAge(county, benchmark, age);
        expect(quote.exactForAge).toBe(true);
        expect(quote.premium).toBeCloseTo(benchmark[CMS_PUBLISHED_AGES.indexOf(age)], 2);
      }
    }
  });

  /**
   * The under-21 range is asked about separately, and it has to be. Checking
   * only the adult ages and then scaling a 19-year-old off age 21 overpriced
   * Autauga County by 48% and called the figure exact.
   */
  it('never scales an under-21 age off a curve the county does not file on', () => {
    const splitCurve = cmsMarketplaceIndex.counties.filter(
      (county) => county.ageCurve === 'federal-default' && county.childAgeCurve === 'state-filed',
    );
    expect(splitCurve.length).toBeGreaterThan(100);

    for (const county of splitCurve) {
      const benchmark = benchmarkSilverByAge(county.countyFips);
      const published18 = benchmark[CMS_PUBLISHED_AGES.indexOf(18)];
      const curved = benchmark[AGE_21] * FEDERAL_DEFAULT_AGE_CURVE[18];
      // These counties genuinely diverge, which is what makes the flag necessary.
      expect(Math.abs(published18 - curved) / curved).toBeGreaterThan(0.005);

      // An unpublished under-21 age falls back to a published one and says so.
      const nineteen = premiumForAge(county, benchmark, 19);
      expect(nineteen.exactForAge).toBe(false);
      expect(nineteen.quotedAge).toBe(18);
      expect(nineteen.premium).toBe(published18);
      // Adults in the same county are still exact, because that range conforms.
      expect(premiumForAge(county, benchmark, 35).exactForAge).toBe(true);
      // Published ages are exact on both sides of 21 regardless.
      expect(premiumForAge(county, benchmark, 18)).toMatchObject({ exactForAge: true, premium: published18 });
      expect(premiumForAge(county, benchmark, 8).exactForAge).toBe(true);
    }

    // A household including such a child is flagged inexact rather than silently rounded.
    expect(benchmarkForHousehold(splitCurve[0].countyFips, [40, 19]).exactForAges).toBe(false);

    // Autauga is the county that made the split necessary: adult rates match
    // the curve, under-21 rates do not, and a 20-year-old must not be quoted
    // at the adult age-21 premium just because 21 is numerically closer.
    const autauga = getCmsCounty('01001');
    expect(autauga).toMatchObject({ countyName: 'Autauga', stateCode: 'AL', ageCurve: 'federal-default', childAgeCurve: 'state-filed' });
    const autaugaBenchmark = benchmarkSilverByAge('01001');
    expect(premiumForAge(autauga!, autaugaBenchmark, 19)).toMatchObject({ exactForAge: false, quotedAge: 18 });
    expect(premiumForAge(autauga!, autaugaBenchmark, 20)).toMatchObject({
      exactForAge: false,
      quotedAge: 18,
      premium: autaugaBenchmark[CMS_PUBLISHED_AGES.indexOf(18)],
    });
    expect(benchmarkForHousehold('01001', [40, 19]).exactForAges).toBe(false);
  });

  it('quotes an unpublished age off the curve, and refuses to for a state-filed county', () => {
    const benchmark = [400, 470, 500, 524, 567.5, 639, 893, 1357];
    // 35 is not a published age; the federal curve prices it exactly.
    const federal = premiumForAge(BOTH_FEDERAL, benchmark, 35);
    expect(federal.premium).toBeCloseTo(500 * FEDERAL_DEFAULT_AGE_CURVE[35], 2);
    expect(federal.exactForAge).toBe(true);
    expect(federal.quotedAge).toBe(35);
    // Above 64 the curve stops rising, as the rating rules require.
    expect(premiumForAge(BOTH_FEDERAL, benchmark, 70).premium).toBeCloseTo(500 * 3, 2);

    // 35 is equidistant from 30 and 40, so the older age wins the tie here too.
    const filed = premiumForAge(BOTH_FILED, benchmark, 35);
    expect(filed.exactForAge).toBe(false);
    expect(filed.quotedAge).toBe(40);
    expect(filed.premium).toBe(benchmark[CMS_PUBLISHED_AGES.indexOf(40)]);
    expect(premiumForAge(BOTH_FILED, benchmark, 32).quotedAge).toBe(30);
    // A 20-year-old is still a child, so the fallback stays on that side of 21.
    expect(premiumForAge(BOTH_FILED, benchmark, 20).quotedAge).toBe(18);
    // A published age is exact even where the state files its own curve.
    expect(premiumForAge(BOTH_FILED, benchmark, 50)).toMatchObject({ exactForAge: true, quotedAge: 50 });
    expect(nearestPublishedAge(10)).toBe('child');
    expect(nearestPublishedAge(15)).toBe('child');
    // 16 is equidistant from 14 and 18; the tie goes to the older child age.
    expect(nearestPublishedAge(16)).toBe(18);
    expect(nearestPublishedAge(20)).toBe(18);
    // 45 is equidistant from 40 and 50; the tie goes to the older age so a
    // budget is never handed the cheaper of two equally close figures.
    expect(nearestPublishedAge(45)).toBe(50);
    expect(nearestPublishedAge(44)).toBe(40);
    expect(nearestPublishedAge(46)).toBe(50);
  });

  it('bills at most the three oldest children under 21', () => {
    const benchmark = [400, 470, 500, 524, 567.5, 639, 893, 1357];
    const twoAdults = householdPremium(BOTH_FEDERAL, benchmark, [40, 38]);
    expect(twoAdults.billedMemberCount).toBe(2);
    expect(twoAdults.premium).toBeCloseTo(500 * FEDERAL_DEFAULT_AGE_CURVE[40] + 500 * FEDERAL_DEFAULT_AGE_CURVE[38], 2);

    const fourChildren = householdPremium(BOTH_FEDERAL, benchmark, [40, 38, 12, 10, 8, 6]);
    const threeChildren = householdPremium(BOTH_FEDERAL, benchmark, [40, 38, 12, 10, 8]);
    // The fourth child adds nothing to the premium.
    expect(fourChildren.premium).toBe(threeChildren.premium);
    expect(fourChildren.billedMemberCount).toBe(5);
    expect(fourChildren.unbilledChildCount).toBe(1);
    // A 20-year-old is a child for rating and competes for those three slots.
    expect(householdPremium(BOTH_FEDERAL, benchmark, [40, 20, 19, 18, 2]).billedMemberCount).toBe(4);
    expect(() => householdPremium(BOTH_FEDERAL, benchmark, [])).toThrow(/at least one member/);
  });

  it('drops empty age tokens instead of turning a trailing comma into an infant', () => {
    expect(parseEnrollingAges('40, 38, 10')).toEqual({ ages: [40, 38, 10], invalidTokens: [] });
    expect(parseEnrollingAges('40, 38, 10,')).toEqual({ ages: [40, 38, 10], invalidTokens: [] });
    expect(parseEnrollingAges('40,,38')).toEqual({ ages: [40, 38], invalidTokens: [] });
    expect(parseEnrollingAges('0')).toEqual({ ages: [0], invalidTokens: [] });
    expect(parseEnrollingAges('')).toEqual({ ages: [], invalidTokens: [] });
    expect(parseEnrollingAges('abc')).toEqual({ ages: [], invalidTokens: ['abc'] });
    expect(parseEnrollingAges('40, bob, 10')).toEqual({ ages: [40, 10], invalidTokens: ['bob'] });
  });

  it('reads a real county end to end', () => {
    const harris = getCmsCounty('48201');
    expect(harris).toMatchObject({ stateCode: 'TX', countyName: 'Harris', ageCurve: 'federal-default' });
    const benchmark = benchmarkSilverByAge('48201');
    expect(benchmark[AGE_21]).toBeGreaterThan(100);
    const silver = metalSummary('48201', 'silver')!;
    const bronze = metalSummary('48201', 'bronze')!;
    // Bronze buys a lower premium with a higher deductible; that is the trade.
    expect(bronze.lowestByAge[AGE_21]).toBeLessThan(silver.lowestByAge[AGE_21]);
    expect(bronze.individualDeductible.median).toBeGreaterThan(silver.individualDeductible.median);

    const household = benchmarkForHousehold('48201', [40, 38, 10]);
    expect(household.premium).toBeGreaterThan(benchmark[AGE_21]);
    expect(household.billedMemberCount).toBe(3);
    expect(lowestMetalForHousehold('48201', 'gold', [40])!.premium).toBeGreaterThan(0);
    expect(() => benchmarkSilverByAge('06037')).toThrow(/No published Marketplace plans/);
  });

  it('resolves a ZIP to counties and distinguishes an unpriced state from a bad ZIP', () => {
    const houston = cmsCountiesForZip('77002');
    expect(houston.status).toBe('covered');
    if (houston.status === 'covered') expect(houston.counties.some((county) => county.countyFips === '48201')).toBe(true);
    // A Los Angeles ZIP is a real place this release simply does not price.
    const losAngeles = cmsCountiesForZip('90012');
    expect(losAngeles.status).toBe('not-in-this-release');
    expect(losAngeles.stateCodes).toContain('CA');
    expect(cmsCountiesForZip('00000').status).toBe('unknown-zip');
    expect(cmsCountiesForZip('abcde').status).toBe('unknown-zip');
  });

  /**
   * Alaska and Hawaii have their own federal poverty guidelines, so a caller
   * that cannot name the state must not quietly assume a contiguous one: the
   * same income gives a credit tens of dollars a month apart.
   */
  it('names the state whether or not this release prices the county', () => {
    expect(cmsCountiesForZip('77002').stateCodes).toEqual(['TX']);
    // Anchorage is priced here; Los Angeles is not, and both still name a state.
    expect(cmsCountiesForZip('99501').stateCodes).toEqual(['AK']);
    expect(cmsCountiesForZip('96813').stateCodes).toEqual(['HI']);
    expect(cmsCountiesForZip('90012').stateCodes).toEqual(['CA']);
    // Only a ZIP that resolves to nothing at all reports no state.
    expect(cmsCountiesForZip('00000').stateCodes).toEqual([]);
    // Naming the state is what keeps Alaska on its own poverty guideline.
    const anchorage = cmsCountiesForZip('99501');
    expect(anchorage.stateCodes).toEqual(['AK']);
    expect(calculateAcaSubsidy({
      coverageYear: 2026,
      stateCode: anchorage.stateCodes[0]!,
      householdSize: 1,
      annualHouseholdMagi: 25_000,
      monthlyBenchmarkPremium: 500,
      monthlyPlanPremium: 500,
      eligibility: 'assumed-eligible',
    }).value.povertyGuideline).toBe(19_550);
  });

  it('maps income to the cost-sharing variant it actually grants', () => {
    expect(costSharingLevelForIncome(120)).toBe(94);
    expect(costSharingLevelForIncome(150)).toBe(94);
    expect(costSharingLevelForIncome(150.01)).toBe(87);
    expect(costSharingLevelForIncome(200)).toBe(87);
    expect(costSharingLevelForIncome(200.01)).toBe(73);
    expect(costSharingLevelForIncome(250)).toBe(73);
    // Above 250% there is no reduction; below 100% the Marketplace decides.
    expect(costSharingLevelForIncome(250.01)).toBeNull();
    expect(costSharingLevelForIncome(99)).toBeNull();
    expect(costSharingLevelForIncome(Number.NaN)).toBeNull();
  });

  it('rejects a tampered or truncated packed column set', () => {
    expect(() => cmsMarketplacePremiumsSchema.parse({ ...premiumsJson, countyCount: premiumsJson.countyCount + 1 }))
      .toThrow(/Packed columns hold/);
    expect(() => cmsMarketplacePremiumsSchema.parse({ ...premiumsJson, values: [...premiumsJson.values, 1] }))
      .toThrow(/Packed columns hold/);
    // -1 is the only negative allowed: it marks a figure the county does not publish.
    expect(() => cmsMarketplacePremiumsSchema.parse({ ...premiumsJson, values: premiumsJson.values.map(() => CMS_ABSENT - 1) }))
      .toThrow();
  });
});
