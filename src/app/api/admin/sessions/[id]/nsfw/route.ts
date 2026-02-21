import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true, id: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit
    const { success } = await checkRateLimit(currentUser.walletAddress);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await params;
    const { nsfw } = await req.json();

    if (typeof nsfw !== 'boolean') {
      return NextResponse.json(
        { error: 'nsfw must be a boolean' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(sessions)
      .set({
        nsfw,
        nsfwMarkedBy: nsfw ? dbUser.id : null,
        nsfwMarkedAt: nsfw ? new Date() : null,
      })
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id, nsfw: sessions.nsfw });

    if (!updated) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('Admin NSFW toggle error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
