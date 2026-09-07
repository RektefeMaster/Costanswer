import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DATASET_POLICIES, scheduledDatasetIds } from '@/lib/data/dataset-policy';
import { addUtcDays, evaluateDatasetFreshness, evaluateFreshness, nextExpectedReleaseDate, observationPeriodEndDate, utcCalendarDate } from '@/lib/data/freshness';
import { datasetSourceDisplay, formatObservationPeriod } from '@/lib/data/source-display';
import {
  EIA_GASOLINE_SERIES_BY_CODE,
  normalizeEiaGasolineApiResponse,
  normalizeEiaGasolineHtml,
  parseEiaGasolineApiResponse,
} from '@/lib/data/eia-gasoline';
import { observationsFromBlsTimeSeries } from '@/lib/data/bls-cpi';
import { listPublishedTaxYears } from '@/lib/data/tax/snapshot';
import currentGasolineFixture from '@/data/eia-gasoline/current.json';
import {
  abnormalRelativeChangeCodes,
  atomicWrite,
  compareObservationPeriod,
  currentEnvelopeTextFor,
  evaluateRefreshDecision,
  jsonDocumentsEqual,
  manifestTextFor,
  promoteSnapshotFiles,
  syncPromotionPointer,
  writeImmutable,
} from '../scripts/ingest-io';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'costanswer-ingest-'));
  tempDirs.push(dir);
  return dir;
}

describe('dataset freshness policy', () => {
  it('measures freshness against the provider release calendar, not raw age', () => {
    const electricity = DATASET_POLICIES['eia-electricity'];
    // EIA runs about two months behind, so June data is still the newest thing
    // EIA has published all through August. Calling it stale on age alone was
    // the site contradicting itself: "stale · latest available official data".
    expect(nextExpectedReleaseDate(electricity, { observationPeriod: '2026-06' })).toBe('2026-09-30');
    expect(evaluateFreshness(electricity, { observationPeriod: '2026-06' }, '2026-08-15')).toBe('current');
    expect(evaluateFreshness(electricity, { observationPeriod: '2026-06' }, '2026-09-29')).toBe('current');
    expect(evaluateFreshness(electricity, { observationPeriod: '2026-06' }, '2026-09-30')).toBe('update-due');
    expect(evaluateFreshness(electricity, { observationPeriod: '2026-06' }, '2026-10-30')).toBe('stale');
    expect(observationPeriodEndDate('2026-06', 'monthly')).toBe('2026-06-30');
    expect(addUtcDays('2026-06-30', 45)).toBe('2026-08-14');
  });

  it('treats weekly and yearly cadences from their observation dates', () => {
    expect(evaluateDatasetFreshness('eia-gasoline', { observationPeriod: '2026-08-31' }, '2026-09-07')).toBe('current');
    // One release interval past the survey week: a newer weekly figure is out.
    expect(evaluateDatasetFreshness('eia-gasoline', { observationPeriod: '2026-08-31' }, '2026-09-08')).toBe('update-due');
    expect(evaluateDatasetFreshness('eia-gasoline', { observationPeriod: '2026-08-31' }, '2026-09-14')).toBe('update-due');
    expect(evaluateDatasetFreshness('eia-gasoline', { observationPeriod: '2026-08-31' }, '2026-09-15')).toBe('stale');
    expect(evaluateDatasetFreshness('freddie-mac-pmms', { observationPeriod: '2026-08-27' }, '2026-09-10')).toBe('stale');
    // PMMS publishes every Thursday, so the Aug 27 survey is superseded on Sep 3.
    expect(evaluateDatasetFreshness('freddie-mac-pmms', { observationPeriod: '2026-08-27' }, '2026-09-02')).toBe('current');
    expect(evaluateDatasetFreshness('freddie-mac-pmms', { observationPeriod: '2026-08-27' }, '2026-09-03')).toBe('update-due');
    expect(evaluateDatasetFreshness('freddie-mac-pmms', { observationPeriod: '2026-08-27' }, '2026-09-09')).toBe('update-due');
    expect(evaluateDatasetFreshness('us-tax', { observationPeriod: '2026' }, '2027-02-04')).toBe('current');
    expect(evaluateDatasetFreshness('us-tax', { observationPeriod: '2026' }, '2028-04-01')).toBe('stale');
    expect(evaluateDatasetFreshness('irs-retirement-limits', { observationPeriod: '2026' }, '2027-02-04')).toBe('current');
    expect(evaluateDatasetFreshness('irs-retirement-limits', { observationPeriod: '2026' }, '2028-04-01')).toBe('stale');

    // OMB issues metro delineation bulletins on no fixed schedule, so Bulletin
    // 23-01 stays current rather than aging into a warning nobody can act on.
    expect(DATASET_POLICIES['census-omb-geography'].releaseIntervalDays).toBeNull();
    expect(evaluateDatasetFreshness('census-omb-geography', {
      observationPeriod: '2024',
      publishedAt: '2023-07-21T00:00:00.000Z',
    }, '2026-09-04')).toBe('current');
  });

  it('does not weekly-refresh tax and keeps year-keyed history', () => {
    expect(DATASET_POLICIES['us-tax'].expectedCadence).toBe('yearly');
    expect(DATASET_POLICIES['us-tax'].refreshMode).toBe('manual');
    expect(scheduledDatasetIds()).not.toContain('us-tax');
    expect(DATASET_POLICIES['irs-retirement-limits'].expectedCadence).toBe('yearly');
    expect(DATASET_POLICIES['irs-retirement-limits'].refreshMode).toBe('manual');
    expect(scheduledDatasetIds()).not.toContain('irs-retirement-limits');
    expect(listPublishedTaxYears()).toEqual([2026]);
  });

  it('covers every scheduled dataset in a refresh script', async () => {
    const { scheduledDatasetsCoveredByRefresh, refreshJobsFor } = await import('../scripts/refresh-jobs');
    const covered = new Set(scheduledDatasetsCoveredByRefresh());
    const missing = scheduledDatasetIds().filter((datasetId) => !covered.has(datasetId));
    expect(missing).toEqual([]);
    expect(refreshJobsFor('weekly').map((job) => job.datasetIds).flat()).toEqual(['eia-gasoline', 'freddie-mac-pmms']);
    expect(refreshJobsFor('monthly').map((job) => job.datasetIds).flat()).toEqual([
      'bls-grocery',
      'bls-cpi',
      'eia-electricity',
      'usda-food-plans',
    ]);
    expect(refreshJobsFor('all').some((job) => job.datasetIds.includes('gsa-perdiem'))).toBe(true);
  });

  it('does not treat a 2024 annual reference year as stale in 2026, and allows official same-period revisions', () => {
    expect(evaluateDatasetFreshness('bea-rpp', {
      observationPeriod: '2024',
      publishedAt: '2026-02-19T00:00:00.000Z',
    }, '2026-09-02')).toBe('current');
    expect(evaluateDatasetFreshness('census-acs5', {
      observationPeriod: '2024',
      publishedAt: '2025-12-11T00:00:00.000Z',
    }, '2026-09-02')).toBe('current');
    expect(formatObservationPeriod('2026', 'yearly')).toBe('Tax year 2026');
    expect(formatObservationPeriod('2026', 'fiscal-year')).toBe('FY 2026');
    expect(formatObservationPeriod('2024', 'reference-year')).toBe('2024');
    expect(evaluateRefreshDecision({
      previous: { observationPeriod: '2026', revisionId: 'original' },
      nextPeriod: '2026',
      payloadUnchanged: false,
      officialRevision: { revisionId: 'revised-2026-05-21', publishedAt: '2026-05-21T00:00:00.000Z' },
    })).toBe('promote');
    expect(() => evaluateRefreshDecision({
      previous: { observationPeriod: '2026', revisionId: 'revised-2026-05-21' },
      nextPeriod: '2026',
      payloadUnchanged: false,
    })).toThrow(/changed/);
  });
});

describe('source display helper', () => {
  it('renders provider and period without treating preliminary as stale', () => {
    const electricity = datasetSourceDisplay({
      datasetId: 'eia-electricity',
      observationPeriod: '2026-06',
      sourceStatus: 'preliminary',
      asOf: '2026-07-15',
    });
    expect(electricity.line).toBe('EIA · June 2026');
    expect(electricity.freshness).toBe('current');
    expect(electricity.freshnessNote).toBeNull();
    expect(electricity.sourceStatus).toBe('preliminary');

    const stale = datasetSourceDisplay({
      datasetId: 'eia-electricity',
      observationPeriod: '2026-06',
      sourceStatus: 'preliminary',
      asOf: '2026-11-15',
    });
    expect(stale.freshness).toBe('stale');
    expect(stale.freshnessLabel).toBe('Older than the expected update window');
    expect(stale.freshnessNote).toContain('past its expected update window');

    expect(formatObservationPeriod('2026-08-27', 'weekly')).toBe('Aug 27, 2026');
    expect(formatObservationPeriod('2026', 'yearly')).toBe('Tax year 2026');
    expect(datasetSourceDisplay({
      datasetId: 'us-tax',
      observationPeriod: '2026',
      sourceStatus: 'verified',
      asOf: '2026-09-02',
    }).line).toBe('IRS · Tax year 2026');
  });

  it('defaults display asOf to the runtime calendar date, not the publishing snapshot', () => {
    const asOf = utcCalendarDate();
    const withDefault = datasetSourceDisplay({
      datasetId: 'eia-electricity',
      observationPeriod: '2026-06',
      sourceStatus: 'preliminary',
    });
    const explicit = datasetSourceDisplay({
      datasetId: 'eia-electricity',
      observationPeriod: '2026-06',
      sourceStatus: 'preliminary',
      asOf,
    });
    expect(withDefault.freshness).toBe(explicit.freshness);
    expect(utcCalendarDate(new Date('2026-10-15T12:00:00.000Z'))).toBe('2026-10-15');
  });
});

describe('last-known-good ingest IO', () => {
  it('orders periods and refuses older or silently revised candidates', () => {
    expect(compareObservationPeriod('2026-09-07', '2026-08-31')).toBe('newer');
    expect(evaluateRefreshDecision({
      previous: { observationPeriod: '2026-08-31' },
      nextPeriod: '2026-09-07',
      payloadUnchanged: false,
    })).toBe('promote');
    expect(evaluateRefreshDecision({
      previous: { observationPeriod: '2026-08-31' },
      nextPeriod: '2026-08-31',
      payloadUnchanged: true,
    })).toBe('already-current');
    expect(() => evaluateRefreshDecision({
      previous: { observationPeriod: '2026-08-31' },
      nextPeriod: '2026-08-24',
      payloadUnchanged: false,
    })).toThrow(/regressed/);
    expect(() => evaluateRefreshDecision({
      previous: { observationPeriod: '2026-08-31' },
      nextPeriod: '2026-08-31',
      payloadUnchanged: false,
    })).toThrow(/changed/);
  });

  it('keeps the previous file when an immutable write is interrupted by a different candidate', async () => {
    const dir = await tempDir();
    const target = path.join(dir, 'current.json');
    await writeFile(target, '{"good":true}\n');
    await expect(writeImmutable(target, '{"bad":true}\n')).rejects.toThrow(/Refusing to overwrite/);
    expect(await readFile(target, 'utf8')).toBe('{"good":true}\n');
  });

  it('does not leave a candidate file or create the target if atomic write fails', async () => {
    const dir = await tempDir();
    const missingParent = path.join(dir, 'missing', 'current.json');
    await expect(atomicWrite(missingParent, '{"x":1}\n')).rejects.toThrow();
    expect(await readdir(dir)).toEqual([]);
  });

  it('writes current.json last and preserves it when a later candidate is rejected', async () => {
    const dir = await tempDir();
    const snapshot = {
      snapshotId: 'demo-2026-06-v1',
      observationPeriod: '2026-06',
      normalizedSha256: 'a'.repeat(64),
    };
    await promoteSnapshotFiles({
      dataDirectory: dir,
      snapshot,
      normalizedFileName: 'demo.normalized.json',
      rawRelativePath: path.join('raw', '2026-06.json'),
      rawContents: '{"raw":true}\n',
    });
    const promoted = await readFile(path.join(dir, 'current.json'), 'utf8');
    expect(JSON.parse(promoted).manifest.currentSnapshotId).toBe('demo-2026-06-v1');
    expect(() => evaluateRefreshDecision({
      previous: snapshot,
      nextPeriod: '2026-06',
      payloadUnchanged: false,
    })).toThrow(/changed/);
    expect(await readFile(path.join(dir, 'current.json'), 'utf8')).toBe(promoted);
  });

  it('does not rewrite a semantically identical current pointer that only differs by trailing whitespace', async () => {
    const dir = await tempDir();
    const snapshot = {
      snapshotId: 'demo-2026-06-v1',
      observationPeriod: '2026-06',
      normalizedSha256: 'a'.repeat(64),
    };
    const currentPath = path.join(dir, 'current.json');
    const extraNewline = `${currentEnvelopeTextFor(snapshot)}\n`;
    await writeFile(path.join(dir, 'manifest.json'), manifestTextFor(snapshot));
    await writeFile(currentPath, extraNewline);
    expect(jsonDocumentsEqual(extraNewline, currentEnvelopeTextFor(snapshot))).toBe(true);
    expect(await syncPromotionPointer(dir, snapshot)).toBe(false);
    expect(await readFile(currentPath, 'utf8')).toBe(extraNewline);
  });

  it('repairs a current pointer that names the wrong snapshot', async () => {
    const dir = await tempDir();
    const good = {
      snapshotId: 'demo-2026-06-v1',
      observationPeriod: '2026-06',
      normalizedSha256: 'a'.repeat(64),
    };
    const stale = {
      snapshotId: 'demo-2026-05-v1',
      observationPeriod: '2026-05',
      normalizedSha256: 'b'.repeat(64),
    };
    await writeFile(path.join(dir, 'manifest.json'), manifestTextFor(stale));
    await writeFile(path.join(dir, 'current.json'), currentEnvelopeTextFor(stale));
    expect(await syncPromotionPointer(dir, good)).toBe(true);
    expect(JSON.parse(await readFile(path.join(dir, 'current.json'), 'utf8')).manifest.currentSnapshotId).toBe(good.snapshotId);
  });

  it('flags impossible relative jumps without treating a 10% shock as invalid', () => {
    const previous = [{ code: 'TX', dollarsPerGallon: 3 }, { code: 'CA', dollarsPerGallon: 5 }];
    const mild = [{ code: 'TX', dollarsPerGallon: 3.3 }, { code: 'CA', dollarsPerGallon: 5.4 }];
    const broken = [{ code: 'TX', dollarsPerGallon: 9 }, { code: 'CA', dollarsPerGallon: 5.4 }];
    expect(abnormalRelativeChangeCodes(previous, mild, (row) => row.code, (row) => row.dollarsPerGallon, 80)).toEqual([]);
    expect(abnormalRelativeChangeCodes(previous, broken, (row) => row.code, (row) => row.dollarsPerGallon, 80)).toEqual(['TX']);
  });
});

describe('gasoline API normalization', () => {
  it('maps official weekly regular all-formulations series IDs onto the same geographies as the HTML table', () => {
    const geographies = currentGasolineFixture.snapshot.geographies as Array<{
      code: keyof typeof EIA_GASOLINE_SERIES_BY_CODE;
      seriesId: string;
      dollarsPerGallon: number;
    }>;
    const api = {
      response: {
        frequency: 'weekly' as const,
        data: geographies.map((row) => ({
          period: '2026-08-31',
          series: row.seriesId,
          duoarea: row.code,
          value: String(row.dollarsPerGallon),
        })),
      },
    };
    const parsed = parseEiaGasolineApiResponse(api);
    expect(parsed.observationPeriod).toBe('2026-08-31');
    expect(parsed.rows).toHaveLength(19);
    const snapshot = normalizeEiaGasolineApiResponse(api, {
      fetchedAt: '2026-09-02T00:00:00.000Z',
      rawSha256: 'd'.repeat(64),
    });
    expect(snapshot.geographies.find((row) => row.code === 'STX')?.dollarsPerGallon).toBe(3.577);
    expect(snapshot.geographies.find((row) => row.code === 'SCA')?.dollarsPerGallon).toBe(5.52);
    expect(snapshot.geographies.every((row) => row.seriesId === EIA_GASOLINE_SERIES_BY_CODE[row.code])).toBe(true);
  });

  it('rejects an API payload that drops a required geography', () => {
    const api = {
      response: {
        data: [{ period: '2026-08-31', series: 'EMM_EPMR_PTE_NUS_DPG', value: '4.071' }],
      },
    };
    expect(() => parseEiaGasolineApiResponse(api)).toThrow(/Missing EIA gasoline API geographies/);
  });

  it('still parses the recorded HTML table after the API adapter was added', async () => {
    const html = await readFile(path.join(process.cwd(), 'data/eia-gasoline/raw/2026-08-31.html'), 'utf8');
    const snapshot = normalizeEiaGasolineHtml(html, {
      fetchedAt: currentGasolineFixture.snapshot.fetchedAt,
      rawSha256: currentGasolineFixture.snapshot.rawSha256,
    });
    expect(snapshot.observationPeriod).toBe('2026-08-31');
    expect(snapshot.geographies).toEqual(currentGasolineFixture.snapshot.geographies);
  });
});

describe('official CPI historical file', () => {
  it('keeps CUUR0000SA0 monthly continuity and skips unpublished months', () => {
    const text = [
      'series_id\tyear\tperiod\tvalue\tfootnote_codes',
      'CUUR0000SA0\t1913\tM01\t9.8\t',
      'CUUR0000SA0\t1913\tM01\t9.8\t',
    ].join('\n');
    expect(() => observationsFromBlsTimeSeries(text)).toThrow(/Duplicate CPI month/);
  });
});
