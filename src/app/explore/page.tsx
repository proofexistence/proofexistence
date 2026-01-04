import { getRecentProofs } from '@/lib/db/queries/get-recent-proofs';
import { ExploreClient } from '@/components/explore/explore-client';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { inArray, sql, and, eq } from 'drizzle-orm';

export const metadata = {
  title: 'Explore | Proof of Existence',
  description: 'Discover the latest verified proofs from around the world.',
};

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
