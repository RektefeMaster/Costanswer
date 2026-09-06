/**
 * A small SQLite-shaped store for testing the monetization pipeline.
 *
 * Not a SQL engine. It understands the specific statements the repositories
 * issue, which is enough to exercise inserts, updates, the unique constraints
 * that carry the replay and duplicate guards, and the handful of aggregate
 * queries the router needs. Anything it does not recognise throws loudly rather
 * than returning an empty result, so a query that silently stops matching shows
 * up as a failing test rather than a passing one.
 */
import type { D1DatabaseLike, D1PreparedStatement, D1Value } from '@/lib/monetization/store/d1';

type Row = Record<string, unknown>;

export class FakeD1 implements D1DatabaseLike {
  readonly tables = new Map<string, Row[]>();
  private readonly uniqueIndexes: Array<{ table: string; columns: string[] }> = [
    { table: 'lead_deliveries', columns: ['provider_id', 'idempotency_key'] },
    { table: 'lead_provider_events', columns: ['provider_id', 'provider_event_id'] },
    { table: 'revenue_ledger', columns: ['provider_id', 'provider_reference'] },
    { table: 'monetization_idempotency', columns: ['idempotency_key'] },
    { table: 'monetization_flag_overrides', columns: ['flag'] },
  ];

  private rows(table: string): Row[] {
    const existing = this.tables.get(table);
    if (existing) return existing;
    const created: Row[] = [];
    this.tables.set(table, created);
    return created;
  }

  prepare(query: string): D1PreparedStatement {
    return new FakeStatement(this, query.replace(/\s+/g, ' ').trim());
  }

  async batch<T>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[] }>> {
    const out: Array<{ results: T[] }> = [];
    for (const statement of statements) out.push(await statement.all<T>());
    return out;
  }

  insert(table: string, row: Row): void {
    for (const index of this.uniqueIndexes) {
      if (index.table !== table) continue;
      // A partial index over a nullable column does not constrain null rows.
      if (index.columns.some((column) => row[column] === null || row[column] === undefined)) continue;
      const clash = this.rows(table).some((existing) => index.columns.every((column) => existing[column] === row[column]));
      if (clash) throw new Error(`UNIQUE constraint failed: ${table}.${index.columns.join(',')}`);
    }
    this.rows(table).push(row);
  }

  select(table: string): Row[] {
    return this.rows(table);
  }
}

class FakeStatement implements D1PreparedStatement {
  private values: D1Value[] = [];

  constructor(private readonly database: FakeD1, private readonly query: string) {}

  bind(...values: D1Value[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  async first<T = Row>(): Promise<T | null> {
    const results = await this.all<T>();
    return results.results[0] ?? null;
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    return { results: this.execute() as T[] };
  }

  async run(): Promise<{ success: boolean; meta?: { changes?: number } }> {
    const changed = this.execute();
    return { success: true, meta: { changes: changed.length } };
  }

  private execute(): Row[] {
    const query = this.query;

    if (/^CREATE (TABLE|INDEX|UNIQUE INDEX)/i.test(query)) return [];

    if (/^INSERT INTO/i.test(query)) return this.runInsert(query);
    if (/^UPDATE/i.test(query)) return this.runUpdate(query);
    if (/^DELETE FROM/i.test(query)) return this.runDelete(query);
    if (/^SELECT/i.test(query)) return this.runSelect(query);

    throw new Error(`FakeD1 does not understand: ${query}`);
  }

  private runInsert(query: string): Row[] {
    const match = /^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]*)\)/i.exec(query);
    if (!match) throw new Error(`FakeD1 cannot parse insert: ${query}`);
    const table = match[1];
    const columns = match[2].split(',').map((column) => column.trim());
    // A VALUES list may mix placeholders with literals, so bind positions are
    // counted across the placeholders only. Mapping column index to bind index
    // silently shifts every column after the first literal.
    const slots = match[3].split(',').map((slot) => slot.trim());
    if (slots.length !== columns.length) {
      throw new Error(`FakeD1 insert column/value mismatch: ${query}`);
    }
    const row: Row = {};
    let bindIndex = 0;
    columns.forEach((column, index) => {
      const slot = slots[index];
      if (slot === '?') {
        row[column] = this.values[bindIndex] ?? null;
        bindIndex += 1;
        return;
      }
      if (/^'.*'$/.test(slot)) row[column] = slot.slice(1, -1);
      else if (/^-?\d+$/.test(slot)) row[column] = Number(slot);
      else if (slot.toUpperCase() === 'NULL') row[column] = null;
      else throw new Error(`FakeD1 cannot evaluate insert literal: ${slot}`);
    });

    if (/ON CONFLICT.*DO NOTHING/i.test(query)) {
      try { this.database.insert(table, row); } catch { return []; }
      return [row];
    }

    if (/ON CONFLICT.*DO UPDATE SET count = count \+ excluded.count/i.test(query)) {
      const keys = ['day_bucket', 'event_name', 'page_id', 'calculator_id', 'vertical', 'locale', 'provider_id', 'placement'];
      const existing = this.database.select(table).find((candidate) => keys.every((key) => candidate[key] === row[key]));
      if (existing) {
        existing.count = Number(existing.count) + Number(row.count);
        return [existing];
      }
      this.database.insert(table, row);
      return [row];
    }

    if (/ON CONFLICT\(flag\) DO UPDATE/i.test(query)) {
      const existing = this.database.select(table).find((candidate) => candidate.flag === row.flag);
      if (existing) {
        Object.assign(existing, row);
        return [existing];
      }
      this.database.insert(table, row);
      return [row];
    }

    this.database.insert(table, row);
    return [row];
  }

  private runUpdate(query: string): Row[] {
    const table = /^UPDATE (\w+)/i.exec(query)?.[1];
    if (!table) throw new Error(`FakeD1 cannot parse update: ${query}`);

    const setClause = /SET (.+?) WHERE /is.exec(query)?.[1] ?? '';
    const whereClause = /WHERE (.+)$/is.exec(query)?.[1] ?? '';
    const assignments = splitTopLevel(setClause);

    // Bind order is SET placeholders first, then WHERE placeholders.
    const setPlaceholders = countPlaceholders(setClause);
    const setValues = this.values.slice(0, setPlaceholders);
    const whereValues = this.values.slice(setPlaceholders);

    const matched = this.database.select(table).filter((row) => matchesWhere(row, whereClause, whereValues));
    let cursor = 0;
    for (const row of matched) {
      let localCursor = 0;
      for (const assignment of assignments) {
        const [rawColumn, rawExpression] = splitOnce(assignment, '=');
        const column = rawColumn.trim();
        const expression = rawExpression.trim();
        const used = countPlaceholders(expression);
        const args = setValues.slice(localCursor, localCursor + used);
        localCursor += used;
        row[column] = evaluateAssignment(row, column, expression, args);
      }
      cursor += 1;
    }
    return matched.slice(0, cursor);
  }

  private runDelete(query: string): Row[] {
    const table = /^DELETE FROM (\w+)/i.exec(query)?.[1];
    if (!table) throw new Error(`FakeD1 cannot parse delete: ${query}`);
    const whereClause = /WHERE (.+)$/is.exec(query)?.[1] ?? '';
    const rows = this.database.select(table);
    const removed = rows.filter((row) => matchesWhere(row, whereClause, this.values));
    for (const row of removed) rows.splice(rows.indexOf(row), 1);
    return removed;
  }

  private runSelect(query: string): Row[] {
    // Aggregates and joins are hand-handled: there are four of them and a
    // general implementation would be a database.
    if (/FROM lead_contacts c JOIN lead_requests r/i.test(query)) return this.duplicateLookup();
    if (/SUM\(CASE WHEN status IN \('accepted','paid'\)/i.test(query)) return this.campaignUsage();
    if (/SELECT event_name, SUM\(count\) AS total/i.test(query)) return this.eventTotals();
    if (/SELECT 1 AS hit FROM suppression_records/i.test(query)) return this.suppressionHit();

    const table = /FROM (\w+)/i.exec(query)?.[1];
    if (!table) throw new Error(`FakeD1 cannot parse select: ${query}`);
    const whereClause = /WHERE (.+?)(?: ORDER BY | LIMIT |$)/is.exec(query)?.[1] ?? '';
    let rows = this.database.select(table).filter((row) => matchesWhere(row, whereClause, this.values));

    const order = /ORDER BY (\w+) (ASC|DESC)/i.exec(query);
    if (order) {
      const [, column, direction] = order;
      rows = [...rows].sort((left, right) => {
        const a = String(left[column] ?? '');
        const b = String(right[column] ?? '');
        return direction.toUpperCase() === 'DESC' ? b.localeCompare(a) : a.localeCompare(b);
      });
    }
    if (/LIMIT \?/i.test(query)) rows = rows.slice(0, Number(this.values[this.values.length - 1]));
    else {
      const limit = /LIMIT (\d+)/i.exec(query);
      if (limit) rows = rows.slice(0, Number(limit[1]));
    }
    return rows;
  }

  private duplicateLookup(): Row[] {
    const [vertical, since, excludeLeadId, phoneHash, , emailHash] = this.values;
    const contacts = this.database.select('lead_contacts');
    const requests = this.database.select('lead_requests');
    const hits = contacts.filter((contact) =>
      (phoneHash !== null && contact.phone_hash === phoneHash)
      || (emailHash !== null && contact.email_hash === emailHash));
    for (const contact of hits) {
      if (contact.lead_id === excludeLeadId) continue;
      const request = requests.find((row) => row.lead_id === contact.lead_id);
      if (!request) continue;
      if (request.vertical !== vertical) continue;
      if (String(request.created_at) < String(since)) continue;
      return [{ lead_id: request.lead_id, created_at: request.created_at }];
    }
    return [];
  }

  private campaignUsage(): Row[] {
    const [dayStart, hourStart, weekStart, , campaignId] = this.values;
    const deliveries = this.database.select('lead_deliveries').filter((row) => row.campaign_id === campaignId);
    const accepted = (since: unknown) => deliveries.filter((row) =>
      ['accepted', 'paid'].includes(String(row.status)) && String(row.created_at) >= String(since)).length;
    const rejectedWeek = deliveries.filter((row) => row.status === 'rejected' && String(row.created_at) >= String(weekStart)).length;
    const settledWeek = deliveries.filter((row) =>
      ['accepted', 'rejected', 'paid'].includes(String(row.status)) && String(row.created_at) >= String(weekStart)).length;
    return [{
      accepted_today: accepted(dayStart),
      accepted_hour: accepted(hourStart),
      rejected_week: rejectedWeek,
      settled_week: settledWeek,
    }];
  }

  private eventTotals(): Row[] {
    const [fromDay, toDay] = this.values;
    const totals = new Map<string, number>();
    for (const row of this.database.select('monetization_events')) {
      const day = String(row.day_bucket);
      if (day < String(fromDay) || day > String(toDay)) continue;
      const name = String(row.event_name);
      totals.set(name, (totals.get(name) ?? 0) + Number(row.count));
    }
    return [...totals.entries()].map(([event_name, total]) => ({ event_name, total }));
  }

  private suppressionHit(): Row[] {
    const [phoneHash, , emailHash] = this.values;
    const hit = this.database.select('suppression_records').some((row) =>
      (phoneHash !== null && row.phone_hash === phoneHash)
      || (emailHash !== null && row.email_hash === emailHash));
    return hit ? [{ hit: 1 }] : [];
  }
}

function countPlaceholders(fragment: string): number {
  return (fragment.match(/\?/g) ?? []).length;
}

function splitOnce(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  return [value.slice(0, index), value.slice(index + separator.length)];
}

function splitTopLevel(clause: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of clause) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim());
}

function evaluateAssignment(row: Row, column: string, expression: string, args: D1Value[]): unknown {
  if (expression === '?') return args[0] ?? null;
  if (/^COALESCE\(\?, \w+\)$/i.test(expression)) return args[0] ?? row[column] ?? null;
  if (/^\w+ \+ 1$/.test(expression)) return Number(row[column] ?? 0) + 1;
  if (/^COALESCE\(\w+, \?\)$/i.test(expression)) return row[column] ?? args[0] ?? null;
  if (/^CASE WHEN/i.test(expression)) {
    // The only CASE in the repositories: the provider circuit breaker.
    const threshold = Number(args[0]);
    return Number(row.consecutive_failures ?? 0) >= threshold ? 'down' : 'degraded';
  }
  if (/^'[^']*'$/.test(expression)) return expression.slice(1, -1);
  if (/^-?\d+$/.test(expression)) return Number(expression);
  if (expression === 'NULL') return null;
  throw new Error(`FakeD1 cannot evaluate assignment: ${column} = ${expression}`);
}

function matchesWhere(row: Row, clause: string, values: D1Value[]): boolean {
  if (!clause.trim()) return true;
  const conditions = clause.split(/\sAND\s/i).map((part) => part.trim()).filter(Boolean);
  let cursor = 0;
  for (const condition of conditions) {
    const used = countPlaceholders(condition);
    const args = values.slice(cursor, cursor + used);
    cursor += used;
    if (!matchesCondition(row, condition, args)) return false;
  }
  return true;
}

function stripWrappingParens(value: string): string {
  if (!value.startsWith('(') || !value.endsWith(')')) return value;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') {
      depth -= 1;
      // The opening paren closed before the end, so the outer pair is not a wrap.
      if (depth === 0 && index !== value.length - 1) return value;
    }
  }
  return stripWrappingParens(value.slice(1, -1).trim());
}

function matchesCondition(row: Row, condition: string, args: D1Value[]): boolean {
  // Strip a wrapping pair only when it really is one. Blindly removing a
  // leading "(" and a trailing ")" mangles `status IN ('a','b')` into an
  // unparseable fragment.
  const cleaned = stripWrappingParens(condition.trim());

  // OR groups: "either identifier matches", "never attempted or due now".
  if (/\sOR\s/i.test(cleaned)) {
    let cursor = 0;
    let matched = false;
    for (const branch of cleaned.split(/\sOR\s/i).map((part) => part.trim())) {
      const used = (branch.match(/\?/g) ?? []).length;
      const branchArgs = args.slice(cursor, cursor + used);
      cursor += used;
      if (matchesCondition(row, branch, branchArgs)) matched = true;
    }
    return matched;
  }

  if (/IS NULL$/i.test(cleaned)) {
    const column = cleaned.replace(/\s+IS NULL$/i, '').trim();
    return row[column] === null || row[column] === undefined;
  }
  if (/IS NOT NULL$/i.test(cleaned)) {
    const column = cleaned.replace(/\s+IS NOT NULL$/i, '').trim();
    return row[column] !== null && row[column] !== undefined;
  }
  const inMatch = /^(\w+) IN \(([^)]+)\)$/i.exec(cleaned);
  if (inMatch) {
    const slots = inMatch[2].split(',').map((value) => value.trim());
    // A bound IN list (`IN (?,?,?)`) is how a variable-length filter is built;
    // a literal list is how a fixed status set is written. Both appear.
    const allowed = slots.every((slot) => slot === '?')
      ? args.map((value) => String(value))
      : slots.map((slot) => slot.replace(/^'|'$/g, ''));
    return allowed.includes(String(row[inMatch[1]]));
  }

  // A bound flag compared against a literal: `(is_test = 0 OR ? = 1)`.
  const boundLiteral = /^\? = (\d+)$/.exec(cleaned);
  if (boundLiteral) return Number(args[0]) === Number(boundLiteral[1]);
  const comparison = /^(\w+) (>=|<=|=|<|>) \?$/.exec(cleaned);
  if (comparison) {
    const [, column, operator] = comparison;
    const left = row[column];
    const right = args[0];
    if (left === null || left === undefined) return false;
    switch (operator) {
      case '=': return String(left) === String(right);
      case '>=': return String(left) >= String(right);
      case '<=': return String(left) <= String(right);
      case '>': return String(left) > String(right);
      case '<': return String(left) < String(right);
      default: return false;
    }
  }
  const literal = /^(\w+) = '([^']*)'$/.exec(cleaned);
  if (literal) return String(row[literal[1]]) === literal[2];
  const numericLiteral = /^(\w+) = (\d+)$/.exec(cleaned);
  if (numericLiteral) return Number(row[numericLiteral[1]]) === Number(numericLiteral[2]);

  throw new Error(`FakeD1 cannot evaluate condition: ${cleaned}`);
}
