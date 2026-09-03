'use client';

import { useMemo, useState } from 'react';
import { calculateGpa, calculateGrade, DEFAULT_GPA_SCALE } from '@/lib/calculations/education';
import { calculateSquareFootage } from '@/lib/calculations/square-footage';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

type GradeRow = { id: string; name: string; scoreEarned: string; scorePossible: string; weight: string };

export function GradeCalculator() {
  const [items, setItems] = useState<GradeRow[]>([
    { id: 'item-1', name: 'Homework', scoreEarned: '90', scorePossible: '100', weight: '20' },
    { id: 'item-2', name: 'Exam', scoreEarned: '85', scorePossible: '100', weight: '80' },
  ]);
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateGrade({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            scoreEarned: Number(item.scoreEarned),
            scorePossible: Number(item.scorePossible),
            weight: Number(item.weight),
          })),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [items]);

  return (
    <CalculatorPanel title="Weighted grade" intro="Each item is earned ÷ possible, then weighted. The letter scale is an assumption." toolId="grade" category="education" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify(items)}>
      <div className="ingredient-editor grade-editor" role="group" aria-label="Grade items">
        <div className="ingredient-head" aria-hidden="true"><span>Name</span><span>Earned</span><span>Possible</span><span>Weight</span><span /></div>
        {items.map((item, index) => (
          <div className="ingredient-row" key={item.id}>
            <label><span className="sr-only">Item {index + 1} name</span><span className="ingredient-mobile-label" aria-hidden="true">Name</span><input value={item.name} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, name: event.target.value } : row))} /></label>
            <label><span className="sr-only">Item {index + 1} earned</span><span className="ingredient-mobile-label" aria-hidden="true">Earned</span><input id={index === 0 ? 'grade-earned-0' : undefined} type="number" min="0" step="0.1" inputMode="decimal" value={item.scoreEarned} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, scoreEarned: event.target.value } : row))} /></label>
            <label><span className="sr-only">Item {index + 1} possible</span><span className="ingredient-mobile-label" aria-hidden="true">Possible</span><input type="number" min="0.01" step="0.1" inputMode="decimal" value={item.scorePossible} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, scorePossible: event.target.value } : row))} /></label>
            <label><span className="sr-only">Item {index + 1} weight</span><span className="ingredient-mobile-label" aria-hidden="true">Weight</span><input type="number" min="0" step="1" inputMode="decimal" value={item.weight} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, weight: event.target.value } : row))} /></label>
            <button type="button" aria-label={`Remove ${item.name || `item ${index + 1}`}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>×</button>
          </div>
        ))}
        {items.length < 30 && <button className="add-row-button" type="button" onClick={() => setItems((current) => [...current, { id: `item-${current.length + 1}`, name: '', scoreEarned: '100', scorePossible: '100', weight: '10' }])}>+ Add an item</button>}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Calculated grade" value={`${calculation.result.value.percent.toFixed(2)}%`} note={`Assumed letter ${calculation.result.value.letter} on a 90/80/70/60 scale`} tone="coral" />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

type CourseRow = { id: string; name: string; grade: string; credits: string };

export function GpaCalculator() {
  const [courses, setCourses] = useState<CourseRow[]>([
    { id: 'course-a', name: 'Course A', grade: 'A', credits: '3' },
    { id: 'course-b', name: 'Course B', grade: 'B', credits: '3' },
  ]);
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateGpa({
          courses: courses.map((course) => ({
            id: course.id,
            name: course.name,
            grade: course.grade,
            credits: Number(course.credits),
          })),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [courses]);
  const grades = Object.keys(DEFAULT_GPA_SCALE);

  return (
    <CalculatorPanel title="GPA" intro="Courses, letter grades, and credits on a visible 4.0 convenience scale." toolId="gpa" category="education" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify(courses)}>
      <div className="ingredient-editor gpa-editor" role="group" aria-label="Courses">
        <div className="ingredient-head" aria-hidden="true"><span>Course</span><span>Grade</span><span>Credits</span><span /><span /></div>
        {courses.map((course, index) => (
          <div className="ingredient-row" key={course.id}>
            <label><span className="sr-only">Course {index + 1} name</span><span className="ingredient-mobile-label" aria-hidden="true">Course</span><input value={course.name} onChange={(event) => setCourses((current) => current.map((row) => row.id === course.id ? { ...row, name: event.target.value } : row))} /></label>
            <label>
              <span className="sr-only">Course {index + 1} grade</span>
              <span className="ingredient-mobile-label" aria-hidden="true">Grade</span>
              <select value={course.grade} onChange={(event) => setCourses((current) => current.map((row) => row.id === course.id ? { ...row, grade: event.target.value } : row))}>
                {grades.map((grade) => <option value={grade} key={grade}>{grade} ({DEFAULT_GPA_SCALE[grade]})</option>)}
              </select>
            </label>
            <label><span className="sr-only">Course {index + 1} credits</span><span className="ingredient-mobile-label" aria-hidden="true">Credits</span><input id={index === 0 ? 'gpa-credits-0' : undefined} type="number" min="0.01" step="0.5" inputMode="decimal" value={course.credits} onChange={(event) => setCourses((current) => current.map((row) => row.id === course.id ? { ...row, credits: event.target.value } : row))} /></label>
            <span />
            <button type="button" aria-label={`Remove ${course.name || `course ${index + 1}`}`} disabled={courses.length === 1} onClick={() => setCourses((current) => current.filter((row) => row.id !== course.id))}>×</button>
          </div>
        ))}
        {courses.length < 40 && <button className="add-row-button" type="button" onClick={() => setCourses((current) => [...current, { id: `course-${current.length + 1}`, name: '', grade: 'B', credits: '3' }])}>+ Add a course</button>}
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="GPA" value={calculation.result.value.gpa.toFixed(2)} note="Unweighted 4.0 convenience scale" tone="coral" />
          <StatGrid items={[
            { label: 'Quality points', value: String(calculation.result.value.qualityPoints) },
            { label: 'Credits', value: String(calculation.result.value.totalCredits) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}

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
