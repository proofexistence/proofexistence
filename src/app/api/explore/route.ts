import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { desc, inArray, eq, and, or, like, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Filters
    const status = searchParams.get('status'); // 'MINTED', 'SETTLED', or 'all'
    const sortBy = searchParams.get('sortBy') || 'recent'; // 'recent', 'popular', 'trending'
    const timeframe = searchParams.get('timeframe'); // '24h', '7d', '30d', 'all'

    // Build where conditions
    const conditions = [];

    // Always exclude hidden sessions from explore
    conditions.push(eq(sessions.hidden, 0));

    // Status filter
    if (status && status !== 'all') {
      conditions.push(eq(sessions.status, status));
    } else {
      conditions.push(
        inArray(sessions.status, ['MINTED', 'SETTLED', 'PENDING'])
      );
    }

    // Timeframe filter
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      conditions.push(gte(sessions.createdAt, startDate));
    }

    // Search filter - search in title, message, and username
    if (search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          like(sessions.title, searchPattern),
          like(sessions.message, searchPattern),
          like(users.name, searchPattern),
          like(users.username, searchPattern)
        )
      );
    }

    // Determine sort order
    let orderByClause;
    switch (sortBy) {
      case 'popular':
        orderByClause = desc(sessions.views);
        break;
      case 'trending':
        // Trending: sort by likes with recent bias
        orderByClause = desc(
          sql`${sessions.likes} * (EXTRACT(EPOCH FROM (NOW() - ${sessions.createdAt})) / 86400 + 1)`
        );
        break;
      case 'recent':
      default:
        orderByClause = desc(sessions.createdAt);
        break;
    }

    // Execute query
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
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count || 0);
    const hasMore = offset + proofs.length < total;

    return NextResponse.json({
      proofs: proofs.map((proof) => ({
        ...proof,
        createdAt: proof.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching explore proofs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proofs' },
      { status: 500 }
    );
  }
}
