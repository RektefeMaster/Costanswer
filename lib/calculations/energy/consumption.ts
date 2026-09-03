import { assertFiniteNonNegative, assertInRange } from './finite';
import { periodQuantitiesFromWeekly, type PeriodQuantities } from './period';

export type PowerEnergyUse = {
  watts: number;
  hours: number;
  kwh: number;
};

export type WeeklyUsagePattern = {
  hoursPerDay: number;
  daysPerWeek: number;
};

export type ApplianceEnergyUse = {
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;
  kwhPerUsageDay: number;
  kwhPerWeek: number;
  quantities: PeriodQuantities;
};

export function energyUseFromPower(input: { watts: number; hours: number }): PowerEnergyUse {
  assertFiniteNonNegative(input.watts, 'Wattage');
  assertFiniteNonNegative(input.hours, 'Hours');
  return {
    watts: input.watts,
    hours: input.hours,
    kwh: (input.watts / 1000) * input.hours,
  };
}

export function energyUseFromKw(input: { kw: number; hours: number }): PowerEnergyUse {
  assertFiniteNonNegative(input.kw, 'Kilowatts');
  assertFiniteNonNegative(input.hours, 'Hours');
  return energyUseFromPower({ watts: input.kw * 1000, hours: input.hours });
}

export function weeklyHoursFromPattern(pattern: WeeklyUsagePattern): number {
  assertInRange(pattern.hoursPerDay, 0, 24, 'Hours per day');
  assertInRange(pattern.daysPerWeek, 0, 7, 'Days per week');
  return pattern.hoursPerDay * pattern.daysPerWeek;
}

export function applianceEnergyFromWeeklyPattern(input: {
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;
}): ApplianceEnergyUse {
  assertFiniteNonNegative(input.watts, 'Wattage');
  const weeklyHours = weeklyHoursFromPattern({
    hoursPerDay: input.hoursPerDay,
    daysPerWeek: input.daysPerWeek,
  });
  const kwhPerUsageDay = energyUseFromPower({ watts: input.watts, hours: input.hoursPerDay }).kwh;
  const kwhPerWeek = energyUseFromPower({ watts: input.watts, hours: weeklyHours }).kwh;
  return {
    watts: input.watts,
    hoursPerDay: input.hoursPerDay,
    daysPerWeek: input.daysPerWeek,
    kwhPerUsageDay,
    kwhPerWeek,
    quantities: periodQuantitiesFromWeekly(kwhPerWeek),
  };
}
