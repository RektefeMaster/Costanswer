'use client';

import type { BreakdownStep } from '@/lib/calculations/contracts';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <label className="calc-field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function InputShell({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  return (
    <span className="input-shell">
      {prefix && <span className="input-affix">{prefix}</span>}
      {children}
      {suffix && <span className="input-affix">{suffix}</span>}
    </span>
  );
}

export function CalculatorPanel({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <section className="calculator-panel" aria-labelledby="calculator-title" data-hydrated={hydrated}>
      <div className="calculator-heading">
        <p>YOUR INPUTS</p>
        <h2 id="calculator-title">{title}</h2>
        <span>{intro}</span>
      </div>
      {children}
    </section>
  );
}

export function PrimaryResult({ label, value, note, tone = 'mint' }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className={`primary-result result-${tone}`} aria-live="polite">
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
    </div>
  );
}

export function StatGrid({ items }: { items: Array<{ label: string; value: string; note?: string }> }) {
  return (
    <div className="result-stat-grid">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}

export function ResultDetails({
  breakdown,
  assumptions,
  calculationVersion,
  datasetSnapshotIds,
}: {
  breakdown: BreakdownStep[];
  assumptions: string[];
  calculationVersion: string;
  datasetSnapshotIds: string[];
}) {
  return (
    <div className="result-details">
      <details open>
        <summary>See the math</summary>
        <ol>
          {breakdown.map((step) => (
            <li key={`${step.label}-${step.value}`}>
              <span><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</span>
              <b>{step.value}</b>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>Assumptions & limits</summary>
        <ul>{assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
      <p className="result-audit">
        <span>Method {calculationVersion}</span>
        <span>{datasetSnapshotIds.length > 0 ? `Data ${datasetSnapshotIds.join(', ')}` : 'Data Manual inputs / fixed rules'}</span>
      </p>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return <p className="calc-error" role="alert">{message}</p>;
}
