/**
 * The calculation receipt: what kind of claim each number on a page is.
 *
 * Built from the tool's own data manifest, so every page gets one and none of
 * them can describe a source the tool does not actually read. The four class
 * words are the point — a reader who sees the same "estimate" note over a 2026
 * bracket, a Freddie Mac average and a rate they typed themselves has been
 * told nothing. Separating them is what makes the confident lines worth
 * trusting and the modelled ones worth questioning.
 */
import {
  PROVENANCE_CLASS_MEANING,
  PROVENANCE_CLASS_WORDS,
  getDataSource,
  provenanceClassForTier,
  type DataSourceId,
  type ProvenanceClass,
} from '../data/data-sources';
import type { ToolDataManifest } from './types';

export type ReceiptLine = {
  provenanceClass: ProvenanceClass;
  /** The class word, ready to print: "VERIFIED". */
  classWord: string;
  /** The source, or a description of the reader's own input. */
  source: string;
  /** What this source decides on this page, and how far it may be trusted. */
  role: string;
  /** Observation period or effective version, when the caller knows it. */
  period?: string;
};

const REQUIRED_ROLE: Record<ProvenanceClass, string> = {
  verified: 'Sets the figures this answer is made of. Without it the page says so rather than estimating.',
  observed: 'Measured and published. The answer is built on it, so it is only as current as the release date shown.',
  modeled: 'A calibrated model rather than a published price. Treat the result as a range, not a quote.',
  'user-entered': 'Used exactly as you typed it.',
};

const OPTIONAL_ROLE: Record<ToolDataManifest['fallbackBehavior']['kind'], string> = {
  blocked: 'Sharpens the answer where it is available.',
  'user-entered': 'Only a starting value. A figure from your own bill or quote replaces it and is used instead.',
  'formula-only': 'Context printed beside the answer. The answer does not depend on it.',
};

export function calculationReceipt(input: {
  manifest: ToolDataManifest;
  /** Observation period or effective version per source, when the page knows it. */
  periods?: Partial<Record<DataSourceId, string>>;
}): ReceiptLine[] {
  const { manifest } = input;
  const periods = input.periods ?? {};
  const lines: ReceiptLine[] = [];

  for (const sourceId of manifest.requiredDatasets) {
    const source = getDataSource(sourceId);
    const provenanceClass = provenanceClassForTier(source.tier);
    lines.push({
      provenanceClass,
      classWord: PROVENANCE_CLASS_WORDS[provenanceClass],
      source: source.label,
      role: REQUIRED_ROLE[provenanceClass],
      period: periods[sourceId],
    });
  }

  for (const sourceId of manifest.optionalDatasets) {
    const source = getDataSource(sourceId);
    const provenanceClass = provenanceClassForTier(source.tier);
    lines.push({
      provenanceClass,
      classWord: PROVENANCE_CLASS_WORDS[provenanceClass],
      source: source.label,
      role: OPTIONAL_ROLE[manifest.fallbackBehavior.kind],
      period: periods[sourceId],
    });
  }

  for (const modeled of manifest.modeledInputs) {
    lines.push({
      provenanceClass: 'modeled',
      classWord: PROVENANCE_CLASS_WORDS.modeled,
      source: modeled.label,
      role: modeled.why,
    });
  }

  /*
   * Every page has reader input, but it is only worth a receipt line where the
   * reader is replacing something we would otherwise have supplied. On a tip
   * calculator "you typed the bill" is not a provenance claim; on a mortgage
   * page "you typed 6.1% and we used 6.1%, not the survey average" is.
   */
  if (manifest.fallbackBehavior.kind === 'user-entered') {
    lines.push({
      provenanceClass: 'user-entered',
      classWord: PROVENANCE_CLASS_WORDS['user-entered'],
      source: 'A figure you enter',
      role: PROVENANCE_CLASS_MEANING['user-entered'],
    });
  }

  return lines;
}

/** The one-line summary above the receipt, in the reader's terms. */
export function receiptSummary(manifest: ToolDataManifest): string {
  if (manifest.requiresData) {
    return 'This answer is built from published figures. Each one is named below, with the release it came from.';
  }
  if (manifest.optionalDatasets.length === 0 && manifest.modeledInputs.length === 0) {
    return 'This answer is arithmetic on what you enter. No outside dataset is involved, so nothing here can go out of date.';
  }
  if (manifest.fallbackBehavior.kind === 'user-entered') {
    return 'The arithmetic is decided by your inputs. Official data only supplies a starting value, and anything you type replaces it.';
  }
  return 'The arithmetic is decided by your inputs. Official data is printed beside the answer as context, and the answer stands without it.';
}
