export const CONTACT_KINDS = [
  { id: 'correction', label: 'Wrong figure', subject: 'Wrong figure' },
  { id: 'request', label: 'Calculator I want', subject: 'Calculator request' },
  { id: 'complaint', label: 'Something broken', subject: 'Complaint' },
  { id: 'suggestion', label: 'Suggestion', subject: 'Suggestion' },
] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number]['id'];

export type ContactDraft = {
  kind: ContactKind;
  message: string;
  pageUrl?: string;
  methodVersion?: string;
  dataSnapshot?: string;
  replyEmail?: string;
};

export type ContactParseResult =
  | { ok: true; draft: ContactDraft }
  | { ok: false; error: string };

const KIND_IDS = new Set<string>(CONTACT_KINDS.map((kind) => kind.id));
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2_000;
const LINE_MAX = 120;
const URL_MAX = 500;

export function parseContactDraft(input: unknown): ContactParseResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'The note did not have a shape this page can send.' };
  }
  const record = input as Record<string, unknown>;
  const kind = typeof record.kind === 'string' ? record.kind : '';
  if (!KIND_IDS.has(kind)) {
    return { ok: false, error: 'Pick what the note is: a wrong figure, a calculator you want, something broken, or a suggestion.' };
  }

  const message = collapseWhitespace(record.message);
  if (message.length < MESSAGE_MIN) {
    return { ok: false, error: 'Write at least a sentence. Twenty characters is enough to know what you mean.' };
  }
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: 'Keep the note under 2,000 characters. A page URL and the Method line matter more than a long story.' };
  }

  const pageUrl = parseOptionalPageUrl(record.pageUrl);
  if (pageUrl === 'invalid') {
    return { ok: false, error: 'The page URL has to be a path on this site or an http(s) address.' };
  }

  const methodVersion = parseOptionalLine(record.methodVersion, 'Method version');
  if (typeof methodVersion === 'object') return methodVersion;
  const dataSnapshot = parseOptionalLine(record.dataSnapshot, 'Data snapshot');
  if (typeof dataSnapshot === 'object') return dataSnapshot;

  const replyEmail = parseOptionalReplyEmail(record.replyEmail);
  if (replyEmail === 'invalid') {
    return { ok: false, error: 'If you leave a reply address, it has to be an email address.' };
  }

  const draft: ContactDraft = { kind: kind as ContactKind, message };
  if (pageUrl) draft.pageUrl = pageUrl;
  if (methodVersion) draft.methodVersion = methodVersion;
  if (dataSnapshot) draft.dataSnapshot = dataSnapshot;
  if (replyEmail) draft.replyEmail = replyEmail;
  return { ok: true, draft };
}

export function composeContactBody(draft: ContactDraft): string {
  const kind = CONTACT_KINDS.find((entry) => entry.id === draft.kind);
  const lines = [`Kind: ${kind?.subject ?? draft.kind}`];
  if (draft.pageUrl) lines.push(`Page: ${draft.pageUrl}`);
  if (draft.methodVersion) lines.push(`Method: ${draft.methodVersion}`);
  if (draft.dataSnapshot) lines.push(`Data: ${draft.dataSnapshot}`);
  if (draft.replyEmail) lines.push(`Reply-to: ${draft.replyEmail}`);
  return `${lines.join('\n')}\n\n${draft.message}`;
}

export function composeContactMailto(to: string, draft: ContactDraft): string {
  const kind = CONTACT_KINDS.find((entry) => entry.id === draft.kind);
  const subject = `CostAnswer: ${kind?.subject ?? 'Note'}`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeContactBody(draft))}`;
}

function collapseWhitespace(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function parseOptionalLine(value: unknown, label: string): string | undefined | ContactParseResult {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > LINE_MAX) {
    return { ok: false, error: `${label} is a short string from Technical details, not a paragraph.` };
  }
  return trimmed;
}

function parseOptionalReplyEmail(value: unknown): string | undefined | 'invalid' {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!EMAIL.test(trimmed) || trimmed.length > LINE_MAX) return 'invalid';
  return trimmed;
}

function parseOptionalPageUrl(value: unknown): string | undefined | 'invalid' {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > URL_MAX) return 'invalid';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    return 'invalid';
  }
  return 'invalid';
}
