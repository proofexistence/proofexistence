import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { desc, inArray, eq } from 'drizzle-orm';

export async function getRecentProofs(limit = 50) {
  try {
    const proofs = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        duration: sessions.duration,
        sectorId: sessions.sectorId,
        message: sessions.message,
        views: sessions.views,
        likes: sessions.likes,
        userName: users.name,
        walletAddress: users.walletAddress,
        title: sessions.title,
        previewUrl: sessions.previewUrl,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(inArray(sessions.status, ['MINTED', 'SETTLED', 'PENDING']))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);

    return proofs;
  } catch (error) {
    console.error('Error fetching recent proofs:', error);
    return [];
  }
}
