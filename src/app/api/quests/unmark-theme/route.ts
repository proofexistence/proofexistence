import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import { unmarkTheme } from '@/lib/db/queries/quests';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const { success } = await checkRateLimit(user.walletAddress);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Unmark theme
    const wasUnmarked = await unmarkTheme(user.id);

    return NextResponse.json({
      success: true,
      wasUnmarked,
    });
  } catch (error) {
    console.error('Unmark Theme API Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
