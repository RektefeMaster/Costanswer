'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/locales';
import type { MonetizationContext } from '@/lib/monetization/context';
import type { LeadVerticalId } from '@/lib/monetization/policy';
import { activeConsentVersion, renderConsent } from '@/lib/monetization/consent/versions';
import { emitMonetizationEvent } from '@/lib/monetization/events';
import { currentAttribution } from '@/lib/monetization/attribution/capture';
import { UI_STRINGS } from '@/lib/monetization/ui/strings';

/**
 * The lead form.
 *
 * Four things about it are deliberate and worth stating, because each is a
 * place the usual pattern is worse:
 *
 *  - Coverage comes first, and no contact field exists in the DOM until it has
 *    come back positive. A form that collects a phone number and then discovers
 *    there is no buyer has collected it for nothing.
 *  - It knows what the calculator knew. Project size, quality tier and the
 *    estimate range are carried from the page, so the reader is never asked to
 *    retype something they already told us.
 *  - Consent names the partner, is never pre-checked, and the exact rendered
 *    wording is what gets hashed on the server. The version is carried through
 *    so a change while the form is open is caught rather than silently applied.
 *  - The submit key is generated once and reused on every retry, so a double
 *    click and a flaky reconnect produce one lead rather than three.
 */

type Step = 'coverage' | 'no-coverage' | 'project' | 'contact' | 'consent' | 'success' | 'error';

export type LeadFormProps = {
  context: MonetizationContext;
  vertical: LeadVerticalId;
  /** Fields the calculator already knows; these are never asked for again. */
  known?: { zip?: string; size?: number; unit?: string; qualityTier?: string };
};

export function LeadForm({ context, vertical, known }: LeadFormProps) {
  const locale = context.locale;
  const formId = useId();
  const [step, setStep] = useState<Step>('coverage');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [zip, setZip] = useState(known?.zip ?? context.location?.zip ?? '');
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [homeowner, setHomeowner] = useState<'yes' | 'no' | ''>('');
  const [timeframe, setTimeframe] = useState('');
  const [workType, setWorkType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  /*
   * Both of these are impure, so neither may be computed while rendering:
   * React may render this component more than once for a single interaction,
   * and a submit key that changes between renders is exactly the bug this key
   * exists to prevent. They are seeded on first use instead, which is always
   * inside an event handler.
   */
  const startedAt = useRef<number | null>(null);
  const submitKey = useRef<string | null>(null);
  const liveRegion = useRef<HTMLParagraphElement>(null);

  const elapsedMs = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
    return Date.now() - startedAt.current;
  };

  /** One key for the life of this form, so a retry is not a second lead. */
  const idempotencyKey = () => {
    if (submitKey.current === null) {
      submitKey.current = `ca-${crypto.randomUUID().replaceAll('-', '')}`;
    }
    return submitKey.current;
  };

  const consent = useMemo(() => {
    if (!partnerName) return null;
    const version = activeConsentVersion(new Date().toISOString().slice(0, 10));
    return { version, rendered: renderConsent(version, locale, partnerName) };
  }, [partnerName, locale]);

  const t = (key: keyof typeof UI_STRINGS) => UI_STRINGS[key][locale as Locale];

  async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ ok: false }));
    return { ok: response.ok, payload: payload as Record<string, unknown> };
  }

  async function onCheckCoverage(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{5}$/.test(zip.trim())) {
      setError(t('requiredField'));
      return;
    }
    setBusy(true);
    // Seeds the clock the anti-abuse check reads, at the first real interaction.
    startedAt.current ??= Date.now();
    emitMonetizationEvent('lead_coverage_check', {
      pageId: context.pageId, calculatorId: context.calculatorId,
      locale, vertical: context.vertical,
    });
    try {
      const { ok, payload } = await post('/api/monetization/coverage', {
        vertical, zip: zip.trim(), pageId: context.pageId, locale,
      });
      if (!ok || payload.covered !== true) {
        setStep('no-coverage');
        return;
      }
      setPartnerName(String(payload.partnerName ?? ''));
      setStep('project');
      emitMonetizationEvent('lead_form_start', {
        pageId: context.pageId, calculatorId: context.calculatorId,
        locale, vertical: context.vertical,
      });
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!consented) {
      setError(t('consentRequired'));
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError(t('requiredField'));
      return;
    }
    if (!consent) return;

    setBusy(true);
    try {
      const { ok, payload } = await post('/api/monetization/lead', {
        vertical,
        pageId: context.pageId,
        calculatorId: context.calculatorId,
        locale,
        zip: zip.trim(),
        project: {
          type: context.project?.type,
          size: known?.size ?? context.project?.size,
          unit: known?.unit ?? context.project?.unit,
          qualityTier: known?.qualityTier ?? context.project?.qualityTier,
          estimatedLow: context.project?.estimatedLow,
          estimatedHigh: context.project?.estimatedHigh,
        },
        qualification: {
          homeowner: homeowner === '' ? undefined : homeowner === 'yes',
          timeframe: timeframe || undefined,
          workType: workType || undefined,
        },
        contact: {
          firstName: firstName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
        consent: { version: consent.version.version, accepted: true, partnerName },
        website: honeypot,
        elapsedMs: elapsedMs(),
        attribution: { ...currentAttribution(), placement: 'after-result' },
      }, { 'idempotency-key': idempotencyKey() });

      if (!ok) {
        setError(String(payload.error ?? t('errorGeneric')));
        setStep('error');
        return;
      }
      setMessage(String(payload.message ?? ''));
      setStep(payload.disposition === 'no_route' ? 'no-coverage' : 'success');
      emitMonetizationEvent('lead_submit', {
        pageId: context.pageId, calculatorId: context.calculatorId,
        locale, vertical: context.vertical,
      });
    } catch {
      setError(t('errorGeneric'));
      setStep('error');
    } finally {
      setBusy(false);
    }
  }

  /*
   * Enter is submit, on every step.
   *
   * Routing every Enter press to the final submit handler meant pressing it on
   * the project step ran the consent check and showed "tick the box" for a box
   * that is two steps away. Each step handles its own Enter.
   */
  function onFormSubmit(event: React.FormEvent) {
    if (step === 'coverage') return onCheckCoverage(event);
    if (step === 'consent') return onSubmit(event);
    event.preventDefault();
    advance();
    return undefined;
  }

  function advance() {
    setError(null);
    if (step === 'project') {
      setStep('contact');
      return;
    }
    if (step === 'contact') {
      setStep('consent');
      emitMonetizationEvent('lead_consent_view', {
        pageId: context.pageId, calculatorId: context.calculatorId,
        locale, vertical: context.vertical,
        consentVersion: consent?.version.version ?? 'unknown',
      });
      emitMonetizationEvent('lead_form_step_complete', {
        pageId: context.pageId, calculatorId: context.calculatorId,
        locale, vertical: context.vertical, step: 2,
      });
    }
  }

  if (step === 'no-coverage') {
    return (
      <div className="lead-form" role="status">
        <p>{message ?? t('noCoverage')}</p>
        {/* #main-content is the skip-link target the layout already renders,
            so this is a real destination. The previous href pointed at the
            form's generated id, which is on no element. */}
        <a className="lead-back" href="#main-content">{t('backToTool')}</a>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="lead-form lead-success" role="status" aria-live="polite">
        <h3>{t('successHeading')}</h3>
        <p>{message}</p>
        <h4>{t('whatHappensNext')}</h4>
        <p>{t('nextSteps')}</p>
        <p className="lead-estimate-note">{t('estimateVsQuote')}</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={onFormSubmit} noValidate>
      <p ref={liveRegion} className="sr-only" role="status" aria-live="polite">
        {busy ? (step === 'consent' ? t('submitting') : t('checking')) : ''}
      </p>

      {step === 'coverage' && (
        <fieldset>
          <legend>{t('zipLabel')}</legend>
          <label htmlFor={`${formId}-zip`}>{t('zipLabel')}</label>
          <input
            id={`${formId}-zip`}
            name="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            aria-describedby={`${formId}-zip-hint`}
            aria-invalid={error !== null}
            required
          />
          <small id={`${formId}-zip-hint`}>{t('zipHint')}</small>
        </fieldset>
      )}

      {step === 'project' && (
        <fieldset>
          <legend>{t('stepProject')}</legend>

          <label htmlFor={`${formId}-homeowner`}>{t('homeownerLabel')}</label>
          <select id={`${formId}-homeowner`} value={homeowner} onChange={(event) => setHomeowner(event.target.value as 'yes' | 'no' | '')}>
            <option value="">—</option>
            <option value="yes">{t('yes')}</option>
            <option value="no">{t('no')}</option>
          </select>

          <label htmlFor={`${formId}-timeframe`}>{t('timeframeLabel')}</label>
          <select id={`${formId}-timeframe`} value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
            <option value="">—</option>
            <option value="immediately">{t('timeframeImmediately')}</option>
            <option value="within_1_month">{t('timeframeMonth')}</option>
            <option value="within_3_months">{t('timeframeThreeMonths')}</option>
            <option value="within_6_months">{t('timeframeSixMonths')}</option>
            <option value="planning">{t('timeframePlanning')}</option>
          </select>

          <label htmlFor={`${formId}-work-type`}>{t('workTypeLabel')}</label>
          <select id={`${formId}-work-type`} value={workType} onChange={(event) => setWorkType(event.target.value)}>
            <option value="">—</option>
            <option value="repair">{t('workRepair')}</option>
            <option value="replacement">{t('workReplacement')}</option>
            <option value="new_installation">{t('workNew')}</option>
          </select>
        </fieldset>
      )}

      {step === 'contact' && (
        <fieldset>
          <legend>{t('stepContact')}</legend>
          <p className="lead-hint">{t('contactHint')}</p>

          <label htmlFor={`${formId}-first-name`}>{t('firstNameLabel')}</label>
          <input id={`${formId}-first-name`} name="firstName" type="text" autoComplete="given-name"
            value={firstName} onChange={(event) => setFirstName(event.target.value)} />

          <label htmlFor={`${formId}-phone`}>{t('phoneLabel')}</label>
          <input id={`${formId}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel"
            value={phone} onChange={(event) => setPhone(event.target.value)} />

          <label htmlFor={`${formId}-email`}>{t('emailLabel')}</label>
          <input id={`${formId}-email`} name="email" type="email" inputMode="email" autoComplete="email"
            value={email} onChange={(event) => setEmail(event.target.value)} />

          {/* Honeypot. Hidden from people and from assistive technology alike. */}
          <div aria-hidden="true" className="lead-honeypot">
            <label htmlFor={`${formId}-website`}>Website</label>
            <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off"
              value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </div>
        </fieldset>
      )}

      {step === 'consent' && (
        <div className="lead-review">
          {/* What is about to be sent, in front of the person agreeing to send
              it. Asking for consent without showing the details is asking them
              to agree to something they can no longer see. */}
          <p className="lead-review-title">{t('stepContact')}</p>
          <ul>
            {firstName && <li>{firstName}</li>}
            {phone && <li>{phone}</li>}
            {email && <li>{email}</li>}
            <li>{zip}</li>
          </ul>
          <button type="button" className="lead-back-button" onClick={() => setStep('contact')}>
            {t('backLabel')}
          </button>
        </div>
      )}

      {step === 'consent' && consent && (
        <fieldset className="lead-consent">
          <legend>{consent.rendered.heading}</legend>
          <ul>
            {consent.rendered.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <div className="lead-consent-check">
            <input
              id={`${formId}-consent`}
              name="consent"
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              aria-describedby={`${formId}-consent-footnote`}
              required
            />
            <label htmlFor={`${formId}-consent`}>{consent.rendered.checkboxLabel}</label>
          </div>
          <small id={`${formId}-consent-footnote`}>{consent.rendered.footnote}</small>
        </fieldset>
      )}

      {error && <p className="lead-error" role="alert">{error}</p>}

      <div className="lead-actions">
        {step !== 'coverage' && (
          <button type="button" className="lead-back-button" onClick={() => setStep(previousStep(step))}>
            {t('backLabel')}
          </button>
        )}
        {step === 'coverage' && (
          <button type="submit" disabled={busy}>{busy ? t('checking') : t('checkCoverage')}</button>
        )}
        {(step === 'project' || step === 'contact') && (
          <button type="button" onClick={advance}>{t('continueLabel')}</button>
        )}
        {step === 'consent' && (
          <button type="submit" disabled={busy}>{busy ? t('submitting') : t('submitLabel')}</button>
        )}
      </div>
    </form>
  );
}

function previousStep(step: Step): Step {
  switch (step) {
    case 'consent': return 'contact';
    case 'contact': return 'project';
    case 'project': return 'coverage';
    default: return 'coverage';
  }
}
