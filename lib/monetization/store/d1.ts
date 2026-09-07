/**
 * Access to the monetization database.
 *
 * The site has never had one. Every dataset it ships is an immutable snapshot
 * compiled into the Worker, and that decision was right and is not being
 * revisited — a mortgage rate does not need a database. Consent records do.
 * A lead is mutable, transactional, PII-bearing, queried by four different
 * access patterns and legally required to be retrievable years after the fact,
 * which is the case the architecture doc already reserved D1 for.
 *
 * The binding is optional at runtime and its absence is not an error. A Worker
 * deployed without it serves every calculator exactly as before; the lead
 * channel reports itself unavailable and the CTA never renders. That is the
 * fail-closed direction: the failure mode of a missing database must be "we
 * did not collect this person's phone number", never "we collected it and
 * dropped it".
 */
export type D1Value = string | number | null;

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[] }>>;
  exec?(query: string): Promise<unknown>;
}

export type MonetizationStoreStatus =
  | { available: true; database: D1DatabaseLike }
  | { available: false; reason: 'not-bound' | 'not-configured' };

const BINDING_NAME = 'MONETIZATION_DB';

let injected: D1DatabaseLike | undefined;

/**
 * Point the store at a database.
 *
 * Used by the request entry point, which is the only place that holds the
 * Worker `env`, and by tests, which supply an in-memory implementation. Modules
 * below the boundary never reach for a global.
 */
export function setMonetizationDatabase(database: D1DatabaseLike | undefined): void {
  injected = database;
}

export function monetizationStore(env?: Record<string, unknown>): MonetizationStoreStatus {
  const candidate = injected ?? (env?.[BINDING_NAME] as D1DatabaseLike | undefined);
  if (!candidate || typeof candidate.prepare !== 'function') {
    return { available: false, reason: 'not-bound' };
  }
  return { available: true, database: candidate };
}

export function requireMonetizationStore(env?: Record<string, unknown>): D1DatabaseLike {
  const status = monetizationStore(env);
  if (!status.available) {
    throw new MonetizationStoreUnavailable(
      `The ${BINDING_NAME} D1 binding is not configured. Lead capture stays disabled until it is.`,
    );
  }
  return status.database;
}

export class MonetizationStoreUnavailable extends Error {
  readonly code = 'monetization_store_unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'MonetizationStoreUnavailable';
  }
}

/** ISO instant, second precision. Every timestamp column in the schema uses this. */
export function nowIso(at: number = Date.now()): string {
  return new Date(at).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function dayBucket(at: number = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

export function plusDays(days: number, at: number = Date.now()): string {
  return nowIso(at + days * 24 * 60 * 60 * 1000);
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function fromJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function toBoolean(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

export function fromBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Run the schema migrations.
 *
 * Every statement is `IF NOT EXISTS`, so this is safe to run on every cold
 * start of a maintenance job and safe to run twice. It is deliberately not run
 * on the request path: a page render should never be the thing that discovers
 * the schema is missing.
 */
export async function applyMigrations(database: D1DatabaseLike, sql: string): Promise<number> {
  const statements = sql
    .split(/;\s*$/m)
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await database.prepare(statement).run();
  }
  return statements.length;
}
