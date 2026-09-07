/**
 * Importing an affiliate network's own report.
 *
 * Affiliate networks mostly do not expose conversions in real time, so revenue
 * arrives as a statement days or weeks later. Without a path for it the ledger
 * only ever holds clicks, and an outbound click is not revenue — treating it as
 * one is the single easiest way to build a business on a number that is not
 * money.
 *
 * Importing the same statement twice is the failure this is shaped around: a
 * unique index on the merchant and their own line reference makes a repeated
 * import a no-op rather than a doubled month.
 */
import { moneyFromDecimalString, type Money } from '../money';
import type { RevenueStatus } from '../revenue/ledger';

export type ConversionLine = {
  readonly lineReference: string;
  readonly merchantId: string;
  readonly occurredOn: string;
  readonly amount: Money;
  readonly status: RevenueStatus;
};

export type ImportProblem = { readonly row: number; readonly reason: string };

export type ParsedStatement = {
  readonly lines: readonly ConversionLine[];
  readonly problems: readonly ImportProblem[];
};

const REQUIRED_COLUMNS = ['line_reference', 'merchant_id', 'occurred_on', 'amount', 'status'] as const;
const ALLOWED_STATUSES: readonly RevenueStatus[] = ['reported', 'confirmed', 'paid', 'reversed'];
const MAX_ROWS = 10_000;

/**
 * Parse a statement without guessing.
 *
 * A row that cannot be read becomes a reported problem, not a skipped line and
 * not an assumed zero. An import that silently drops rows produces a total that
 * is quietly wrong, which is worse than one that refuses.
 */
export function parseConversionCsv(csv: string): ParsedStatement {
  const rows = csv.trim().split(/\r?\n/);
  if (rows.length === 0) return { lines: [], problems: [{ row: 0, reason: 'The file was empty.' }] };
  if (rows.length - 1 > MAX_ROWS) {
    return { lines: [], problems: [{ row: 0, reason: `More than ${MAX_ROWS} rows; split the file.` }] };
  }

  const header = splitCsvLine(rows[0]).map((column) => column.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return { lines: [], problems: [{ row: 0, reason: `Missing columns: ${missing.join(', ')}.` }] };
  }

  const index = (column: string) => header.indexOf(column);
  const lines: ConversionLine[] = [];
  const problems: ImportProblem[] = [];

  for (let rowNumber = 1; rowNumber < rows.length; rowNumber += 1) {
    const raw = rows[rowNumber];
    if (raw.trim().length === 0) continue;
    const cells = splitCsvLine(raw);

    const status = cells[index('status')]?.trim().toLowerCase() as RevenueStatus;
    if (!ALLOWED_STATUSES.includes(status)) {
      problems.push({ row: rowNumber, reason: `Unknown status "${cells[index('status')]}".` });
      continue;
    }

    const occurredOn = cells[index('occurred_on')]?.trim() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      problems.push({ row: rowNumber, reason: `"${occurredOn}" is not a YYYY-MM-DD date.` });
      continue;
    }

    let amount: Money;
    try {
      amount = moneyFromDecimalString(cells[index('amount')]?.trim() ?? '');
    } catch (error) {
      problems.push({ row: rowNumber, reason: error instanceof Error ? error.message : 'Unreadable amount.' });
      continue;
    }

    // A reversal has to be negative. A statement that reports a clawback as a
    // positive number would otherwise be added to revenue.
    const signed = status === 'reversed' && amount.minorUnits > 0
      ? moneyFromDecimalString(`-${cells[index('amount')].trim()}`)
      : amount;

    const lineReference = cells[index('line_reference')]?.trim() ?? '';
    const merchantId = cells[index('merchant_id')]?.trim() ?? '';
    if (!lineReference || !merchantId) {
      problems.push({ row: rowNumber, reason: 'A line reference and a merchant id are both required.' });
      continue;
    }

    lines.push({ lineReference, merchantId, occurredOn, amount: signed, status });
  }

  return { lines, problems };
}

/** Minimal RFC 4180 handling: quoted fields with embedded commas and quotes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }
      if (character === '"') {
        quoted = false;
        continue;
      }
      current += character;
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === ',') {
      cells.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  cells.push(current);
  return cells;
}
