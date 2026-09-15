'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';
import { localizedTool } from '@/lib/i18n/tool-copy';
import { siteText } from '@/lib/i18n/site-copy';
import type { BreakdownStep } from '@/lib/calculations/contracts';
import { emitAnalyticsEvent } from '@/lib/analytics';
import {
  compareScenarios,
  confidenceStatement,
  receiptText,
  solveForTarget,
  type CompareRow,
  type ConfidenceLevel,
  type ConfidenceReasons,
  type ReverseSolveResult,
} from '@/lib/calculators/depth';
import { parseNumericBound, stepNumberValue } from '@/lib/number-step';
import type { CategoryId } from '@/lib/categories';
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
/*
 * Write and read are separate contexts on purpose. Putting live `dock` state
 * into the same object PrimaryResult's effect depends on recreates that object
 * on every setDock, which re-runs the effect (cleanup setDock(null) → setDock
 * again) and trips "Maximum update depth exceeded". Setters stay stable;
 * readers subscribe to dock state without poisoning the write path.
 */
const ResultDockWriteContext = createContext<{
  setDock: (state: ResultDockState | null) => void;
  setDockVisible: (visible: boolean) => void;
} | null>(null);
const ResultDockReadContext = createContext<ResultDockState | null>(null);

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  return (
    <div className="calc-field">
      <label className="field-label" htmlFor={htmlFor}>{t(label)}</label>
      {children}
      {hint && <small>{t(hint)}</small>}
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
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const numberInput = isValidElement(child) && child.type === 'input' && (child.props as InputHTMLAttributes<HTMLInputElement>).type === 'number'
    ? child as ReactElement<InputHTMLAttributes<HTMLInputElement>>
    : null;

  if (!numberInput) {
    return (
      <span className="input-shell">
        {prefix && <span className="input-affix">{t(prefix)}</span>}
        {children}
        {suffix && <span className="input-affix">{t(suffix)}</span>}
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
        {prefix && <span className="input-affix">{t(prefix)}</span>}
        {cloneElement(numberInput, { inputMode })}
        {suffix && <span className="input-affix">{t(suffix)}</span>}
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
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const display = localizedTool({ id: toolId, title, shortTitle: title, description: intro, eyebrow: '' }, locale);
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
  const [dockVisible, setDockVisible] = useState(false);
  const dockWrite = useMemo(() => ({ setDock, setDockVisible }), []);

  return (
    <ToolAnalyticsContext.Provider value={{ toolId, category }}>
      <ResultDockWriteContext.Provider value={dockWrite}>
        <ResultDockReadContext.Provider value={dock}>
          <section className={`calculator-panel${dockVisible ? ' dock-visible' : ''}`} aria-labelledby="calculator-title" data-hydrated={hydrated} onInputCapture={markStarted} onChangeCapture={markStarted}>
            <div className="calculator-heading">
              <p>{t("Your numbers")}</p>
              <h2 id="calculator-title">{display.title}</h2>
              <span>{display.description}</span>
            </div>
            {children}
            {dock && <ResultDock label={dock.label} value={dock.value} tone={dock.tone} />}
          </section>
        </ResultDockReadContext.Provider>
      </ResultDockWriteContext.Provider>
    </ToolAnalyticsContext.Provider>
  );
}

function ResultDock({ label, value, tone }: ResultDockState) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const dockWrite = useContext(ResultDockWriteContext);
  const setDockVisible = dockWrite?.setDockVisible;
  const [visible, setVisible] = useState(false);
  const resultInView = useRef(true);
  const panelInView = useRef(true);

  useEffect(() => {
    const result = document.querySelector('.calculator-panel .primary-result');
    const panel = document.querySelector('.calculator-panel');
    /*
     * Nothing to observe means nothing to show, and nothing to reset either:
     * the dock can only be visible because a previous run made it so, and that
     * run's cleanup — below — has already hidden it by the time this line
     * runs. Setting state here as well was a redundant synchronous update
     * inside an effect, which is both a lint error and a wasted render.
     */
    if (!result || !panel) return;

    const sync = () => {
      const next = panelInView.current && !resultInView.current;
      setVisible((current) => (current === next ? current : next));
      setDockVisible?.(next);
    };

    const resultObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      resultInView.current = entry.isIntersecting;
      sync();
    }, { threshold: 0, rootMargin: '-88px 0px -12% 0px' });

    const panelObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      panelInView.current = entry.isIntersecting;
      sync();
    }, { threshold: 0, rootMargin: '-88px 0px 0px 0px' });

    resultObserver.observe(result);
    panelObserver.observe(panel);
    return () => {
      resultObserver.disconnect();
      panelObserver.disconnect();
      setDockVisible?.(false);
      setVisible(false);
    };
  }, [setDockVisible, label, value]);

  return (
    <p className={`result-dock result-${tone}${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <span>{t(label)}</span>
      <strong>{value}</strong>
    </p>
  );
}

export function PrimaryResult({ label, value, note, tone = 'mint' }: { label: string; value: string; note?: string; tone?: string }) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const dockWrite = useContext(ResultDockWriteContext);
  const setDock = dockWrite?.setDock;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDock?.({ label, value, tone });
    return () => setDock?.(null);
  }, [setDock, label, value, tone]);

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
      <p>{t(label)}</p>
      <strong>{value}</strong>
      {note && <span>{t(note)}</span>}
      <button type="button" className="copy-result" onClick={copyResult} aria-label={copied ? t('Result copied') : t('Copy result')}>
        {copied ? t('Copied') : t('Copy')}
      </button>
    </div>
  );
}

export function StatGrid({ items }: { items: Array<{ label: string; value: string; note?: string }> }) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  return (
    <div className="result-stat-grid">
      {items.map((item) => (
        <div key={item.label}>
          <span>{t(item.label)}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{t(item.note)}</small>}
        </div>
      ))}
    </div>
  );
}

type ReceiptProps = {
  breakdown: BreakdownStep[];
  assumptions: string[];
  calculationVersion: string;
  datasetSnapshotIds: string[];
  /** The headline figure, so copied text carries the answer and not only the working. */
  headline?: { label: string; value: string };
  title?: string;
};

/**
 * Breakdown, assumptions, method version and snapshot ids — and a way to take
 * all of it somewhere else.
 *
 * The copy action is the part that matters. A figure pasted into a message on
 * its own has lost the assumptions that make it true, and those are usually
 * exactly what the other person would have disagreed with.
 */
export function CalculationReceipt({
  breakdown,
  assumptions,
  calculationVersion,
  datasetSnapshotIds,
  headline,
  title,
}: ReceiptProps) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const analytics = useContext(ToolAnalyticsContext);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const emitInteraction = (interaction: 'math_toggle' | 'assumptions_toggle') => {
    if (analytics) emitAnalyticsEvent('result_interaction', { ...analytics, interaction });
  };

  const dock = useContext(ResultDockReadContext);
  const resolvedHeadline = headline
    ?? (dock ? { label: dock.label, value: dock.value } : null)
    ?? { label: 'Result', value: breakdown[breakdown.length - 1]?.value ?? '' };

  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const copyReceipt = async () => {
    const text = receiptText({
      title: title ?? 'CostAnswer result',
      headline: resolvedHeadline,
      breakdown,
      assumptions,
      calculationVersion,
      datasetSnapshotIds,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const reportIncorrectResult = async () => {
    const isEs = typeof document !== 'undefined' && (document.documentElement.lang === 'es' || window.location.pathname.startsWith('/es'));
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const toolTitle = title ?? (typeof document !== 'undefined' ? document.title.split('|')[0]?.trim() : 'Calculator');

    // Collect user-entered form inputs from the nearest panel or container
    const inputsGathered: string[] = [];
    if (typeof document !== 'undefined') {
      const root = document.querySelector('.calculator-panel') || document.querySelector('form') || document.querySelector('main');
      if (root) {
        const els = root.querySelectorAll('input:not([type=hidden]), select');
        els.forEach((node) => {
          if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) {
            const hasLabels = 'labels' in node ? (node as HTMLInputElement).labels : null;
            const lbl = hasLabels?.[0]?.innerText
              || node.getAttribute('aria-label')
              || node.name
              || node.id;
            const val = node.value;
            if (lbl && val !== undefined && val !== '') {
              inputsGathered.push(`${lbl.replace(/\s+/g, ' ').trim()}: ${val}`);
            }
          }
        });
      }
    }

    const stepsText = breakdown.map((s) => `  • ${s.label}: ${s.value}${s.detail ? ` (${s.detail})` : ''}`).join('\n');
    const assumptionsText = assumptions.map((a) => `  • ${a}`).join('\n');
    const inputsText = inputsGathered.length > 0 ? inputsGathered.map((i) => `  • ${i}`).join('\n') : '  (Default/standard inputs)';
    const dataSnapshotText = datasetSnapshotIds.length > 0 ? datasetSnapshotIds.join(', ') : 'Manual inputs / fixed rules';

    const subject = isEs
      ? `CostAnswer Reporte: ${toolTitle} (${resolvedHeadline.value})`
      : `CostAnswer Error Report: ${toolTitle} (${resolvedHeadline.value})`;

    const promptText = isEs
      ? '[Por favor describa qué cifra parece incorrecta o qué resultado esperaba aquí]'
      : '[Please describe what looks wrong or what result you expected here]';

    const body = [
      promptText,
      '',
      '=== DIAGNOSTIC REPORT ===',
      `Tool: ${toolTitle}`,
      `URL: ${pageUrl}`,
      `Primary Result: ${resolvedHeadline.label}: ${resolvedHeadline.value}`,
      `Method Version: ${calculationVersion}`,
      `Data Snapshot: ${dataSnapshotText}`,
      '',
      'User Inputs:',
      inputsText,
      '',
      'Calculation Steps:',
      stepsText,
      '',
      'Assumptions:',
      assumptionsText,
    ].join('\n');

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(body);
      }
    } catch {
      // ignore clipboard error
    }

    const mailto = `mailto:hello@costanswer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') {
      window.location.href = mailto;
    }

    setReportStatus(isEs ? 'Abriendo correo a hello@costanswer.com… (Copiado)' : 'Opening email to hello@costanswer.com… (Copied)');
    setTimeout(() => setReportStatus(null), 4000);
  };

  return (
    <div className="result-details">
      <details open>
        <summary onClick={() => emitInteraction('math_toggle')}>{t("How we got this")}</summary>
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
        <summary onClick={() => emitInteraction('assumptions_toggle')}>{t("What we assumed")}</summary>
        <ul>{assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
      {/*
        Version and snapshot ids are what make a result checkable, so they stay
        on the page. Sitting open in the main flow they read as internal QA, so
        they fold away behind a summary anyone who wants them can open.
      */}
      <details className="result-audit-details">
        <summary>{t("Technical details")}</summary>
        <p className="result-audit">
          <span>Method {calculationVersion}</span>
          <span>{datasetSnapshotIds.length > 0 ? `Data ${datasetSnapshotIds.join(', ')}` : 'Data Manual inputs / fixed rules'}</span>
        </p>
        <p className="result-audit-help">
          {locale === 'es-US' ? (
            <>
              ¿Discrepancia en los números? Puedes hacer clic en <em>{t("Report incorrect result")}</em> abajo o escribir a <a href="mailto:hello@costanswer.com">hello@costanswer.com</a> con las líneas de Método y Datos.
            </>
          ) : (
            <>
              Discrepancy in the numbers? You can click <em>{t("Report incorrect result")}</em> below or email <a href="mailto:hello@costanswer.com">hello@costanswer.com</a> with the Method and Data lines.
            </>
          )}
        </p>
      </details>
      <div className="receipt-actions">
        <button type="button" className="receipt-copy" onClick={copyReceipt}>
          {copied ? t('Copied the working') : t('Copy result and working')}
        </button>
        <button
          type="button"
          className="receipt-report"
          onClick={reportIncorrectResult}
          title="Report an incorrect result or formula discrepancy with prefilled diagnostics"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{reportStatus ?? t('Report incorrect result')}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The original name, kept so the fifty-one existing calculators keep working.
 *
 * It is the receipt without a headline; they gain the copy action by being
 * left alone, which is why this is an alias rather than a second component.
 */
export function ResultDetails(props: ReceiptProps) {
  return <CalculationReceipt {...props} />;
}

export function InlineError({ message }: { message: string }) {
  return <p className="calc-error" role="alert">{message}</p>;
}

/*
 * Whether a section is open is state the browser owns, not React, so it is read
 * through `useSyncExternalStore` rather than copied into component state by an
 * effect. That is what keeps the server render and the first client render
 * agreeing: the server snapshot is always "closed", and a reader who opened the
 * section earlier in the session gets it back on the first commit instead of
 * after a second render.
 */
const sessionFlagListeners = new Map<string, Set<() => void>>();

function readSessionFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === 'open';
  } catch {
    // Private mode and blocked site data both throw here. A section that will
    // not remember its state is a much smaller problem than one that crashes.
    return false;
  }
}

function writeSessionFlag(key: string, open: boolean): void {
  try {
    window.sessionStorage.setItem(key, open ? 'open' : 'closed');
  } catch {
    // Nothing to do: the section still opens, it just will not be remembered.
  }
  for (const listener of sessionFlagListeners.get(key) ?? []) listener();
}

function subscribeToSessionFlag(key: string) {
  return (onChange: () => void) => {
    const listeners = sessionFlagListeners.get(key) ?? new Set<() => void>();
    listeners.add(onChange);
    sessionFlagListeners.set(key, listeners);
    return () => {
      listeners.delete(onChange);
      if (listeners.size === 0) sessionFlagListeners.delete(key);
    };
  };
}

/**
 * The inputs past the first few, folded away until asked for.
 *
 * Collapsed by default because a calculator that opens with nineteen fields
 * reads as work rather than an answer. The content is in the DOM either way —
 * a `details` element, not a conditional render — so it stays findable and
 * crawlable while the page still opens on the question the reader came with.
 */
export function AdvancedSection({
  id,
  title,
  hint,
  children,
}: {
  /** Stable within the tool. Used for the session key and the analytics field. */
  id: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const analytics = useContext(ToolAnalyticsContext);
  const key = `costanswer:advanced:${analytics?.toolId ?? 'tool'}:${id}`;
  const subscribe = useMemo(() => subscribeToSessionFlag(key), [key]);
  const getSnapshot = useMemo(() => () => readSessionFlag(key), [key]);
  const open = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const announced = useRef(false);

  return (
    <details
      className="advanced-section"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        writeSessionFlag(key, next);
        // Once per tool view. Reopening the same section is the same intent.
        if (next && !announced.current && analytics) {
          announced.current = true;
          emitAnalyticsEvent('advanced_opened', { ...analytics, section: id });
        }
      }}
    >
      <summary>{t(title)}</summary>
      {hint && <p className="advanced-hint">{t(hint)}</p>}
      <div className="advanced-body">{children}</div>
    </details>
  );
}

/**
 * Two sets of inputs answered side by side, with the difference stated.
 *
 * Naming the delta is the whole point. Two columns of numbers make the reader
 * do the subtraction, and the subtraction is the question they actually had.
 */
export function ScenarioCompare({
  labelA,
  labelB,
  rows,
  caption,
}: {
  labelA: string;
  labelB: string;
  rows: readonly CompareRow[];
  caption?: string;
}) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const analytics = useContext(ToolAnalyticsContext);
  const deltas = useMemo(() => compareScenarios(rows), [rows]);
  const changed = deltas.some((delta) => delta.direction !== 'unchanged');
  const announced = useRef(false);

  useEffect(() => {
    // Rendering the panel is not using it. A reader has compared something only
    // once the two sides actually differ.
    if (!changed || announced.current || !analytics) return;
    announced.current = true;
    emitAnalyticsEvent('compare_used', analytics);
  }, [changed, analytics]);

  return (
    <div className="scenario-compare">
      <table>
        {caption && <caption>{t(caption)}</caption>}
        <thead>
          <tr>
            <th scope="col">{t('Figure')}</th>
            <th scope="col">{t(labelA)}</th>
            <th scope="col">{t(labelB)}</th>
            <th scope="col">{t('Difference')}</th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((delta) => (
            <tr key={delta.label}>
              <th scope="row">{t(delta.label)}</th>
              <td>{delta.a}</td>
              <td>{delta.b}</td>
              <td className={`delta delta-${delta.direction}`}>{delta.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REVERSE_STATUS_TONE: Record<Exclude<ReverseSolveResult['status'], 'solved'>, string> = {
  unreachable: 'reverse-unreachable',
  flat: 'reverse-flat',
  'invalid-range': 'reverse-invalid',
};

/**
 * The calculator run backwards: name the answer, get the input that reaches it.
 *
 * "What salary do I need to take home $5,000 a month" is the question people
 * actually arrive with, and it is the forward calculation with one unknown
 * moved. When no input in range reaches the target the panel says so rather
 * than returning the closest value, because the closest value looks like a
 * yes.
 */
export function ReverseSolve({
  solvedFor,
  targetLabel,
  inputLabel,
  evaluate,
  lower,
  upper,
  tolerance,
  formatInput,
  prefix,
}: {
  /** Field id of the input being solved for. Used for analytics. */
  solvedFor: string;
  targetLabel: string;
  inputLabel: string;
  evaluate: (input: number) => number;
  lower: number;
  upper: number;
  tolerance?: number;
  formatInput: (value: number) => string;
  prefix?: string;
}) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const analytics = useContext(ToolAnalyticsContext);
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<ReverseSolveResult | null>(null);
  const inputId = `reverse-${solvedFor}`;

  const run = () => {
    const parsed = Number(target);
    if (target.trim() === '' || !Number.isFinite(parsed)) {
      setResult({ status: 'invalid-range', reason: t('Enter a target first.') });
      return;
    }
    setResult(solveForTarget({ evaluate, target: parsed, lower, upper, tolerance }));
    if (analytics) emitAnalyticsEvent('reverse_used', { ...analytics, solvedFor });
  };

  return (
    <div className="reverse-solve">
      <Field label={targetLabel} htmlFor={inputId}>
        <InputShell prefix={prefix}>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </InputShell>
      </Field>
      <button type="button" className="reverse-solve-run" onClick={run}>{t('Solve')}</button>
      {result?.status === 'solved' && (
        <p className="reverse-solve-answer" aria-live="polite">
          <span>{t(inputLabel)}</span>
          <strong>{formatInput(result.value)}</strong>
        </p>
      )}
      {result && result.status !== 'solved' && (
        <p className={`reverse-solve-answer ${REVERSE_STATUS_TONE[result.status]}`} aria-live="polite">
          {t(result.reason)}
        </p>
      )}
    </div>
  );
}

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/**
 * A confidence level that always says why.
 *
 * "Medium confidence" alone tells a reader neither what is uncertain nor
 * whether it affects them. The reasons are required by the type, and if they
 * come back empty at runtime — filtered lists do that — this renders nothing,
 * because no reason means there is no claim to make.
 */
export function ConfidenceChip({ level, reasons }: { level: ConfidenceLevel; reasons: ConfidenceReasons }) {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const statement = confidenceStatement(level, reasons);
  if (!statement) return null;
  return (
    <p className={`confidence-chip confidence-${statement.level}`}>
      <span>{t(CONFIDENCE_LABEL[statement.level])}</span>
      <small>{t(statement.reason)}</small>
    </p>
  );
}
