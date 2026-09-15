import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { spanishRewritePath } from '@/lib/i18n/routing';
import { localeFromPathname } from '@/lib/i18n/path-locale';
import { LOCALE_HEADER, PATHNAME_HEADER } from '@/lib/i18n/request-locale';

/**
 * Locale is the URL, never the IP, never Accept-Language.
 *
 * This is `proxy.ts`, not `middleware.ts`, for two reasons. It is the Next 16
 * name for the file, which vinext follows. And Vercel compiles a root
 * `middleware.ts` into its own Routing Middleware function — a second, separate
 * bundle that leaves `next/server` external and so crashed every request with
 * ERR_MODULE_NOT_FOUND before the SSR function was ever reached. Vinext already
 * carries this file inside the SSR bundle; the platform copy was both redundant
 * and broken. `proxy.ts` is only picked up through `vercel.json`, which does not
 * point at it.
 *
 * A crawler in Mexico hitting `/salary/registered-nurse/texas` must get the
 * English page. A crawler in Ohio hitting `/es/salario/enfermero-registrado/texas`
 * must get the Spanish page. Switching languages is a link the reader clicks.
 */
export function proxy(request: NextRequest) {
  const locale = localeFromPathname(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  const rewritePath = spanishRewritePath(request.nextUrl.pathname);
  if (rewritePath) {
    const destination = request.nextUrl.clone();
    destination.pathname = rewritePath;
    return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.[a-zA-Z0-9]+$).*)'],
};
