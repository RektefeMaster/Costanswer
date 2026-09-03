import { describe, expect, it } from 'vitest';
import { convertValue, EXACT_CONVERSION_CONSTANTS } from '@/lib/calculations/conversion/units';
import { calculateUnitConversion } from '@/lib/calculations/unit-conversion';
import { calculateSquareFootage } from '@/lib/calculations/square-footage';
import { calculateConcrete } from '@/lib/calculations/concrete';

describe('conversion constants', () => {
  it('locks the international yard and pound exact ties', () => {
    expect(EXACT_CONVERSION_CONSTANTS.inchCentimeters).toBe(2.54);
    expect(EXACT_CONVERSION_CONSTANTS.footMeters).toBe(0.3048);
    expect(EXACT_CONVERSION_CONSTANTS.mileMeters).toBe(1609.344);
    expect(EXACT_CONVERSION_CONSTANTS.poundKilograms).toBe(0.45359237);
    expect(convertValue(1, 'in', 'cm')).toBe(2.54);
    expect(convertValue(1, 'ft', 'm')).toBe(0.3048);
    expect(convertValue(1, 'mi', 'm')).toBe(1609.344);
    expect(convertValue(1, 'lb', 'kg')).toBe(0.45359237);
  });

  it('converts temperature affinely and round-trips common units', () => {
    expect(convertValue(0, 'c', 'f')).toBeCloseTo(32, 10);
    expect(convertValue(100, 'c', 'f')).toBeCloseTo(212, 10);
    expect(convertValue(32, 'f', 'c')).toBeCloseTo(0, 12);
    expect(convertValue(212, 'f', 'c')).toBeCloseTo(100, 12);
    expect(convertValue(convertValue(12.345, 'in', 'm'), 'm', 'in')).toBeCloseTo(12.345, 12);
    expect(convertValue(convertValue(10, 'ft2', 'm2'), 'm2', 'ft2')).toBeCloseTo(10, 12);
    expect(convertValue(convertValue(2, 'us-gal', 'l'), 'l', 'us-gal')).toBeCloseTo(2, 12);
  });

  it('exposes the public converter without pair SEO pages', () => {
    const result = calculateUnitConversion({ category: 'length', fromUnit: 'in', toUnit: 'cm', value: 1 });
    expect(result.value.output).toBe(2.54);
    expect(result.calculationVersion).toBe('unit-conversion-v1.0.0');
    expect(() => calculateUnitConversion({ category: 'length', fromUnit: 'in', toUnit: 'kg', value: 1 })).toThrow();
  });
});

describe('square footage', () => {
  it('locks 12 × 10 ft as 120 ft² and reuses conversion for square meters', () => {
    const result = calculateSquareFootage({
      unit: 'ft',
      spaces: [{ id: 'room', name: 'Room', length: 12, width: 10 }],
    });
    expect(result.value.totalSquareFeet).toBe(120);
    expect(result.value.totalSquareMeters).toBeCloseTo(convertValue(120, 'ft2', 'm2'), 2);
  });

  it('does not change the concrete volume fixture', () => {
    const slab = calculateConcrete({ lengthFeet: 10, widthFeet: 10, thicknessInches: 4, wastePercent: 10, bagWeight: 80 });
    expect(slab.value.exactCubicYards).toBeGreaterThan(0);
  });
});
