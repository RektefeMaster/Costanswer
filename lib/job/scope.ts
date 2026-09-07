import { JOB_CATALOG, jobFormFields, type JobId } from './catalog';
import type { JobEstimateInput } from './types';

const OPENING_ALLOWANCE = 0.85;
const EIGHT_FT_CEILING = 8;

export type JobScopeFields = {
  units?: number;
  rooms?: number;
  roomFloorSqFt?: number;
  tons?: number;
  windows?: number;
  typicalWindowSqFt?: number;
};

const EXTERIOR_DOOR_COMPONENTS = ['exterior-door-fiberglass', 'exterior-door-metal', 'exterior-door-wood'] as const;
const SIDING_COMPONENTS = ['vinyl-siding', 'wood-siding'] as const;

function exclusiveMaterialFactors(
  selectedId: string,
  componentIds: readonly string[],
): Record<string, number> {
  const factors: Record<string, number> = {};
  for (const id of componentIds) factors[id] = id === selectedId ? 1 : 0;
  return factors;
}

export type ResolvedJobScope = {
  units: number;
  materialFactors: Record<string, number>;
  note: string;
};

function finitePositive(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function paintCeilingFeet(heightId: string): number {
  switch (heightId) {
    case 'eight':
      return EIGHT_FT_CEILING;
    case 'tall':
      return 9;
    default:
      return EIGHT_FT_CEILING;
  }
}

export function paintWallSqFtFromRooms(rooms: number, roomFloorSqFt: number, ceilingHeightFt = EIGHT_FT_CEILING): number {
  return rooms * 4 * Math.sqrt(roomFloorSqFt) * ceilingHeightFt * OPENING_ALLOWANCE;
}

function requireUnits(jobId: JobId, fields: JobScopeFields): number {
  if (finitePositive(fields.units)) return fields.units;
  throw new Error(`Enter ${JOB_CATALOG[jobId].scope.label.toLowerCase()}.`);
}

/**
 * Convert what the user can actually measure into recipe units.
 * API callers may still send recipe units directly.
 */
export function resolveJobScope(
  jobId: JobId,
  fields: JobScopeFields,
  modifiers: Record<string, string>,
): ResolvedJobScope {
  const materialFactors: Record<string, number> = {};
  let units: number;
  let note = '';

  switch (jobId) {
    case 'interior-painting': {
      if (finitePositive(fields.rooms) && finitePositive(fields.roomFloorSqFt)) {
        const ceiling = paintCeilingFeet(modifiers.height ?? 'eight');
        units = paintWallSqFtFromRooms(fields.rooms, fields.roomFloorSqFt, ceiling);
        note = `${fields.rooms} room${fields.rooms === 1 ? '' : 's'} of about ${fields.roomFloorSqFt} sq ft is about ${Math.round(units).toLocaleString('en-US')} sq ft of wall at ${ceiling} ft, after a 15% opening allowance.`;
      } else {
        units = requireUnits(jobId, fields);
      }
      break;
    }
    case 'hvac-replacement':
    case 'heat-pump-replacement': {
      units = requireUnits(jobId, fields);
      const tons = finitePositive(fields.tons) ? fields.tons : 3;
      const equipmentId = jobId === 'hvac-replacement' ? 'split-system' : 'air-source-heat-pump';
      materialFactors[equipmentId] = tons / 3;
      note = `Equipment is scaled from EIA’s 3-ton baseline (${tons} ton${tons === 1 ? '' : 's'}).`;
      break;
    }
    case 'concrete-driveway': {
      units = requireUnits(jobId, fields);
      if ((modifiers.thickness ?? 'four') === 'five') {
        materialFactors['ready-mix-concrete'] = 5 / 4;
        note = 'Five-inch slabs use 25% more ready-mix than the 4-inch recipe quantity.';
      }
      break;
    }
    case 'water-heater-replacement': {
      units = requireUnits(jobId, fields);
      if ((modifiers.fuel ?? 'gas') === 'electric') {
        materialFactors['tank-water-heater'] = 0;
        materialFactors['tank-water-heater-electric'] = 1;
        note = 'Equipment is EIA’s typical 36-gallon electric storage tank (2022 retail midpoint).';
      } else {
        materialFactors['tank-water-heater-electric'] = 0;
        note = 'Equipment is EIA’s typical 40-gallon gas storage tank (2022 retail midpoint).';
      }
      break;
    }
    case 'fence-install': {
      units = requireUnits(jobId, fields);
      if ((modifiers.height ?? 'six') === 'four') {
        materialFactors['wood-privacy-fence'] = 4 / 6;
        note = 'Four-foot privacy uses two-thirds of the named 6 ft wood package quantity.';
      }
      break;
    }
    case 'window-replacement': {
      if (finitePositive(fields.windows) && finitePositive(fields.typicalWindowSqFt)) {
        units = fields.windows * fields.typicalWindowSqFt;
        note = `${fields.windows} window${fields.windows === 1 ? '' : 's'} of about ${fields.typicalWindowSqFt} sq ft is about ${Math.round(units).toLocaleString('en-US')} sq ft of vinyl window.`;
      } else {
        units = requireUnits(jobId, fields);
      }
      break;
    }
    case 'exterior-door-replacement': {
      units = requireUnits(jobId, fields);
      const material = modifiers.material ?? 'fiberglass';
      const selected = material === 'metal'
        ? 'exterior-door-metal'
        : material === 'wood'
          ? 'exterior-door-wood'
          : 'exterior-door-fiberglass';
      Object.assign(materialFactors, exclusiveMaterialFactors(selected, EXTERIOR_DOOR_COMPONENTS));
      note = `Each door is priced as 20 sq ft of a 36-inch by 80-inch prehung ${material} leaf.`;
      break;
    }
    case 'siding-replacement': {
      units = requireUnits(jobId, fields);
      const material = modifiers.material ?? 'vinyl';
      const selected = material === 'wood' ? 'wood-siding' : 'vinyl-siding';
      Object.assign(materialFactors, exclusiveMaterialFactors(selected, SIDING_COMPONENTS));
      note = material === 'wood'
        ? 'Finish is NREL’s wood exterior-finish intercept (2023$ midpoint).'
        : 'Finish is NREL’s vinyl exterior-finish intercept (2023$ midpoint).';
      break;
    }
    case 'electrical-panel-upgrade':
    case 'tree-removal':
    case 'deck-build':
    case 'bathroom-remodel':
    case 'drywall-install':
      units = requireUnits(jobId, fields);
      break;
    default: {
      const exhaustive: never = jobId;
      throw new Error(`Unhandled job id: ${JSON.stringify(exhaustive)}`);
    }
  }

  return { units, materialFactors, note };
}

export function parseScopeFields(read: (key: string) => string | null | undefined): JobScopeFields {
  const numberAt = (key: string): number | undefined => {
    const raw = read(key);
    if (raw == null || raw.trim() === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    units: numberAt('units'),
    rooms: numberAt('rooms'),
    roomFloorSqFt: numberAt('roomFloorSqFt'),
    tons: numberAt('tons'),
    windows: numberAt('windows'),
    typicalWindowSqFt: numberAt('typicalWindowSqFt'),
  };
}

export function toJobEstimateInput(
  jobId: JobId,
  zip: string,
  modifiers: Record<string, string>,
  fields: JobScopeFields,
): JobEstimateInput {
  const resolved = resolveJobScope(jobId, fields, modifiers);
  const meta = JOB_CATALOG[jobId];
  if (!Number.isFinite(resolved.units) || resolved.units < meta.scope.min || resolved.units > meta.scope.max) {
    throw new Error(`Enter ${meta.scope.label.toLowerCase()} between ${meta.scope.min} and ${meta.scope.max}.`);
  }
  for (const field of jobFormFields(meta)) {
    const raw = fields[field.id as keyof JobScopeFields];
    if (raw != null && (raw < field.min || raw > field.max)) {
      throw new Error(`Enter ${field.label.toLowerCase()} between ${field.min} and ${field.max}.`);
    }
  }
  return {
    jobId,
    zip,
    units: resolved.units,
    modifiers,
    materialFactors: resolved.materialFactors,
  };
}
