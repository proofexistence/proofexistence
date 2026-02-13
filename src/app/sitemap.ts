import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { isNotNull, inArray } from 'drizzle-orm';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://www.proofexistence.com';

function localizedUrl(path: string, locale: string): string {
  const cleanPath = path === '/' ? '' : path;
  if (locale === defaultLocale) return `${BASE_URL}${cleanPath}`;
  return `${BASE_URL}/${locale}${cleanPath}`;
}

function alternatesForPath(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = localizedUrl(path, locale);
  }
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages = [
    { path: '/', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/explore', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/cosmos', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/whitepaper', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/canvas', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/badges', changeFrequency: 'weekly' as const, priority: 0.6 },
    { path: '/brands', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/learn', changeFrequency: 'weekly' as const, priority: 0.7 },
    {
      path: '/supporters',
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: localizedUrl(page.path, defaultLocale),
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: alternatesForPath(page.path),
  }));

  // Dynamic proof pages (SETTLED or MINTED only)
  let proofEntries: MetadataRoute.Sitemap = [];
  try {
    const proofs = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(inArray(sessions.status, ['SETTLED', 'MINTED']));

    proofEntries = proofs.map((proof) => ({
      url: localizedUrl(`/proof/${proof.id}`, defaultLocale),
      lastModified: proof.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: alternatesForPath(`/proof/${proof.id}`),
    }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch proofs:', error);
  }

  // Dynamic user profile pages
  let userEntries: MetadataRoute.Sitemap = [];
  try {
    const publicUsers = await db
      .select({
        username: users.username,
      })
      .from(users)
      .where(isNotNull(users.username));

    userEntries = publicUsers
      .filter((u) => u.username)
      .map((user) => ({
        url: localizedUrl(`/u/${user.username}`, defaultLocale),
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
        alternates: alternatesForPath(`/u/${user.username}`),
      }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch users:', error);
  }

  return [...staticEntries, ...proofEntries, ...userEntries];
}
