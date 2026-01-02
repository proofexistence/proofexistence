import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { checkRateLimit } from '@/lib/ratelimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Toggle session visibility (hidden/visible)
 * Only the session owner can toggle visibility
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get wallet address from header
    const rawWalletAddress = req.headers.get('X-Wallet-Address');
    if (!rawWalletAddress) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Normalize wallet address
    let walletAddress: string;
    try {
      walletAddress = ethers.getAddress(rawWalletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Rate limit
    const rateLimit = await checkRateLimit(`visibility:${walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get the session with user info
    const session = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        hidden: sessions.hidden,
        userWallet: users.walletAddress,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session.length) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    if (session[0].userWallet?.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Not authorized to modify this session' },
        { status: 403 }
      );
    }

    // Parse request body for the new hidden value
    const body = await req.json();
    const newHidden = body.hidden === true ? 1 : 0;

    // Update the session
    const [updated] = await db
      .update(sessions)
      .set({ hidden: newHidden })
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id, hidden: sessions.hidden });

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error('[Session Visibility] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
