import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { questRewards, users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rewardIds } = await req.json();
    if (!rewardIds || !Array.isArray(rewardIds) || rewardIds.length === 0) {
      return NextResponse.json(
        { error: 'rewardIds array required' },
        { status: 400 }
      );
    }

    // Update status from PENDING to APPROVED
    const updated = await db
      .update(questRewards)
      .set({ status: 'APPROVED' })
      .where(inArray(questRewards.id, rewardIds))
      .returning();

    return NextResponse.json({
      success: true,
      approvedCount: updated.length,
    });
  } catch (error) {
    console.error('Approve rewards error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
