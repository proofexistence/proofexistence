import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/navigation';

/**
 * Proxy for handling request processing (Next.js 16 renamed middleware to proxy)
 *
 * This proxy handles:
 * 1. Internationalization (locale detection and routing)
 * 2. Auth is handled at the API route level via getCurrentUser()
 */
const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /_vercel (Vercel internals)
    // - /monitoring (Sentry tunnel)
    // - Static files (favicon, images, etc.)
    '/((?!api|_next|_vercel|monitoring|.*\\..*).*)',
  ],
};
