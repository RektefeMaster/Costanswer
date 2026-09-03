import { assertFiniteNonNegative, assertPositive } from './finite';

export type VehicleBatteryEnergy = {
  miles: number;
  kwhPer100Miles: number;
  batteryKwh: number;
};

export type WallChargingEnergy = {
  batteryKwh: number;
  chargingLossPercent: number;
  chargingEfficiency: number;
  wallKwh: number;
};

export function chargingEfficiencyFromLossPercent(chargingLossPercent: number): number {
  assertFiniteNonNegative(chargingLossPercent, 'Charging loss');
  if (chargingLossPercent >= 100) throw new Error('Charging loss must be less than 100%.');
  const chargingEfficiency = 1 - chargingLossPercent / 100;
  if (chargingEfficiency <= 0) throw new Error('Charging efficiency must be greater than zero.');
  return chargingEfficiency;
}

export function batteryKwhFromMiles(input: { miles: number; kwhPer100Miles: number }): VehicleBatteryEnergy {
  assertFiniteNonNegative(input.miles, 'Miles');
  assertPositive(input.kwhPer100Miles, 'EV efficiency');
  return {
    miles: input.miles,
    kwhPer100Miles: input.kwhPer100Miles,
    batteryKwh: input.miles * input.kwhPer100Miles / 100,
  };
}

export function wallKwhFromBattery(input: {
  batteryKwh: number;
  chargingLossPercent: number;
}): WallChargingEnergy {
  assertFiniteNonNegative(input.batteryKwh, 'Battery energy');
  const chargingEfficiency = chargingEfficiencyFromLossPercent(input.chargingLossPercent);
  return {
    batteryKwh: input.batteryKwh,
    chargingLossPercent: input.chargingLossPercent,
    chargingEfficiency,
    wallKwh: input.batteryKwh / chargingEfficiency,
  };
}
