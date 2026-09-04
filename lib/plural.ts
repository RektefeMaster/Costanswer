/**
 * English count phrases.
 *
 * Result notes are assembled from user input, so a count of one was rendering
 * "1 people", "1 years", "1 payments". One helper keeps every count phrase
 * agreeing with its number.
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
