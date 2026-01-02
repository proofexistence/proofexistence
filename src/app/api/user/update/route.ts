import { db } from '@/db';
import { users } from '@/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, ilike, and, ne } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { verifyWeb3AuthToken } from '@/lib/web3auth/verify';
import { ethers } from 'ethers';

// Feature flag
const USE_WEB3AUTH = process.env.NEXT_PUBLIC_USE_WEB3AUTH === 'true';

/**
 * Update user profile in DB
 *
 * DB fields:
 * - username (unique)
 * - name (display name)
 * - avatarUrl
 */
export async function POST(req: NextRequest) {
  try {
    let walletAddress: string | null = null;

    if (USE_WEB3AUTH) {
      // Web3Auth mode: Check for Bearer token or wallet address header
      const authHeader = req.headers.get('Authorization');
      const walletHeader = req.headers.get('X-Wallet-Address');

      if (authHeader?.startsWith('Bearer ')) {
        const idToken = authHeader.slice(7);
        const verified = await verifyWeb3AuthToken(idToken);
        if (verified) {
          walletAddress = ethers.getAddress(verified.walletAddress);
        }
      }

      // Fallback to wallet address header (for external wallets)
      if (!walletAddress && walletHeader) {
        try {
          walletAddress = ethers.getAddress(walletHeader);
        } catch {
          return NextResponse.json(
            { error: 'Invalid wallet address' },
            { status: 400 }
          );
        }
      }

      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
    } else {
      // Clerk mode
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      walletAddress = (clerkUser.publicMetadata as Record<string, unknown>)
        ?.walletAddress as string;

      if (!walletAddress) {
        return NextResponse.json(
          { error: 'No wallet linked' },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const { username, name, avatarUrl } = body;

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

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

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
    console.error('[User Update] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
