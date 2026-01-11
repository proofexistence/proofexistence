'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  time26Balance: string | null;
}

// Helper to truncate wallet address for display
export function truncateWallet(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      username?: string | null;
      name?: string | null;
      avatarUrl?: string | null;
    }) => {
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
      return result.user as Profile;
    },
    onSuccess: (updatedUser) => {
      if (user?.walletAddress) {
        queryClient.setQueryData(['profile', user.walletAddress], updatedUser);
      }
    },
  });

  // Upload Avatar Mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (data: { imageBase64: string; imageType: string }) => {
      if (!user?.walletAddress) throw new Error('Not authenticated');

      const res = await fetch('/api/web3auth/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          imageBase64: data.imageBase64,
          imageType: data.imageType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload image');
      }

      const uploadData = await res.json();
      return uploadData.url as string;
    },
  });

  // Computed display label: name > truncated wallet
  const displayLabel = profile
    ? profile.name || truncateWallet(profile.walletAddress)
    : '';

  return {
    profile,
    displayLabel,
    isLoading: isAuthLoading || (isConnected && isProfileLoading),
    isAuthenticated: isConnected && !!profile,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    isUploading: uploadAvatarMutation.isPending,
  };
}
