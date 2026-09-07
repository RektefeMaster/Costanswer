/**
 * Shared request handling for the monetization endpoints.
 *
 * These are the only routes on the site that accept a POST carrying personal
 * details, so the things that are elsewhere unnecessary — rate limiting, an
 * origin check, careful error shapes — are necessary here.
 */
import { pepperedHash, timingSafeEqual } from '../hash';
import { monetizationStore, type D1DatabaseLike } from '../store/d1';
import { siteConfig } from '@/lib/site-config';

export type RouteEnvironment = Record<string, unknown> & { MONETIZATION_DB?: unknown };

/**
 * An error the reader may see, versus one they may not.
 *
 * Anything not deliberately marked public becomes a generic message. A stack
 * trace or a database error on a page that has just taken someone's phone
 * number is both a leak and a bad experience.
 */
export class PublicError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'PublicError';
  }
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof PublicError) {
    return jsonResponse({ ok: false, error: error.message }, error.status);
  }
  return jsonResponse(
    { ok: false, error: 'Something went wrong on our side. Your CostAnswer estimate is unaffected.' },
    500,
  );
}

/**
 * Cross-origin submission guard.
 *
 * A same-origin check rather than a token, because these endpoints are used by
 * a guest with no session — there is nothing to bind a CSRF token to. The
 * `Origin` header is sent on every cross-origin POST a browser makes, which is
 * the case this is defending against.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return; // Same-origin navigations may omit it; a browser POST does not.
  let expected: string;
  try {
    expected = new URL(siteConfig.origin).origin;
  } catch {
    return;
  }
  if (new URL(origin).origin !== expected) {
    throw new PublicError('This request did not come from CostAnswer.', 403);
  }
}

export function requireStore(env: RouteEnvironment | undefined): D1DatabaseLike {
  const status = monetizationStore(env as Record<string, unknown> | undefined);
  if (!status.available) {
    // The honest message. Not "try again" — nothing the reader does will fix a
    // missing binding, and their estimate is genuinely unaffected.
    throw new PublicError(
      'Local estimate matching is temporarily unavailable. Your CostAnswer estimate is unaffected.',
      503,
    );
  }
  return status.database;
}


/**
 * The store, or nothing.
 *
 * For paths where an absent database is not an error worth telling anyone
 * about — a click beacon on a page the reader has already left.
 */
export function monetizationStoreOrNull(env: RouteEnvironment | undefined): D1DatabaseLike | null {
  const status = monetizationStore(env as Record<string, unknown> | undefined);
  return status.available ? status.database : null;
}

export function requirePepper(env: RouteEnvironment | undefined): string {
  const pepper = (env?.MONETIZATION_HASH_PEPPER as string | undefined) ?? process.env.MONETIZATION_HASH_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new PublicError('Local estimate matching is temporarily unavailable. Your CostAnswer estimate is unaffected.', 503);
  }
  return pepper;
}

/**
 * A fixed-window limiter keyed on a hashed client address.
 *
 * In-memory, so it is per-isolate rather than global. That is a real limitation
 * and it is the right trade at this size: a global limiter needs a durable
 * counter on the hot path of every submission, and the abuse this is stopping
 * is a script hammering one endpoint, which lands on one isolate anyway.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Expired buckets are swept, not left to accumulate.
 *
 * A key was only ever overwritten if the same caller came back, so every
 * one-off visitor left an entry behind for the life of the isolate. Sweeping on
 * a size threshold keeps it bounded without a timer, which a Worker does not
 * reliably get to run anyway.
 */
const MAX_TRACKED_CALLERS = 5_000;

function sweepExpired(now: number): void {
  if (buckets.size < MAX_TRACKED_CALLERS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still full of live buckets: this is either real traffic or an attack, and
  // dropping the oldest is better than growing without bound.
  if (buckets.size >= MAX_TRACKED_CALLERS) {
    const excess = buckets.size - Math.floor(MAX_TRACKED_CALLERS / 2);
    let removed = 0;
    for (const key of buckets.keys()) {
      if (removed >= excess) break;
      buckets.delete(key);
      removed += 1;
    }
  }
}

export const RATE_LIMITS = {
  coverage: { limit: 30, windowMs: 60_000 },
  submit: { limit: 5, windowMs: 60_000 },
  click: { limit: 120, windowMs: 60_000 },
} as const;

export function enforceRateLimit(scope: keyof typeof RATE_LIMITS, key: string, now = Date.now()): void {
  sweepExpired(now);
  const { limit, windowMs } = RATE_LIMITS[scope];
  const bucketKey = `${scope}:${key}`;
  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new PublicError('Too many requests. Wait a moment and try again.', 429);
  }
}

/**
 * A stable, non-reversible key for the caller.
 *
 * The raw address is never stored and never logged. It exists for the length of
 * this function so that a limiter and, where a campaign's terms require it, a
 * consent evidence record can be keyed without keeping an address.
 */
export async function clientKey(request: Request, pepper: string): Promise<string> {
  const address = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  return pepperedHash(`client:${address}`, pepper);
}

/** Admin authentication: a bearer secret, compared in constant time. */
export function assertAdmin(request: Request, env: RouteEnvironment | undefined): string {
  const expected = (env?.MONETIZATION_ADMIN_TOKEN as string | undefined) ?? process.env.MONETIZATION_ADMIN_TOKEN;
  if (!expected || expected.length < 32) {
    throw new PublicError('Not found.', 404);
  }
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!timingSafeEqual(expected, presented)) {
    throw new PublicError('Not found.', 404);
  }
  return request.headers.get('x-admin-actor') ?? 'admin';
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new PublicError('Send this as JSON.', 415);
  }
  const text = await request.text();
  if (text.length > 32_768) throw new PublicError('That request was too large.', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new PublicError('That request was not valid JSON.', 400);
  }
}
