/**
 * Spend Off-chain TIME26 Balance API
 *
 * POST - Deduct TIME26 from user's off-chain balance for payments
 *
 * This is used when users choose to pay for Instant Proof with their
 * earned TIME26 rewards instead of wallet balance.
 *
 * The spent amount is tracked in `time26Spent` and will be burned
 * during the daily cron job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatTime26 } from '@/lib/rewards/calculate';

export const dynamic = 'force-dynamic';

interface SpendRequest {
  amount: string; // Amount in wei (as string)
  reason: string; // e.g., "instant_proof", "nft_mint"
  sessionId?: string; // Optional reference
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SpendRequest = await req.json();
    const { amount, reason, sessionId } = body;

    if (!amount || !reason) {
      return NextResponse.json(
        { error: 'Missing amount or reason' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= BigInt(0)) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Get user's current balance
    const [dbUser] = await db
      .select({
        id: users.id,
        time26Balance: users.time26Balance,
      })
      .from(users)
      .where(eq(users.walletAddress, user.walletAddress))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check available balance
    const balance = BigInt(dbUser.time26Balance);

    if (balance < amountBigInt) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          available: balance.toString(),
          availableFormatted: formatTime26(balance.toString()),
          requested: amount,
          requestedFormatted: formatTime26(amount),
        },
        { status: 400 }
      );
    }

    // Deduct from balance and add to pending burn
    await db
      .update(users)
      .set({
        time26Balance: sql`${users.time26Balance} - ${amount}::numeric`,
        time26PendingBurn: sql`${users.time26PendingBurn} + ${amount}::numeric`,
      })
      .where(eq(users.id, dbUser.id));

    // Calculate new balance
    const newBalance = balance - amountBigInt;

    // console.log(
    //   `[SpendBalance] User ${user.walletAddress} spent ${formatTime26(amount)} TIME26 for ${reason}${sessionId ? ` (session: ${sessionId})` : ''}`
    // );

    return NextResponse.json({
      success: true,
      spent: amount,
      spentFormatted: formatTime26(amount),
      reason,
      sessionId,
      newBalance: newBalance.toString(),
      newBalanceFormatted: formatTime26(newBalance.toString()),
    });
  } catch (error) {
    console.error('[SpendBalance API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check available balance for spending
 *
 * Note: With the new model, time26Balance IS the available balance.
 * Spent amounts are deducted immediately and tracked in time26PendingBurn
 * until the cron job burns them on-chain.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [dbUser] = await db
      .select({
        time26Balance: users.time26Balance,
        time26PendingBurn: users.time26PendingBurn,
      })
      .from(users)
      .where(eq(users.walletAddress, user.walletAddress))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      balance: dbUser.time26Balance,
      balanceFormatted: formatTime26(dbUser.time26Balance),
      pendingBurn: dbUser.time26PendingBurn,
      pendingBurnFormatted: formatTime26(dbUser.time26PendingBurn),
    });
  } catch (error) {
    console.error('[SpendBalance API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
