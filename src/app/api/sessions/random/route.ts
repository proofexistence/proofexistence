import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch random sessions that have IPFS hashes (so they have images)
    const randomSessions = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        title: sessions.title,
        message: sessions.message,
        views: sessions.views,
        likes: sessions.likes,
        userName: users.name,
        walletAddress: users.walletAddress,
        trailData: sessions.trailData,
        color: sessions.color,
        previewUrl: sessions.previewUrl,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(
        sql`${sessions.status} IN ('MINTED', 'SETTLED') AND (${sessions.ipfsHash} IS NOT NULL OR ${sessions.previewUrl} IS NOT NULL)`
      )
      .orderBy(sql`RANDOM()`)
      .limit(6);

    return NextResponse.json({
      sessions: randomSessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching random sessions:', error);
    return NextResponse.json({ sessions: [] }, { status: 500 });
  }
}
