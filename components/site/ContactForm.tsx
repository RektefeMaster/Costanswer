'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  CONTACT_KINDS,
  composeContactBody,
  composeContactMailto,
  parseContactDraft,
  type ContactKind,
} from '@/lib/contact-message';

const HINTS: Record<ContactKind, string> = {
  correction: 'Paste the Method version and Data snapshot from Technical details. What you typed, what the page showed, and the official table you expected.',
  request: 'What should it calculate, for whom, and which official table if you know one. The closest page already on the site helps.',
  complaint: 'What broke, on which page, and what you expected instead. A URL is enough to start.',
  suggestion: 'Copy, layout, a missing state, a stale source. One change per note is easier to act on.',
};

export function ContactForm({ inboxEmail }: { inboxEmail?: string }) {
  const [kind, setKind] = useState<ContactKind>('request');
  const [message, setMessage] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [methodVersion, setMethodVersion] = useState('');
  const [dataSnapshot, setDataSnapshot] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const parsed = useMemo(
    () => parseContactDraft({
      kind,
      message,
      pageUrl,
      replyEmail,
      methodVersion: kind === 'correction' ? methodVersion : '',
      dataSnapshot: kind === 'correction' ? dataSnapshot : '',
    }),
    [kind, message, pageUrl, methodVersion, dataSnapshot, replyEmail],
  );

  async function copyDraft() {
    if (!parsed.ok) {
      setStatus(null);
      setError(parsed.error);
      return false;
    }
    const body = composeContactBody(parsed.draft);
    try {
      await navigator.clipboard.writeText(body);
      setError(null);
      return true;
    } catch {
      setError(null);
      setStatus(body);
      return false;
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.ok) {
      setStatus(null);
      setError(parsed.error);
      return;
    }
    setError(null);
    if (!inboxEmail) {
      const copied = await copyDraft();
      if (copied) {
        setStatus('There is no public inbox on the site yet. The note is copied so you can keep it until one is listed.');
      }
      return;
    }
    window.location.href = composeContactMailto(inboxEmail, parsed.draft);
    setStatus('If your mail app did not open, copy the note and send it to the address above.');
  }

  const correction = kind === 'correction';

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <fieldset className="contact-kind">
        <legend className="field-label">What is this</legend>
        <div className="contact-kind-options">
          {CONTACT_KINDS.map((entry) => (
            <label key={entry.id}>
              <input
                type="radio"
                name="contact-kind"
                value={entry.id}
                checked={kind === entry.id}
                onChange={() => {
                  setKind(entry.id);
                  setError(null);
                  setStatus(null);
                }}
              />
              {entry.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="contact-form-grid">
        <div className="calc-field">
          <label className="field-label" htmlFor="contact-url">Page URL</label>
          <span className="input-shell">
            <input
              id="contact-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="/everyday/per-diem"
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
            />
          </span>
        </div>
        <div className="calc-field">
          <label className="field-label" htmlFor="contact-reply">Your email, if you want a reply</label>
          <span className="input-shell">
            <input
              id="contact-reply"
              type="email"
              autoComplete="email"
              value={replyEmail}
              onChange={(event) => setReplyEmail(event.target.value)}
            />
          </span>
        </div>
      </div>

      {correction
        ? (
          <div className="contact-form-grid">
            <div className="calc-field">
              <label className="field-label" htmlFor="contact-method">Method version</label>
              <span className="input-shell">
                <input
                  id="contact-method"
                  type="text"
                  autoComplete="off"
                  value={methodVersion}
                  onChange={(event) => setMethodVersion(event.target.value)}
                />
              </span>
            </div>
            <div className="calc-field">
              <label className="field-label" htmlFor="contact-data">Data snapshot</label>
              <span className="input-shell">
                <input
                  id="contact-data"
                  type="text"
                  autoComplete="off"
                  value={dataSnapshot}
                  onChange={(event) => setDataSnapshot(event.target.value)}
                />
              </span>
            </div>
          </div>
        )
        : null}

      <div className="calc-field">
        <label className="field-label" htmlFor="contact-message">The note</label>
        <textarea
          id="contact-message"
          name="message"
          rows={7}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <small>{HINTS[kind]}</small>
      </div>

      {error ? <p className="contact-form-error" role="alert">{error}</p> : null}
      {status ? <p className="contact-form-status" role="status">{status}</p> : null}

      <div className="contact-form-actions">
        <button type="submit">
          {inboxEmail ? 'Open in your mail app' : 'Copy the note'}
        </button>
        {inboxEmail
          ? (
            <button
              type="button"
              className="contact-form-secondary"
              onClick={async () => {
                if (await copyDraft()) setStatus('Copied. Paste it into a message to the address above.');
              }}
            >
              Copy the note
            </button>
          )
          : null}
      </div>
    </form>
  );
}
