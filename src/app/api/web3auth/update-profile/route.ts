import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, ilike, and, ne } from 'drizzle-orm';
import { ethers } from 'ethers';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Profile update endpoint for external wallet users (MetaMask, etc.)
 * These users don't have an ID token, so we authenticate by wallet address.
 *
 * Security considerations:
 * - Only allows updating non-sensitive profile fields
 * - Rate limited to prevent abuse
 * - User must already exist in DB (created during initial sync)
 *
 * For higher security operations, consider implementing message signing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      walletAddress: rawWalletAddress,
      username,
      name,
      firstName,
      lastName,
      avatarUrl,
    } = body;

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
    const rateLimit = await checkRateLimit(`update-profile:${walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if user exists (must have been created during initial sync)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found. Please reconnect your wallet.' },
        { status: 404 }
      );
    }

    // Validation for username
    if (username !== undefined && username !== null && username !== '') {
      if (username.length > 30) {
        return NextResponse.json(
          { error: 'Username too long (max 30 characters)' },
          { status: 400 }
        );
      }

      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          {
            error:
              'Username can only contain letters, numbers, underscores, and hyphens',
          },
          { status: 400 }
        );
      }
    }

    // Check username uniqueness if changing
    const newUsername =
      username !== undefined ? username || null : existingUser.username;

    if (newUsername && newUsername !== existingUser.username) {
      const conflict = await db.query.users.findFirst({
        where: and(
          ilike(users.username, newUsername),
          ne(users.walletAddress, walletAddress)
        ),
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Username "${newUsername}" is already taken` },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      username: newUsername,
      name: name !== undefined ? name || null : existingUser.name,
    };

    // Include additional profile fields
    if (firstName !== undefined) {
      updateData.firstName = firstName || null;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName || null;
    }
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    console.log('[Web3Auth Update Profile] Updating:', {
      walletAddress,
      from: { username: existingUser.username, name: existingUser.name },
      to: updateData,
    });

    // Update database
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.walletAddress, walletAddress))
      .returning();

    return NextResponse.json({
      success: true,
      user: result[0],
    });
  } catch (error) {
    console.error('[Web3Auth Update Profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
