'use client';

import type { ConfidenceLevel } from '@/lib/calculators/depth';
import { ConfidenceChip as ToolConfidenceChip } from '@/components/calculators/CalculatorUI';

export function ConfidenceChip({
  incomplete,
  level,
  reasons,
}: {
  incomplete: boolean;
  level: ConfidenceLevel | null;
  reasons: string[];
}) {
  if (incomplete || level == null) {
    return (
      <p className="confidence-chip confidence-low">
        <span>Incomplete</span>
        <small>Verified material data is not enough for a full CostAnswer estimated range.</small>
      </p>
    );
  }
  const stated = reasons.map((reason) => reason.trim()).filter((reason) => reason.length > 0);
  const [first, ...rest] = stated;
  if (!first) return null;
  return <ToolConfidenceChip level={level} reasons={[first, ...rest]} />;
}
