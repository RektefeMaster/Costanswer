'use client';

import { PrimaryResult, ResultDetails, StatGrid } from '@/components/calculators/CalculatorUI';
import { formatMoney } from '@/lib/calculations/contracts';
import type { CalculationResult } from '@/lib/calculations/contracts';
import { materialList } from '@/lib/job/material-labels';
import type { JobEstimate } from '@/lib/job/types';
import { ConfidenceChip } from './ConfidenceChip';

function rangeText(estimate: JobEstimate): string {
  if (!estimate.range) return 'Incomplete';
  return `${formatMoney(estimate.range.lowCents / 100, 0)}–${formatMoney(estimate.range.highCents / 100, 0)}`;
}

export function JobResult({ result }: { result: CalculationResult<JobEstimate> }) {
  const estimate = result.value;
  const incomplete = estimate.status === 'incomplete';
  return (
    <div className="calculation-output">
      <PrimaryResult
        label={estimate.rangeLabel}
        value={rangeText(estimate)}
        note={incomplete
          ? `No complete range until these critical materials have a sourced baseline: ${materialList(estimate.unpricedCritical) || 'unknown'}. Labor and priced lines may still be shown.`
          : `Expected ${estimate.range ? formatMoney(estimate.range.expectedCents / 100, 0) : '—'}`}
        tone="amber"
      />
      <ConfidenceChip incomplete={incomplete} level={estimate.confidence} reasons={estimate.confidenceReasons} />
      <StatGrid items={[
        { label: 'Where', value: `${estimate.location.countyName}, ${estimate.location.state}`, note: estimate.geographyNote },
        { label: 'Direct labor', value: formatMoney(estimate.labor.reduce((sum, step) => sum + step.cents, 0) / 100), note: 'OEWS × ECEC loading' },
        { label: 'Materials', value: formatMoney(estimate.materials.reduce((sum, step) => sum + step.cents, 0) / 100), note: estimate.unpricedCritical.length > 0 ? `Unpriced: ${materialList(estimate.unpricedCritical)}` : 'National baseline × PPI' },
        { label: 'Equipment cost proxy', value: formatMoney(estimate.equipment.reduce((sum, step) => sum + step.cents, 0) / 100), note: estimate.femaProxyNote },
      ]} />
      <ResultDetails
        breakdown={result.breakdown}
        assumptions={result.assumptions}
        calculationVersion={result.calculationVersion}
        datasetSnapshotIds={result.datasetSnapshotIds}
      />
    </div>
  );
}
