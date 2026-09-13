import { calculationErrorMessage } from '@/lib/calculations/error';
import { countiesForLoanLimitState, resolveZipToLoanLimitCounties } from '@/lib/data/loan-limit-lookup';
import { isStateCode } from '@/lib/location/states';
import { FHFA_TERRITORY_NAMES } from '@/lib/data/fhfa-loan-limits-snapshot';

const CACHE_CONTROL = 'public, max-age=600';

function isLoanLimitState(value: string): boolean {
  return isStateCode(value) || Object.hasOwn(FHFA_TERRITORY_NAMES, value);
}

/**
 * County list for one state, or the counties a ZIP covers.
 *
 * The FHFA file and the Census ZCTA crosswalk stay on the server. A client
 * that imported either would blow the 150 KiB gzip chunk budget.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const zip = url.searchParams.get('zip')?.trim() ?? '';
  const state = url.searchParams.get('state')?.trim().toUpperCase() ?? '';

  try {
    if (zip) {
      return Response.json(
        { resolution: resolveZipToLoanLimitCounties(zip) },
        { headers: { 'cache-control': CACHE_CONTROL } },
      );
    }
    if (state && isLoanLimitState(state)) {
      return Response.json(
        { state, counties: countiesForLoanLimitState(state) },
        { headers: { 'cache-control': CACHE_CONTROL } },
      );
    }
    return Response.json(
      { error: 'Pass a two-letter state code or a five-digit ZIP.' },
      { status: 400, headers: { 'cache-control': CACHE_CONTROL } },
    );
  } catch (error) {
    return Response.json(
      { error: calculationErrorMessage(error) },
      { status: 400, headers: { 'cache-control': CACHE_CONTROL } },
    );
  }
}
