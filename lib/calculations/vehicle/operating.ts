import { assertFiniteNonNegative } from '@/lib/calculations/energy/finite';
import {
  batteryKwhFromMiles,
  energyCostFromKwh,
  fuelCost,
  periodQuantitiesFromAnnual,
  wallKwhFromBattery,
} from '@/lib/calculations/energy';

export const POWERTRAINS = ['gas', 'ev'] as const;
export type Powertrain = (typeof POWERTRAINS)[number];

export type VehicleEnergyPlan =
  | { powertrain: 'gas'; annualMiles: number; mpg: number; dollarsPerGallon: number }
  | {
      powertrain: 'ev';
      annualMiles: number;
      kwhPer100Miles: number;
      electricityCentsPerKwh: number;
      chargingLossPercent: number;
    };

export type VehicleEnergyCost = {
  powertrain: Powertrain;
  annualMiles: number;
  annualEnergyCost: number;
  monthlyEnergyCost: number;
  gallonsPerYear: number | null;
  wallKwhPerYear: number | null;
  energyCostPerMile: number;
};

export type VehicleOperatingCost = {
  energy: VehicleEnergyCost;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  monthlyRegistration: number;
  monthlyOperatingTotal: number;
  annualOperatingTotal: number;
};

/** Driving energy only. Gasoline and EV both reuse the Energy Engine primitives. */
export function vehicleEnergyCost(plan: VehicleEnergyPlan): VehicleEnergyCost {
  switch (plan.powertrain) {
    case 'gas': {
      const fuel = fuelCost({
        miles: plan.annualMiles,
        mpg: plan.mpg,
        dollarsPerGallon: plan.dollarsPerGallon,
      });
      return {
        powertrain: 'gas',
        annualMiles: plan.annualMiles,
        annualEnergyCost: fuel.cost,
        monthlyEnergyCost: periodQuantitiesFromAnnual(fuel.cost).monthly,
        gallonsPerYear: fuel.gallons,
        wallKwhPerYear: null,
        energyCostPerMile: plan.annualMiles === 0 ? 0 : fuel.cost / plan.annualMiles,
      };
    }
    case 'ev': {
      const battery = batteryKwhFromMiles({
        miles: plan.annualMiles,
        kwhPer100Miles: plan.kwhPer100Miles,
      });
      const charging = wallKwhFromBattery({
        batteryKwh: battery.batteryKwh,
        chargingLossPercent: plan.chargingLossPercent,
      });
      const electricity = energyCostFromKwh({
        kwh: charging.wallKwh,
        centsPerKwh: plan.electricityCentsPerKwh,
      });
      return {
        powertrain: 'ev',
        annualMiles: plan.annualMiles,
        annualEnergyCost: electricity.cost,
        monthlyEnergyCost: periodQuantitiesFromAnnual(electricity.cost).monthly,
        gallonsPerYear: null,
        wallKwhPerYear: charging.wallKwh,
        energyCostPerMile: plan.annualMiles === 0 ? 0 : electricity.cost / plan.annualMiles,
      };
    }
    default: {
      const exhaustive: never = plan;
      throw new Error(`Unhandled powertrain: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Everything that recurs while you own the car. Insurance and upkeep are the numbers the
 * user supplies; nothing here is quoted from a provider.
 */
export function vehicleOperatingCost(input: {
  energy: VehicleEnergyPlan;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  annualRegistration: number;
}): VehicleOperatingCost {
  assertFiniteNonNegative(input.monthlyInsurance, 'Insurance');
  assertFiniteNonNegative(input.monthlyMaintenance, 'Maintenance');
  assertFiniteNonNegative(input.annualRegistration, 'Registration');

  const energy = vehicleEnergyCost(input.energy);
  const monthlyRegistration = periodQuantitiesFromAnnual(input.annualRegistration).monthly;
  const monthlyOperatingTotal = energy.monthlyEnergyCost
    + input.monthlyInsurance
    + input.monthlyMaintenance
    + monthlyRegistration;

  return {
    energy,
    monthlyInsurance: input.monthlyInsurance,
    monthlyMaintenance: input.monthlyMaintenance,
    monthlyRegistration,
    monthlyOperatingTotal,
    annualOperatingTotal: monthlyOperatingTotal * 12,
  };
}
