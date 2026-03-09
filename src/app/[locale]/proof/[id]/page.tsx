import React from 'react';
import Link from 'next/link';
import { ProofViewer } from '@/components/proof/proof-viewer';
import { normalizeArweaveUrl, getArweaveUrl } from '@/lib/arweave-gateway';
import { locales, defaultLocale } from '@/i18n/config';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

async function getSession(id: string) {
  const { db } = await import('@/db');
  const { sessions, users } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

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

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      username: true,
      name: true,
      walletAddress: true,
      avatarUrl: true,
    },
  });

  return { ...session, user };
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
      try {
        const metadataUrl = getArweaveUrl(session.ipfsHash);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(metadataUrl, {
          signal: controller.signal,
          next: { revalidate: 3600 },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const metadata = await res.json();
          if (metadata.image) {
            imageUrl = normalizeArweaveUrl(metadata.image);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch Arweave metadata for OG:', e);
      }
    }

    // Proxy legacy .webp URLs to fix content-type mismatch (JPEG data served as image/webp)
    if (imageUrl && imageUrl.endsWith('.webp')) {
      imageUrl = `https://www.proofexistence.com/api/image/proxy?url=${encodeURIComponent(imageUrl)}`;
    }

    // Fall back to dynamic OG image only when no preview image exists at all
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
    const baseUrl = 'https://www.proofexistence.com';
    const proofPath = `/proof/${session.id}`;
    const proofUrl =
      resolvedParams.locale === defaultLocale
        ? `${baseUrl}${proofPath}`
        : `${baseUrl}/${resolvedParams.locale}${proofPath}`;

    const languages: Record<string, string> = {};
    for (const l of locales) {
      languages[l] =
        l === defaultLocale
          ? `${baseUrl}${proofPath}`
          : `${baseUrl}/${l}${proofPath}`;
    }
    languages['x-default'] = `${baseUrl}${proofPath}`;

    return {
      title: title,
      description: description,
      alternates: {
        canonical: proofUrl,
        languages,
      },
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

function getCreativeWorkJsonLd(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
) {
  const authorName =
    session.user?.name || session.user?.username || 'Anonymous';
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: session.title || `Proof #${session.id.slice(0, 8)}`,
    description:
      session.description ||
      `An immutable proof of existence on the blockchain.`,
    creator: {
      '@type': 'Person',
      name: authorName,
    },
    dateCreated: new Date(session.createdAt).toISOString(),
    provider: {
      '@type': 'Organization',
      name: 'Proof of Existence',
      url: 'https://www.proofexistence.com',
    },
    ...(session.previewUrl && { image: session.previewUrl }),
    url: `https://www.proofexistence.com/proof/${session.id}`,
  };
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
  const isSyncing = false;

  if (session.ipfsHash) {
    try {
      const metadataUrl = getArweaveUrl(session.ipfsHash);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(metadataUrl, {
        signal: controller.signal,
        next: { revalidate: 60 },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const metadata = await response.json();
        if (metadata.image) {
          nftImage = normalizeArweaveUrl(metadata.image);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Arweave metadata:', error);
      // Gateway may be temporarily unreachable - don't show syncing state
    }
  }

  const jsonLd = getCreativeWorkJsonLd(session);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProofViewer
        session={{ ...session, color: session.color || undefined }}
        nftImage={nftImage}
        isSyncing={isSyncing}
      />
    </>
  );
}
