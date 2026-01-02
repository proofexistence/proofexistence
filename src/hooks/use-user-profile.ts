'use client';

import { useProfile } from '@/hooks/use-profile';

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

function truncateWallet(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Hook to get unified user profile
 * Uses useProfile hook which syncs to DB and caches with React Query
 */
export function useUserProfile() {
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
