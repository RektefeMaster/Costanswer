export const CONVERSION_ENGINE_ID = 'unit-conversion-v1.0.0' as const;

export const CONVERSION_CATEGORIES = ['length', 'mass', 'volume', 'area', 'temperature', 'speed'] as const;
export type ConversionCategory = (typeof CONVERSION_CATEGORIES)[number];

export type LinearUnit = {
  id: string;
  label: string;
  symbol: string;
  category: Exclude<ConversionCategory, 'temperature'>;
  toBase: number;
};

export type AffineUnit = {
  id: string;
  label: string;
  symbol: string;
  category: 'temperature';
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
};

export type ConversionUnit = LinearUnit | AffineUnit;

const INCH_METERS = 0.0254;
const FOOT_METERS = 0.3048;
const MILE_METERS = 1609.344;
const POUND_KILOGRAMS = 0.45359237;
const US_GALLON_CUBIC_METERS = 0.003785411784;
const INTERNATIONAL_ACRE_SQUARE_METERS = 4046.8564224;
const NAUTICAL_MILE_METERS = 1852;

const linearUnits: LinearUnit[] = [
  { id: 'mm', label: 'Millimeters', symbol: 'mm', category: 'length', toBase: 0.001 },
  { id: 'cm', label: 'Centimeters', symbol: 'cm', category: 'length', toBase: 0.01 },
  { id: 'm', label: 'Meters', symbol: 'm', category: 'length', toBase: 1 },
  { id: 'km', label: 'Kilometers', symbol: 'km', category: 'length', toBase: 1_000 },
  { id: 'in', label: 'Inches', symbol: 'in', category: 'length', toBase: INCH_METERS },
  { id: 'ft', label: 'Feet', symbol: 'ft', category: 'length', toBase: FOOT_METERS },
  { id: 'yd', label: 'Yards', symbol: 'yd', category: 'length', toBase: 0.9144 },
  { id: 'mi', label: 'Miles', symbol: 'mi', category: 'length', toBase: MILE_METERS },

  { id: 'mg', label: 'Milligrams', symbol: 'mg', category: 'mass', toBase: 1e-6 },
  { id: 'g', label: 'Grams', symbol: 'g', category: 'mass', toBase: 0.001 },
  { id: 'kg', label: 'Kilograms', symbol: 'kg', category: 'mass', toBase: 1 },
  { id: 't', label: 'Metric tons', symbol: 't', category: 'mass', toBase: 1_000 },
  { id: 'oz', label: 'Ounces', symbol: 'oz', category: 'mass', toBase: POUND_KILOGRAMS / 16 },
  { id: 'lb', label: 'Pounds', symbol: 'lb', category: 'mass', toBase: POUND_KILOGRAMS },
  { id: 'st', label: 'Stone', symbol: 'st', category: 'mass', toBase: POUND_KILOGRAMS * 14 },

  { id: 'ml', label: 'Milliliters', symbol: 'mL', category: 'volume', toBase: 1e-6 },
  { id: 'l', label: 'Liters', symbol: 'L', category: 'volume', toBase: 0.001 },
  { id: 'm3', label: 'Cubic meters', symbol: 'm³', category: 'volume', toBase: 1 },
  { id: 'in3', label: 'Cubic inches', symbol: 'in³', category: 'volume', toBase: INCH_METERS ** 3 },
  { id: 'ft3', label: 'Cubic feet', symbol: 'ft³', category: 'volume', toBase: FOOT_METERS ** 3 },
  { id: 'us-gal', label: 'US gallons', symbol: 'gal', category: 'volume', toBase: US_GALLON_CUBIC_METERS },
  { id: 'us-qt', label: 'US quarts', symbol: 'qt', category: 'volume', toBase: US_GALLON_CUBIC_METERS / 4 },
  { id: 'us-pt', label: 'US pints', symbol: 'pt', category: 'volume', toBase: US_GALLON_CUBIC_METERS / 8 },
  { id: 'us-cup', label: 'US cups', symbol: 'cup', category: 'volume', toBase: US_GALLON_CUBIC_METERS / 16 },
  { id: 'us-fl-oz', label: 'US fluid ounces', symbol: 'fl oz', category: 'volume', toBase: US_GALLON_CUBIC_METERS / 128 },

  { id: 'mm2', label: 'Square millimeters', symbol: 'mm²', category: 'area', toBase: 1e-6 },
  { id: 'cm2', label: 'Square centimeters', symbol: 'cm²', category: 'area', toBase: 1e-4 },
  { id: 'm2', label: 'Square meters', symbol: 'm²', category: 'area', toBase: 1 },
  { id: 'km2', label: 'Square kilometers', symbol: 'km²', category: 'area', toBase: 1_000_000 },
  { id: 'in2', label: 'Square inches', symbol: 'in²', category: 'area', toBase: INCH_METERS ** 2 },
  { id: 'ft2', label: 'Square feet', symbol: 'ft²', category: 'area', toBase: FOOT_METERS ** 2 },
  { id: 'yd2', label: 'Square yards', symbol: 'yd²', category: 'area', toBase: 0.9144 ** 2 },
  { id: 'ac', label: 'Acres', symbol: 'ac', category: 'area', toBase: INTERNATIONAL_ACRE_SQUARE_METERS },
  { id: 'mi2', label: 'Square miles', symbol: 'mi²', category: 'area', toBase: MILE_METERS ** 2 },
  { id: 'ha', label: 'Hectares', symbol: 'ha', category: 'area', toBase: 10_000 },

  { id: 'm-s', label: 'Meters per second', symbol: 'm/s', category: 'speed', toBase: 1 },
  { id: 'km-h', label: 'Kilometers per hour', symbol: 'km/h', category: 'speed', toBase: 1_000 / 3_600 },
  { id: 'mph', label: 'Miles per hour', symbol: 'mph', category: 'speed', toBase: MILE_METERS / 3_600 },
  { id: 'ft-s', label: 'Feet per second', symbol: 'ft/s', category: 'speed', toBase: FOOT_METERS },
  { id: 'kn', label: 'Knots', symbol: 'kn', category: 'speed', toBase: NAUTICAL_MILE_METERS / 3_600 },
];

const temperatureUnits: AffineUnit[] = [
  {
    id: 'c',
    label: 'Celsius',
    symbol: '°C',
    category: 'temperature',
    toBase: (value) => value + 273.15,
    fromBase: (value) => value - 273.15,
  },
  {
    id: 'f',
    label: 'Fahrenheit',
    symbol: '°F',
    category: 'temperature',
    toBase: (value) => (value + 459.67) * (5 / 9),
    fromBase: (value) => value * (9 / 5) - 459.67,
  },
  {
    id: 'k',
    label: 'Kelvin',
    symbol: 'K',
    category: 'temperature',
    toBase: (value) => value,
    fromBase: (value) => value,
  },
];

export const CONVERSION_UNITS: ConversionUnit[] = [...linearUnits, ...temperatureUnits];
const unitById = new Map(CONVERSION_UNITS.map((unit) => [unit.id, unit]));

export const EXACT_CONVERSION_CONSTANTS = {
  inchMeters: INCH_METERS,
  footMeters: FOOT_METERS,
  mileMeters: MILE_METERS,
  poundKilograms: POUND_KILOGRAMS,
  inchCentimeters: 2.54,
} as const;

export function getConversionUnit(id: string): ConversionUnit {
  const unit = unitById.get(id);
  if (!unit) throw new Error(`Unknown unit: ${id}.`);
  return unit;
}

export function unitsForCategory(category: ConversionCategory): ConversionUnit[] {
  return CONVERSION_UNITS.filter((unit) => unit.category === category);
}

export function convertValue(value: number, fromId: string, toId: string): number {
  if (!Number.isFinite(value)) throw new Error('Value must be a finite number.');
  const from = getConversionUnit(fromId);
  const to = getConversionUnit(toId);
  if (from.category !== to.category) {
    throw new Error(`Cannot convert ${from.label} to ${to.label}.`);
  }
  if (from.category === 'temperature' && to.category === 'temperature') {
    const kelvin = (from as AffineUnit).toBase(value);
    if (kelvin < 0) throw new Error('Temperature cannot be below absolute zero.');
    return (to as AffineUnit).fromBase(kelvin);
  }
  const linearFrom = from as LinearUnit;
  const linearTo = to as LinearUnit;
  return value * linearFrom.toBase / linearTo.toBase;
}
