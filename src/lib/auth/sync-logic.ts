import { db } from '@/db';
import { users } from '@/db/schema';
import { openfort } from '@/lib/openfort';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';

export interface SyncUserParams {
  userId: string;
  email?: string | null;
  name?: string | null; // Display name
  imageUrl?: string | null;
  web3Wallet?: string | null; // If they signed up via Wallet
  referredByCode?: string | null; // The referral code (if any)
}

export async function syncUserToDatabase(params: SyncUserParams) {
  const { userId, email, name, web3Wallet, referredByCode } = params;

  // Display name passed from caller (already computed from first/last if needed)
  const displayName = name?.trim() || null;

  // 1. Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (existingUser) {
    // For existing users, only update email and lastSeenAt
    // DO NOT touch username or name - user has full control over these

    await db
      .update(users)
      .set({
        email: email || existingUser.email,
        // DO NOT update name here - user controls it via settings
        lastSeenAt: new Date(),
      })
      .where(eq(users.clerkId, userId));

    // --- REPAIR LOGIC: Ensure Clerk Metadata is in sync ---
    // If user exists in DB but lost their Clerk Metadata, we need to fix it.
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const meta = clerkUser.publicMetadata as {
        openfortPlayerId?: string;
        isExternalWallet?: boolean;
        walletAddress?: string;
      };

      // Determine if they SHOULD be an External Wallet user
      // 1. If passed explicitly via params (web3Wallet)
      // 2. Or if metadata says so
      const isExternal = !!web3Wallet || !!meta.isExternalWallet;

      // CASE 1: External wallet user but metadata not set
      if (isExternal && meta.isExternalWallet !== true) {
        console.log(
          `[Sync] Setting isExternalWallet=true for user ${userId}...`
        );
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...meta,
            isExternalWallet: true,
            walletAddress: web3Wallet || existingUser.walletAddress,
          },
        });
        console.log('[Sync] External wallet metadata set.');
        return { success: true, status: 'updated', user: existingUser };
      }

      // CASE 2: Openfort user missing openfortPlayerId
      if (!isExternal && !meta.openfortPlayerId) {
        console.log(`[Sync] Repairing metadata for user ${userId}...`);

        // 1. Try to find existing player in Openfort
        // Note: list() returns a paginated response. If the user is not in the first batch,
        // we might miss them. Ideally we should search by exact description if API supported it.
        // For now, we scan recent players to recover.
        let playerId: string | undefined;
        try {
          const playerList = await openfort.players.list({
            limit: 100,
          });
          // Exact match
          const match = playerList.data?.find(
            (p) => p.description === `Clerk User: ${userId}`
          );
          playerId = match?.id;
        } catch (searchErr) {
          console.warn(
            '[Sync] Player search failed, will create new',
            searchErr
          );
        }

        let finalAddress = existingUser.walletAddress;

        // 2. If not found, create new (Recover from lost state)
        if (!playerId) {
          console.log('[Sync] Player not found in Openfort. Creating new...');
          const player = await openfort.players.create({
            name: displayName || 'User',
            description: `Clerk User: ${userId}`,
          });
          playerId = player.id;

          // Create Account
          const chainId =
            process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ? 80002 : 137;
          const account = await openfort.accounts.create({
            player: playerId,
            chainId: chainId,
          });

          // Update DB with new address (Since old one is unusable without player ID)
          finalAddress = account.address;
          await db
            .update(users)
            .set({ walletAddress: finalAddress })
            .where(eq(users.clerkId, userId));
        }

        // 3. Update Metadata
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            openfortPlayerId: playerId,
            walletAddress: finalAddress,
            isExternalWallet: false,
          },
        });
        console.log('[Sync] Metadata repaired successfully.');
      }
    } catch (err) {
      console.error('[Sync] Failed to repair user metadata:', err);
      // Don't block the login flow, just log
    }
    // -----------------------------------------------------

    return { success: true, status: 'updated', user: existingUser };
  }

  // 2. Determine Wallet Logic

  let finalWalletAddress: string;
  let openfortPlayerId: string | undefined;
  let isExternalWallet = false;

  if (web3Wallet) {
    // CASE A: User signed up with MetaMask/Web3
    finalWalletAddress = web3Wallet;
    isExternalWallet = true;
  } else {
    // CASE B: Email/Social -> Create Openfort Wallet
    try {
      const player = await openfort.players.create({
        name: displayName || 'User',
        description: `Clerk User: ${userId}`,
      });
      openfortPlayerId = player.id;

      const chainId =
        process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ? 80002 : 137;
      const account = await openfort.accounts.create({
        player: player.id,
        chainId: chainId,
      });

      finalWalletAddress = account.address;
    } catch (err) {
      console.error('[Sync] Openfort creation failed:', err);
      // Fallback: If Openfort fails, we can't create a functional user without a wallet address
      // But we might want to throw or handle gracefully.
      // For now, rethrow to fail the sync.
      throw err;
    }
  }

  // 3. Insert into Database
  // Use first part of email or random string as fallback username
  const username = email ? email.split('@')[0] : `user_${userId.slice(-8)}`;

  // Generate Referral Code (Hash of wallet, first 8 chars)
  // Ensure we have a wallet address (we should by now)
  const codeSource = finalWalletAddress || userId;
  const referralCode = ethers.id(codeSource).slice(2, 10); // keccak256, remove 0x, take 8 chars

  // Resolve Referrer (if code provided)
  let referredByUserId: string | null = null;
  if (referredByCode) {
    const referrer = await db.query.users.findFirst({
      where: eq(users.referralCode, referredByCode),
    });
    if (referrer) {
      referredByUserId = referrer.id;
    }
  }

  // Handle potential duplicate username by appending random slice if needed?
  // For now simple logic.

  // Check if wallet address already exists (account recovery case)
  const existingWalletUser = await db.query.users.findFirst({
    where: eq(users.walletAddress, finalWalletAddress),
  });

  if (existingWalletUser) {
    // Wallet already exists with different clerkId - update to new clerkId (account recovery)
    console.log(
      `[Sync] Wallet ${finalWalletAddress} already exists, updating clerkId from ${existingWalletUser.clerkId} to ${userId}`
    );
    await db
      .update(users)
      .set({
        clerkId: userId,
        email: email || existingWalletUser.email,
        lastSeenAt: new Date(),
      })
      .where(eq(users.walletAddress, finalWalletAddress));

    // Update Clerk Metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        openfortPlayerId: openfortPlayerId,
        walletAddress: finalWalletAddress,
        isExternalWallet: isExternalWallet,
      },
    });

    return {
      success: true,
      status: 'recovered',
      walletAddress: finalWalletAddress,
    };
  }

  await db.insert(users).values({
    clerkId: userId,
    walletAddress: finalWalletAddress,
    email: email || null,
    name: displayName,
    username: username,
    referralCode: referralCode,
    referredBy: referredByUserId,
  });

  // 4. Update Clerk Metadata (Important for client-side checks)
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      openfortPlayerId: openfortPlayerId,
      walletAddress: finalWalletAddress,
      isExternalWallet: isExternalWallet,
    },
  });

  return {
    success: true,
    status: 'created',
    walletAddress: finalWalletAddress,
  };
}
