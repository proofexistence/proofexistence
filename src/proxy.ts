import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  // Exclude /proof, /api, /_next, /monitoring, and static files from locale routing
  matcher: ['/((?!proof|api|_next|monitoring|.*\\..*).*)'],
};
