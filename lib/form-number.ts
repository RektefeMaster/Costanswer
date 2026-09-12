/**
 * Pass calculator form fields to engines without `Number(field)`.
 *
 * `Number("") === 0` and `Number("  ") === 0`, which turns a blank interest
 * rate (or any min-0 field) into a silent valid zero. Engines parse decimal
 * strings through `finiteNumber`; keep the raw field text until then.
 */
export function formNumber(raw: string): string {
  return raw;
}
