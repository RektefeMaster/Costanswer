'use client';

import { useMemo, useState } from 'react';
import { calculateBodyFat, type BiologicalSex } from '@/lib/calculations/health';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails } from './CalculatorUI';

export function BodyFatCalculator() {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'us'>('us');
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [height, setHeight] = useState('70');
  const [neck, setNeck] = useState('16');
  const [waist, setWaist] = useState('34');
  const [hip, setHip] = useState('38');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateBodyFat({
          unitSystem,
          sex,
          height: Number(height),
          neck: Number(neck),
          waist: Number(waist),
          hip: sex === 'female' ? Number(hip) : undefined,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [unitSystem, sex, height, neck, waist, hip]);

  const switchUnits = (target: 'us' | 'metric') => {
    if (target === unitSystem) return;
    setUnitSystem(target);
    const convert = (val: string, toMetric: boolean) => {
      const num = Number(val);
      if (!Number.isFinite(num) || num <= 0) return val;
      return toMetric ? String(Math.round(num * 2.54 * 10) / 10) : String(Math.round((num / 2.54) * 10) / 10);
    };
    const toMetric = target === 'metric';
    setHeight((curr) => convert(curr, toMetric));
    setNeck((curr) => convert(curr, toMetric));
    setWaist((curr) => convert(curr, toMetric));
    setHip((curr) => convert(curr, toMetric));
  };

  const suffix = unitSystem === 'metric' ? 'cm' : 'in';

  return (
    <CalculatorPanel
      title="Estimated body-fat percentage"
      intro="U.S. Navy circumference method. Tape measurements, not a clinical scan."
      toolId="body-fat"
      category="health"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([unitSystem, sex, height, neck, waist, hip])}
    >
      <div className="mode-tabs" role="group" aria-label="Unit system">
        <button type="button" aria-pressed={unitSystem === 'us'} className={unitSystem === 'us' ? 'active' : ''} onClick={() => switchUnits('us')}>US</button>
        <button type="button" aria-pressed={unitSystem === 'metric'} className={unitSystem === 'metric' ? 'active' : ''} onClick={() => switchUnits('metric')}>Metric</button>
      </div>
      <div className="mode-tabs" role="group" aria-label="Equation">
        <button type="button" aria-pressed={sex === 'female'} className={sex === 'female' ? 'active' : ''} onClick={() => setSex('female')}>Female equation</button>
        <button type="button" aria-pressed={sex === 'male'} className={sex === 'male' ? 'active' : ''} onClick={() => setSex('male')}>Male equation</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Height" htmlFor="bf-height"><InputShell suffix={suffix}><input id="bf-height" type="number" min="1" step="0.1" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} /></InputShell></Field>
        <Field label="Neck" htmlFor="bf-neck"><InputShell suffix={suffix}><input id="bf-neck" type="number" min="1" step="0.1" inputMode="decimal" value={neck} onChange={(event) => setNeck(event.target.value)} /></InputShell></Field>
        <Field label="Waist" htmlFor="bf-waist"><InputShell suffix={suffix}><input id="bf-waist" type="number" min="1" step="0.1" inputMode="decimal" value={waist} onChange={(event) => setWaist(event.target.value)} /></InputShell></Field>
        {sex === 'female' && (
          <Field label="Hip" htmlFor="bf-hip"><InputShell suffix={suffix}><input id="bf-hip" type="number" min="1" step="0.1" inputMode="decimal" value={hip} onChange={(event) => setHip(event.target.value)} /></InputShell></Field>
        )}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated body-fat percentage" value={`${calculation.result.value.bodyFatPercent.toFixed(1)}%`} note="Circumference estimate, not DEXA." tone="rose" />
          <p className="health-note">Tape site and posture change this number. It is not equivalent to a clinical body-composition test and is not a diagnosis.</p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
