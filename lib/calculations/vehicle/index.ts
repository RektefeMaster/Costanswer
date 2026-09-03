export { CAR_AFFORDABILITY_ENGINE_ID } from './version';
export {
  composeVehiclePurchase,
  financeVehicle,
  type VehicleFinancing,
  type VehiclePurchase,
} from './financing';
export {
  POWERTRAINS,
  vehicleEnergyCost,
  vehicleOperatingCost,
  type Powertrain,
  type VehicleEnergyCost,
  type VehicleEnergyPlan,
  type VehicleOperatingCost,
} from './operating';
export {
  composeVehicleOwnershipCost,
  type VehicleOwnershipCost,
} from './ownership';
export {
  VEHICLE_AFFORDABILITY_BAND_IDS,
  VEHICLE_AFFORDABILITY_BANDS,
  maxVehiclePriceForBand,
  vehicleBandLabel,
  vehicleBurden,
  vehicleVerdict,
  vehicleVerdictLabel,
  type VehicleAffordabilityBandId,
  type VehicleAffordabilityVerdict,
  type VehicleBudget,
  type VehicleBurden,
} from './affordability';
