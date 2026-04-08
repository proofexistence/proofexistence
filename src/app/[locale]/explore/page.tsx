import { getRecentProofs } from '@/lib/db/queries/get-recent-proofs';
import { ExploreClient } from '@/components/explore/explore-client';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { inArray, sql, and, eq } from 'drizzle-orm';

import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.explore' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  // Fetch initial proofs server-side
  const proofs = await getRecentProofs(20);

  // Get total count for initial load (exclude hidden sessions)
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(
      and(
        inArray(sessions.status, ['MINTED', 'SETTLED']),
        eq(sessions.hidden, 0)
      )
    );

  const total = Number(totalResult[0]?.count || 0);

  return (
    <ExploreClient
      initialProofs={proofs.map((proof) => ({
        ...proof,
        createdAt: proof.createdAt.toISOString(),
      }))}
      initialTotal={total}
    />
  );
}
