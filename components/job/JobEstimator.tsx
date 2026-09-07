'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalculatorPanel, InlineError } from '@/components/calculators/CalculatorUI';
import { JOB_CATALOG, jobFormFields, type JobId } from '@/lib/job/catalog';
import { fetchJobEstimate, fetchQuoteCheck } from '@/lib/job/client';
import { parseScopeFields, resolveJobScope } from '@/lib/job/scope';
import type { CalculationResult } from '@/lib/calculations/contracts';
import type { JobEstimate, QuoteCheckResult } from '@/lib/job/types';
import { JobResult } from './JobResult';
import { QuoteVerdict } from './QuoteVerdict';
import { ScopeForm } from './ScopeForm';

function defaultModifiers(jobId: JobId): Record<string, string> {
  return Object.fromEntries(JOB_CATALOG[jobId].modifiers.map((modifier) => [modifier.id, modifier.defaultOptionId]));
}

function defaultFields(jobId: JobId): Record<string, string> {
  return Object.fromEntries(jobFormFields(JOB_CATALOG[jobId]).map((field) => [field.id, String(field.defaultValue)]));
}

function isAbort(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
}

export function JobEstimator({ jobId, mode }: { jobId: JobId; mode: 'estimate' | 'quote' }) {
  const job = JOB_CATALOG[jobId];
  const [zip, setZip] = useState('75201');
  const [fields, setFields] = useState(() => defaultFields(jobId));
  const [modifiers, setModifiers] = useState(() => defaultModifiers(jobId));
  const [quote, setQuote] = useState('');
  const [estimate, setEstimate] = useState<CalculationResult<JobEstimate> | null>(null);
  const [check, setCheck] = useState<CalculationResult<QuoteCheckResult> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formJobId, setFormJobId] = useState(jobId);

  if (formJobId !== jobId) {
    setFormJobId(jobId);
    setFields(defaultFields(jobId));
    setModifiers(defaultModifiers(jobId));
    setQuote('');
    setEstimate(null);
    setCheck(null);
    setError('');
    setLoading(false);
  }

  const resolved = useMemo(() => {
    try {
      return resolveJobScope(jobId, parseScopeFields((key) => fields[key]), modifiers);
    } catch {
      return null;
    }
  }, [fields, jobId, modifiers]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ job: jobId, zip });
    for (const [id, value] of Object.entries(fields)) params.set(id, value);
    if (resolved) params.set('units', String(resolved.units));
    for (const [id, value] of Object.entries(modifiers)) params.set(id, value);
    return params;
  }, [fields, jobId, modifiers, resolved, zip]);

  const ready = /^\d{5}$/.test(zip)
    && resolved != null
    && Number.isFinite(resolved.units)
    && resolved.units >= job.scope.min
    && resolved.units <= job.scope.max
    && jobFormFields(job).every((field) => {
      const value = Number(fields[field.id]);
      return Number.isFinite(value) && value >= field.min && value <= field.max;
    });

  useEffect(() => {
    if (!ready || !resolved) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const quoteModeReady = mode === 'quote' && quote.trim() !== '';
      const run = quoteModeReady
        ? fetchQuoteCheck({
            jobId,
            zip,
            units: resolved.units,
            ...Object.fromEntries(Object.entries(fields).map(([id, value]) => [id, Number(value)])),
            modifiers,
            contractorQuote: Number(quote),
          }, controller.signal)
        : fetchJobEstimate(query, controller.signal);
      void run.then((payload) => {
        if (quoteModeReady) {
          const checked = payload as CalculationResult<QuoteCheckResult>;
          setCheck(checked);
          setEstimate({
            value: checked.value.estimate,
            calculationVersion: checked.calculationVersion,
            datasetSnapshotIds: checked.datasetSnapshotIds,
            breakdown: checked.breakdown,
            assumptions: checked.assumptions,
          });
        } else {
          setEstimate(payload as CalculationResult<JobEstimate>);
          setCheck(null);
        }
        setError('');
      }).catch((caught: unknown) => {
        if (isAbort(caught)) return;
        setError(caught instanceof Error ? caught.message : 'The estimate could not be calculated.');
        setEstimate(null);
        setCheck(null);
      }).finally(() => setLoading(false));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fields, jobId, modifiers, mode, query, quote, ready, resolved, zip]);

  return (
    <CalculatorPanel
      title={mode === 'quote' ? 'Is this quote in our estimated range?' : `What should ${job.shortTitle.toLowerCase()} cost?`}
      intro="ZIP, the quantities you can actually measure, and a few named modifiers. The range is a CostAnswer estimate, not a market quantile."
      toolId={`job-${jobId}`}
      category="home"
      calculationState={error ? 'invalid' : estimate ? 'complete' : 'waiting'}
      calculationSignature={`${query.toString()}|${mode}|${quote}`}
    >
      <ScopeForm
        job={job}
        zip={zip}
        fields={fields}
        modifiers={modifiers}
        scopeNote={resolved?.note}
        quote={mode === 'quote' ? quote : undefined}
        onZip={setZip}
        onField={(id, value) => setFields((current) => ({ ...current, [id]: value }))}
        onModifier={(id, value) => setModifiers((current) => ({ ...current, [id]: value }))}
        onQuote={mode === 'quote' ? setQuote : undefined}
      />
      {loading && <p className="calc-status">Updating the estimate…</p>}
      {error && <InlineError message={error} />}
      {ready && check && <QuoteVerdict result={check.value} />}
      {ready && estimate && <JobResult result={estimate} />}
    </CalculatorPanel>
  );
}
