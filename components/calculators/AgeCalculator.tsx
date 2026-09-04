'use client';

import { useMemo, useState } from 'react';
import { calculateAge } from '@/lib/calculations/everyday';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { pluralize } from '@/lib/plural';

export function AgeCalculator({ initialDate }: { initialDate: string }) {
  const [birthDate, setBirthDate] = useState('1990-06-15');
  const [asOfDate, setAsOfDate] = useState(initialDate);

  const calculation = useMemo(() => {
    try {
      return { result: calculateAge({ birthDate, asOfDate }), error: '' };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [birthDate, asOfDate]);

  return (
    <CalculatorPanel title="Exact age" intro="Birth date to a selected as-of date. Calendar days, not clock time." toolId="age" category="everyday" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={`${birthDate}|${asOfDate}`}>
      <div className="calc-form-grid">
        <Field label="Birth date" htmlFor="age-birth"><span className="input-shell"><input id="age-birth" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></span></Field>
        <Field label="As of" htmlFor="age-asof"><span className="input-shell"><input id="age-asof" type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></span></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult
            label="Completed age"
            value={pluralize(calculation.result.value.years, 'year', 'years')}
            note={`${pluralize(calculation.result.value.months, 'month', 'months')}, ${pluralize(calculation.result.value.days, 'day', 'days')}`}
            tone="rose"
          />
          <StatGrid items={[
            { label: 'Total days', value: calculation.result.value.totalDays.toLocaleString('en-US') },
            { label: 'Next birthday', value: calculation.result.value.nextBirthday, note: pluralize(calculation.result.value.daysUntilNextBirthday, 'day', 'days') },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
