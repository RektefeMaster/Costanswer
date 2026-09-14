/**
 * Browser-local calendar date as YYYY-MM-DD.
 *
 * Prefer this over `toISOString().slice(0, 10)` for “today” defaults: UTC can
 * already be the next calendar day in the Americas after late afternoon.
 */
export function localCalendarDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
