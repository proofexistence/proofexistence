'use client';

import { useQuery } from '@tanstack/react-query';

// Types matching the API response from getProfile
export interface PublicProfile {
  user: {
    id: string;
    clerkId: string | null;
    name: string | null;
    walletAddress: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  createdProofs: Array<{
    id: string;
    createdAt: string;
    status: string;
    ipfsHash: string | null;
    message: string | null;
    views: number | null;
    likes: number | null;
    title: string | null;
    previewUrl: string | null;
    userName: string | null;
    walletAddress: string | null;
  }>;
  savedProofs: Array<{
    id: string | null;
    createdAt: string | null;
    status: string | null;
    ipfsHash: string | null;
    message: string | null;
    views: number | null;
    likes: number | null;
    title: string | null;
    previewUrl: string | null;
    userName: string | null;
    walletAddress: string | null;
  }>;
  badges: Array<{
    id: string | null;
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    awardedAt: string | null;
  }>;
}

/**
 * Hook to fetch any user's public profile by username or wallet address
 * Uses React Query for caching
 */
export function usePublicProfile(identifier: string | undefined) {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public-profile', identifier],
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!identifier) return null;

      const res = await fetch(`/api/profile/${encodeURIComponent(identifier)}`);

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch profile');
      }

      return res.json();
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
}
