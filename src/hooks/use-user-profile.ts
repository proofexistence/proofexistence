'use client';

import { useQuery } from '@tanstack/react-query';
import { useUserSafe as useUser } from '@/lib/clerk/safe-hooks';
import { useProfile } from '@/hooks/use-profile';
import { ethers } from 'ethers';

// Feature flag - determined at build time
const USE_WEB3AUTH = process.env.NEXT_PUBLIC_USE_WEB3AUTH === 'true';

/**
 * Unified user profile data combining Auth provider and DB sources
 */
export interface UserProfile {
  // Auth provider data
  clerkId: string; // For Web3Auth: empty string (not used)
  imageUrl: string | null;
  email: string | null;

  // From DB
  username: string | null;
  displayName: string | null; // This is the 'name' field in DB
  walletAddress: string;
  referralCode: string | null;

  // Computed
  displayLabel: string; // What to show in UI: displayName > truncated wallet
}

interface DbProfileResponse {
  user: {
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    walletAddress: string;
    createdAt: string;
    referralCode: string | null;
  } | null;
}

function truncateWallet(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Hook to get unified user profile (Web3Auth version)
 * Uses useProfile hook which syncs to DB and caches with React Query
 */
function useWeb3AuthProfile() {
  const {
    profile: dbProfile,
    isLoading,
    isAuthenticated,
    error,
    refetch,
  } = useProfile();

  // Map to UserProfile interface for compatibility
  const profile: UserProfile | null = dbProfile
    ? {
        // Auth provider data
        clerkId: dbProfile.clerkId || '', // Not used for Web3Auth
        imageUrl: dbProfile.avatarUrl || null,
        email: dbProfile.email || null,

        // From DB
        username: dbProfile.username || null,
        displayName: dbProfile.name || null,
        walletAddress: dbProfile.walletAddress,
        referralCode: dbProfile.referralCode || null,

        // Computed
        displayLabel: dbProfile.name || truncateWallet(dbProfile.walletAddress),
      }
    : null;

  return {
    profile,
    isLoading,
    isAuthenticated,
    error,
    refetch,
  };
}

/**
 * Hook to get unified user profile (Clerk version)
 */
function useClerkProfile() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Parse metadata
  const metadata = clerkUser?.publicMetadata as Record<string, unknown>;
  const rawWalletAddress = metadata?.walletAddress as string | undefined;
  const isExternalWallet = !!metadata?.isExternalWallet;

  // Determine lookup identifier
  let lookupIdentifier: string | undefined;

  if (isExternalWallet && rawWalletAddress) {
    try {
      lookupIdentifier = ethers.getAddress(rawWalletAddress);
    } catch {
      lookupIdentifier = rawWalletAddress;
    }
  } else if (clerkUser?.id) {
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
        if (res.status === 404) {
          return { user: null };
        }
        console.error('[useUserProfile] API error:', res.status);
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
    enabled: !!lookupIdentifier,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      if (error.message.includes('404')) return false;
      return failureCount < 3;
    },
  });

  // Combine Clerk + DB data
  const profile: UserProfile | null =
    isClerkLoaded && clerkUser && lookupIdentifier
      ? {
          clerkId: clerkUser.id,
          imageUrl: clerkUser.imageUrl || null,
          email: clerkUser.primaryEmailAddress?.emailAddress || null,

          username: dbData?.user?.username || null,
          displayName: dbData?.user?.name || null,
          walletAddress:
            dbData?.user?.walletAddress ||
            (isExternalWallet ? lookupIdentifier : '') ||
            '',
          referralCode: dbData?.user?.referralCode || null,

          displayLabel:
            dbData?.user?.name ||
            truncateWallet(
              dbData?.user?.walletAddress ||
                (isExternalWallet ? lookupIdentifier : '') ||
                ''
            ),
        }
      : null;

  return {
    profile,
    isLoading: !isClerkLoaded || (!!lookupIdentifier && isDbLoading),
    isAuthenticated: isClerkLoaded && !!clerkUser,
    error: dbError,
    refetch,
  };
}

/**
 * Hook to get unified user profile from Auth provider + DB
 * Automatically uses Web3Auth or Clerk based on feature flag
 */
export const useUserProfile = USE_WEB3AUTH
  ? useWeb3AuthProfile
  : useClerkProfile;
