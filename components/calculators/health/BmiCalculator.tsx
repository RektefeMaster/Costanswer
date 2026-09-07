'use client';

import { useMemo, useState } from 'react';
import { calculateBmi } from '@/lib/calculations/health';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

export function BmiCalculator() {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'us'>('us');
  const [weight, setWeight] = useState('154');
  const [height, setHeight] = useState('69');

  const switchUnits = (target: 'metric' | 'us') => {
    if (target === unitSystem) return;
    setUnitSystem(target);
    const w = Number(weight);
    const h = Number(height);
    if (target === 'metric') {
      setWeight(Number.isFinite(w) && w > 0 ? String(Math.round((w / 2.20462262) * 10) / 10) : '70');
      setHeight(Number.isFinite(h) && h > 0 ? String(Math.round(h * 2.54 * 10) / 10) : '175');
    } else {
      setWeight(Number.isFinite(w) && w > 0 ? String(Math.round(w * 2.20462262 * 10) / 10) : '154');
      setHeight(Number.isFinite(h) && h > 0 ? String(Math.round((h / 2.54) * 10) / 10) : '69');
    }
  };

  const calculation = useMemo(() => {
    try {
      return { result: calculateBmi({ unitSystem, weight: Number(weight), height: Number(height) }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [unitSystem, weight, height]);

  return (
    <CalculatorPanel
      title="Body Mass Index"
      intro="Height and weight in. Estimated BMI out. Adult screening ranges are secondary."
      toolId="bmi"
      category="health"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([unitSystem, weight, height])}
    >
      <div className="mode-tabs" role="group" aria-label="Unit system">
        <button type="button" aria-pressed={unitSystem === 'us'} className={unitSystem === 'us' ? 'active' : ''} onClick={() => switchUnits('us')}>US</button>
        <button type="button" aria-pressed={unitSystem === 'metric'} className={unitSystem === 'metric' ? 'active' : ''} onClick={() => switchUnits('metric')}>Metric</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Weight" htmlFor="bmi-weight">
          <InputShell suffix={unitSystem === 'metric' ? 'kg' : 'lb'}>
            <input id="bmi-weight" type="number" min="0.1" step="0.1" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Height" htmlFor="bmi-height">
          <InputShell suffix={unitSystem === 'metric' ? 'cm' : 'in'}>
            <input id="bmi-height" type="number" min="1" step="0.1" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} />
          </InputShell>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated BMI" value={calculation.result.value.bmi.toFixed(2)} note="Adult formula. Not a diagnosis." tone="rose" />
          <StatGrid items={[
            { label: 'Weight', value: `${calculation.result.value.weightKg.toFixed(1)} kg` },
            { label: 'Height', value: `${calculation.result.value.heightMeters.toFixed(2)} m` },
            { label: 'Adult CDC range', value: calculation.result.value.adultCategoryLabel, note: 'Ages 20+, screening only' },
          ]} />
          <p className="health-note">BMI is a population screening ratio of weight to height. Adult categories come from CDC ranges and do not apply to children. They are not a diagnosis.</p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
