import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Sync Web3Auth user to database
 *
 * Called on every page load to ensure user exists and is up to date.
 * Uses walletAddress as the unique identifier.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, walletAddress: rawWallet, email, name, avatarUrl } = body;

    if (!rawWallet) {
      return NextResponse.json(
        { error: 'Missing walletAddress' },
        { status: 400 }
      );
    }

    // Normalize wallet address
    let walletAddress: string;
    try {
      walletAddress = ethers.getAddress(rawWallet);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Rate limit
    const rateLimit = await checkRateLimit(`sync:${walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (existingUser) {
      // For existing users, only update lastSeenAt
      // DO NOT touch name/avatarUrl - user has full control over these via settings
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.walletAddress, walletAddress));

      return NextResponse.json({
        success: true,
        status: 'unchanged',
        user: existingUser,
      });
    }

    // Generate username from email or wallet
    const username = email
      ? email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '')
      : `user_${walletAddress.slice(-8).toLowerCase()}`;

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

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: userId || null,
        walletAddress,
        email: email || null,
        name: name || null,
        avatarUrl: avatarUrl || null,
        username,
        referralCode,
        referredBy: referredByUserId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      status: 'created',
      user: newUser,
    });
  } catch (error) {
    console.error('[Web3Auth Sync] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
