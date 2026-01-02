import { NextResponse } from 'next/server';
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
      // Check if anything changed
      const hasChanges =
        (email && email !== existingUser.email) ||
        (name && name !== existingUser.name) ||
        (avatarUrl && avatarUrl !== existingUser.avatarUrl);

      if (hasChanges) {
        const [updated] = await db
          .update(users)
          .set({
            email: email || existingUser.email,
            name: name || existingUser.name,
            avatarUrl: avatarUrl || existingUser.avatarUrl,
            lastSeenAt: new Date(),
          })
          .where(eq(users.walletAddress, walletAddress))
          .returning();

        return NextResponse.json({
          success: true,
          status: 'updated',
          user: updated,
        });
      }

      // No changes, just update lastSeenAt
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

    // Create new user
    const username = email
      ? email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '')
      : `user_${walletAddress.slice(-8).toLowerCase()}`;

    const referralCode = ethers.id(walletAddress).slice(2, 10);

    // Parse name into firstName/lastName if possible
    let firstName: string | null = null;
    let lastName: string | null = null;
    if (name) {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] || null;
      lastName = parts.slice(1).join(' ') || null;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: userId || null, // Store userId like clerkId
        walletAddress,
        email: email || null,
        name: name || null,
        firstName,
        lastName,
        avatarUrl: avatarUrl || null,
        username,
        referralCode,
      })
      .returning();

    console.log('[Web3Auth Sync] Created user:', walletAddress);

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
