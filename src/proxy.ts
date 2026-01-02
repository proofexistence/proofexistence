import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling request processing
 *
 * With Web3Auth, authentication is handled client-side and via API route headers.
 * This middleware is kept minimal - protection happens in API routes via getCurrentUser().
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  // Pass through all requests - auth is handled at the API route level
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (except cron)
    '/(api(?!/cron)|trpc)(.*)',
  ],
};
