/** The idempotency store, in the shape the `once` helper expects. */
import { nowIso, type D1DatabaseLike } from '../d1';
import type { IdempotencyStore } from '../../leads/idempotency';

export function d1IdempotencyStore(database: D1DatabaseLike): IdempotencyStore {
  return {
    async lookup(scope, key) {
      const row = await database.prepare(
        'SELECT result_id FROM monetization_idempotency WHERE idempotency_key = ? AND scope = ? AND expires_at > ?',
      ).bind(key, scope, nowIso()).first<{ result_id: string }>();
      return row ? row.result_id : null;
    },
    async remember(scope, key, resultId, expiresAt) {
      // A conflict means a concurrent request won the race. The first writer's
      // result is the canonical one, so this does nothing rather than overwrite.
      await database.prepare(`
        INSERT INTO monetization_idempotency (idempotency_key, scope, result_id, created_at, expires_at)
        VALUES (?,?,?,?,?)
        ON CONFLICT(idempotency_key) DO NOTHING
      `).bind(key, scope, resultId, nowIso(), expiresAt).run();
    },
  };
}

export async function purgeExpiredIdempotencyKeys(database: D1DatabaseLike, at: number = Date.now()): Promise<number> {
  const result = await database.prepare('DELETE FROM monetization_idempotency WHERE expires_at <= ?')
    .bind(nowIso(at)).run();
  return result.meta?.changes ?? 0;
}
