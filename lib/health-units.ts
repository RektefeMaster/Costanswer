import { convertValue } from '@/lib/calculations/conversion/units';

/** Display precision for unit toggles — enough to round-trip without visible drift. */
const DISPLAY_DECIMALS = 4;

function formatConverted(value: number): string {
  const factor = 10 ** DISPLAY_DECIMALS;
  return String(Math.round(value * factor) / factor);
}

export function convertWeightForUnitSwitch(
  raw: string,
  from: 'metric' | 'us',
  to: 'metric' | 'us',
): string {
  if (from === to) return raw;
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value <= 0) return raw;
  return formatConverted(convertValue(value, from === 'metric' ? 'kg' : 'lb', to === 'metric' ? 'kg' : 'lb'));
}

export function convertLengthForUnitSwitch(
  raw: string,
  from: 'metric' | 'us',
  to: 'metric' | 'us',
): string {
  if (from === to) return raw;
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value <= 0) return raw;
  return formatConverted(convertValue(value, from === 'metric' ? 'cm' : 'in', to === 'metric' ? 'cm' : 'in'));
}

export function healthWeightInputBounds(unitSystem: 'metric' | 'us'): { min: number; max: number } {
  if (unitSystem === 'metric') return { min: 30, max: 300 };
  return {
    min: Math.floor(convertValue(30, 'kg', 'lb') * 10) / 10,
    max: Math.ceil(convertValue(300, 'kg', 'lb') * 10) / 10,
  };
}

export function healthHeightInputBounds(unitSystem: 'metric' | 'us'): { min: number; max: number } {
  if (unitSystem === 'metric') return { min: 120, max: 220 };
  return {
    min: Math.floor(convertValue(120, 'cm', 'in') * 10) / 10,
    max: Math.ceil(convertValue(220, 'cm', 'in') * 10) / 10,
  };
}

export function bmiWeightInputBounds(unitSystem: 'metric' | 'us'): { min: number; max: number } {
  if (unitSystem === 'metric') return { min: 2, max: 400 };
  return {
    min: Math.floor(convertValue(2, 'kg', 'lb') * 10) / 10,
    max: Math.ceil(convertValue(400, 'kg', 'lb') * 10) / 10,
  };
}

export function bmiHeightInputBounds(unitSystem: 'metric' | 'us'): { min: number; max: number } {
  if (unitSystem === 'metric') return { min: 50, max: 250 };
  return {
    min: Math.floor(convertValue(50, 'cm', 'in') * 10) / 10,
    max: Math.ceil(convertValue(250, 'cm', 'in') * 10) / 10,
  };
}
