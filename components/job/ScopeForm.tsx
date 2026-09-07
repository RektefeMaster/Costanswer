'use client';

import { Field, InputShell } from '@/components/calculators/CalculatorUI';
import { jobFormFields, type JobPublicMeta, type ScopeField } from '@/lib/job/catalog';

export function ScopeForm({
  job,
  zip,
  fields,
  modifiers,
  scopeNote,
  quote,
  onZip,
  onField,
  onModifier,
  onQuote,
}: {
  job: JobPublicMeta;
  zip: string;
  fields: Record<string, string>;
  modifiers: Record<string, string>;
  scopeNote?: string;
  quote?: string;
  onZip: (value: string) => void;
  onField: (id: string, value: string) => void;
  onModifier: (id: string, value: string) => void;
  onQuote?: (value: string) => void;
}) {
  const formFields: ScopeField[] = jobFormFields(job);
  return (
    <>
      <div className="calc-form-grid">
        <Field label="ZIP code" htmlFor={`${job.jobId}-zip`} hint="Mapped to county with an approximate ZIP/ZCTA match, not a HUD USPS crosswalk.">
          <InputShell>
            <input id={`${job.jobId}-zip`} inputMode="numeric" maxLength={5} value={zip} onChange={(event) => onZip(event.target.value.replace(/\D/g, '').slice(0, 5))} />
          </InputShell>
        </Field>
        {formFields.map((field) => (
          <Field label={field.label} htmlFor={`${job.jobId}-${field.id}`} hint={field.hint} key={field.id}>
            <InputShell suffix={field.suffix ?? job.unitLabel}>
              <input
                id={`${job.jobId}-${field.id}`}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={fields[field.id] ?? String(field.defaultValue)}
                onChange={(event) => onField(field.id, event.target.value)}
              />
            </InputShell>
          </Field>
        ))}
        {onQuote && (
          <Field label="Contractor quote" htmlFor={`${job.jobId}-quote`}>
            <InputShell prefix="$">
              <input id={`${job.jobId}-quote`} type="number" min="0" step="1" value={quote} onChange={(event) => onQuote(event.target.value)} />
            </InputShell>
          </Field>
        )}
      </div>
      {scopeNote ? <p className="calc-status">{scopeNote}</p> : null}
      {job.modifiers.length > 0 && (
        <div className="calc-form-grid">
          {job.modifiers.map((modifier) => (
            <Field label={modifier.label} htmlFor={`${job.jobId}-${modifier.id}`} key={modifier.id}>
              <span className="input-shell select-shell">
                <select
                  id={`${job.jobId}-${modifier.id}`}
                  value={modifiers[modifier.id] ?? modifier.defaultOptionId}
                  onChange={(event) => onModifier(modifier.id, event.target.value)}
                >
                  {modifier.options.map((option) => (
                    <option value={option.id} key={option.id}>{option.label}</option>
                  ))}
                </select>
              </span>
            </Field>
          ))}
        </div>
      )}
    </>
  );
}
