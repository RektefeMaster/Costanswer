import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adEmbed, adUnitFor } from '@/lib/monetization/ads/embed';

const CLIENT = 'ca-pub-1234567890123456';

/**
 * The state the site ships in is "no network", and these first two cases are
 * the ones that matter most: everything below them only runs on a day someone
 * has deliberately configured a publisher id.
 */
describe('ad embed', () => {
  it('resolves to nothing when no network is configured', () => {
    expect(adEmbed({})).toBeNull();
    expect(adUnitFor('in-content', {})).toBeNull();
  });

  it('resolves to nothing when the network is named but has no client id', () => {
    expect(adEmbed({ AD_PROVIDER: 'adsense' })).toBeNull();
  });

  it('builds the AdSense loader against the configured client', () => {
    const embed = adEmbed({ AD_PROVIDER: 'adsense', ADSENSE_CLIENT_ID: CLIENT });
    expect(embed).not.toBeNull();
    expect(embed?.networkId).toBe('adsense');
    expect(embed?.consentRequirement).toBe('tcf_v2');
    expect(embed?.scriptUrl).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`,
    );
  });

  it('leaves a placement with no unit id as a reserved empty box', () => {
    const environment = { AD_PROVIDER: 'adsense', ADSENSE_CLIENT_ID: CLIENT };
    // A guessed data-ad-slot is an invalid request, not an unfilled one.
    expect(adUnitFor('in-content', environment)).toBeNull();
    expect(adUnitFor('desktop-rail', environment)).toBeNull();
  });

  it('emits a unit only for the placement that was configured', () => {
    const environment = {
      AD_PROVIDER: 'adsense',
      ADSENSE_CLIENT_ID: CLIENT,
      ADSENSE_SLOT_IN_CONTENT: '9876543210',
    };
    expect(adUnitFor('in-content', environment)).toEqual({
      networkId: 'adsense',
      clientId: CLIENT,
      unitId: '9876543210',
    });
    expect(adUnitFor('header-leaderboard', environment)).toBeNull();
  });

  it('treats a blank value as unset rather than as an empty unit', () => {
    const environment = {
      AD_PROVIDER: 'adsense',
      ADSENSE_CLIENT_ID: CLIENT,
      ADSENSE_SLOT_IN_CONTENT: '   ',
    };
    expect(adUnitFor('in-content', environment)).toBeNull();
  });

  it('has no embed for networks whose script host is only issued at approval', () => {
    // Guessing a hostname would put an unverified origin in the CSP.
    expect(adEmbed({ AD_PROVIDER: 'mediavine-journey', MEDIAVINE_SITE_ID: 'site' })).toBeNull();
    expect(adEmbed({ AD_PROVIDER: 'raptive', RAPTIVE_SITE_ID: 'site' })).toBeNull();
  });
});

describe('/ads.txt', () => {
  /*
   * The route reads `process.env` at call time, so these set and restore it
   * rather than passing an environment in. Google stops serving on a domain
   * whose ads.txt is invalid, so "wrong file" and "no file" are genuinely
   * different outcomes and both are pinned here.
   */
  const KEYS = ['AD_PROVIDER', 'ADSENSE_CLIENT_ID'] as const;
  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) saved.set(key, process.env[key]);
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  async function get() {
    const { GET } = await import('@/app/ads.txt/route');
    return GET();
  }

  it('is absent while no network is configured', async () => {
    delete process.env.AD_PROVIDER;
    delete process.env.ADSENSE_CLIENT_ID;
    expect((await get()).status).toBe(404);
  });

  it('is absent rather than wrong when the publisher id is missing', async () => {
    process.env.AD_PROVIDER = 'adsense';
    delete process.env.ADSENSE_CLIENT_ID;
    // A placeholder entry reads as "this seller is not authorised", which is
    // worse than having no file at all.
    expect((await get()).status).toBe(404);
  });

  it('publishes the AdSense seller line once a publisher id is set', async () => {
    process.env.AD_PROVIDER = 'adsense';
    process.env.ADSENSE_CLIENT_ID = 'ca-pub-1234567890123456';
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/);
    // ads.txt wants the bare `pub-` form, not the `ca-pub-` form the tag uses.
    expect(await response.text()).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  });

  it('refuses a publisher id that is not one', async () => {
    process.env.AD_PROVIDER = 'adsense';
    process.env.ADSENSE_CLIENT_ID = 'not-a-publisher';
    expect((await get()).status).toBe(404);
  });
});
