import { JOB_CATALOG, isJobId } from '@/lib/job/catalog';
import { calculateJobEstimate } from '@/lib/job/estimate';
import { locateJobZip } from '@/lib/job/location';
import { parseScopeFields, toJobEstimateInput } from '@/lib/job/scope';
import { loadJobDatasets } from '@/lib/job/server-datasets';

const ZIP = /^\d{5}$/;
const CACHE_CONTROL = 'private, no-store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job') ?? '';
  const zip = (url.searchParams.get('zip') ?? '').trim();
  if (!isJobId(jobId)) {
    return Response.json({ error: 'Unknown job.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  if (!ZIP.test(zip)) {
    return Response.json({ error: 'Enter a five-digit ZIP code.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  const location = locateJobZip(zip);
  if (!location) {
    return Response.json({ error: 'That ZIP is not in the ZCTA file. PO-box-only ZIPs have no match.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  const meta = JOB_CATALOG[jobId];
  const modifiers: Record<string, string> = {};
  for (const modifier of meta.modifiers) {
    const selected = url.searchParams.get(modifier.id) ?? modifier.defaultOptionId;
    if (!modifier.options.some((option) => option.id === selected)) {
      return Response.json({ error: `Unknown ${modifier.label} option.` }, { status: 400, headers: { 'cache-control': 'no-store' } });
    }
    modifiers[modifier.id] = selected;
  }

  let input;
  try {
    input = toJobEstimateInput(jobId, zip, modifiers, parseScopeFields((key) => url.searchParams.get(key)));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Check the job quantities.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  const datasets = await loadJobDatasets(jobId, location.state, location.countyGeoid.slice(0, 2), url.origin);
  const result = calculateJobEstimate(input, datasets);
  return Response.json(result, { headers: { 'cache-control': CACHE_CONTROL } });
}
