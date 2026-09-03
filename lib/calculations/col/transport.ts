import { vehicleOperatingCost, type VehicleEnergyPlan } from '@/lib/calculations/vehicle/operating';
import type { StateCode } from '@/lib/location/states';

export type ColTransportMode = 'none' | 'gas' | 'ev' | 'manual';

export type ColTransportInput =
  | { mode: 'none'; manualMonthly?: number }
  | { mode: 'manual'; monthly: number }
  | {
      mode: 'gas';
      annualMiles: number;
      mpg: number;
      dollarsPerGallon: number;
      monthlyInsurance: number;
      monthlyMaintenance: number;
      annualRegistration: number;
    }
  | {
      mode: 'ev';
      annualMiles: number;
      kwhPer100Miles: number;
      electricityCentsPerKwh: number;
      chargingLossPercent: number;
      monthlyInsurance: number;
      monthlyMaintenance: number;
      annualRegistration: number;
    };

export function composeColTransport(input: ColTransportInput): {
  amount: number | null;
  included: boolean;
  sourceLabel: string;
  usesEiaGasoline: boolean;
  usesEiaElectricity: boolean;
  rppApplied: false;
} {
  switch (input.mode) {
    case 'none':
      if (input.manualMonthly != null) {
        return {
          amount: input.manualMonthly,
          included: true,
          sourceLabel: 'Manual monthly transportation (no personal vehicle modeled)',
          usesEiaGasoline: false,
          usesEiaElectricity: false,
          rppApplied: false,
        };
      }
      return {
        amount: null,
        included: false,
        sourceLabel: 'Personal vehicle not modeled; transit is not assumed to be free',
        usesEiaGasoline: false,
        usesEiaElectricity: false,
        rppApplied: false,
      };
    case 'manual':
      return {
        amount: input.monthly,
        included: true,
        sourceLabel: 'Manual monthly transportation',
        usesEiaGasoline: false,
        usesEiaElectricity: false,
        rppApplied: false,
      };
    case 'gas': {
      const energy: VehicleEnergyPlan = {
        powertrain: 'gas',
        annualMiles: input.annualMiles,
        mpg: input.mpg,
        dollarsPerGallon: input.dollarsPerGallon,
      };
      const operating = vehicleOperatingCost({
        energy,
        monthlyInsurance: input.monthlyInsurance,
        monthlyMaintenance: input.monthlyMaintenance,
        annualRegistration: input.annualRegistration,
      });
      return {
        amount: operating.monthlyOperatingTotal,
        included: true,
        sourceLabel: 'Gasoline vehicle operating cost from EIA fuel price and entered miles/MPG',
        usesEiaGasoline: true,
        usesEiaElectricity: false,
        rppApplied: false,
      };
    }
    case 'ev': {
      const energy: VehicleEnergyPlan = {
        powertrain: 'ev',
        annualMiles: input.annualMiles,
        kwhPer100Miles: input.kwhPer100Miles,
        electricityCentsPerKwh: input.electricityCentsPerKwh,
        chargingLossPercent: input.chargingLossPercent,
      };
      const operating = vehicleOperatingCost({
        energy,
        monthlyInsurance: input.monthlyInsurance,
        monthlyMaintenance: input.monthlyMaintenance,
        annualRegistration: input.annualRegistration,
      });
      return {
        amount: operating.monthlyOperatingTotal,
        included: true,
        sourceLabel: 'EV charging cost from EIA electricity price and entered miles/efficiency',
        usesEiaGasoline: false,
        usesEiaElectricity: true,
        rppApplied: false,
      };
    }
    default: {
      const exhaustive: never = input;
      throw new Error(`Unhandled transport mode: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function assertNoRppOnLocalRate(amount: number, rpp: number | null, label: string): number {
  if (!Number.isFinite(amount)) throw new Error(`${label} amount must be a finite official dollar value.`);
  if (rpp != null && !Number.isFinite(rpp)) throw new Error(`${label} RPP context is invalid.`);
  // Contract: return the official unscaled amount. Never return amount * rpp / 100.
  return amount;
}

export type { StateCode };
