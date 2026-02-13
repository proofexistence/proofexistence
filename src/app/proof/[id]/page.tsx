import React from 'react';
import Link from 'next/link';
import { ProofViewer } from '@/components/proof/proof-viewer';
import { fetchArweaveMetadata } from '@/lib/arweave-gateway';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSession(id: string) {
  const { db } = await import('@/db');
  const { sessions, users, userDailyQuests } = await import('@/db/schema');
  const { eq, and } = await import('drizzle-orm');
  const { getTodayDateString } = await import('@/lib/quests/config');
  const { getTodayTheme } = await import('@/lib/db/queries/quests');

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    columns: {
      id: true,
      userId: true,
      startTime: true,
      duration: true,
      status: true,
      trailData: true,
      createdAt: true,
      txHash: true,
      ipfsHash: true,
      previewUrl: true,
      color: true,
      title: true,
      description: true,
      message: true,
      views: true,
      likes: true,
    },
  });

  if (!session) return null;

  // Manual fetch for user if relation is missing
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      username: true,
      name: true,
      walletAddress: true,
      avatarUrl: true,
    },
  });

  // Check if this session is marked as today's theme by its owner
  // Wrapped in try/catch so quest/theme failures don't break metadata generation
  let isMarkedAsTheme = false;
  let themeName: string | null = null;
  try {
    const today = getTodayDateString();
    const [ownerQuest] = await db
      .select({ themeSessionId: userDailyQuests.themeSessionId })
      .from(userDailyQuests)
      .where(
        and(
          eq(userDailyQuests.userId, session.userId),
          eq(userDailyQuests.date, today)
        )
      )
      .limit(1);

    isMarkedAsTheme = ownerQuest?.themeSessionId === session.id;

    if (isMarkedAsTheme) {
      const theme = await getTodayTheme();
      themeName = theme?.theme || null;
    }
  } catch (e) {
    console.warn('[getSession] Failed to fetch quest/theme info:', e);
  }

  return { ...session, user, themeInfo: { isMarkedAsTheme, themeName } };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<import('next').Metadata> {
  try {
    const resolvedParams = await params;
    const session = await getSession(resolvedParams.id);

    if (!session) {
      return {
        title: 'Proof Not Found',
        description: 'The requested proof of existence could not be found.',
        openGraph: {
          title: 'Proof Not Found',
          description: 'The requested proof of existence could not be found.',
          images: [{ url: '/og-v2.png', width: 1200, height: 630 }],
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Proof Not Found',
          images: ['/og-v2.png'],
        },
      };
    }

    const dateStr = new Date(session.createdAt).toLocaleDateString();
    const shortId = session.id.slice(0, 8);

    const displayTitle = session.title || `Proof #${shortId}`;
    const authorName =
      session.user?.name || session.user?.username || 'Anonymous';

    // Try to get Arweave image, fall back to previewUrl, then /api/og
    let imageUrl = session.previewUrl;
    if (session.ipfsHash) {
      const metadata = await fetchArweaveMetadata(session.ipfsHash, 2000);
      if (metadata?.image) {
        imageUrl = metadata.image;
      }
    }

    // Fall back to dynamic OG image if no direct image available
    if (!imageUrl) {
      const ogUrl = new URL('https://www.proofexistence.com/api/og');
      ogUrl.searchParams.set('title', displayTitle);
      ogUrl.searchParams.set('date', dateStr);
      ogUrl.searchParams.set('id', session.id);
      ogUrl.searchParams.set('author', authorName);
      if (session.duration) {
        ogUrl.searchParams.set('duration', session.duration.toString());
      }
      if (session.message) {
        ogUrl.searchParams.set('message', session.message.slice(0, 100));
      }
      if (session.status) {
        ogUrl.searchParams.set('status', session.status);
      }
      imageUrl = ogUrl.toString();
    }
    const description =
      session.description ||
      `Verified immutable proof stored on Arweave. Created at ${dateStr}.`;
    const title = `${displayTitle} | Proof of Existence`;
    const proofUrl = `https://www.proofexistence.com/proof/${session.id}`;

    return {
      title: title,
      description: description,
      openGraph: {
        title: displayTitle,
        description: description,
        url: proofUrl,
        siteName: 'POE 2026',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: displayTitle,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: displayTitle,
        description: description,
        images: [imageUrl],
        creator: '@Proofexist2006',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Proof of Existence',
      description: 'A Year-Long Collective Art Experiment',
      openGraph: {
        title: 'Proof of Existence',
        description: 'A Year-Long Collective Art Experiment',
        images: [{ url: '/og-v2.png', width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Proof of Existence',
        images: ['/og-v2.png'],
      },
    };
  }
}

export default async function ProofPage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getSession(resolvedParams.id);

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl mb-4">404</h1>
        <p className="text-white/50 mb-8">Proof not found.</p>
        <Link
          href="/"
          className="px-6 py-2 bg-white text-black rounded-full hover:scale-105 transition-transform"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Fetch Arweave Metadata if available
  let nftImage: string | null = null;
  let isSyncing = false;

  if (session.ipfsHash) {
    const metadata = await fetchArweaveMetadata(session.ipfsHash);
    if (metadata) {
      if (metadata.image) {
        nftImage = metadata.image;
      }
    } else {
      isSyncing = true;
    }
  }

  return (
    <ProofViewer
      session={{ ...session, color: session.color || undefined }}
      nftImage={nftImage}
      isSyncing={isSyncing}
      themeInfo={session.themeInfo}
    />
  );
}
