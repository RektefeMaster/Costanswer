import type { JobEstimate } from './types';

export type CalibrationEvidence = {
  kind: 'permit-valuation' | 'dot-bid';
  label: string;
  deltaCents: number;
};

/**
 * Wave-2 seam. V1 passes `[]` and returns the estimate unchanged.
 * Later evidence must appear as a named breakdown line, never a silent multiplier.
 */
export function calibrate(estimate: JobEstimate, evidence: CalibrationEvidence[]): JobEstimate {
  if (evidence.length === 0) return estimate;
  throw new Error('Calibration evidence is wave 2. V1 must pass an empty list.');
}
