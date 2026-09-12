'use client';

import { useMemo, useState } from 'react';
import { calculateGpa, calculateGrade, DEFAULT_GPA_SCALE } from '@/lib/calculations/education';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, InlineError, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';

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
            scoreEarned: item.scoreEarned,
            scorePossible: item.scorePossible,
            weight: item.weight,
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
            credits: course.credits,
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
