/**
 * Authoring helpers and the integrity rules for a tool's data manifest.
 *
 * Four constructors, because there are only four honest answers to "what does
 * this page do when the data is gone":
 *
 * - `requiresOfficialData` — nothing. It says the answer is unavailable.
 * - `formulaWithDefault`   — asks the reader for the number it was defaulting.
 * - `formulaWithBenchmark` — drops a context line and keeps the answer.
 * - `formulaOnly`          — nothing to lose; it never read a dataset.
 *
 * Writing the constructor is the decision. Everything downstream — the
 * readiness check, the source list on the page, the freshness gate — reads the
 * manifest rather than re-deciding per tool, so a source that goes missing
 * cannot degrade one page gracefully and another silently.
 */
import { DATASET_POLICIES, type DatasetId } from '../data/dataset-policy';
import { DATASET_IDS } from '../data/dataset-policy';
import { getDataSource, type DataSourceId } from '../data/data-sources';
import type { DataFallback, ToolDataManifest, ToolDefinition } from './types';

/**
 * How old a copy of one source may be before the tool that requires it stops
 * claiming a complete answer.
 *
 * A full release interval, plus the grace the freshness policy already allows
 * for a missed release, plus the provider's own publication lag. Anything
 * tighter blanks a page because BLS published on its usual schedule and we
 * were not looking; anything looser lets a superseded table stand for a second
 * full release cycle. Sources with no cadence — a tax year's rules, a
 * manufacturer's yield table — get a year, which is the interval at which
 * somebody has to look at them anyway.
 */
const PINNED_SOURCE_STALENESS_DAYS = 400;

export function defaultStalenessDays(sourceIds: DataSourceId[]): number | null {
  if (sourceIds.length === 0) return null;
  let longest = 0;
  for (const sourceId of sourceIds) {
    const policyId = getDataSource(sourceId).policyId;
    if (policyId === null) {
      longest = Math.max(longest, PINNED_SOURCE_STALENESS_DAYS);
      continue;
    }
    const policy = DATASET_POLICIES[policyId];
    const interval = policy.releaseIntervalDays ?? 365;
    longest = Math.max(longest, interval + policy.staleAfterMissedDays + policy.publicationLagDays);
  }
  return longest;
}

/** The answer does not exist without these sources. */
export function requiresOfficialData(input: {
  required: DataSourceId[];
  optional?: DataSourceId[];
  /** Why the page cannot answer without them, in the reader's terms. */
  note: string;
  modeled?: ToolDataManifest['modeledInputs'];
  maxStalenessDays?: number;
}): ToolDataManifest {
  if (input.required.length === 0) throw new Error('requiresOfficialData needs at least one required source.');
  return {
    requiresData: true,
    requiredDatasets: input.required,
    optionalDatasets: input.optional ?? [],
    modeledInputs: input.modeled ?? [],
    fallbackBehavior: { kind: 'blocked', note: input.note },
    maxStalenessDays: input.maxStalenessDays ?? defaultStalenessDays(input.required),
  };
}

/** Arithmetic that seeds one input from official data; the reader can type it instead. */
export function formulaWithDefault(input: { optional: DataSourceId[]; note: string; modeled?: ToolDataManifest['modeledInputs'] }): ToolDataManifest {
  if (input.optional.length === 0) throw new Error('formulaWithDefault needs at least one optional source.');
  return {
    requiresData: false,
    requiredDatasets: [],
    optionalDatasets: input.optional,
    modeledInputs: input.modeled ?? [],
    fallbackBehavior: { kind: 'user-entered', note: input.note },
    maxStalenessDays: null,
  };
}

/** Arithmetic that prints official data beside the answer as context. */
export function formulaWithBenchmark(input: { optional: DataSourceId[]; note: string; modeled?: ToolDataManifest['modeledInputs'] }): ToolDataManifest {
  if (input.optional.length === 0) throw new Error('formulaWithBenchmark needs at least one optional source.');
  return {
    requiresData: false,
    requiredDatasets: [],
    optionalDatasets: input.optional,
    modeledInputs: input.modeled ?? [],
    fallbackBehavior: { kind: 'formula-only', note: input.note },
    maxStalenessDays: null,
  };
}

/** Solvable from its inputs alone. No dataset is read at any point. */
export function formulaOnly(note: string, modeled: ToolDataManifest['modeledInputs'] = []): ToolDataManifest {
  return {
    requiresData: false,
    requiredDatasets: [],
    optionalDatasets: [],
    modeledInputs: modeled,
    fallbackBehavior: { kind: 'formula-only', note },
    maxStalenessDays: null,
  };
}

export function manifestSourceIds(manifest: ToolDataManifest): DataSourceId[] {
  return [...manifest.requiredDatasets, ...manifest.optionalDatasets];
}

/** The tracked datasets a tool touches, for the freshness gate. */
export function manifestDatasetIds(manifest: ToolDataManifest): DatasetId[] {
  const tracked = new Set(DATASET_IDS as readonly string[]);
  return manifestSourceIds(manifest).filter((id): id is DatasetId => tracked.has(id));
}

const FALLBACK_KINDS_FOR_OPTIONAL: Array<DataFallback['kind']> = ['user-entered', 'formula-only'];

export function assertToolDataManifest(tool: Pick<ToolDefinition, 'id' | 'data' | 'resultNature'>): void {
  const { data } = tool;
  const where = `${tool.id} data manifest`;
  const required = new Set(data.requiredDatasets);
  const optional = new Set(data.optionalDatasets);

  if (required.size !== data.requiredDatasets.length) throw new Error(`${where} repeats a required source.`);
  if (optional.size !== data.optionalDatasets.length) throw new Error(`${where} repeats an optional source.`);
  for (const id of [...required, ...optional]) getDataSource(id);
  for (const id of required) {
    if (optional.has(id)) throw new Error(`${where} lists ${id} as both required and optional.`);
  }

  if (data.requiresData !== required.size > 0) {
    throw new Error(`${where} sets requiresData=${data.requiresData} with ${required.size} required sources.`);
  }

  if (data.requiresData) {
    if (data.fallbackBehavior.kind !== 'blocked') {
      throw new Error(`${where} requires data, so its fallback must be 'blocked', not '${data.fallbackBehavior.kind}'.`);
    }
    if (data.maxStalenessDays === null || !Number.isInteger(data.maxStalenessDays) || data.maxStalenessDays <= 0) {
      throw new Error(`${where} requires data and must set a positive whole-day staleness limit.`);
    }
    const floor = defaultStalenessDays(data.requiredDatasets) ?? 0;
    if (data.maxStalenessDays < floor) {
      throw new Error(
        `${where} allows ${data.maxStalenessDays} days, which is tighter than the ${floor}-day release cycle of its own sources.`,
      );
    }
  } else {
    if (!FALLBACK_KINDS_FOR_OPTIONAL.includes(data.fallbackBehavior.kind)) {
      throw new Error(`${where} requires no data, so its fallback may not be '${data.fallbackBehavior.kind}'.`);
    }
    if (data.maxStalenessDays !== null) {
      throw new Error(`${where} requires no data, so it must not set a staleness limit.`);
    }
    if (data.fallbackBehavior.kind === 'user-entered' && optional.size === 0) {
      throw new Error(`${where} promises a reader-entered fallback but names no source it would replace.`);
    }
  }

  if (!data.fallbackBehavior.note.trim()) throw new Error(`${where} states no fallback behaviour.`);

  for (const modeled of data.modeledInputs) {
    if (modeled.label.trim().length < 3) throw new Error(`${where} lists a modelled input with no name.`);
    if (modeled.why.trim().length < 30) {
      throw new Error(`${where} names the modelled input ${JSON.stringify(modeled.label)} without saying where the figure came from.`);
    }
  }

  /*
   * `exact` claims the arithmetic is decided by the inputs. A tool that cannot
   * answer without an outside table is not exact — it is an official-data
   * estimate, whatever its formula does once the table is loaded. This gate is
   * what stops the two fields drifting apart as tools gain data.
   */
  if (data.requiresData && tool.resultNature === 'exact') {
    throw new Error(`${where} requires official data, so resultNature may not be 'exact'.`);
  }
}
