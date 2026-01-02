import React from 'react';
import Link from 'next/link';
import { ProofViewer } from '@/components/proof/proof-viewer';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSession(id: string) {
  // In a server component, we can call the DB directly or fetch via absolute URL if needed.
  // However, to keep it simple and consistent with the API logic, let's fetch from the API.
  // Note: For SSR in Next.js, absolute URL is needed.
  // We'll trust the API route we created.

  // Better yet, for a public page, we can just fetch directly from DB to avoid self-request overhead/issues
  // But since we are in "app router", we can fetch data directly.
  // Let's use the API approach for consistency if we wanted client-side fetching,
  // but here we are Server Side.

  // To avoid "localhost" issues in production, let's use the direct DB call pattern here too
  // or just fetch from the client side?
  // Let's go with Client Side fetching for the canvas data to handle the loading state gracefully on the UI
  // OR Server Component fetching for better SEO/Metadata.

  // Let's do Server Component fetching.
  // Re-implementing the DB call here is cleaner than a self-fetch.

  const { db } = await import('@/db');
  const { sessions, users } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    with: {
      // Assuming there's a relation defined in schema (drizzle relations)?
      // If not, we might need manual join or separate fetch if relations aren't set up in schema.ts (they are not visible in the provided schema file view).
      // Given schema.ts didn't show `relations` definitions, we should check if they exist or just fetch user manually.
      // Let's assume no relations map yet, so safe bet is to fetch user separately or use db.select().from().innerJoin().
    },
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
    },
  });

  return { ...session, user };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<import('next').Metadata> {
  const resolvedParams = await params;
  const session = await getSession(resolvedParams.id);

  if (!session) {
    return {
      title: 'Proof Not Found',
      description: 'The requested proof of existence could not be found.',
    };
  }

  const dateStr = new Date(session.createdAt).toLocaleDateString();
  const shortId = session.id.slice(0, 8);
  const ogUrl = new URL('https://proofexistence.com/api/og');

  const displayTitle = session.title || `Proof #${shortId}`;

  ogUrl.searchParams.set('title', displayTitle);
  ogUrl.searchParams.set('date', dateStr);
  ogUrl.searchParams.set('id', session.id);

  if (session.previewUrl) {
    ogUrl.searchParams.set('image', session.previewUrl);
  }
  if (session.user) {
    const authorName = session.user.name || session.user.username || 'Anonymous';
    ogUrl.searchParams.set('author', authorName);
  }
  if (session.duration) {
    ogUrl.searchParams.set('duration', session.duration.toString());
  }
  if (session.message) {
    ogUrl.searchParams.set('message', session.message.slice(0, 100));
  }
  if (session.status) {
    ogUrl.searchParams.set('status', session.status);
  }

  const imageUrl = ogUrl.toString();
  const description =
    session.description ||
    `Verified immutable proof stored on Arweave. Created at ${dateStr}.`;

  const title = `${displayTitle} | Proof of Existence`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: displayTitle,
      description: description,
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
    },
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

  // Debug: Ensure we have data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session.trailData || (session.trailData as any[]).length === 0) {
    console.warn('[ProofPage] No trail data found!');
  }

  // Fetch Arweave Metadata if available
  let nftImage: string | null = null;
  let isSyncing = false;

  if (session.ipfsHash) {
    try {
      // Use Irys Gateway for speed
      const metadataUrl = `https://gateway.irys.xyz/${session.ipfsHash}`;
      // Set timeout to avoid hanging if gateway is slow
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(metadataUrl, {
        signal: controller.signal,
        next: { revalidate: 60 }, // Cache for 60s
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const metadata = await response.json();
        if (metadata.image) {
          // Resolve ar:// to gateway
          nftImage = metadata.image
            .replace('ar://', 'https://gateway.irys.xyz/')
            .replace('https://arweave.net/', 'https://gateway.irys.xyz/');
        }
      } else {
        // If 404 or other error, likely still propagating
        isSyncing = true;
      }
    } catch (error) {
      console.warn('Failed to fetch Arweave metadata:', error);
      isSyncing = true;
    }
  }

  return (
    <ProofViewer
      session={{ ...session, color: session.color || undefined }}
      nftImage={nftImage}
      isSyncing={isSyncing}
    />
  );
}
