import { JOB_CATALOG, isJobId } from '@/lib/job/catalog';
import { locateJobZip } from '@/lib/job/location';
import { checkJobQuote } from '@/lib/job/quote-check';
import { parseScopeFields, toJobEstimateInput } from '@/lib/job/scope';
import { loadJobDatasets } from '@/lib/job/server-datasets';

const ZIP = /^\d{5}$/;

function readBodyField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  return undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Send a JSON body.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  const record = body as Record<string, unknown>;
  const jobId = typeof record.jobId === 'string' ? record.jobId : '';
  const zip = typeof record.zip === 'string' ? record.zip.trim() : '';
  const quoteDollars = Number(record.contractorQuote);
  if (!isJobId(jobId)) return Response.json({ error: 'Unknown job.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  if (!ZIP.test(zip)) return Response.json({ error: 'Enter a five-digit ZIP code.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  const location = locateJobZip(zip);
  if (!location) {
    return Response.json({ error: 'That ZIP is not in the ZCTA file. PO-box-only ZIPs have no match.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  if (!Number.isFinite(quoteDollars) || quoteDollars < 0) {
    return Response.json({ error: 'Enter the contractor quote in dollars.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  const meta = JOB_CATALOG[jobId];
  const modifiers: Record<string, string> = {};
  const incoming = record.modifiers && typeof record.modifiers === 'object' ? record.modifiers as Record<string, unknown> : {};
  for (const modifier of meta.modifiers) {
    const raw = incoming[modifier.id];
    const selected = typeof raw === 'string' ? raw : modifier.defaultOptionId;
    if (!modifier.options.some((option) => option.id === selected)) {
      return Response.json({ error: `Unknown ${modifier.label} option.` }, { status: 400, headers: { 'cache-control': 'no-store' } });
    }
    modifiers[modifier.id] = selected;
  }

  let input;
  try {
    input = toJobEstimateInput(jobId, zip, modifiers, parseScopeFields((key) => readBodyField(record, key)));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Check the job quantities.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const datasets = await loadJobDatasets(jobId, location.state, location.countyGeoid.slice(0, 2), new URL(request.url).origin);
  const result = checkJobQuote({
    ...input,
    contractorQuoteCents: Math.round(quoteDollars * 100),
  }, datasets);
  return Response.json(result, { headers: { 'cache-control': 'no-store' } });
}
