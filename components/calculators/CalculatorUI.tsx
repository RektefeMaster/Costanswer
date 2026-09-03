'use client';

import type { BreakdownStep } from '@/lib/calculations/contracts';
import { emitAnalyticsEvent } from '@/lib/analytics';
import { parseNumericBound, stepNumberValue } from '@/lib/number-step';
import type { CategoryId } from '@/lib/tool-registry';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

const subscribeToHydration = () => () => undefined;
const clientHydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;
const ToolAnalyticsContext = createContext<{ toolId: string; category: CategoryId } | null>(null);

type ResultDockState = { label: string; value: string; tone: string };
const ResultDockContext = createContext<{ setDock: (state: ResultDockState | null) => void } | null>(null);

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="calc-field">
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function emitInputChange(onChange: InputHTMLAttributes<HTMLInputElement>['onChange'], next: string) {
  if (!onChange) return;
  const target = { value: next } as HTMLInputElement;
  onChange({ target, currentTarget: target } as ChangeEvent<HTMLInputElement>);
}

function stepperName(props: InputHTMLAttributes<HTMLInputElement>) {
  return String(props['aria-label'] ?? props.id ?? 'value').replace(/-/g, ' ');
}

export function InputShell({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const numberInput = isValidElement(child) && child.type === 'input' && (child.props as InputHTMLAttributes<HTMLInputElement>).type === 'number'
    ? child as ReactElement<InputHTMLAttributes<HTMLInputElement>>
    : null;

  if (!numberInput) {
    return (
      <span className="input-shell">
        {prefix && <span className="input-affix">{prefix}</span>}
        {children}
        {suffix && <span className="input-affix">{suffix}</span>}
      </span>
    );
  }

  const props = numberInput.props;
  const step = parseNumericBound(props.step as string | number | undefined) ?? 1;
  const min = parseNumericBound(props.min);
  const max = parseNumericBound(props.max);
  const fallback = parseNumericBound(typeof props.placeholder === 'string' ? props.placeholder : undefined);
  const rawValue = props.value == null ? '' : String(props.value);
  const numericValue = Number(rawValue);
  const hasNumericValue = rawValue.trim() !== '' && Number.isFinite(numericValue);
  const atMin = hasNumericValue && min !== undefined && numericValue <= min;
  const atMax = hasNumericValue && max !== undefined && numericValue >= max;
  const fieldName = stepperName(props);
  const inputMode = props.inputMode ?? (step % 1 === 0 ? 'numeric' : 'decimal');
  const decreaseDisabled = hasNumericValue ? atMin : fallback === undefined;

  return (
    <span className="input-shell with-stepper">
      <button
        type="button"
        className="stepper-btn"
        tabIndex={-1}
        aria-label={`Decrease ${fieldName}`}
        disabled={decreaseDisabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => emitInputChange(props.onChange, stepNumberValue(rawValue, -1, step, min, max, fallback))}
      >
        −
      </button>
      <span className="input-shell-value">
        {prefix && <span className="input-affix">{prefix}</span>}
        {cloneElement(numberInput, { inputMode })}
        {suffix && <span className="input-affix">{suffix}</span>}
      </span>
      <button
        type="button"
        className="stepper-btn"
        tabIndex={-1}
        aria-label={`Increase ${fieldName}`}
        disabled={atMax}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => emitInputChange(props.onChange, stepNumberValue(rawValue, 1, step, min, max, fallback))}
      >
        +
      </button>
    </span>
  );
}

export function CalculatorPanel({
  title,
  intro,
  toolId,
  category,
  calculationState,
  calculationSignature,
  children,
}: {
  title: string;
  intro: string;
  toolId: string;
  category: CategoryId;
  calculationState: 'complete' | 'invalid' | 'waiting';
  calculationSignature: string;
  children: ReactNode;
}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydratedSnapshot, serverHydratedSnapshot);
  const opened = useRef(false);
  const started = useRef(false);
  const lastCompletedSignature = useRef('');

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    emitAnalyticsEvent('tool_opened', { toolId, category });
  }, [toolId, category]);

  useEffect(() => {
    if (!started.current || calculationState !== 'complete' || calculationSignature === lastCompletedSignature.current) return;
    const timeout = window.setTimeout(() => {
      lastCompletedSignature.current = calculationSignature;
      emitAnalyticsEvent('calculation_completed', { toolId, category, resultType: 'valid' });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [calculationState, calculationSignature, toolId, category]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    emitAnalyticsEvent('calculation_started', { toolId, category });
  };

  const [dock, setDock] = useState<ResultDockState | null>(null);
  const dockApi = useMemo(() => ({ setDock }), []);

  return (
    <ToolAnalyticsContext.Provider value={{ toolId, category }}>
      <ResultDockContext.Provider value={dockApi}>
        <section className="calculator-panel" aria-labelledby="calculator-title" data-hydrated={hydrated} onInputCapture={markStarted} onChangeCapture={markStarted}>
          <div className="calculator-heading">
            <p>Your numbers</p>
            <h2 id="calculator-title">{title}</h2>
            <span>{intro}</span>
          </div>
          {children}
          {dock && <ResultDock label={dock.label} value={dock.value} tone={dock.tone} />}
        </section>
      </ResultDockContext.Provider>
    </ToolAnalyticsContext.Provider>
  );
}

function ResultDock({ label, value, tone }: ResultDockState) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const result = document.querySelector('.calculator-panel .primary-result');
    const panel = document.querySelector('.calculator-panel');
    if (!result || !panel) {
      setVisible(false);
      return;
    }

    const update = () => {
      const resultBox = result.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const resultInView = resultBox.top < window.innerHeight * 0.88 && resultBox.bottom > 88;
      const panelInView = panelBox.bottom > 88 && panelBox.top < window.innerHeight;
      setVisible(panelInView && !resultInView);
    };

    const observer = new IntersectionObserver(update, { threshold: [0, 0.25, 0.5, 1] });
    observer.observe(result);
    observer.observe(panel);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, [label, value]);

  return (
    <p className={`result-dock result-${tone}${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

export function PrimaryResult({ label, value, note, tone = 'mint' }: { label: string; value: string; note?: string; tone?: string }) {
  const dock = useContext(ResultDockContext);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dock?.setDock({ label, value, tone });
    return () => dock?.setDock(null);
  }, [dock, label, value, tone]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(`${label}: ${value}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`primary-result result-${tone}`} aria-live="polite">
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
      <button type="button" className="copy-result" onClick={copyResult} aria-label={copied ? 'Result copied' : 'Copy result'}>
        {copied ? 'Copied' : 'Copy'}
      </button>
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
  const analytics = useContext(ToolAnalyticsContext);
  const emitInteraction = (interaction: 'math_toggle' | 'assumptions_toggle') => {
    if (analytics) emitAnalyticsEvent('result_interaction', { ...analytics, interaction });
  };
  return (
    <div className="result-details">
      <details open>
        <summary onClick={() => emitInteraction('math_toggle')}>How we got this</summary>
        <ol>
          {breakdown.map((step, index) => (
            <li key={`${index}-${step.label}-${step.value}`}>
              <span><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</span>
              <b>{step.value}</b>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary onClick={() => emitInteraction('assumptions_toggle')}>What we assumed</summary>
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
