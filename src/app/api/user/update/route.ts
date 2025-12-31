import { db } from '@/db';
import { users } from '@/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, ilike, and, ne } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Update user profile in DB
 *
 * Only handles DB fields:
 * - username (unique)
 * - name (display name)
 *
 * Clerk fields (firstName, lastName, profileImage) are updated
 * directly from the client via Clerk SDK.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const walletAddress = (clerkUser.publicMetadata as Record<string, unknown>)
      ?.walletAddress as string;

    if (!walletAddress) {
      return NextResponse.json({ error: 'No wallet linked' }, { status: 400 });
    }

    const body = await req.json();
    const { username, name } = body;

    console.log('[User Update] Request:', {
      userId,
      walletAddress,
      username,
      name,
    });

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
    const updateData = {
      username: newUsername,
      name: name !== undefined ? name || null : existingUser.name,
    };

    console.log('[User Update] Updating:', {
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

    console.log('[User Update] Result:', result[0]);

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
