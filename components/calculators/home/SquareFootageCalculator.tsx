'use client';

import { useMemo, useState } from 'react';
import { calculateSquareFootage } from '@/lib/calculations/square-footage';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, InlineError, PrimaryResult, ResultDetails } from '../CalculatorUI';

type SpaceRow = { id: string; name: string; length: string; width: string };

export function SquareFootageCalculator() {
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [spaces, setSpaces] = useState<SpaceRow[]>([{ id: 'space-1', name: 'Room', length: '12', width: '10' }]);
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateSquareFootage({
          unit,
          spaces: spaces.map((space) => ({
            id: space.id,
            name: space.name,
            length: Number(space.length),
            width: Number(space.width),
          })),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [unit, spaces]);

  return (
    <CalculatorPanel title="Square footage" intro="Rectangles added together. Metric input converts through the shared conversion engine." toolId="square-footage" category="home" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([unit, spaces])}>
      <div className="mode-tabs" role="group" aria-label="Length unit">
        <button type="button" aria-pressed={unit === 'ft'} className={unit === 'ft' ? 'active' : ''} onClick={() => setUnit('ft')}>Feet</button>
        <button type="button" aria-pressed={unit === 'm'} className={unit === 'm' ? 'active' : ''} onClick={() => setUnit('m')}>Meters</button>
      </div>
      <div className="ingredient-editor area-editor" role="group" aria-label="Spaces">
        <div className="ingredient-head" aria-hidden="true"><span>Name</span><span>Length</span><span>Width</span><span /><span /></div>
        {spaces.map((space, index) => (
          <div className="ingredient-row" key={space.id}>
            <label><span className="sr-only">Space {index + 1} name</span><span className="ingredient-mobile-label" aria-hidden="true">Name</span><input value={space.name} onChange={(event) => setSpaces((current) => current.map((row) => row.id === space.id ? { ...row, name: event.target.value } : row))} /></label>
            <label><span className="sr-only">Space {index + 1} length</span><span className="ingredient-mobile-label" aria-hidden="true">Length</span><input id={index === 0 ? 'area-length-0' : undefined} type="number" min="0.01" step="0.1" inputMode="decimal" value={space.length} onChange={(event) => setSpaces((current) => current.map((row) => row.id === space.id ? { ...row, length: event.target.value } : row))} /></label>
            <label><span className="sr-only">Space {index + 1} width</span><span className="ingredient-mobile-label" aria-hidden="true">Width</span><input type="number" min="0.01" step="0.1" inputMode="decimal" value={space.width} onChange={(event) => setSpaces((current) => current.map((row) => row.id === space.id ? { ...row, width: event.target.value } : row))} /></label>
            <span />
            <button type="button" aria-label={`Remove ${space.name || `space ${index + 1}`}`} disabled={spaces.length === 1} onClick={() => setSpaces((current) => current.filter((row) => row.id !== space.id))}>×</button>
          </div>
        ))}
        {spaces.length < 20 && <button className="add-row-button" type="button" onClick={() => setSpaces((current) => [...current, { id: `space-${current.length + 1}`, name: '', length: '10', width: '10' }])}>+ Add a space</button>}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Total area" value={`${calculation.result.value.totalSquareFeet.toLocaleString('en-US')} ft²`} note={`${calculation.result.value.totalSquareMeters.toLocaleString('en-US')} m²`} tone="amber" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
