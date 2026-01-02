'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

export interface Profile {
  id: string;
  clerkId: string | null;
  walletAddress: string;
  username: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  referralCode: string | null;
}

interface SyncResponse {
  success: boolean;
  user: Profile;
  status: 'created' | 'updated' | 'unchanged';
}

/**
 * Simple profile hook for Web3Auth users
 *
 * Flow:
 * 1. User logs in → Web3Auth context has user info (userId, walletAddress, email, name, profileImage)
 * 2. This hook syncs to DB on mount (upsert by walletAddress)
 * 3. Returns cached profile from React Query
 */
export function useProfile() {
  const { isLoading: isAuthLoading, isConnected, user } = useWeb3Auth();
  const queryClient = useQueryClient();

  // Sync user to DB and fetch profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', user?.walletAddress],
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.walletAddress) return null;

      // Sync to DB (upsert) and get profile
      const res = await fetch('/api/web3auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          walletAddress: user.walletAddress,
          email: user.email,
          name: user.name,
          avatarUrl: user.profileImage,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to sync profile');
      }

      const data: SyncResponse = await res.json();
      return data.user;
    },
    enabled: isConnected && !!user?.walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Helper to update and refetch
  const updateProfile = async (data: {
    username?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  }): Promise<Profile> => {
    if (!user?.walletAddress) throw new Error('Not authenticated');

    const res = await fetch('/api/web3auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: user.walletAddress, ...data }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update profile');
    }

    const result = await res.json();

    // Update cache
    queryClient.setQueryData(['profile', user.walletAddress], result.user);

    return result.user;
  };

  return {
    profile,
    isLoading: isAuthLoading || (isConnected && isProfileLoading),
    isAuthenticated: isConnected && !!profile,
    error,
    refetch,
    updateProfile,
  };
}
