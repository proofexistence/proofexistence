import { NextRequest, NextResponse } from 'next/server';
import { checkAndAwardEarlyAdopterBadge } from '@/lib/badges/check-early-adopter';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Manual trigger endpoint to award badges
 *
 * Usage:
 * GET /api/badges/award?type=early-adopter
 *
 * Protected by admin authentication
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate User
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Authorize (Check Admin Status)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: {
        isAdmin: true,
      },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Not an admin' },
        { status: 403 }
      );
    }

    const type = new URL(req.url).searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Missing type parameter. Use ?type=early-adopter' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'early-adopter': {
        const results = await checkAndAwardEarlyAdopterBadge();
        return NextResponse.json({
          success: true,
          badge: 'early-adopter-top-100',
          results,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown badge type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in badge award API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
