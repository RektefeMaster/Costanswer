'use client';

import { useMemo, useState } from 'react';
import {
  ACTIVITY_FACTORS,
  ACTIVITY_LEVELS,
  calculateBmr,
  calculateCalorie,
  calculateTdee,
  type ActivityLevel,
  type BiologicalSex,
  type CalorieGoal,
} from '@/lib/calculations/health';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

function EnergyFields({
  unitSystem,
  setUnitSystem,
  sex,
  setSex,
  age,
  setAge,
  weight,
  setWeight,
  height,
  setHeight,
  activity,
  setActivity,
  showActivity = true,
}: {
  unitSystem: 'metric' | 'us';
  setUnitSystem: (value: 'metric' | 'us') => void;
  sex: BiologicalSex;
  setSex: (value: BiologicalSex) => void;
  age: string;
  setAge: (value: string) => void;
  weight: string;
  setWeight: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  activity: ActivityLevel;
  setActivity: (value: ActivityLevel) => void;
  showActivity?: boolean;
}) {
  return (
    <>
      <div className="mode-tabs" role="group" aria-label="Unit system">
        <button type="button" aria-pressed={unitSystem === 'us'} className={unitSystem === 'us' ? 'active' : ''} onClick={() => setUnitSystem('us')}>US</button>
        <button type="button" aria-pressed={unitSystem === 'metric'} className={unitSystem === 'metric' ? 'active' : ''} onClick={() => setUnitSystem('metric')}>Metric</button>
      </div>
      <div className="mode-tabs compact-grid" role="group" aria-label="Sex used by the equation">
        <button type="button" aria-pressed={sex === 'female'} className={sex === 'female' ? 'active' : ''} onClick={() => setSex('female')}>Female equation</button>
        <button type="button" aria-pressed={sex === 'male'} className={sex === 'male' ? 'active' : ''} onClick={() => setSex('male')}>Male equation</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Age" htmlFor="energy-age" hint="Adult estimate, 18–80">
          <InputShell suffix="years">
            <input id="energy-age" type="number" min="18" max="80" step="1" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Weight" htmlFor="energy-weight">
          <InputShell suffix={unitSystem === 'metric' ? 'kg' : 'lb'}>
            <input id="energy-weight" type="number" min="20" step="0.1" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Height" htmlFor="energy-height">
          <InputShell suffix={unitSystem === 'metric' ? 'cm' : 'in'}>
            <input id="energy-height" type="number" min="50" step="0.1" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} />
          </InputShell>
        </Field>
        {showActivity && (
          <Field label="Activity" htmlFor="energy-activity">
            <span className="input-shell select-shell">
              <select id="energy-activity" value={activity} onChange={(event) => setActivity(event.target.value as ActivityLevel)}>
                {ACTIVITY_LEVELS.map((level) => (
                  <option value={level} key={level}>{ACTIVITY_FACTORS[level].label} ({ACTIVITY_FACTORS[level].factor})</option>
                ))}
              </select>
            </span>
          </Field>
        )}
      </div>
    </>
  );
}

function useEnergyState() {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'us'>('metric');
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [age, setAge] = useState('30');
  const [weight, setWeight] = useState('80');
  const [height, setHeight] = useState('180');
  const [activity, setActivity] = useState<ActivityLevel>('sedentary');
  return { unitSystem, setUnitSystem, sex, setSex, age, setAge, weight, setWeight, height, setHeight, activity, setActivity };
}

export function BmrCalculator() {
  const state = useEnergyState();
  const calculation = useMemo(() => {
    try {
      return { result: calculateBmr({ unitSystem: state.unitSystem, sex: state.sex, ageYears: Number(state.age), weight: Number(state.weight), height: Number(state.height), activity: state.activity }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [state.unitSystem, state.sex, state.age, state.weight, state.height, state.activity]);

  return (
    <CalculatorPanel title="Estimated BMR" intro="Mifflin–St Jeor resting-energy estimate for adults. Activity is not applied here." toolId="bmr" category="health" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([state.unitSystem, state.sex, state.age, state.weight, state.height])}>
      <EnergyFields {...state} showActivity={false} />
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated BMR" value={`${calculation.result.value.bmrKcal.toLocaleString('en-US')} kcal/day`} note="Not a measured metabolic rate." tone="rose" />
          <p className="health-note">This equation is an adult estimate. It is not appropriate as a stand-alone number for children, pregnancy, or clinical care.</p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function TdeeCalculator() {
  const state = useEnergyState();
  const calculation = useMemo(() => {
    try {
      return { result: calculateTdee({ unitSystem: state.unitSystem, sex: state.sex, ageYears: Number(state.age), weight: Number(state.weight), height: Number(state.height), activity: state.activity }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [state.unitSystem, state.sex, state.age, state.weight, state.height, state.activity]);

  return (
    <CalculatorPanel title="Estimated TDEE" intro="BMR × a documented activity factor. The factor is a planning assumption." toolId="tdee" category="health" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([state.unitSystem, state.sex, state.age, state.weight, state.height, state.activity])}>
      <EnergyFields {...state} />
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated TDEE" value={`${calculation.result.value.tdeeKcal.toLocaleString('en-US')} kcal/day`} note={`${ACTIVITY_FACTORS[calculation.result.value.activity].label} × BMR`} tone="rose" />
          <StatGrid items={[
            { label: 'Estimated BMR', value: `${calculation.result.value.bmrKcal.toLocaleString('en-US')} kcal` },
            { label: 'Activity factor', value: String(calculation.result.value.activityFactor) },
          ]} />
          <p className="health-note">Activity multipliers are conventional planning factors, not a measurement of your metabolism.</p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

export function CalorieCalculator() {
  const state = useEnergyState();
  const [goal, setGoal] = useState<CalorieGoal>('maintain');
  const calculation = useMemo(() => {
    try {
      return { result: calculateCalorie({ unitSystem: state.unitSystem, sex: state.sex, ageYears: Number(state.age), weight: Number(state.weight), height: Number(state.height), activity: state.activity, goal }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [state.unitSystem, state.sex, state.age, state.weight, state.height, state.activity, goal]);

  return (
    <CalculatorPanel title="Estimated daily calories" intro="Maintenance calories from TDEE, with an optional small planning offset." toolId="calorie" category="health" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([state.unitSystem, state.sex, state.age, state.weight, state.height, state.activity, goal])}>
      <EnergyFields {...state} />
      <div className="mode-tabs" role="group" aria-label="Calorie goal">
        <button type="button" aria-pressed={goal === 'maintain'} className={goal === 'maintain' ? 'active' : ''} onClick={() => setGoal('maintain')}>Maintain</button>
        <button type="button" aria-pressed={goal === 'lose-slow'} className={goal === 'lose-slow' ? 'active' : ''} onClick={() => setGoal('lose-slow')}>Slow loss (−250)</button>
        <button type="button" aria-pressed={goal === 'gain-slow'} className={goal === 'gain-slow' ? 'active' : ''} onClick={() => setGoal('gain-slow')}>Slow gain (+250)</button>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated daily calories" value={`${calculation.result.value.goalKcal.toLocaleString('en-US')} kcal/day`} note={goal === 'maintain' ? 'Estimated maintenance calories' : 'Includes a small planning offset'} tone="rose" />
          <StatGrid items={[
            { label: 'Maintenance (TDEE)', value: `${calculation.result.value.maintenanceKcal.toLocaleString('en-US')} kcal` },
            { label: 'Estimated BMR', value: `${calculation.result.value.bmrKcal.toLocaleString('en-US')} kcal` },
          ]} />
          <p className="health-note">This is not a diet plan, not a calorie-deficit program, and not for children, pregnancy, or clinical populations.</p>
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
