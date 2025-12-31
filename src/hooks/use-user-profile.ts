'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { ethers } from 'ethers';

/**
 * Unified user profile data combining Clerk and DB sources
 *
 * From Clerk: firstName, lastName, imageUrl
 * From DB: username, displayName, walletAddress
 */
export interface UserProfile {
  // From Clerk
  clerkId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  email: string | null;

  // From DB
  username: string | null;
  displayName: string | null; // This is the 'name' field in DB
  walletAddress: string;
  referralCode: string | null;

  // Computed
  fullName: string | null; // firstName + lastName
  displayLabel: string; // What to show in UI: displayName > fullName > truncated wallet
}

interface DbProfileResponse {
  user: {
    username: string | null;
    name: string | null;
    walletAddress: string;
    createdAt: string;
    referralCode: string | null;
  } | null;
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Hook to get unified user profile from Clerk + DB
 * - Clerk data is available immediately via useUser()
 * - DB data is fetched via API and cached with React Query
 */
export function useUserProfile() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Parse metadata
  const metadata = clerkUser?.publicMetadata as Record<string, unknown>;
  const rawWalletAddress = metadata?.walletAddress as string | undefined;
  const isExternalWallet = !!metadata?.isExternalWallet;

  // Determine lookup identifier
  let lookupIdentifier: string | undefined;

  if (isExternalWallet && rawWalletAddress) {
    // For external wallets, we MUST trust the address but checksum it locally
    // because Clerk might lowercase it
    try {
      lookupIdentifier = ethers.utils.getAddress(rawWalletAddress);
    } catch {
      // Fallback if checksum fails (unlikely)
      lookupIdentifier = rawWalletAddress;
    }
  } else if (clerkUser?.id) {
    // For OpenFort/Email users, ignore the potentially lowercased address in metadata
    // Use Clerk ID to fetch the authoritative profile from DB
    lookupIdentifier = clerkUser.id;
  }

  // Fetch DB profile data
  const {
    data: dbData,
    isLoading: isDbLoading,
    error: dbError,
    refetch,
  } = useQuery({
    queryKey: ['db-profile', lookupIdentifier],
    queryFn: async (): Promise<DbProfileResponse> => {
      if (!lookupIdentifier) return { user: null };

      const res = await fetch(`/api/profile/${lookupIdentifier}`);

      if (!res.ok) {
        // If profile doesn't exist yet (e.g. new user syncing), return null user
        // so we fall back to Clerk data without error
        if (res.status === 404) {
          return { user: null };
        }

        console.error('[useUserProfile] API error:', res.status);
        throw new Error('Failed to fetch profile');
      }
      const data = await res.json();
      return data;
    },
    enabled: !!lookupIdentifier,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: (failureCount, error) => {
      // Don't retry on 404s (if we were throwing them) or other permanent errors
      if (error.message.includes('404')) return false;
      return failureCount < 3;
    },
  });

  // Combine Clerk + DB data
  const profile: UserProfile | null =
    isClerkLoaded && clerkUser && lookupIdentifier
      ? {
          // From Clerk
          clerkId: clerkUser.id,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          imageUrl: clerkUser.imageUrl || null,
          email: clerkUser.primaryEmailAddress?.emailAddress || null,

          // From DB
          // Prioritize DB data, fallback to checksummed local identifier only if it looks like an address
          username: dbData?.user?.username || null,
          displayName: dbData?.user?.name || null,
          walletAddress:
            dbData?.user?.walletAddress ||
            (isExternalWallet ? lookupIdentifier : '') ||
            '',
          referralCode: dbData?.user?.referralCode || null,

          // Computed
          fullName:
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() || null,
          displayLabel:
            dbData?.user?.name ||
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() ||
            truncateWallet(
              dbData?.user?.walletAddress ||
                (isExternalWallet ? lookupIdentifier : '') ||
                ''
            ),
        }
      : null;

  const result = {
    profile,
    isLoading: !isClerkLoaded || (!!lookupIdentifier && isDbLoading),
    isAuthenticated: isClerkLoaded && !!clerkUser,
    error: dbError,
    refetch,
  };

  return result;
}
