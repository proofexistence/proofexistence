import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedSessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryWallet = (user.publicMetadata as { walletAddress?: string })
      ?.walletAddress;

    if (!primaryWallet) {
      return NextResponse.json(
        { error: 'No wallet connected' },
        { status: 400 }
      );
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, primaryWallet))
      .limit(1);

    if (!dbUser) {
      // Return empty if user db record not created yet
      return NextResponse.json({ savedSessionIds: [] });
    }

    const saved = await db
      .select({ sessionId: savedSessions.sessionId })
      .from(savedSessions)
      .where(eq(savedSessions.userId, dbUser.id));

    return NextResponse.json({
      savedSessionIds: saved.map((s) => s.sessionId),
    });
  } catch (err) {
    console.error('Error fetching saved sessions:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
