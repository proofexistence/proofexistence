import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Sync endpoint for external wallet users (MetaMask, etc.)
 * These users don't have an ID token, so we just create/update by wallet address
 *
 * Note: This is less secure than token-based sync because we can't verify
 * that the request actually came from the wallet owner. In the future,
 * we could add message signing verification for enhanced security.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawWalletAddress = body.walletAddress;

    if (!rawWalletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
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

    // Rate limit by wallet address (stricter for unauthenticated requests)
    const rateLimit = await checkRateLimit(`sync-wallet:${walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (existingUser) {
      // Just update lastSeenAt
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.walletAddress, walletAddress));

      return NextResponse.json({
        success: true,
        status: 'updated',
        walletAddress,
      });
    }

    // Create new user with minimal data
    const username = `user_${walletAddress.slice(-8).toLowerCase()}`;
    const referralCode = ethers.id(walletAddress).slice(2, 10);

    // Resolve Referrer (if code provided in cookie)
    let referredByUserId: string | null = null;
    const cookieStore = await cookies();
    const referredByCode = cookieStore.get('referral_code')?.value;

    if (referredByCode) {
      const referrer = await db.query.users.findFirst({
        where: eq(users.referralCode, referredByCode),
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    await db.insert(users).values({
      clerkId: null,
      walletAddress,
      email: null,
      name: null,
      username,
      referralCode,
      referredBy: referredByUserId,
    });

    return NextResponse.json({
      success: true,
      status: 'created',
      walletAddress,
    });
  } catch (error) {
    console.error('[Web3Auth Sync Wallet] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
