import { describe, expect, it } from 'vitest';
import { ANSWER_ENGINE_CRAWLERS, htmlLimitedBotsPattern, htmlLimitedBotsSource } from '@/lib/seo/crawlers';

/**
 * What this file protects.
 *
 * `htmlLimitedBots` decides who gets `<title>`, the description, the canonical
 * and the hreflang set inside `<head>` instead of streamed into the body for a
 * hydration they will never run. Setting it *replaces* the framework's own
 * list, so the two ways to get this wrong are opposites: drop an entry and
 * Slack silently unfurls a bare link again; widen the pattern and real readers
 * lose streaming. Both are invisible in a browser, which is why they are
 * asserted here rather than noticed later.
 */

function matches(userAgent: string): boolean {
  return htmlLimitedBotsPattern().test(userAgent);
}

describe('html-limited bots', () => {
  it('still covers everything the framework default covered', () => {
    // Replacing the default list means inheriting responsibility for it.
    const inherited = [
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'facebookexternalhit/1.1',
      'Slackbot-LinkExpanding 1.0',
      'Twitterbot/1.0',
      'LinkedInBot/1.0',
      'WhatsApp/2.23',
      'Discordbot/2.0',
      'DuckDuckBot/1.1',
      'Mozilla/5.0 (compatible; Applebot/0.1)',
      'redditbot/1.0',
      'Chrome-Lighthouse',
      'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
    ];
    for (const agent of inherited) expect(matches(agent), agent).toBe(true);
  });

  it('covers the answer engines the default leaves out', () => {
    /*
     * These fetch HTML and do not run scripts. Before this list existed they
     * read every salary and topic page with an empty `<head>`: no title, no
     * description, no canonical — the exact surface the corpus is written for.
     */
    const answerEngines = [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot',
      'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
      'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com',
      'Mozilla/5.0 (compatible; Claude-SearchBot/1.0)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
      'Mozilla/5.0 (compatible; Perplexity-User/1.0)',
      'Mozilla/5.0 (compatible; Amazonbot/0.1)',
      'Mozilla/5.0 (compatible; Bytespider)',
      'CCBot/2.0 (https://commoncrawl.org/faq/)',
      'Mozilla/5.0 (compatible; DuckAssistBot/1.0)',
      'Mozilla/5.0 (compatible; MistralAI-User/1.0)',
    ];
    for (const agent of answerEngines) expect(matches(agent), agent).toBe(true);
  });

  it('includes Googlebot, which the framework default deliberately omits', () => {
    /*
     * A considered departure. Googlebot renders, so the default streams to it.
     * With 63,000 URLs whose canonical and hreflang would only be discoverable
     * after render, and metadata computed from bundled snapshots with no I/O,
     * blocking the stream costs nothing and removes a dependency on the render
     * queue. `Googlebot-Image` and friends keep the default path.
     */
    expect(matches('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(matches('Googlebot-Image/1.0')).toBe(false);
  });

  it('does not catch ordinary readers', () => {
    const readers = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ];
    for (const agent of readers) expect(matches(agent), agent).toBe(false);
  });

  it('compiles, and round-trips through the source the config stores', () => {
    // The config layer reads `.source` back off the RegExp, so a pattern that
    // did not round-trip would silently apply something other than this list.
    expect(htmlLimitedBotsPattern().source).toBe(htmlLimitedBotsSource());
    expect(() => new RegExp(htmlLimitedBotsSource(), 'i')).not.toThrow();
  });

  it('names each answer engine once', () => {
    expect(new Set(ANSWER_ENGINE_CRAWLERS).size).toBe(ANSWER_ENGINE_CRAWLERS.length);
  });
});
