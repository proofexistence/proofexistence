import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';

export interface SyncUserParams {
  walletAddress: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  referredByCode?: string | null;
}

/**
 * Sync user to database by wallet address (Web3Auth flow)
 * Creates user if doesn't exist, updates lastSeenAt if exists
 */
export async function syncUserToDatabase(params: SyncUserParams) {
  const { walletAddress, email, name, avatarUrl, referredByCode } = params;

  // Normalize wallet address
  const normalizedWallet = ethers.getAddress(walletAddress);

  // Check if user already exists by wallet address
  const existingUser = await db.query.users.findFirst({
    where: eq(users.walletAddress, normalizedWallet),
  });

  if (existingUser) {
    // Update lastSeenAt and optionally email if not set
    await db
      .update(users)
      .set({
        email: email || existingUser.email,
        avatarUrl: avatarUrl || existingUser.avatarUrl,
        lastSeenAt: new Date(),
      })
      .where(eq(users.walletAddress, normalizedWallet));

    return { success: true, status: 'updated', user: existingUser };
  }

  // New user - create record

  // Generate username from email or wallet
  const username = email
    ? email.split('@')[0]
    : `user_${normalizedWallet.slice(-8)}`;

  // Generate Referral Code (Hash of wallet, first 8 chars)
  const referralCode = ethers.id(normalizedWallet).slice(2, 10);

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

  // Insert new user
  const [newUser] = await db
    .insert(users)
    .values({
      walletAddress: normalizedWallet,
      email: email || null,
      name: name || null,
      avatarUrl: avatarUrl || null,
      username: username,
      referralCode: referralCode,
      referredBy: referredByUserId,
    })
    .returning();

  return {
    success: true,
    status: 'created',
    user: newUser,
  };
}
