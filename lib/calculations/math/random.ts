export type Rng = () => number;

export const RANDOM_COUNT_MAX = 100;
export const RANDOM_RANGE_ABS_MAX = 1_000_000_000;

function nextUnit(rng: Rng): number {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('The random source must return a number in [0, 1).');
  }
  return value;
}

function randomIntInclusive(min: number, max: number, rng: Rng): number {
  const span = max - min + 1;
  return min + Math.floor(nextUnit(rng) * span);
}

/**
 * Floyd's algorithm: sample `count` distinct integers from [min, max] using
 * O(count) memory. Avoids allocating a `max - min + 1` pool that can be
 * billions of entries when unique rejection sampling exhausts its attempt cap.
 */
function sampleUniqueInts(min: number, max: number, count: number, rng: Rng): number[] {
  const span = max - min + 1;
  const selected = new Set<number>();
  for (let j = span - count + 1; j <= span; j += 1) {
    const t = min + Math.floor(nextUnit(rng) * j);
    if (selected.has(t)) {
      selected.add(min + j - 1);
    } else {
      selected.add(t);
    }
  }
  return [...selected];
}

export function generateRandomNumbers(input: {
  min: number;
  max: number;
  count: number;
  integer: boolean;
  unique: boolean;
  rng: Rng;
}): number[] {
  const { min, max, count, integer, unique, rng } = input;
  if (![min, max, count].every(Number.isFinite)) throw new Error('Random number inputs must be finite.');
  if (min > max) throw new Error('The minimum cannot be greater than the maximum.');
  if (!Number.isInteger(count) || count < 1 || count > RANDOM_COUNT_MAX) {
    throw new Error(`Count must be a whole number from 1 to ${RANDOM_COUNT_MAX}.`);
  }
  if (Math.abs(min) > RANDOM_RANGE_ABS_MAX || Math.abs(max) > RANDOM_RANGE_ABS_MAX) {
    throw new Error(`Values must stay within ±${RANDOM_RANGE_ABS_MAX.toLocaleString('en-US')}.`);
  }
  if (!integer && unique) throw new Error('Unique values are only available in integer mode.');

  if (!integer) {
    // Half-open [min, max). Equal bounds are an empty interval — reject rather
    // than silently collapsing to a single point that contradicts the contract.
    if (min === max) {
      throw new Error('Decimal mode needs a non-empty range: minimum must be less than maximum.');
    }
    return Array.from({ length: count }, () => min + nextUnit(rng) * (max - min));
  }

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('Integer mode requires whole-number bounds.');
  }
  const span = max - min + 1;
  if (unique && count > span) {
    throw new Error('Unique count cannot be larger than the integer range.');
  }
  if (!unique) {
    return Array.from({ length: count }, () => randomIntInclusive(min, max, rng));
  }

  const picked = new Set<number>();
  const values: number[] = [];
  let attempts = 0;
  const attemptCap = Math.max(count * 20, 50);
  while (values.length < count) {
    attempts += 1;
    if (attempts > attemptCap) {
      return sampleUniqueInts(min, max, count, rng);
    }
    const candidate = randomIntInclusive(min, max, rng);
    if (picked.has(candidate)) continue;
    picked.add(candidate);
    values.push(candidate);
  }
  return values;
}

export function cryptoRng(): number {
  const bytes = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] / 2 ** 32;
  }
  throw new Error('A secure random source is not available in this environment.');
}
