import type { Metadata } from 'next';
import { ProfilePageContent } from '@/components/profile/profile-page-content';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://www.proofexistence.com';

interface PageProps {
  params: Promise<{
    username: string;
    locale: string;
  }>;
}

async function getUserByIdentifier(identifier: string) {
  const { db } = await import('@/db');
  const { users } = await import('@/db/schema');
  const { sql } = await import('drizzle-orm');

  const decoded = decodeURIComponent(identifier);

  const result = await db
    .select({
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(sql`LOWER(${users.username}) = LOWER(${decoded})`)
    .limit(1);

  return result[0] ?? null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username, locale } = await params;
  const user = await getUserByIdentifier(username);

  if (!user) {
    return {
      title: 'Profile Not Found | Proof of Existence',
      description: 'The requested user profile could not be found.',
    };
  }

  const displayName = user.name || user.username || 'Anonymous';
  const title = `${displayName} | Proof of Existence`;
  const description = `View ${displayName}'s light trails and proofs on Proof of Existence.`;
  const profilePath = `/u/${user.username}`;
  const profileUrl =
    locale === defaultLocale
      ? `${BASE_URL}${profilePath}`
      : `${BASE_URL}/${locale}${profilePath}`;

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] =
      l === defaultLocale
        ? `${BASE_URL}${profilePath}`
        : `${BASE_URL}/${l}${profilePath}`;
  }
  languages['x-default'] = `${BASE_URL}${profilePath}`;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: 'POE 2026',
      ...(user.avatarUrl && {
        images: [{ url: user.avatarUrl, alt: displayName }],
      }),
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(user.avatarUrl && { images: [user.avatarUrl] }),
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  return <ProfilePageContent username={username} />;
}
