/**
 * Which crawlers must be handed metadata in `<head>` rather than in the stream.
 *
 * The framework renders a page as a stream and lets React hoist `<title>`,
 * the description, the canonical and the hreflang set into `<head>` during
 * hydration. A browser runs that hydration and never notices. A client that
 * parses the HTML and stops does notice: it reads a `<head>` holding a charset
 * and a stylesheet, and concludes the page has no title.
 *
 * `htmlLimitedBots` is the switch that turns streaming off per user agent, and
 * the framework ships a default list. Two things about that default matter
 * here, and both were measured against this site rather than assumed:
 *
 *   - It already covers the link unfurlers and Bing. Slack, Facebook, Bingbot
 *     and the rest were never broken, so nothing below is about them.
 *   - It deliberately omits Googlebot, because Googlebot renders. That is a
 *     sound default and a poor fit for a corpus this size: 63,000 pages whose
 *     canonical and hreflang are only discoverable after render is 63,000
 *     pages waiting on a render queue. Metadata here is computed from bundled
 *     snapshots with no I/O, so blocking the stream for it costs a crawler
 *     nothing measurable.
 *
 * What the default genuinely misses is the answer engines. GPTBot, ClaudeBot,
 * PerplexityBot and OAI-SearchBot fetch HTML and do not run scripts, so every
 * one of them was reading these pages untitled — the exact surface the salary
 * corpus was written for.
 *
 * Built from a list rather than written as one literal so that adding a
 * crawler is a one-line change with a test behind it. Both shapes are
 * exported: the config option is typed for a `RegExp`, and the source string
 * is what the framework stores and what the tests read.
 */

/**
 * The framework's own list, copied verbatim.
 *
 * Copied rather than imported: `htmlLimitedBots` replaces the default outright,
 * so omitting an entry here silently un-fixes Slack or Bing. The framework does
 * not export it, so `tests/crawlers.spec.ts` asserts the well-known members are
 * still present instead.
 */
const FRAMEWORK_DEFAULT_BOTS = String.raw`(?:^|[^\w-])[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|meta-externalagent|meta-externalfetcher|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;

/**
 * Googlebot, added on purpose.
 *
 * `Googlebot(?!-)` and `Googlebot$` are how the framework recognises Googlebot
 * proper elsewhere; the negative lookahead keeps `Googlebot-Image` and friends
 * on the default path, which the `[\w-]+-Google` branch above does not cover
 * anyway. See the note above for why this site opts in.
 */
const GOOGLEBOT = String.raw`Googlebot(?!-)|Googlebot$`;

/**
 * Answer engines and AI crawlers, none of which execute JavaScript.
 *
 * Named individually rather than matched by a loose `.*bot` pattern: a pattern
 * that broad would also catch browsers carrying "bot" in a product token and
 * turn streaming off for real readers.
 */
const ANSWER_ENGINE_BOTS = [
  // OpenAI: training, search index, and user-initiated fetches.
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic.
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  // Perplexity.
  'PerplexityBot',
  'Perplexity-User',
  // Others that surface pages in an answer rather than a result list.
  'DuckAssistBot',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'cohere-training-data-crawler',
  'MistralAI-User',
  'YouBot',
  'Diffbot',
  'omgili',
  'Timpibot',
] as const;

export const ANSWER_ENGINE_CRAWLERS: readonly string[] = ANSWER_ENGINE_BOTS;

/**
 * The full source string for `htmlLimitedBots`.
 *
 * Alternation, so order carries no meaning and a new entry cannot change how
 * an existing one matches. The framework compiles this case-insensitively.
 */
export function htmlLimitedBotsSource(): string {
  return [FRAMEWORK_DEFAULT_BOTS, GOOGLEBOT, ...ANSWER_ENGINE_BOTS].join('|');
}

/**
 * The same list as a `RegExp`, which is what `next.config.ts` is typed for.
 *
 * The config layer reads `.source` back off it, so this round-trips to exactly
 * the string above. Constructing it here also means an unparseable pattern
 * fails at config load with a stack that points at this file, rather than at a
 * request that quietly served the wrong thing.
 */
export function htmlLimitedBotsPattern(): RegExp {
  return new RegExp(htmlLimitedBotsSource(), 'i');
}
