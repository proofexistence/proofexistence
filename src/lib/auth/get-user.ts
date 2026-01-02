import { headers } from 'next/headers';
import { verifyWeb3AuthToken } from '@/lib/web3auth/verify';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';

export interface AuthenticatedUser {
  id: string; // UUID from DB
  walletAddress: string;
  email: string | null;
  username: string | null;
  name: string | null;
}

/**
 * Get authenticated user from Web3Auth JWT or wallet address header
 *
 * For social login users: Uses Bearer token (ID token from Web3Auth)
 * For external wallet users: Uses X-Wallet-Address header (less secure, but works)
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const headersList = await headers();
  const authHeader = headersList.get('Authorization');
  const walletHeader = headersList.get('X-Wallet-Address');

  let walletAddress: string | null = null;

  // Try Bearer token first (social login users)
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    const verified = await verifyWeb3AuthToken(idToken);

    if (verified) {
      walletAddress = ethers.getAddress(verified.walletAddress);
    }
  }

  // Fallback to wallet address header (external wallet users)
  if (!walletAddress && walletHeader) {
    try {
      walletAddress = ethers.getAddress(walletHeader);
    } catch {
      // Invalid wallet address
      return null;
    }
  }

  if (!walletAddress) {
    return null;
  }

  // Look up user by wallet address
  const user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    walletAddress: user.walletAddress,
    email: user.email,
    username: user.username,
    name: user.name,
  };
}

/**
 * Require authentication - throws if not authenticated
 * Use this in API routes that require a logged-in user
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Get user ID for rate limiting (wallet address)
 */
export async function getRateLimitKey(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get('Authorization');
  const walletHeader = headersList.get('X-Wallet-Address');

  // Try Bearer token first
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    const verified = await verifyWeb3AuthToken(idToken);

    if (verified) {
      return ethers.getAddress(verified.walletAddress);
    }
  }

  // Fallback to wallet header
  if (walletHeader) {
    try {
      return ethers.getAddress(walletHeader);
    } catch {
      return null;
    }
  }

  return null;
}
